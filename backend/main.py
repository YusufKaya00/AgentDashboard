import json
import asyncio
import os
import logging
from datetime import datetime
import uuid
import re
from typing import List, Optional, Dict, Any
import httpx
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from storage import StorageManager
from llm import llm_client
from skill_manager import skill_manager
from background_agent import agent_manager, BackgroundAgent

app = FastAPI(title="Claude Dashboard API")

# CORS - Her şeye izin ver
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class Agent(BaseModel):
    id: str
    name: str
    description: str
    model: str
    status: str
    role: Optional[str] = "worker"
    capabilities: Optional[List[str]] = []
    config: Optional[Dict[str, Any]] = {}
    created_at: str
    updated_at: str

active_connections: List[WebSocket] = []

async def broadcast_activity(activity: dict):
    for connection in list(active_connections):
        try:
            await connection.send_json({"type": "activity", "data": activity})
        except:
            if connection in active_connections:
                active_connections.remove(connection)

# 1. FILE WATCHER: CLI'ın yaptıklarını canlı izle
class WorkspaceHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if event.is_directory: return
        if ".claude" in event.src_path or "node_modules" in event.src_path: return
        
        filename = os.path.basename(event.src_path)
        msg = f"WORKSPACE: File '{filename}' was modified by Agent/CLI."
        asyncio.run_coroutine_threadsafe(
            handle_file_event(msg),
            loop
        )

async def handle_file_event(msg):
    log = StorageManager.log_activity("system", msg, "info")
    await broadcast_activity(log)

# Global loop for watchdog
loop = None
observer = None

@app.on_event("startup")
async def startup_event():
    global loop, observer
    loop = asyncio.get_event_loop()
    observer = Observer()
    observer.schedule(WorkspaceHandler(), path=".", recursive=True)
    observer.start()

@app.on_event("shutdown")
async def shutdown_event():
    global observer
    if observer:
        observer.stop()
        observer.join()

# Endpoints
@app.get("/api/stats")
async def get_stats():
    agents = StorageManager.get_agents()
    return {
        "total_agents": len(agents),
        "active_agents": sum(1 for a in agents if isinstance(a, dict) and a.get('status') == "active"),
        "total_activities": len(StorageManager.get_activity()),
        "total_tasks": len(StorageManager.get_tasks()),
        "total_messages": 0,
        "total_memory": 0
    }

@app.get("/api/agents", response_model=List[Agent])
async def get_agents():
    return [Agent(**a) for a in StorageManager.get_agents() if isinstance(a, dict)]

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # 403'ü engellemek için origin kontrolünü manuel geçelim
    await websocket.accept()
    active_connections.append(websocket)
    try:
        # Send initial status
        await websocket.send_json({
            "type": "status",
            "data": {"status": "connected", "timestamp": datetime.now().isoformat()}
        })

        # Send initial activities
        activities = StorageManager.get_activity()[-10:]
        for activity in reversed(activities):
            await websocket.send_json({"type": "activity", "data": activity})

        # Keep connection alive with heartbeat
        while True:
            try:
                # Wait for client message with timeout
                await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Send heartbeat response
                await websocket.send_json({
                    "type": "heartbeat",
                    "data": {"timestamp": datetime.now().isoformat()}
                })
            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                await websocket.send_json({
                    "type": "heartbeat",
                    "data": {"timestamp": datetime.now().isoformat()}
                })
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)
    except Exception as e:
        if websocket in active_connections:
            active_connections.remove(websocket)

# 2. HIZLI PROXY: CLI için gecikmeyi sıfıra indir
@app.post("/v1/messages")
async def cli_proxy_messages(request: Request):
    body = await request.json()
    model_name = body.get("model", "unknown")
    
    # Anında logla
    log = StorageManager.log_activity("cli", f"CLI Request: {model_name}", "request")
    await broadcast_activity(log)
    
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ["host", "content-length", "accept-encoding"]}
    headers["host"] = "127.0.0.1:8082"
    
    async def fast_forward():
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", "http://127.0.0.1:8082/v1/messages?beta=true", headers=headers, json=body) as response:
                async for chunk in response.aiter_raw():
                    yield chunk
    
    return StreamingResponse(fast_forward(), media_type="text/event-stream")

@app.get("/api/activity")
async def get_activity(limit: int = 50):
    return StorageManager.get_activity()[-limit:]

# Skills Endpoints
@app.get("/api/skills")
async def get_skills():
    return skill_manager.get_all_skills()

@app.get("/api/skills/stats")
async def get_skills_stats():
    return skill_manager.get_skill_stats()

@app.post("/api/skills")
async def create_skill(skill_data: dict):
    return skill_manager.add_skill(skill_data)

@app.put("/api/skills/{skill_id}")
async def update_skill(skill_id: str, skill_data: dict):
    skill = skill_manager.update_skill(skill_id, skill_data)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill

@app.delete("/api/skills/{skill_id}")
async def delete_skill(skill_id: str):
    if not skill_manager.delete_skill(skill_id):
        raise HTTPException(status_code=404, detail="Skill not found")
    return {"status": "deleted"}

@app.post("/api/skills/{skill_id}/toggle")
async def toggle_skill(skill_id: str):
    skill = skill_manager.toggle_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill

# Agent Summary Endpoint
@app.get("/api/agents/summary")
async def get_agents_summary():
    agents = StorageManager.get_agents()
    models = {}
    status_counts = {"active": 0, "inactive": 0, "error": 0}

    for agent in agents:
        if not isinstance(agent, dict):
            continue

        model = agent.get("model", "unknown")
        models[model] = models.get(model, 0) + 1

        status = agent.get("status", "inactive")
        if status in status_counts:
            status_counts[status] += 1

    return {
        "total": len(agents),
        "models": models,
        "status": status_counts,
        "agents": agents
    }

# Chat Logs Endpoint
@app.get("/api/chats/all")
async def get_all_chat_logs(limit: int = 100):
    all_logs = StorageManager.get_all_chat_logs()
    return all_logs[-limit:]

@app.get("/api/chats/{agent_id}")
async def get_chat_logs(agent_id: str, limit: int = 50):
    history = StorageManager.get_chat_history(agent_id)
    return history[-limit:]

# System Status Endpoint
@app.get("/api/system/status")
async def get_system_status():
    return StorageManager.get_system_status()

# Detailed Activity Endpoint
@app.get("/api/activities/detailed")
async def get_detailed_activities(limit: int = 100):
    activities = StorageManager.get_activity()
    return activities[-limit:]

# ============ HOOKS ENDPOINTS ============
@app.get("/api/hooks")
async def get_hooks():
    return StorageManager.get_hooks()

@app.post("/api/hooks")
async def create_hook(hook_data: dict):
    hooks = StorageManager.get_hooks()
    hooks.append(hook_data)
    StorageManager.save_hooks(hooks)
    # Log activity
    log = StorageManager.log_activity("system", f"Hook created: {hook_data.get('name')}", "info")
    await broadcast_activity(log)
    return hook_data

@app.delete("/api/hooks/{hook_id}")
async def delete_hook(hook_id: str):
    hooks = StorageManager.get_hooks()
    hooks = [h for h in hooks if h.get("id") != hook_id]
    StorageManager.save_hooks(hooks)
    # Log activity
    log = StorageManager.log_activity("system", f"Hook deleted: {hook_id}", "info")
    await broadcast_activity(log)
    return {"status": "deleted"}

@app.post("/api/hooks/{hook_id}/toggle")
async def toggle_hook(hook_id: str):
    hooks = StorageManager.get_hooks()
    for hook in hooks:
        if hook.get("id") == hook_id:
            hook["enabled"] = not hook.get("enabled", True)
            StorageManager.save_hooks(hooks)
            # Log activity
            log = StorageManager.log_activity("system", f"Hook toggled: {hook_id} -> {hook['enabled']}", "info")
            await broadcast_activity(log)
            return hook
    raise HTTPException(status_code=404, detail="Hook not found")

# ============ AGENTS ENDPOINTS ============
@app.post("/api/agents")
async def create_agent(agent_data: dict):
    agents = StorageManager.get_agents()
    new_agent = {
        "id": agent_data.get("id", str(uuid.uuid4())),
        "name": agent_data.get("name", "New Agent"),
        "description": agent_data.get("description", ""),
        "model": agent_data.get("model", "default"),
        "status": agent_data.get("status", "active"),
        "role": agent_data.get("role", "worker"),
        "capabilities": agent_data.get("capabilities", []),
        "config": agent_data.get("config", {}),
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    agents.append(new_agent)
    StorageManager.save_agents(agents)
    # Log activity
    log = StorageManager.log_activity("system", f"Agent created: {new_agent['name']}", "info")
    await broadcast_activity(log)
    return new_agent

@app.put("/api/agents/{agent_id}")
async def update_agent(agent_id: str, agent_data: dict):
    agents = StorageManager.get_agents()
    for i, agent in enumerate(agents):
        if agent.get("id") == agent_id:
            agents[i] = {**agent, **agent_data, "id": agent_id, "updated_at": datetime.now().isoformat()}
            StorageManager.save_agents(agents)
            # Log activity
            log = StorageManager.log_activity("system", f"Agent updated: {agent_id}", "info")
            await broadcast_activity(log)
            return agents[i]
    raise HTTPException(status_code=404, detail="Agent not found")

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    agents = StorageManager.get_agents()
    agents = [a for a in agents if a.get("id") != agent_id]
    StorageManager.save_agents(agents)
    # Log activity
    log = StorageManager.log_activity("system", f"Agent deleted: {agent_id}", "info")
    await broadcast_activity(log)
    return {"status": "deleted"}

# ============ MODELS ENDPOINTS ============
@app.get("/api/models")
async def get_models():
    return StorageManager.get_models()

@app.post("/api/models")
async def create_model(model_data: dict):
    models = StorageManager.get_models()
    new_model = {
        "id": model_data.get("id", str(uuid.uuid4())),
        "name": model_data.get("name", "New Model"),
        "provider": model_data.get("provider", "openai"),
        "api_endpoint": model_data.get("api_endpoint", ""),
        "api_key": model_data.get("api_key", ""),
        "max_tokens": model_data.get("max_tokens", 4096),
        "temperature": model_data.get("temperature", 0.7),
        "enabled": model_data.get("enabled", True),
        "created_at": datetime.now().isoformat()
    }
    models.append(new_model)
    StorageManager.save_models(models)
    # Log activity
    log = StorageManager.log_activity("system", f"Model created: {new_model['name']}", "info")
    await broadcast_activity(log)
    return new_model

@app.delete("/api/models/{model_id}")
async def delete_model(model_id: str):
    models = StorageManager.get_models()
    models = [m for m in models if m.get("id") != model_id]
    StorageManager.save_models(models)
    # Log activity
    log = StorageManager.log_activity("system", f"Model deleted: {model_id}", "info")
    await broadcast_activity(log)
    return {"status": "deleted"}

# ============ BACKGROUND AGENT ENDPOINTS ============
@app.get("/api/agents/background")
async def get_background_agents():
    """Tüm background agent'ları listele"""
    agents = []
    for agent_id, agent in agent_manager.agents.items():
        agents.append({
            "id": agent_id,
            "name": agent.name,
            "description": agent.description,
            "model": agent.model,
            "is_running": agent.is_running,
            "queue_size": agent.task_queue.qsize() if agent.is_running else 0
        })
    return agents

@app.post("/api/agents/background")
async def create_background_agent(agent_data: dict):
    """Yeni background agent oluştur"""
    agent_id = agent_data.get("id", f"agent-{uuid.uuid4().hex[:8]}")
    agent = agent_manager.create_agent(
        agent_id=agent_id,
        name=agent_data.get("name", "New Agent"),
        description=agent_data.get("description", ""),
        model=agent_data.get("model", "claude-opus-4-7"),
        system_prompt=agent_data.get("system_prompt")
    )

    # Storage'a da kaydet
    agents = StorageManager.get_agents()
    agents.append({
        "id": agent_id,
        "name": agent.name,
        "description": agent.description,
        "model": agent.model,
        "status": "active",
        "role": "background",
        "capabilities": ["chat", "analyze", "code"],
        "config": {"is_background": True},
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    })
    StorageManager.save_agents(agents)

    # Log activity
    log = StorageManager.log_activity("system", f"Background agent created: {agent.name}", "info")
    await broadcast_activity(log)

    return {
        "id": agent_id,
        "name": agent.name,
        "description": agent.description,
        "model": agent.model,
        "is_running": agent.is_running
    }

@app.post("/api/agents/background/{agent_id}/start")
async def start_background_agent(agent_id: str):
    """Background agent'ı başlat"""
    agent = agent_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await agent_manager.start_agent(agent_id)

    # Log activity
    log = StorageManager.log_activity("system", f"Background agent started: {agent_id}", "info")
    await broadcast_activity(log)

    return {"status": "started", "agent_id": agent_id}

@app.post("/api/agents/background/{agent_id}/stop")
async def stop_background_agent(agent_id: str):
    """Background agent'ı durdur"""
    agent = agent_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await agent_manager.stop_agent(agent_id)

    # Log activity
    log = StorageManager.log_activity("system", f"Background agent stopped: {agent_id}", "info")
    await broadcast_activity(log)

    return {"status": "stopped", "agent_id": agent_id}

@app.post("/api/agents/background/{agent_id}/task")
async def add_agent_task(agent_id: str, task_data: dict):
    """Background agent'a task ekle"""
    agent = agent_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    task_type = task_data.get("type", "chat")
    data = task_data.get("data", {})

    # Callback - sonucu WebSocket üzerinden yayınla
    async def task_callback(result):
        log = StorageManager.log_activity(
            agent_id,
            f"Task completed: {task_type}",
            "info"
        )
        log["result"] = result
        await broadcast_activity(log)

    task_id = await agent.add_task(task_type, data, task_callback)

    # Log activity
    log = StorageManager.log_activity(
        agent_id,
        f"Task added: {task_type} ({task_id})",
        "info"
    )
    await broadcast_activity(log)

    return {"task_id": task_id, "status": "queued"}

@app.get("/api/agents/background/{agent_id}/memory")
async def get_agent_memory(agent_id: str):
    """Agent hafızasını al"""
    agent = agent_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return agent.get_memory()

@app.post("/api/agents/background/{agent_id}/memory")
async def add_agent_memory(agent_id: str, memory_data: dict):
    """Agent hafızasına bilgi ekle"""
    agent = agent_manager.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    key = memory_data.get("key")
    value = memory_data.get("value")

    await agent.add_memory(key, value)

    # Log activity
    log = StorageManager.log_activity(
        agent_id,
        f"Memory added: {key}",
        "info"
    )
    await broadcast_activity(log)

    return {"status": "added", "key": key}

@app.get("/api/agents/background/{agent_id}/chat")
async def get_agent_chat_history(agent_id: str, limit: int = 50):
    """Agent sohbet geçmişini al"""
    history = StorageManager.get_chat_history(agent_id)
    return history[-limit:]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

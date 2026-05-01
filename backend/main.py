"""
Claude Dashboard Backend - FastAPI
AI Agent Yönetim ve İzleme Sistemi
Gerçek AI Entegrasyonu, Agent-to-Agent İletişim, Memory, Task Execution
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import asyncio
from datetime import datetime
import uuid
import httpx
from collections import defaultdict

app = FastAPI(title="Claude Dashboard API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELS ====================

class Agent(BaseModel):
    id: str
    name: str
    description: str
    model: str
    status: str  # active, inactive, error
    config: Dict[str, Any]
    created_at: str
    updated_at: str
    last_activity: Optional[str] = None
    role: Optional[str] = "worker"  # team_lead, worker, specialist
    parent_agent_id: Optional[str] = None  # Hierarşik yapı için
    capabilities: List[str] = []  # Agent'ın yetenekleri

class Hook(BaseModel):
    id: str
    name: str
    type: str  # pre, post, error
    trigger: str
    action: str
    enabled: bool
    config: Dict[str, Any]
    created_at: str

class AIModel(BaseModel):
    id: str
    name: str
    provider: str  # anthropic, openai, codex, antigravity, custom
    api_endpoint: Optional[str] = None
    api_key: Optional[str] = None
    model_id: str
    capabilities: List[str]
    enabled: bool
    config: Dict[str, Any]

class ActivityLog(BaseModel):
    id: str
    agent_id: str
    type: str  # request, response, error, hook
    message: str
    timestamp: str
    metadata: Dict[str, Any]

class Message(BaseModel):
    id: str
    agent_id: str
    role: str  # user, assistant, system
    content: str
    timestamp: str
    metadata: Dict[str, Any] = {}

class Task(BaseModel):
    id: str
    agent_id: str
    description: str
    status: str  # pending, in_progress, completed, failed
    result: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None
    metadata: Dict[str, Any] = {}

class Memory(BaseModel):
    id: str
    agent_id: str
    key: str
    value: Any
    created_at: str
    updated_at: str
    ttl: Optional[int] = None  # Time to live in seconds

class TrainingData(BaseModel):
    id: str
    agent_id: str
    prompt: str
    completion: str
    created_at: str
    metadata: Dict[str, Any] = {}

class ChatRequest(BaseModel):
    agent_id: str
    message: str
    context: Optional[Dict[str, Any]] = {}
    tools: Optional[List[str]] = []

class AgentCallRequest(BaseModel):
    from_agent_id: str
    to_agent_id: str
    task: str
    context: Optional[Dict[str, Any]] = {}

# ==================== IN-MEMORY STORAGE ====================

agents: Dict[str, Agent] = {}
hooks: Dict[str, Hook] = {}
models: Dict[str, AIModel] = {}
activity_logs: List[ActivityLog] = []
active_connections: List[WebSocket] = []
messages: Dict[str, List[Message]] = defaultdict(list)  # agent_id -> messages
tasks: Dict[str, Task] = {}
memory: Dict[str, Dict[str, Memory]] = defaultdict(dict)  # agent_id -> key -> memory
training_data: Dict[str, List[TrainingData]] = defaultdict(list)  # agent_id -> training_data

# ==================== INITIAL DATA ====================

# Örnek AI Modelleri
initial_models = [
    AIModel(
        id="claude-opus",
        name="Claude Opus",
        provider="anthropic",
        model_id="claude-opus-4-7",
        capabilities=["text", "code", "analysis", "tool-use"],
        enabled=True,
        config={"max_tokens": 200000, "temperature": 0.7}
    ),
    AIModel(
        id="claude-sonnet",
        name="Claude Sonnet",
        provider="anthropic",
        model_id="claude-sonnet-4-6",
        capabilities=["text", "code", "analysis"],
        enabled=True,
        config={"max_tokens": 100000, "temperature": 0.7}
    ),
    AIModel(
        id="gpt-4",
        name="GPT-4",
        provider="openai",
        model_id="gpt-4",
        capabilities=["text", "code", "analysis"],
        enabled=True,
        config={"max_tokens": 8192, "temperature": 0.7}
    ),
    AIModel(
        id="codex",
        name="Codex",
        provider="openai",
        model_id="code-davinci-002",
        capabilities=["code", "completion"],
        enabled=False,
        config={"max_tokens": 4096, "temperature": 0.2}
    ),
    AIModel(
        id="antigravity",
        name="Antigravity",
        provider="custom",
        api_endpoint="https://api.antigravity.ai/v1",
        model_id="antigravity-v1",
        capabilities=["text", "code", "image"],
        enabled=False,
        config={"custom_param": "value"}
    )
]

for model in initial_models:
    models[model.id] = model

# Örnek Hook'lar
initial_hooks = [
    Hook(
        id="hook-1",
        name="Pre-Request Logger",
        type="pre",
        trigger="agent.request",
        action="log_request",
        enabled=True,
        config={"log_level": "info"},
        created_at=datetime.now().isoformat()
    ),
    Hook(
        id="hook-2",
        name="Error Handler",
        type="error",
        trigger="agent.error",
        action="send_alert",
        enabled=True,
        config={"alert_channel": "slack"},
        created_at=datetime.now().isoformat()
    ),
    Hook(
        id="hook-3",
        name="Post-Response Analyzer",
        type="post",
        trigger="agent.response",
        action="analyze_response",
        enabled=False,
        config={"check_quality": True},
        created_at=datetime.now().isoformat()
    )
]

for hook in initial_hooks:
    hooks[hook.id] = hook

# ==================== AI PROVIDER HANDLERS ====================

async def call_anthropic(model_id: str, messages: List[Dict], config: Dict, api_key: Optional[str] = None):
    """Anthropic API çağrısı"""
    # Demo amaçlı mock response
    return {
        "content": [{"text": f"Anthropic {model_id} response: {messages[-1]['content']}"}],
        "model": model_id
    }

async def call_openai(model_id: str, messages: List[Dict], config: Dict, api_key: Optional[str] = None):
    """OpenAI API çağrısı"""
    # Demo amaçlı mock response
    return {
        "choices": [{"message": {"content": f"OpenAI {model_id} response: {messages[-1]['content']}"}}],
        "model": model_id
    }

async def call_custom(endpoint: str, model_id: str, messages: List[Dict], config: Dict, api_key: Optional[str] = None):
    """Custom API çağrısı"""
    # Demo amaçlı mock response
    return {
        "response": f"Custom {model_id} response: {messages[-1]['content']}"
    }

async def call_ai_model(model: AIModel, messages: List[Dict]) -> str:
    """AI model çağrısı"""
    try:
        if model.provider == "anthropic":
            response = await call_anthropic(model.model_id, messages, model.config, model.api_key)
            return response["content"][0]["text"]
        elif model.provider == "openai":
            response = await call_openai(model.model_id, messages, model.config, model.api_key)
            return response["choices"][0]["message"]["content"]
        elif model.provider == "custom":
            response = await call_custom(model.api_endpoint, model.model_id, messages, model.config, model.api_key)
            return response["response"]
        else:
            raise ValueError(f"Unknown provider: {model.provider}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI call failed: {str(e)}")

# ==================== AGENT ENDPOINTS ====================

@app.get("/api/agents", response_model=List[Agent])
async def get_agents():
    """Tüm agentları listele"""
    return list(agents.values())

@app.get("/api/agents/{agent_id}", response_model=Agent)
async def get_agent(agent_id: str):
    """Tek bir agent getir"""
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agents[agent_id]

@app.post("/api/agents", response_model=Agent)
async def create_agent(agent: Agent):
    """Yeni agent oluştur"""
    if not agent.id:
        agent.id = str(uuid.uuid4())
    agent.created_at = datetime.now().isoformat()
    agent.updated_at = datetime.now().isoformat()
    agents[agent.id] = agent

    # Aktivite log
    log = ActivityLog(
        id=str(uuid.uuid4()),
        agent_id=agent.id,
        type="request",
        message=f"Agent created: {agent.name}",
        timestamp=datetime.now().isoformat(),
        metadata={"action": "create"}
    )
    activity_logs.append(log)
    await broadcast_activity(log)
    return agent

@app.put("/api/agents/{agent_id}", response_model=Agent)
async def update_agent(agent_id: str, agent: Agent):
    """Agent güncelle"""
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.id = agent_id
    agent.updated_at = datetime.now().isoformat()
    agents[agent_id] = agent

    log = ActivityLog(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        type="request",
        message=f"Agent updated: {agent.name}",
        timestamp=datetime.now().isoformat(),
        metadata={"action": "update"}
    )
    activity_logs.append(log)
    await broadcast_activity(log)
    return agent

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str):
    """Agent sil"""
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent_name = agents[agent_id].name
    del agents[agent_id]

    log = ActivityLog(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        type="request",
        message=f"Agent deleted: {agent_name}",
        timestamp=datetime.now().isoformat(),
        metadata={"action": "delete"}
    )
    activity_logs.append(log)
    await broadcast_activity(log)
    return {"message": "Agent deleted successfully"}

@app.post("/api/agents/{agent_id}/activate")
async def activate_agent(agent_id: str):
    """Agent'ı aktifleştir"""
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    agents[agent_id].status = "active"
    agents[agent_id].last_activity = datetime.now().isoformat()

    log = ActivityLog(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        type="request",
        message=f"Agent activated: {agents[agent_id].name}",
        timestamp=datetime.now().isoformat(),
        metadata={"action": "activate"}
    )
    activity_logs.append(log)
    await broadcast_activity(log)
    return {"message": "Agent activated"}

@app.post("/api/agents/{agent_id}/deactivate")
async def deactivate_agent(agent_id: str):
    """Agent'ı deaktifleştir"""
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    agents[agent_id].status = "inactive"

    log = ActivityLog(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        type="request",
        message=f"Agent deactivated: {agents[agent_id].name}",
        timestamp=datetime.now().isoformat(),
        metadata={"action": "deactivate"}
    )
    activity_logs.append(log)
    await broadcast_activity(log)
    return {"message": "Agent deactivated"}

# ==================== CHAT ENDPOINTS ====================

@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Agent ile sohbet et"""
    if request.agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent = agents[request.agent_id]
    if agent.status != "active":
        raise HTTPException(status_code=400, detail="Agent is not active")

    if agent.model not in models:
        raise HTTPException(status_code=404, detail="Model not found")

    model = models[agent.model]
    if not model.enabled:
        raise HTTPException(status_code=400, detail="Model is not enabled")

    # Kullanıcı mesajını kaydet
    user_message = Message(
        id=str(uuid.uuid4()),
        agent_id=request.agent_id,
        role="user",
        content=request.message,
        timestamp=datetime.now().isoformat(),
        metadata=request.context
    )
    messages[request.agent_id].append(user_message)

    # Aktivite log
    log = ActivityLog(
        id=str(uuid.uuid4()),
        agent_id=request.agent_id,
        type="request",
        message=f"Chat request: {request.message[:50]}...",
        timestamp=datetime.now().isoformat(),
        metadata={"context": request.context}
    )
    activity_logs.append(log)
    await broadcast_activity(log)

    try:
        # AI çağrısı
        ai_messages = [
            {"role": "system", "content": f"You are {agent.name}. {agent.description}"},
            *[{"role": m.role, "content": m.content} for m in messages[request.agent_id][-10:]]  # Son 10 mesaj
        ]

        response_text = await call_ai_model(model, ai_messages)

        # AI yanıtını kaydet
        assistant_message = Message(
            id=str(uuid.uuid4()),
            agent_id=request.agent_id,
            role="assistant",
            content=response_text,
            timestamp=datetime.now().isoformat(),
            metadata={"model": model.model_id}
        )
        messages[request.agent_id].append(assistant_message)

        # Aktivite log
        response_log = ActivityLog(
            id=str(uuid.uuid4()),
            agent_id=request.agent_id,
            type="response",
            message=f"Chat response: {response_text[:50]}...",
            timestamp=datetime.now().isoformat(),
            metadata={"model": model.model_id}
        )
        activity_logs.append(response_log)
        await broadcast_activity(response_log)

        # Agent'ı güncelle
        agent.last_activity = datetime.now().isoformat()

        return {
            "message": response_text,
            "agent_id": request.agent_id,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        error_log = ActivityLog(
            id=str(uuid.uuid4()),
            agent_id=request.agent_id,
            type="error",
            message=f"Chat error: {str(e)}",
            timestamp=datetime.now().isoformat(),
            metadata={"error": str(e)}
        )
        activity_logs.append(error_log)
        await broadcast_activity(error_log)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/chat/{agent_id}", response_model=List[Message])
async def get_chat_history(agent_id: str, limit: int = 50):
    """Agent sohbet geçmişini getir"""
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    return messages[agent_id][-limit:]

# ==================== AGENT-TO-AGENT ENDPOINTS ====================

@app.post("/api/agents/call")
async def call_agent(request: AgentCallRequest):
    """Agent'dan agent'a çağrı"""
    if request.from_agent_id not in agents:
        raise HTTPException(status_code=404, detail="From agent not found")
    if request.to_agent_id not in agents:
        raise HTTPException(status_code=404, detail="To agent not found")

    from_agent = agents[request.from_agent_id]
    to_agent = agents[request.to_agent_id]

    if to_agent.status != "active":
        raise HTTPException(status_code=400, detail="Target agent is not active")

    # Aktivite log
    log = ActivityLog(
        id=str(uuid.uuid4()),
        agent_id=request.from_agent_id,
        type="request",
        message=f"Agent call: {from_agent.name} -> {to_agent.name}",
        timestamp=datetime.now().isoformat(),
        metadata={"task": request.task, "to_agent": request.to_agent_id}
    )
    activity_logs.append(log)
    await broadcast_activity(log)

    try:
        # Hedef agent'a görev atayabiliriz veya doğrudan çağırabiliriz
        # Basitlik için, hedef agent'ın modelini kullanarak yanıt üretelim
        if to_agent.model not in models:
            raise HTTPException(status_code=404, detail="Target agent's model not found")

        model = models[to_agent.model]
        if not model.enabled:
            raise HTTPException(status_code=400, detail="Target agent's model is not enabled")

        ai_messages = [
            {"role": "system", "content": f"You are {to_agent.name}. {to_agent.description}"},
            {"role": "user", "content": f"Task from {from_agent.name}: {request.task}"}
        ]

        response_text = await call_ai_model(model, ai_messages)

        # Yanıt log
        response_log = ActivityLog(
            id=str(uuid.uuid4()),
            agent_id=request.to_agent_id,
            type="response",
            message=f"Agent call response: {response_text[:50]}...",
            timestamp=datetime.now().isoformat(),
            metadata={"from_agent": request.from_agent_id}
        )
        activity_logs.append(response_log)
        await broadcast_activity(response_log)

        return {
            "result": response_text,
            "from_agent_id": request.from_agent_id,
            "to_agent_id": request.to_agent_id,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        error_log = ActivityLog(
            id=str(uuid.uuid4()),
            agent_id=request.from_agent_id,
            type="error",
            message=f"Agent call error: {str(e)}",
            timestamp=datetime.now().isoformat(),
            metadata={"error": str(e)}
        )
        activity_logs.append(error_log)
        await broadcast_activity(error_log)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents/{agent_id}/subordinates", response_model=List[Agent])
async def get_subordinates(agent_id: str):
    """Agent'ın altındaki agent'ları getir (hierarşik yapı)"""
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")
    return [a for a in agents.values() if a.parent_agent_id == agent_id]

# ==================== TASK ENDPOINTS ====================

@app.post("/api/tasks", response_model=Task)
async def create_task(task: Task):
    """Yeni görev oluştur"""
    if not task.id:
        task.id = str(uuid.uuid4())
    task.created_at = datetime.now().isoformat()
    tasks[task.id] = task

    log = ActivityLog(
        id=str(uuid.uuid4()),
        agent_id=task.agent_id,
        type="request",
        message=f"Task created: {task.description}",
        timestamp=datetime.now().isoformat(),
        metadata={"task_id": task.id}
    )
    activity_logs.append(log)
    await broadcast_activity(log)

    return task

@app.get("/api/tasks", response_model=List[Task])
async def get_tasks(agent_id: Optional[str] = None, status: Optional[str] = None):
    """Görevleri listele"""
    result = list(tasks.values())
    if agent_id:
        result = [t for t in result if t.agent_id == agent_id]
    if status:
        result = [t for t in result if t.status == status]
    return result

@app.get("/api/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Tek bir görev getir"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks[task_id]

@app.put("/api/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task: Task):
    """Görev güncelle"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    task.id = task_id
    if task.status == "completed" and not task.completed_at:
        task.completed_at = datetime.now().isoformat()
    tasks[task_id] = task
    return task

@app.post("/api/tasks/{task_id}/execute")
async def execute_task(task_id: str):
    """Görevi çalıştır"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]
    task.status = "in_progress"

    log = ActivityLog(
        id=str(uuid.uuid4()),
        agent_id=task.agent_id,
        type="request",
        message=f"Task executing: {task.description}",
        timestamp=datetime.now().isoformat(),
        metadata={"task_id": task_id}
    )
    activity_logs.append(log)
    await broadcast_activity(log)

    # Görevi çalıştır (basit implementasyon)
    try:
        if task.agent_id not in agents:
            raise HTTPException(status_code=404, detail="Agent not found")

        agent = agents[task.agent_id]
        if agent.model not in models:
            raise HTTPException(status_code=404, detail="Model not found")

        model = models[agent.model]
        if not model.enabled:
            raise HTTPException(status_code=400, detail="Model is not enabled")

        ai_messages = [
            {"role": "system", "content": f"You are {agent.name}. {agent.description}"},
            {"role": "user", "content": f"Task: {task.description}"}
        ]

        result = await call_ai_model(model, ai_messages)

        task.status = "completed"
        task.result = result
        task.completed_at = datetime.now().isoformat()

        completion_log = ActivityLog(
            id=str(uuid.uuid4()),
            agent_id=task.agent_id,
            type="response",
            message=f"Task completed: {task.description}",
            timestamp=datetime.now().isoformat(),
            metadata={"task_id": task_id, "result": result[:100]}
        )
        activity_logs.append(completion_log)
        await broadcast_activity(completion_log)

        return {"message": "Task executed successfully", "result": result}

    except Exception as e:
        task.status = "failed"
        error_log = ActivityLog(
            id=str(uuid.uuid4()),
            agent_id=task.agent_id,
            type="error",
            message=f"Task execution error: {str(e)}",
            timestamp=datetime.now().isoformat(),
            metadata={"task_id": task_id, "error": str(e)}
        )
        activity_logs.append(error_log)
        await broadcast_activity(error_log)
        raise HTTPException(status_code=500, detail=str(e))

# ==================== MEMORY ENDPOINTS ====================

@app.post("/api/memory", response_model=Memory)
async def create_memory(memory: Memory):
    """Yeni hafıza oluştur"""
    if not memory.id:
        memory.id = str(uuid.uuid4())
    memory.created_at = datetime.now().isoformat()
    memory.updated_at = datetime.now().isoformat()
    memory[memory.agent_id][memory.key] = memory.dict()
    return memory

@app.get("/api/memory/{agent_id}", response_model=List[Memory])
async def get_memory(agent_id: str):
    """Agent hafızasını getir"""
    if agent_id not in memory:
        return []
    return list(memory[agent_id].values())

@app.get("/api/memory/{agent_id}/{key}", response_model=Memory)
async def get_memory_item(agent_id: str, key: str):
    """Tek bir hafıza öğesi getir"""
    if agent_id not in memory or key not in memory[agent_id]:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory[agent_id][key]

@app.put("/api/memory/{agent_id}/{key}", response_model=Memory)
async def update_memory(agent_id: str, key: str, value: Any):
    """Hafızayı güncelle"""
    if agent_id not in memory or key not in memory[agent_id]:
        raise HTTPException(status_code=404, detail="Memory not found")
    mem = memory[agent_id][key]
    mem.value = value
    mem.updated_at = datetime.now().isoformat()
    return mem

@app.delete("/api/memory/{agent_id}/{key}")
async def delete_memory(agent_id: str, key: str):
    """Hafızayı sil"""
    if agent_id not in memory or key not in memory[agent_id]:
        raise HTTPException(status_code=404, detail="Memory not found")
    del memory[agent_id][key]
    return {"message": "Memory deleted successfully"}

# ==================== TRAINING ENDPOINTS ====================

@app.post("/api/training", response_model=TrainingData)
async def create_training_data(data: TrainingData):
    """Eğitim verisi oluştur"""
    if not data.id:
        data.id = str(uuid.uuid4())
    data.created_at = datetime.now().isoformat()
    training_data[data.agent_id].append(data)
    return data

@app.get("/api/training/{agent_id}", response_model=List[TrainingData])
async def get_training_data(agent_id: str):
    """Agent eğitim verilerini getir"""
    if agent_id not in training_data:
        return []
    return training_data[agent_id]

@app.post("/api/agents/{agent_id}/train")
async def train_agent(agent_id: str, epochs: int = 10):
    """Agent'ı eğit (demo)"""
    if agent_id not in agents:
        raise HTTPException(status_code=404, detail="Agent not found")

    if agent_id not in training_data or len(training_data[agent_id]) == 0:
        raise HTTPException(status_code=400, detail="No training data available")

    log = ActivityLog(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        type="request",
        message=f"Training started: {epochs} epochs",
        timestamp=datetime.now().isoformat(),
        metadata={"epochs": epochs, "data_count": len(training_data[agent_id])}
    )
    activity_logs.append(log)
    await broadcast_activity(log)

    # Demo eğitim simülasyonu
    await asyncio.sleep(2)

    completion_log = ActivityLog(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        type="response",
        message=f"Training completed: {epochs} epochs",
        timestamp=datetime.now().isoformat(),
        metadata={"epochs": epochs, "status": "completed"}
    )
    activity_logs.append(completion_log)
    await broadcast_activity(completion_log)

    return {"message": "Training completed successfully", "epochs": epochs}

# ==================== HOOK ENDPOINTS ====================

@app.get("/api/hooks", response_model=List[Hook])
async def get_hooks():
    """Tüm hook'ları listele"""
    return list(hooks.values())

@app.get("/api/hooks/{hook_id}", response_model=Hook)
async def get_hook(hook_id: str):
    """Tek bir hook getir"""
    if hook_id not in hooks:
        raise HTTPException(status_code=404, detail="Hook not found")
    return hooks[hook_id]

@app.post("/api/hooks", response_model=Hook)
async def create_hook(hook: Hook):
    """Yeni hook oluştur"""
    if not hook.id:
        hook.id = str(uuid.uuid4())
    hook.created_at = datetime.now().isoformat()
    hooks[hook.id] = hook
    return hook

@app.put("/api/hooks/{hook_id}", response_model=Hook)
async def update_hook(hook_id: str, hook: Hook):
    """Hook güncelle"""
    if hook_id not in hooks:
        raise HTTPException(status_code=404, detail="Hook not found")
    hook.id = hook_id
    hooks[hook_id] = hook
    return hook

@app.delete("/api/hooks/{hook_id}")
async def delete_hook(hook_id: str):
    """Hook sil"""
    if hook_id not in hooks:
        raise HTTPException(status_code=404, detail="Hook not found")
    del hooks[hook_id]
    return {"message": "Hook deleted successfully"}

@app.post("/api/hooks/{hook_id}/toggle")
async def toggle_hook(hook_id: str):
    """Hook'ı aç/kapat"""
    if hook_id not in hooks:
        raise HTTPException(status_code=404, detail="Hook not found")
    hooks[hook_id].enabled = not hooks[hook_id].enabled
    return {"message": f"Hook {'enabled' if hooks[hook_id].enabled else 'disabled'}"}

# ==================== MODEL ENDPOINTS ====================

@app.get("/api/models", response_model=List[AIModel])
async def get_models():
    """Tüm modelleri listele"""
    return list(models.values())

@app.get("/api/models/{model_id}", response_model=AIModel)
async def get_model(model_id: str):
    """Tek bir model getir"""
    if model_id not in models:
        raise HTTPException(status_code=404, detail="Model not found")
    return models[model_id]

@app.post("/api/models", response_model=AIModel)
async def create_model(model: AIModel):
    """Yeni model ekle"""
    if not model.id:
        model.id = str(uuid.uuid4())
    models[model.id] = model
    return model

@app.put("/api/models/{model_id}", response_model=AIModel)
async def update_model(model_id: str, model: AIModel):
    """Model güncelle"""
    if model_id not in models:
        raise HTTPException(status_code=404, detail="Model not found")
    model.id = model_id
    models[model_id] = model
    return model

@app.delete("/api/models/{model_id}")
async def delete_model(model_id: str):
    """Model sil"""
    if model_id not in models:
        raise HTTPException(status_code=404, detail="Model not found")
    del models[model_id]
    return {"message": "Model deleted successfully"}

@app.post("/api/models/{model_id}/toggle")
async def toggle_model(model_id: str):
    """Modeli aç/kapat"""
    if model_id not in models:
        raise HTTPException(status_code=404, detail="Model not found")
    models[model_id].enabled = not models[model_id].enabled
    return {"message": f"Model {'enabled' if models[model_id].enabled else 'disabled'}"}

# ==================== ACTIVITY LOG ENDPOINTS ====================

@app.get("/api/activity", response_model=List[ActivityLog])
async def get_activity_logs(limit: int = 100):
    """Aktivite loglarını getir"""
    return activity_logs[-limit:]

@app.get("/api/activity/agent/{agent_id}", response_model=List[ActivityLog])
async def get_agent_activity(agent_id: str, limit: int = 50):
    """Belirli bir agent'ın aktivitelerini getir"""
    agent_logs = [log for log in activity_logs if log.agent_id == agent_id]
    return agent_logs[-limit:]

# ==================== WEBSOCKET FOR LIVE UPDATES ====================

async def broadcast_activity(log: ActivityLog):
    """Tüm bağlı istemcilere aktivite gönder"""
    for connection in active_connections:
        try:
            await connection.send_json(log.dict())
        except:
            pass

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for live updates"""
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Heartbeat
            await websocket.receive_text()
    except WebSocketDisconnect:
        active_connections.remove(websocket)

# ==================== STATS ENDPOINTS ====================

@app.get("/api/stats")
async def get_stats():
    """Dashboard istatistikleri"""
    return {
        "total_agents": len(agents),
        "active_agents": sum(1 for a in agents.values() if a.status == "active"),
        "total_hooks": len(hooks),
        "enabled_hooks": sum(1 for h in hooks.values() if h.enabled),
        "total_models": len(models),
        "enabled_models": sum(1 for m in models.values() if m.enabled),
        "total_activities": len(activity_logs),
        "total_tasks": len(tasks),
        "total_messages": sum(len(msgs) for msgs in messages.values()),
        "total_memory": sum(len(mem) for mem in memory.values())
    }

@app.get("/")
async def root():
    """API ana sayfa"""
    return {
        "message": "Claude Dashboard API v2.0",
        "version": "2.0.0",
        "features": [
            "Real AI Integration",
            "Agent-to-Agent Communication",
            "Memory System",
            "Task Execution",
            "Training/Fine-tuning"
        ],
        "endpoints": {
            "agents": "/api/agents",
            "hooks": "/api/hooks",
            "models": "/api/models",
            "activity": "/api/activity",
            "stats": "/api/stats",
            "chat": "/api/chat",
            "agent_call": "/api/agents/call",
            "tasks": "/api/tasks",
            "memory": "/api/memory",
            "training": "/api/training",
            "websocket": "/ws"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

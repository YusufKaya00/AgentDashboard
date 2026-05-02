"""
Background Agent - Arka Planda Çalışan AI Agent
Bu agent, arka planda görevleri işleyebilir ve LLM çağrıları yapabilir.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Callable
from llm import llm_client
from storage import StorageManager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class BackgroundAgent:
    """Arka planda çalışan AI Agent"""

    def __init__(
        self,
        agent_id: str,
        name: str,
        description: str,
        model: str = "claude-opus-4-7",
        system_prompt: Optional[str] = None
    ):
        self.agent_id = agent_id
        self.name = name
        self.description = description
        self.model = model
        self.system_prompt = system_prompt or f"Sen {name} adında bir AI ajanısın. Görevin: {description}"
        self.is_running = False
        self.task_queue = asyncio.Queue()
        self.worker_task = None

    async def start(self):
        """Agent'ı başlat"""
        if self.is_running:
            logger.warning(f"Agent {self.name} zaten çalışıyor")
            return

        self.is_running = True
        self.worker_task = asyncio.create_task(self._worker_loop())
        logger.info(f"Agent {self.name} başlatıldı")

    async def stop(self):
        """Agent'ı durdur"""
        if not self.is_running:
            return

        self.is_running = False
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
        logger.info(f"Agent {self.name} durduruldu")

    async def _worker_loop(self):
        """Ana worker döngüsü - görevleri sıradan alır ve işler"""
        while self.is_running:
            try:
                task = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
                await self._process_task(task)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Worker loop error: {e}")

    async def _process_task(self, task: Dict[str, Any]):
        """Tek bir görevi işle"""
        task_id = task.get("task_id", "unknown")
        task_type = task.get("type", "unknown")
        data = task.get("data", {})
        callback = task.get("callback")

        logger.info(f"Processing task {task_id} of type {task_type}")

        try:
            result = await self._execute_task(task_type, data)

            # Callback varsa çağır
            if callback:
                if asyncio.iscoroutinefunction(callback):
                    await callback(result)
                else:
                    callback(result)

            logger.info(f"Task {task_id} completed successfully")
        except Exception as e:
            logger.error(f"Task {task_id} failed: {e}")
            if callback:
                callback({"error": str(e)})

    async def _execute_task(self, task_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Görev tipine göre işlem yap"""

        if task_type == "chat":
            return await self._chat(data.get("message", ""), data.get("context", {}))

        elif task_type == "analyze":
            return await self._analyze(data.get("content", ""), data.get("options", {}))

        elif task_type == "code":
            return await self._generate_code(data.get("prompt", ""), data.get("context", {}))

        elif task_type == "custom":
            # Özel görev - doğrudan LLM çağrısı
            return await self._custom_llm_call(data.get("messages", []))

        else:
            raise ValueError(f"Unknown task type: {task_type}")

    async def _chat(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Sohbet görevi"""
        # Memory'den context al
        memory_list = StorageManager.get_memory(self.agent_id)
        # Listeyi sözlüğe çevir
        memory_dict = {}
        for item in memory_list:
            if isinstance(item, dict) and "key" in item:
                memory_dict[item["key"]] = item

        memory_context = "\n".join([f"- {k}: {v.get('value')}" for k, v in memory_dict.items()])

        # Mesajları hazırla
        messages = [
            {"role": "system", "content": f"{self.system_prompt}\n\nHAFIZA:\n{memory_context}"},
            {"role": "user", "content": message}
        ]

        # LLM çağrısı
        response = await llm_client.call_llm(messages, self.model)

        # Chat history'ye kaydet
        history = StorageManager.get_chat_history(self.agent_id)
        history.append({
            "id": str(datetime.now().timestamp()),
            "agent_id": self.agent_id,
            "role": "user",
            "content": message,
            "timestamp": datetime.now().isoformat()
        })
        history.append({
            "id": str(datetime.now().timestamp()) + ".1",
            "agent_id": self.agent_id,
            "role": "assistant",
            "content": response.get("message", ""),
            "timestamp": datetime.now().isoformat()
        })
        StorageManager.save_chat_history(self.agent_id, history)

        return {
            "response": response.get("message", ""),
            "tokens": response.get("tokens", 0),
            "model": self.model
        }

    async def _analyze(self, content: str, options: Dict[str, Any]) -> Dict[str, Any]:
        """Analiz görevi"""
        analysis_type = options.get("type", "general")

        prompt = f"""
        Aşağıdaki içeriği analiz et. Analiz tipi: {analysis_type}

        İçerik:
        {content}

        Lütfen detaylı bir analiz yap ve sonuçları JSON formatında döndür.
        """

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ]

        response = await llm_client.call_llm(messages, self.model)
        return {"analysis": response.get("message", "")}

    async def _generate_code(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Kod üretme görevi"""
        language = context.get("language", "python")

        code_prompt = f"""
        Aşağıdaki görev için {language} kodu yaz:

        Görev:
        {prompt}

        Lütfen sadece kod döndür, açıklama ekleme.
        """

        messages = [
            {"role": "system", "content": f"{self.system_prompt}\nSen uzman bir {language} geliştiricisisin."},
            {"role": "user", "content": code_prompt}
        ]

        response = await llm_client.call_llm(messages, self.model)
        return {"code": response.get("message", ""), "language": language}

    async def _custom_llm_call(self, messages: List[Dict[str, str]]) -> Dict[str, Any]:
        """Özel LLM çağrısı"""
        response = await llm_client.call_llm(messages, self.model)
        return response

    async def add_task(
        self,
        task_type: str,
        data: Dict[str, Any],
        callback: Optional[Callable] = None
    ) -> str:
        """Yeni görev ekle"""
        task_id = f"{task_type}_{datetime.now().timestamp()}"

        task = {
            "task_id": task_id,
            "type": task_type,
            "data": data,
            "callback": callback
        }

        await self.task_queue.put(task)
        logger.info(f"Task {task_id} added to queue")
        return task_id

    async def add_memory(self, key: str, value: Any):
        """Agent hafızasına bilgi ekle"""
        memory_list = StorageManager.get_memory(self.agent_id)
        # Listeyi sözlüğe çevir
        memory_dict = {}
        for item in memory_list:
            if isinstance(item, dict) and "key" in item:
                memory_dict[item["key"]] = item

        # Yeni bilgiyi ekle veya güncelle
        memory_dict[key] = {
            "key": key,
            "value": value,
            "updated_at": datetime.now().isoformat()
        }

        # Sözlüğü tekrar listeye çevir
        StorageManager.save_memory(self.agent_id, list(memory_dict.values()))
        logger.info(f"Memory added: {key}")

    def get_memory(self) -> Dict[str, Any]:
        """Agent hafızasını al"""
        memory_list = StorageManager.get_memory(self.agent_id)
        memory_dict = {}
        for item in memory_list:
            if isinstance(item, dict) and "key" in item:
                memory_dict[item["key"]] = item
        return memory_dict


class AgentManager:
    """Birden fazla background agent'ı yönetir"""

    def __init__(self):
        self.agents: Dict[str, BackgroundAgent] = {}

    def create_agent(
        self,
        agent_id: str,
        name: str,
        description: str,
        model: str = "claude-opus-4-7",
        system_prompt: Optional[str] = None
    ) -> BackgroundAgent:
        """Yeni agent oluştur"""
        agent = BackgroundAgent(agent_id, name, description, model, system_prompt)
        self.agents[agent_id] = agent
        return agent

    def get_agent(self, agent_id: str) -> Optional[BackgroundAgent]:
        """Agent al"""
        return self.agents.get(agent_id)

    async def start_agent(self, agent_id: str):
        """Agent'ı başlat"""
        agent = self.get_agent(agent_id)
        if agent:
            await agent.start()

    async def stop_agent(self, agent_id: str):
        """Agent'ı durdur"""
        agent = self.get_agent(agent_id)
        if agent:
            await agent.stop()

    async def stop_all(self):
        """Tüm agent'ları durdur"""
        for agent in self.agents.values():
            await agent.stop()


# Global agent manager instance
agent_manager = AgentManager()


# Örnek kullanım
async def example_usage():
    """Örnek kullanım"""

    # Agent oluştur
    agent = agent_manager.create_agent(
        agent_id="worker-1",
        name="Code Assistant",
        description="Kod yazma ve analiz işlerinden sorumlu",
        model="claude-opus-4-7"
    )

    # Agent'ı başlat
    await agent.start()

    # Görev ekle
    def callback(result):
        print(f"Sonuç: {result}")

    await agent.add_task(
        task_type="chat",
        data={"message": "Merhaba, nasılsın?"},
        callback=callback
    )

    # Biraz bekle
    await asyncio.sleep(2)

    # Agent'ı durdur
    await agent.stop()


if __name__ == "__main__":
    asyncio.run(example_usage())

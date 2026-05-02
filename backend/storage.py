import json
import os
from typing import Dict, List, Any
import logging

# Define storage directory
STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.claude')

# Ensure storage directory exists
if not os.path.exists(STORAGE_DIR):
    os.makedirs(STORAGE_DIR)

def _get_file_path(filename: str) -> str:
    return os.path.join(STORAGE_DIR, filename)

def read_json(filename: str, default: Any) -> Any:
    path = _get_file_path(filename)
    if not os.path.exists(path):
        return default
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Eğer beklenen liste ise ama sözlük geldiyse listeye çevir (koruma)
            if isinstance(default, list) and isinstance(data, dict):
                return list(data.values())
            return data
    except Exception as e:
        logging.error(f"Error reading {filename}: {e}")
        return default

def write_json(filename: str, data: Any):
    path = _get_file_path(filename)
    try:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logging.error(f"Error writing {filename}: {e}")

class StorageManager:
    @staticmethod
    def get_agents() -> List[dict]:
        return read_json('agents.json', [])

    @staticmethod
    def save_agents(agents: List[dict]):
        write_json('agents.json', agents)

    @staticmethod
    def get_hooks() -> List[dict]:
        return read_json('hooks.json', [])

    @staticmethod
    def save_hooks(hooks: List[dict]):
        write_json('hooks.json', hooks)

    @staticmethod
    def get_models() -> List[dict]:
        return read_json('models.json', [])

    @staticmethod
    def save_models(models: List[dict]):
        write_json('models.json', models)

    @staticmethod
    def get_activity() -> List[dict]:
        return read_json('activity.json', [])

    @staticmethod
    def log_activity(agent_id: str, message: str, log_type: str = "info") -> dict:
        import uuid
        from datetime import datetime
        log = {
            "id": str(uuid.uuid4()),
            "agent_id": agent_id,
            "type": log_type,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "metadata": {}
        }
        logs = StorageManager.get_activity()
        logs.append(log)
        StorageManager.save_activity(logs)
        return log

    @staticmethod
    def save_activity(activity: List[dict]):
        write_json('activity.json', activity[-1000:])  # Keep last 1000 logs

    @staticmethod
    def get_chat_history(agent_id: str) -> List[dict]:
        return read_json(f'chat_{agent_id}.json', [])

    @staticmethod
    def save_chat_history(agent_id: str, history: List[dict]):
        write_json(f'chat_{agent_id}.json', history)

    @staticmethod
    def get_memory(agent_id: str) -> List[dict]:
        return read_json(f'memory_{agent_id}.json', [])

    @staticmethod
    def save_memory(agent_id: str, memory: List[dict]):
        write_json(f'memory_{agent_id}.json', memory)

    @staticmethod
    def get_tasks() -> List[dict]:
        return read_json('tasks.json', [])

    @staticmethod
    def save_tasks(tasks: List[dict]):
        write_json('tasks.json', tasks)
    
    @staticmethod
    def save_task(task: dict):
        tasks = StorageManager.get_tasks()
        # Update or add task
        found = False
        for i, t in enumerate(tasks):
            if t['id'] == task['id']:
                tasks[i] = task
                found = True
                break
        if not found:
            tasks.append(task)
        StorageManager.save_tasks(tasks)

    @staticmethod
    def get_training(agent_id: str) -> List[dict]:
        return read_json(f'training_{agent_id}.json', [])

    @staticmethod
    def save_training(agent_id: str, training: List[dict]):
        write_json(f'training_{agent_id}.json', training)

    @staticmethod
    def get_skills() -> List[dict]:
        return read_json('skills.json', [])

    @staticmethod
    def save_skills(skills: List[dict]):
        write_json('skills.json', skills)

    @staticmethod
    def get_all_chat_logs() -> List[dict]:
        all_logs = []
        storage_dir = STORAGE_DIR
        if os.path.exists(storage_dir):
            for filename in os.listdir(storage_dir):
                if filename.startswith('chat_') and filename.endswith('.json'):
                    agent_id = filename[5:-5]
                    chat_history = read_json(filename, [])
                    for msg in chat_history:
                        msg['agent_id'] = agent_id
                        all_logs.append(msg)
        return all_logs

    @staticmethod
    def get_system_status() -> dict:
        import psutil
        import platform
        from datetime import datetime

        status = {
            "timestamp": datetime.now().isoformat(),
            "system": {
                "platform": platform.system(),
                "platform_version": platform.version(),
                "python_version": platform.python_version(),
            },
            "resources": {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage(STORAGE_DIR).percent,
            },
            "storage": {
                "agents_count": len(StorageManager.get_agents()),
                "skills_count": len(StorageManager.get_skills()),
                "hooks_count": len(StorageManager.get_hooks()),
                "models_count": len(StorageManager.get_models()),
                "tasks_count": len(StorageManager.get_tasks()),
                "activity_count": len(StorageManager.get_activity()),
            }
        }
        return status

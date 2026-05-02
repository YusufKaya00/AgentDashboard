import os
import json
import logging
import httpx
import asyncio
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from tools import FileTools

load_dotenv()

class LLMClient:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "freecc")
        self.base_url = "http://127.0.0.1:8082/v1/messages?beta=true"
        self.timeout = httpx.Timeout(300.0, connect=10.0)
        self.file_tools = FileTools()

    async def call_llm(self, messages: List[Dict[str, str]], model: Optional[str] = None, max_steps: int = 5) -> Dict[str, Any]:
        target_model = model or "claude-3-5-sonnet-20241022"
        if "opus" in target_model.lower():
            target_model = "claude-3-opus-20240229"

        current_messages = list(messages)
        
        for step in range(max_steps):
            # 1. LLM'e Sor
            response = await self._raw_call(current_messages, target_model)
            if response.get("status") == "error":
                return response

            content = response["message"]
            
            # 2. Tool Çağrısı Var mı Kontrol Et (Basit JSON yakalama)
            try:
                # Metin içindeki JSON bloğunu bul
                import re
                json_match = re.search(r'```json\s*(\{.*?\})\s*```', content, re.DOTALL)
                if not json_match:
                    # JSON blok içinde değilse direkt metin olarak ara
                    json_match = re.search(r'(\{.*?"tool".*?\})', content, re.DOTALL)

                if json_match:
                    tool_call = json.loads(json_match.group(1))
                    tool_name = tool_call.get("tool")
                    args = tool_call.get("arguments", {})

                    logging.error(f"EXECUTING TOOL: {tool_name} with {args}")
                    
                    # Tool'u çalıştır
                    result = ""
                    if tool_name == "list_files":
                        result = self.file_tools.list_files(args.get("path", "."))
                    elif tool_name == "read_file":
                        result = self.file_tools.read_file(args.get("path", ""))
                    elif tool_name == "write_file":
                        result = self.file_tools.write_file(args.get("path", ""), args.get("content", ""))
                    
                    # Sonucu mesaj geçmişine ekle ve tekrar LLM'i çağır
                    current_messages.append({"role": "assistant", "content": content})
                    current_messages.append({"role": "user", "content": f"TOOL_RESULT: {json.dumps(result)}"})
                    
                    # Aktiviteyi main.py üzerinden loglamak için bir işaret bırakabiliriz 
                    # (Şimdilik terminalden takip edebilirsiniz)
                    continue 
                else:
                    # Tool çağrısı yoksa final cevabı dön
                    return response

            except Exception as e:
                logging.error(f"Tool Execution Error: {str(e)}")
                return {"message": content, "timestamp": "now"} # Hata olsa da en azından metni dön

        return response

    async def _raw_call(self, messages: List[Dict[str, str]], target_model: str) -> Dict[str, Any]:
        system_prompt = ""
        user_messages = []
        for m in messages:
            if m["role"] == "system":
                system_prompt = m["content"]
            else:
                user_messages.append({"role": m["role"], "content": m["content"]})

        headers = {
            "anthropic-auth-token": self.api_key,
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
            "accept": "text/event-stream"
        }

        payload = {
            "model": target_model,
            "max_tokens": 4096,
            "messages": user_messages,
            "system": system_prompt,
            "stream": True
        }

        full_content = ""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                async with client.stream("POST", self.base_url, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        return {"message": f"Hata ({response.status_code})", "status": "error"}

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "): continue
                        data_str = line[6:].strip()
                        if data_str == "[DONE]": break
                        try:
                            data_json = json.loads(data_str)
                            if "delta" in data_json and "text" in data_json["delta"]:
                                full_content += data_json["delta"]["text"]
                            elif "content_block" in data_json and "text" in data_json["content_block"]:
                                full_content += data_json["content_block"]["text"]
                        except: continue

                return {"message": full_content, "timestamp": "now"}
        except Exception as e:
            return {"message": f"Bağlantı Hatası: {str(e)}", "status": "error"}

llm_client = LLMClient()

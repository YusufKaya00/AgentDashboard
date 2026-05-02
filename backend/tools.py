import os
import shutil
from typing import List, Dict, Any

class FileTools:
    @staticmethod
    def list_files(directory: str = ".") -> List[str]:
        """Proje dizinindeki dosyaları listeler."""
        try:
            files = []
            for root, dirs, filenames in os.walk(directory):
                # .git, node_modules, venv gibi klasörleri atla
                dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', 'venv', '__pycache__', '.claude']]
                for filename in filenames:
                    files.append(os.path.relpath(os.path.join(root, filename), directory))
            return files
        except Exception as e:
            return [f"Hata: {str(e)}"]

    @staticmethod
    def read_file(file_path: str) -> str:
        """Belirtilen dosyanın içeriğini okur."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            return f"Hata: Dosya okunamadı - {str(e)}"

    @staticmethod
    def write_file(file_path: str, content: str) -> str:
        """Dosyaya içerik yazar veya günceller."""
        try:
            # Klasör yoksa oluştur
            os.makedirs(os.path.dirname(os.path.abspath(file_path)), exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return f"Başarılı: {file_path} güncellendi."
        except Exception as e:
            return f"Hata: Dosya yazılamadı - {str(e)}"

# Ajanların kullanabileceği araçların listesi (JSON formatında LLM'e gönderilecek)
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "list_files",
            "description": "Proje dizinindeki tüm dosyaları listeler. Hangi dosyaların olduğunu görmek için kullanılır.",
            "parameters": {
                "type": "object",
                "properties": {
                    "directory": {"type": "string", "description": "Listelenecek dizin (varsayılan: .)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Bir dosyanın içeriğini okur. Kod değişikliği yapmadan önce mevcut kodu anlamak için kullanılır.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Okunacak dosyanın yolu"}
                },
                "required": ["file_path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Yeni bir dosya oluşturur veya mevcut dosyayı günceller.",
            "parameters": {
                "type": "object",
                "properties": {
                    "file_path": {"type": "string", "description": "Yazılacak dosyanın yolu"},
                    "content": {"type": "string", "description": "Dosyanın tam yeni içeriği"}
                },
                "required": ["file_path", "content"]
            }
        }
    }
]

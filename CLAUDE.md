# Claude Dashboard v2.2

AI Agent Yönetim ve İzleme Sistemi - **Full Functional Edition**

## 📋 Proje Hakkında

Claude Dashboard, sadece bir arayüz değil, tamamen fonksiyonel bir AI Agent yönetim sistemidir. Sistem gerçek AI modellerine bağlanabilir, verileri kalıcı olarak saklayabilir ve karmaşık ajan hiyerarşilerini yönetebilir.

## 🎯 Özellikler

### 💾 Kalıcı Veri Saklama (Persistent Storage)
- Tüm veriler (Ajanlar, Mesajlar, Hafıza, Görevler, Skiller, Hooklar) `.claude/` klasöründe saklanır.
- Sunucu kapansa bile verileriniz güvenle korunur.
- JSON tabanlı dosya sistemi ile kolay yedekleme ve düzenleme imkanı.

### 🧠 Gerçek AI Entegrasyonu (LLM Engine)
- **Nvidia NIM** ve **OpenAI** uyumlu API desteği.
- Dinamik model yapılandırması: Her ajan farklı bir model veya sağlayıcıyı kullanabilir.
- Önceden tanımlanmış Claude Opus, Sonnet ve Haiku desteği.

### 🤖 Background Agent Sistemi
- **CLI'dan Agent Oluşturma:** Komut satırından agent oluşturabilirsiniz.
- **Task Kuyruğu:** Agent'lar arka planda görevleri işler.
- **Canlı İletişim:** Agent'larla sohbet edebilirsiniz.
- **Memory Sistemi:** Agent'lar hafızalarını korur.

### ⚡ Gelişmiş Hook Sistemi
- **Pre-Request:** İstek gönderilmeden önce tetiklenir.
- **Post-Response:** Yanıt alındıktan sonra otomatik işlemler için tetiklenir.
- **Error Hooks:** Hata durumlarında tetiklenir.
- **Activity Stream:** Tüm hook aktiviteleri canlı akışta izlenebilir.

### 🎨 Claude Tasarım Dili (Theme)
- **Dark Mode:** Derin siyah ve antrasit tonları.
- **Claude Orange:** Vurgu rengi olarak Claude turuncusu (`#d97757`).
- **Premium UI:** Glassmorphism etkileri, yumuşak geçişler ve Inter font ailesi.

### 📊 Dashboard Özellikleri
- **Agent Summary:** Kaç ajan var, modelleri neler, durumları nasıl.
- **System Status:** CPU, Memory, Disk kullanımı.
- **Activity Feed:** Canlı aktivite akışı.
- **Chat Logs:** Tüm sohbet geçmişi.
- **Skill Manager:** Skill ekleme, silme, toggle.
- **Hook Manager:** Hook oluşturma, silme, toggle.

## 🏗️ Teknik Mimari

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Frontend)                   │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Next.js + Tailwind CSS (Claude Theme)            │  │
│  │  - Real-time updates via WebSockets               │  │
│  │  - Agent & Memory Management UI                   │  │
│  │  - Background Agent Control                       │  │
│  └───────────────────────────────────────────────────┘  │
│                        │ HTTP / WS                     │
│                        ▼                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  FastAPI Backend (Python)                         │  │
│  │  - API Endpoints (Chat, Memory, Tasks, etc.)      │  │
│  │  - Storage Manager (JSON persistence)             │  │
│  │  - LLM Client (OpenAI/Nvidia NIM integration)     │  │
│  │  - Background Agent Manager                       │  │
│  │  - Skill Manager                                 │  │
│  │  - Hook Manager                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                        │                               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Local File System (.claude/)                     │  │
│  │  - agents.json, models.json                       │  │
│  │  - skills.json, hooks.json                        │  │
│  │  - memory_{id}.json, chat_{id}.json               │  │
│  │  - activity.json, tasks.json                      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Hızlı Başlangıç

### 1. Yapılandırma
`claude-dashboard/backend/.env` dosyasını açın ve API key'inizi girin:
```env
OPENAI_API_KEY=nvapi-your-key-here
OPENAI_BASE_URL=https://integrate.api.nvidia.com/v1
```

### 2. Backend Başlatma
```bash
cd claude-dashboard/backend
python main.py
```

Backend şu portta çalışır: `http://localhost:8000`

### 3. Frontend Başlatma
```bash
cd claude-dashboard
npm run dev
```

Frontend şu portta çalışır: `http://localhost:3000`

## 📚 Kullanım Klavuzu

### Dashboard Sayfaları

| Sayfa | Açıklama |
|-------|----------|
| **Dashboard** | Ana panel, agent özeti ve canlı aktivite |
| **Agents** | Tüm agent'ları görüntüleme ve yönetme |
| **Chat** | Agent'larla sohbet etme |
| **Skills** | Skill ekleme, silme, toggle |
| **Chat Logs** | Tüm sohbet geçmişi |
| **System** | Sistem durumu ve kaynak kullanımı |
| **Tasks** | Görev yönetimi |
| **Memory** | Agent hafıza yönetimi |
| **Training** | Agent eğitimi |
| **Hooks** | Hook oluşturma ve yönetme |
| **Models** | Model yapılandırması |
| **Activity** | Aktivite logları |

### Agent Oluşturma (Dashboard)
1. **Agents** sekmesine gidin.
2. **+ Add Agent** butonuna basın.
3. Model olarak listeden birini seçin.
4. Durumu **Active** yapın.

### Agent Oluşturma (CLI)
```bash
# PowerShell
$body = @{
    name = "My Agent"
    description = "My custom agent"
    model = "claude-opus-4-7"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/agents/background" -Method Post -Body $body -ContentType "application/json"
```

### Background Agent Kullanımı

#### Agent Başlatma
```bash
Invoke-RestMethod -Uri "http://localhost:8000/api/agents/background/{agent_id}/start" -Method Post
```

#### Task Gönderme
```bash
$body = @{
    type = "chat"
    data = @{
        message = "Merhaba!"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/agents/background/{agent_id}/task" -Method Post -Body $body -ContentType "application/json"
```

#### Chat History Görüntüleme
```bash
Invoke-RestMethod -Uri "http://localhost:8000/api/agents/background/{agent_id}/chat" -Method Get
```

#### Memory Ekleme
```bash
$body = @{
    key = "user_name"
    value = "Yusuf"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/api/agents/background/{agent_id}/memory" -Method Post -Body $body -ContentType "application/json"
```

### Hafıza (Memory) Kullanımı
- **Key:** Ajana bir isim veya kavram öğretmek için kullanılır (Örn: `proje_sahibi`).
- **Value:** Ajana hatırlatılacak bilgi (Örn: `Yusuf Kaya`).
- Bu bilgiler her sohbette ajana otomatik olarak hatırlatılır.

### Skill Kullanımı
- **Skill Ekleme:** Skills sekmesinden yeni skill ekleyebilirsiniz.
- **Skill Toggle:** Skill'leri açıp kapatabilirsiniz.
- **Skill Silme:** Artık kullanmadığınız skill'leri silebilirsiniz.

### Hook Kullanımı
- **Hook Oluşturma:** Hooks sekmesinden yeni hook oluşturabilirsiniz.
- **Hook Types:** Pre, Post, Error
- **Hook Toggle:** Hook'ları açıp kapatabilirsiniz.

## 🔧 API Endpoint'leri

### Agents
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/agents` | GET | Tüm agent'ları listele |
| `/api/agents` | POST | Agent oluştur |
| `/api/agents/{id}` | PUT | Agent güncelle |
| `/api/agents/{id}` | DELETE | Agent sil |
| `/api/agents/summary` | GET | Agent özeti |

### Background Agents
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/agents/background` | GET | Tüm background agent'ları listele |
| `/api/agents/background` | POST | Background agent oluştur |
| `/api/agents/background/{id}/start` | POST | Agent'ı başlat |
| `/api/agents/background/{id}/stop` | POST | Agent'ı durdur |
| `/api/agents/background/{id}/task` | POST | Task gönder |
| `/api/agents/background/{id}/chat` | GET | Chat history |
| `/api/agents/background/{id}/memory` | GET | Agent hafızası |
| `/api/agents/background/{id}/memory` | POST | Memory ekle |

### Skills
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/skills` | GET | Tüm skill'leri listele |
| `/api/skills` | POST | Skill oluştur |
| `/api/skills/{id}` | PUT | Skill güncelle |
| `/api/skills/{id}` | DELETE | Skill sil |
| `/api/skills/{id}/toggle` | POST | Skill toggle |
| `/api/skills/stats` | GET | Skill istatistikleri |

### Hooks
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/hooks` | GET | Tüm hook'ları listele |
| `/api/hooks` | POST | Hook oluştur |
| `/api/hooks/{id}` | DELETE | Hook sil |
| `/api/hooks/{id}/toggle` | POST | Hook toggle |

### Models
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/models` | GET | Tüm modelleri listele |
| `/api/models` | POST | Model oluştur |
| `/api/models/{id}` | DELETE | Model sil |

### Chat & Activity
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/chats/all` | GET | Tüm chat logları |
| `/api/chats/{agent_id}` | GET | Agent chat logları |
| `/api/activity` | GET | Aktivite logları |
| `/api/activities/detailed` | GET | Detaylı aktiviteler |

### System
| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/stats` | GET | İstatistikler |
| `/api/system/status` | GET | Sistem durumu |

### WebSocket
| Endpoint | Açıklama |
|----------|----------|
| `/ws` | Canlı aktivite akışı |

## 🎨 Tasarım ve Stil (Premium Dark & Orange)
- Sistem, Claude'un estetik dilini temel alan siyah-turuncu bir temaya sahiptir.
- Emojiler sadeleştirilmiş ve modern bir hover efektiyle güçlendirilmiştir.
- Tipografi: Inter font ailesi ile temiz ve okunabilir yapı.

## 🔧 Dosya Yapısı

```
claude-dashboard/
├── backend/
│   ├── main.py              # API ve iş mantığı
│   ├── storage.py           # Veri saklama motoru
│   ├── llm.py               # AI bağlantı motoru
│   ├── background_agent.py  # Background agent sistemi
│   ├── skill_manager.py     # Skill yöneticisi
│   ├── chat_handler.py      # Chat işleyici
│   ├── tools.py             # Araçlar
│   └── .env                 # Yapılandırma
├── src/
│   ├── app/
│   │   ├── page.tsx         # Ana sayfa
│   │   └── layout.tsx       # Layout
│   ├── components/
│   │   ├── DashboardLayout.tsx
│   │   ├── AgentList.tsx
│   │   ├── AgentSummary.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── ChatLogs.tsx
│   │   ├── SkillManager.tsx
│   │   ├── HookList.tsx
│   │   ├── ModelList.tsx
│   │   ├── ActivityFeed.tsx
│   │   ├── SystemStatus.tsx
│   │   ├── TaskManager.tsx
│   │   ├── MemoryManager.tsx
│   │   └── TrainingInterface.tsx
│   ├── lib/
│   │   └── api.ts           # API client
│   └── types/
│       └── index.ts         # TypeScript tipleri
└── .claude/                 # Veri saklama
    ├── agents.json
    ├── models.json
    ├── skills.json
    ├── hooks.json
    ├── activity.json
    ├── tasks.json
    ├── chat_{id}.json
    └── memory_{id}.json
```

## 🔄 Canlı Güncellemeler

WebSocket üzerinden canlı güncellemeler alabilirsiniz:
- Agent oluşturma/silme
- Task tamamlanma
- Activity logları
- Hook/Skill değişiklikleri

## 📝 Örnek Kullanım Senaryosu

1. **Agent Oluştur:**
   ```bash
   # CLI'dan agent oluştur
   $body = @{
       name = "Code Assistant"
       description = "Kod yazma işlerinden sorumlu"
       model = "claude-opus-4-7"
   } | ConvertTo-Json
   Invoke-RestMethod -Uri "http://localhost:8000/api/agents/background" -Method Post -Body $body -ContentType "application/json"
   ```

2. **Agent'ı Başlat:**
   ```bash
   Invoke-RestMethod -Uri "http://localhost:8000/api/agents/background/{agent_id}/start" -Method Post
   ```

3. **Task Gönder:**
   ```bash
   $body = @{
       type = "code"
       data = @{
           prompt = "Python'da bir REST API yaz"
           context = @{
               language = "python"
           }
       }
   } | ConvertTo-Json
   Invoke-RestMethod -Uri "http://localhost:8000/api/agents/background/{agent_id}/task" -Method Post -Body $body -ContentType "application/json"
   ```

4. **Sonucu Görüntüle:**
   ```bash
   Invoke-RestMethod -Uri "http://localhost:8000/api/agents/background/{agent_id}/chat" -Method Get
   ```

5. **Dashboard'da Takip Et:**
   - http://localhost:3000 adresine gidin
   - Activity sekmesinden canlı aktiviteleri izleyin
   - Chat Logs sekmesinden tüm sohbetleri görüntüleyin

---
**Claude Dashboard v2.2** - Built with ❤️ for AI Agent Ecosystem

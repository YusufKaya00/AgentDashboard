# Claude Dashboard

AI Agent Yönetim ve İzleme Sistemi - Kullandığınız tüm AI modelleri için kapsamlı bir dashboard.

## Özellikler

- 🤖 **Agent Yönetimi** - Agent oluşturma, düzenleme, silme ve aktifleştirme
- ⚡ **Hook Yönetimi** - Pre, Post ve Error hook'ları oluşturma ve yönetme
- 🧠 **Model Yönetimi** - Anthropic, OpenAI, Codex, Antigravity ve custom modeller ekleme
- 📊 **Canlı İzleme** - WebSocket ile gerçek zamanlı aktivite akışı
- 📝 **Aktivite Logları** - Tüm işlemlerin detaylı logları

## Kurulum

### Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows için
pip install -r requirements.txt
python main.py
```

Backend `http://localhost:8000` adresinde çalışacaktır.

### Frontend (Next.js)

```bash
npm install
npm run dev
```

Frontend `http://localhost:3000` adresinde çalışacaktır.

## API Endpoints

### Agents
- `GET /api/agents` - Tüm agentları listele
- `GET /api/agents/{id}` - Tek bir agent getir
- `POST /api/agents` - Yeni agent oluştur
- `PUT /api/agents/{id}` - Agent güncelle
- `DELETE /api/agents/{id}` - Agent sil
- `POST /api/agents/{id}/activate` - Agent'ı aktifleştir
- `POST /api/agents/{id}/deactivate` - Agent'ı deaktifleştir

### Hooks
- `GET /api/hooks` - Tüm hook'ları listele
- `GET /api/hooks/{id}` - Tek bir hook getir
- `POST /api/hooks` - Yeni hook oluştur
- `PUT /api/hooks/{id}` - Hook güncelle
- `DELETE /api/hooks/{id}` - Hook sil
- `POST /api/hooks/{id}/toggle` - Hook'ı aç/kapat

### Models
- `GET /api/models` - Tüm modelleri listele
- `GET /api/models/{id}` - Tek bir model getir
- `POST /api/models` - Yeni model ekle
- `PUT /api/models/{id}` - Model güncelle
- `DELETE /api/models/{id}` - Model sil
- `POST /api/models/{id}/toggle` - Modeli aç/kapat

### Activity
- `GET /api/activity` - Aktivite loglarını getir
- `GET /api/activity/agent/{id}` - Agent aktivitelerini getir

### Stats
- `GET /api/stats` - Dashboard istatistikleri

### WebSocket
- `WS /ws` - Canlı aktivite akışı

## Agent Nedir?

Agent, AI modellerini kullanarak belirli görevleri yerine getiren otonom yazılım bileşenleridir. Her agent:

- **Model**: Kullandığı AI modeli (Claude, GPT-4, vb.)
- **Config**: Model parametreleri (temperature, max_tokens, vb.)
- **Status**: Aktif, pasif veya hata durumu
- **Activity**: Son aktivite zamanı

## Hook Nedir?

Hook'lar, agent işlemlerinde belirli noktalarda çalışan otomatik eylemlerdir:

- **Pre Hook**: Agent isteği öncesi çalışır (loglama, doğrulama)
- **Post Hook**: Agent yanıtı sonrası çalışır (analiz, kaydetme)
- **Error Hook**: Hata durumunda çalışır (alert gönderme, loglama)

## Desteklenen Modeller

- Anthropic (Claude Opus, Claude Sonnet)
- OpenAI (GPT-4, GPT-3.5)
- Codex
- Antigravity
- Custom API'ler

## Geliştirme

### Backend Bağımlılıkları

```bash
fastapi
uvicorn
websockets
pydantic
python-multipart
aiofiles
```

### Frontend Bağımlılıkları

```bash
next
react
react-dom
typescript
tailwindcss
```

## Lisans

MIT

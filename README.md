# Tnega Multi-Agent Control Plane & Dashboard

Tnega, AI ajanları (Antigravity Core, Claude Code, Codex Engine) ve diğer özel modeller için geliştirilmiş merkezi bir **Yönetim, İzleme ve Kontrol Paneli (Control Plane)** sistemidir.

---

## 🚀 Öne Çıkan Özellikler

- 🤖 **Merkezi Ajan Yönetimi** - Antigravity Core, Codex ve Claude Code ajanlarının konfigürasyonlarını, rollerini ve durumlarını tek merkezden izleyin ve düzenleyin.
- 📂 **Global Konfigürasyon Depolama** - Tüm ajan ayarları, yetenekleri (skills) ve kontrol paneli verileri global olarak `~/.gemini/antigravity/` dizininde saklanır.
- ⚡ **Otomatik Git ve Dosya Hook Motoru (New)** - Kod tabanınızdaki değişiklikleri otomatik inceleyen ajan tetikleyicileri.
  - **Git Entegrasyonu**: Sunucu başladığında `.git/hooks/pre-commit` ve `.git/hooks/pre-push` dosyaları otomatik olarak kurulur.
  - **Olay Tetikleyicileri (Triggers)**: `git.push` (Push öncesi), `git.commit` (Commit öncesi) ve `file.change` (Debounced dosya değişiklik izleme).
  - **Ajan Bazlı Kod İnceleme**: Bir hook tetiklendiğinde `git diff` otomatik olarak alınır ve seçilen ajana (Antigravity, Claude Code veya Codex) inceleme komutu olarak gönderilir.
- 📊 **Detaylı Sistem Sağlık & Kaynak Telemetrisi** - CPU, RAM kullanımı ve aktif ajan sayılarının anlık takibi.
- 🔌 **Merkezi MCP Entegrasyonu** - Ajanların kullandığı araçları (MCP) yönetin ve diğer editörleriniz (Cursor, VS Code vb.) için ortak araç defteri olarak kullanın.

---

## 🛠️ Kurulum ve Çalıştırma

### Backend (Node.js & Express)

Backend sunucusu Express ve WebSocket tabanlı çalışır. Terminal ve dosya izleme yeteneklerine sahiptir.

```bash
cd backend-node
npm install
npm run dev
```

Sunucu varsayılan olarak `http://localhost:8000` portundan çalışır ve ilk açılışta `.git/hooks/` dizinine Tnega Hook tetikleyicilerini yerleştirir.

### Frontend (Next.js)

```bash
npm install
npm run dev
```

Dashboard arayüzü `http://localhost:3000` adresinden açılacaktır.

---

## 🔗 Otomatik Hook Sistemi Nasıl Çalışır?

1. **Hook Kaydı**: Dashboard üzerindeki **System Hooks** sekmesinden yeni bir hook oluşturun.
2. **Parametreleri Belirleyin**:
   - **Trigger Event**: Hangi olayda tetikleneceği (`git.push`, `git.commit` veya `file.change`).
   - **Executor Agent**: Hangi ajanın çalışacağı (Antigravity Core, Claude Code, Codex veya Yok/Doğrudan Shell Komutu).
   - **Action / Prompt**: Ajanın yapacağı inceleme talimatı (örn: *"Kod değişikliklerini güvenlik ve performans açısından denetle"*).
3. **Otomatik Tetiklenme**: Terminalinizden `git commit` veya `git push` yaptığınızda ya da bir dosyayı değiştirdiğinizde, ilgili ajan arka planda `git diff` çıktısını alarak belirttiğiniz talimatla birlikte çalıştırılır ve inceleme sonuçları dashboard aktivite geçmişine canlı olarak yansıtılır.

---

## 🛡️ Lisans

MIT

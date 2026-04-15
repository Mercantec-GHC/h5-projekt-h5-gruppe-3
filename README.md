# H5 Projekt – Gruppe 3

## 📌 Beskrivelse
Dette projekt er et IoT-system, der måler lysniveau (lux) fra en sensor (Arduino), sender data via MQTT, analyserer det i en backend og gemmer resultaterne i en PostgreSQL database.

Systemet vurderer om lysniveauet er passende afhængigt af tidspunktet på dagen og giver en anbefaling.

---

## 🧱 Arkitektur

Arduino (sensor)  
↓  
MQTT (Mosquitto broker)  
↓  
Node.js ingestion service  
↓  
PostgreSQL database  
↓  
Frontend (Next.js)

---

## ⚙️ Teknologier

- Docker & Docker Compose  
- Node.js (backend)  
- Mosquitto (MQTT broker)  
- PostgreSQL (database)  
- Adminer (database UI)
- Next.js (frontend)

---

## 🚀 Start projektet

Kør følgende i projektmappen:

```bash
docker compose up -d --build
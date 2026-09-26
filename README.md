# 🌦️ Mausam AI+
> An adaptive, persona-based weather intelligence app built with Expo (React Native) + FastAPI.

---

## 📱 Features
- **8 Smart Personas** — Fitness, Health, Commuter, Agriculture, Traveler, Beach/Surf, Family, Event Planner
- **AI-Derived Widgets** — Best running time, route weather, packing guide, comfort index, and more
- **Onboarding Flow** — Name, auto-detect location, persona selection
- **Travel Mode** — Enter a destination to see route weather comparisons (Start → En Route → End)
- **Glassmorphic UI** — Frosted glass cards, staggered animations, gradient backgrounds
- **Real Weather API** — OpenWeatherMap integration with SQLite cache (swappable to PostgreSQL)

---

## 🗂️ Project Structure
```
MauamAI/
├── backend/          # FastAPI Python backend
│   ├── main.py
│   ├── database.py
│   ├── weather_api.py
│   ├── scoring_engine.py
│   └── .env.example
└── frontend/         # Expo / React Native app
    ├── src/app/index.tsx
    ├── src/components/
    ├── app.json
    └── .env
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- Expo Go app on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

---

### 1️⃣ Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy httpx pydantic psycopg2-binary python-multipart

# Copy env file and set your values
copy .env.example .env
```

Edit `.env`:
```
WEATHER_API_KEY=your_openweathermap_api_key   # optional, uses mock if not set
DATABASE_URL=sqlite:///./mausam.db             # or your PostgreSQL URL
```

Start the backend:
```bash
# Find your local IP first (run ipconfig on Windows, ifconfig on Mac)
.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload
```

---

### 2️⃣ Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set your backend URL
# Edit frontend/.env  →  BACKEND_URL=http://YOUR_LOCAL_IP:8000
# Also update app.json → "extra" → "backendUrl"
# Also update src/app/index.tsx → search for 192.168.1.36 and replace with your IP
```

> **💡 Find your local IP:**
> - Windows: run `ipconfig` → look for **IPv4 Address** under your Wi-Fi adapter
> - Mac/Linux: run `ifconfig` → look for `inet` under `en0`

Start the app:
```bash
npm start
```

Scan the QR code with **Expo Go** on your phone. Make sure your phone and PC are on the **same Wi-Fi network**.

---

## 🔑 Getting a Free OpenWeatherMap API Key
1. Go to [openweathermap.org](https://openweathermap.org/api)
2. Sign up for free → go to **API Keys**
3. Copy your key and paste it in `backend/.env` as `WEATHER_API_KEY`

Without a key, the app uses **realistic mock weather data** automatically.

---

## 🤝 Contributing / Suggesting Changes
1. Fork this repo
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Push and open a **Pull Request** — describe what you changed and why

---

## 📋 Team Checklist (for each team member)
- [ ] Clone the repo
- [ ] Set up Python venv and install backend deps
- [ ] Run `npm install` in `frontend/`
- [ ] Find your local IP and update it in `frontend/src/app/index.tsx` and `app.json`
- [ ] Start backend: `.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload`
- [ ] Start frontend: `npm start` inside `frontend/`
- [ ] Scan QR code with Expo Go

---

## 🏗️ Tech Stack
| Layer | Technology |
|---|---|
| Mobile/Web Frontend | Expo (React Native), TypeScript |
| Backend API | FastAPI (Python) |
| Database | SQLite (default) / PostgreSQL |
| Weather Data | OpenWeatherMap API |
| Animations | React Native Animated API |
| Styling | StyleSheet, expo-linear-gradient |

# 🌦️ Mausam AI+
> **Adaptive, persona-based weather intelligence app** — your weather, your way.

[![Backend](https://img.shields.io/badge/Backend-Live%20on%20Railway-success)](https://mauamai-production.up.railway.app)
[![Landing Page](https://img.shields.io/badge/Landing%20Page-Vercel-black)](https://mauamai.vercel.app)
[![Android APK](https://img.shields.io/badge/Download-APK%20v1.0.0-blue)](https://github.com/Code-Ninja007/MauamAI/releases/download/v1.0.0/app-release.apk)
[![GitHub Repo](https://img.shields.io/badge/GitHub-Code--Ninja007%2FMauamAI-181717?logo=github)](https://github.com/Code-Ninja007/MauamAI)

---

## 🔗 Live Links

| Service | URL |
|---|---|
| 📱 **Download APK** | [Click to Download](https://github.com/Code-Ninja007/MauamAI/releases/download/v1.0.0/app-release.apk) |
| 🌐 **Landing Page** | [mauamai.vercel.app](https://mauam-ai.vercel.app/) |
| ⚙️ **Backend API** | [mauamai-production.up.railway.app](https://mauamai-production.up.railway.app) |

---

## 📱 Features

| Persona | Unique Widgets |
|---|---|
| 🩺 **Health** | AQI, Pollen Count, UV Index, Humidity |
| 🏃 **Fitness** | Best Running Hours, Sunrise/Sunset, Heat Alerts |
| 🏄 **Adventure / Beach** | Wave Height, Water Temp, Tide Timings |
| ✈️ **Traveler** | Route Weather, Saved Destinations, Flight Alerts |
| 👨‍👩‍👧 **Family** | School Commute, Rain Alerts, Playtime Windows |
| 🌾 **Agriculture** | Frost Risk, Soil Moisture, Planting Guidance |
| 🚌 **Commuter** | Traffic + Weather, Fog Alerts, Visibility |
| 🎉 **Event Planner** | Extended Forecast, Comfort Index, Rain Probability |

**Other highlights:**
- 🎨 Glassmorphic UI with smooth animations
- 🗺️ Route Weather — origin → en route → destination
- 👤 Lightweight onboarding (name + auto-detect location + persona)
- ☁️ Backend hosted on Railway, APK distributed via GitHub Releases

---

## 🗂️ Project Structure

```
MauamAI/
├── backend/              # FastAPI Python backend (hosted on Railway)
│   ├── main.py           # API routes
│   ├── database.py       # SQLite/PostgreSQL models
│   ├── weather_api.py    # OpenWeatherMap integration + mock fallback
│   ├── scoring_engine.py # Persona widget ranking logic
│   ├── requirements.txt  # Python dependencies
│   └── .env.example      # Environment variable template
├── frontend/             # Expo React Native app (Android APK)
│   ├── src/app/index.tsx # Main app screen — all UI & logic
│   ├── app.json          # Expo config (icon, splash, package name)
│   └── assets/images/    # App icon, splash, other assets
├── landing/              # Static landing page (hosted on Vercel)
│   └── index.html        # Download page for judges/testers
├── .gitignore
├── README.md
└── railway.toml          # Railway auto-deploy config
```

---

## 🚀 Running Locally (For Team Members)

### Prerequisites
- Python 3.10+
- Node.js 18+
- Expo Go app on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

---

### Step 1: Clone the Repo

```bash
git clone https://github.com/Code-Ninja007/MauamAI.git
cd MauamAI
```

---

### Step 2: Run the Backend

```bash
cd backend
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate
# Activate (Mac/Linux)
source venv/bin/activate

pip install -r requirements.txt

# Find your local IP: run ipconfig (Windows) or ifconfig (Mac)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

> **Note:** The live backend is already running at `https://mauamai-production.up.railway.app`.  
> You only need to run locally if you are making backend changes.

---

### Step 3: Run the Frontend

```bash
cd frontend
npm install
```

**To use the live Railway backend (recommended):**
The app already points to `https://mauamai-production.up.railway.app` — just run:
```bash
npm start
```

**To use your own local backend for testing changes:**
Edit line 14 in `frontend/src/app/index.tsx`:
```typescript
// Change this:
const API_BASE_URL = 'https://mauamai-production.up.railway.app';
// To your local IP:
const API_BASE_URL = 'http://YOUR_LOCAL_IP:8000';
```
Then run `npm start` and scan the QR code with Expo Go.

---

## 🤝 How to Contribute / Suggest Changes

We welcome feedback and contributions from all team members!

### Option A — Suggest a change (no code)
Open a [GitHub Issue](https://github.com/Code-Ninja007/MauamAI/issues) and describe:
- What you want to change or improve
- Why you think it would help
- Screenshots if relevant

### Option B — Make a code change (with code)

```bash
# 1. Create your own branch
git checkout -b feature/your-feature-name

# 2. Make your changes in the code

# 3. Commit and push
git add .
git commit -m "feat: describe what you changed"
git push origin feature/your-feature-name

# 4. Open a Pull Request on GitHub
# Go to the repo → Pull Requests → New Pull Request
```

The team lead will review and merge it!

---

## 🔑 Environment Variables

| Variable | Where | Description |
|---|---|---|
| `WEATHER_API_KEY` | Railway backend | OpenWeatherMap API key (optional, uses mock if empty) |
| `DATABASE_URL` | Railway backend | PostgreSQL URL (optional, uses SQLite if empty) |

Copy `backend/.env.example` to `backend/.env` for local development.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| 📱 Mobile App | Expo (React Native), TypeScript |
| ⚙️ Backend API | FastAPI (Python) |
| 🗄️ Database | SQLite (local) / PostgreSQL (production) |
| 🌤️ Weather Data | OpenWeatherMap API with mock fallback |
| 🎨 UI / Animations | React Native Animated API, expo-linear-gradient |
| ☁️ Backend Hosting | Railway.app |
| 🌐 Landing Page | Vercel (static HTML) |
| 📦 APK Distribution | GitHub Releases |

---

## 📋 Team Checklist

- [x] Backend deployed on Railway
- [x] Landing page deployed on Vercel
- [x] APK published on GitHub Releases v1.0.0
- [x] Custom Blue Merry app icon + splash screen
- [x] 8 personas with unique widgets
- [x] Travel route weather feature
- [x] Onboarding flow (name + location + persona)
- [ ] Real OpenWeatherMap API key integration
- [ ] PostgreSQL database on Railway
- [ ] Play Store submission


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

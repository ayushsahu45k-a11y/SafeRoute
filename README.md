# 🚦 SafeRoute
### AI-Powered Traffic Intelligence & Accident Risk Prediction Platform

SafeRoute is a **production-grade, data-driven web application** engineered to enhance road safety through **real-time accident risk prediction, intelligent route analysis, and geospatial visualization**.  

It combines **Machine Learning, real-time APIs, and modern web architecture** to provide users with safer and smarter navigation decisions.

---

## 🌐 Live Demo
> https://safe-route-cyan.vercel.app

---

## 🧠 Overview

SafeRoute acts as an **intelligent decision-support system for navigation**, going beyond traditional map applications by incorporating **risk awareness** into route planning.

Unlike standard navigation tools that optimize only for distance or time, SafeRoute evaluates **safety metrics** such as:
- Weather conditions
- Road type
- Traffic estimation
- Historical risk patterns

---

## 🏗️ System Architecture


Frontend (React + Leaflet)
│
▼
Geocoding Layer (Nominatim API)
│
▼
Routing Engine (OpenRouteService)
│
▼
Backend API Layer (Express / FastAPI)
│
▼
ML Inference Engine (Risk Prediction Model)
│
▼
Response Processing (Scoring + Classification)
│
▼
UI Visualization (Map + Risk Segments)


---

## ⚙️ Technology Stack

| Layer              | Technology                              |
|-------------------|------------------------------------------|
| Frontend          | React.js                                 |
| Maps & Visualization | Leaflet + OpenStreetMap              |
| Routing API       | OpenRouteService                         |
| Backend           | Node.js / Express / FastAPI              |
| Machine Learning  | Scikit-learn (Random Forest / Logistic Regression) |
| Data APIs         | OpenWeather API                          |
| AI Integration    | Generative AI (Assistant Layer)          |
| Deployment        | Vercel / Render / Cloud Platforms        |

---

## 🚀 Key Features

### 🧭 Intelligent Navigation
- Real-time route calculation (distance + ETA)
- Multi-point route analysis

### ⚠️ Accident Risk Prediction
- ML-based risk scoring (0–100%)
- Real-time inference (<500ms)
- Dynamic classification:
  - 🟢 Low Risk (Safe Route)
  - 🟠 Moderate Risk
  - 🔴 High Risk

### 🗺️ Advanced Map System
- Interactive maps with multiple layers
- Route segmentation based on risk
- Satellite and terrain modes

### 🔍 Smart Search System
- Location search (city, address, places)
- Category-based search (ATM, hospitals, etc.)
- API-driven suggestions (no hardcoding)

### 🌦️ Context-Aware Insights
- Weather-based risk adjustments
- Environmental awareness

### 🤖 AI Assistance
- Context-aware navigation assistant
- Helps interpret route safety and decisions

---

## 🧪 Machine Learning Pipeline

### Input Features:
- Weather conditions (API)
- Time of day
- Traffic estimation
- Road type (highway, street, local)

### Output:
- Risk Probability (%)
- Risk Classification

### Model:
- Lightweight & optimized for real-time inference
- Pre-trained and served via API

---

## 📁 Project Structure

```
SafeRoute/
├── src/
│   ├── components/
│   │   ├── AIAssistant.tsx        # AI chat assistant
│   │   ├── FloatingSearchBar.tsx  # Location search bar
│   │   ├── IncidentReportModal.tsx
│   │   ├── LeafletMapView.tsx     # Main map component
│   │   ├── MapLayersMenu.tsx
│   │   ├── MapView.tsx
│   │   ├── OnboardingModal.tsx
│   │   ├── Sidebar.tsx            # Navigation sidebar
│   │   ├── SkeletonLoader.tsx
│   │   ├── ThinSidebar.tsx
│   │   └── TripHistory.tsx        # User trip history
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useDebounce.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── lib/
│   │   ├── api.ts                 # API utilities
│   │   ├── notifications.ts
│   │   ├── orsApi.ts             # OpenRouteService API
│   │   ├── routeCache.ts
│   │   ├── sentry.ts             # Error tracking
│   │   ├── validation.ts
│   │   └── voiceNavigation.ts
│   ├── middleware/
│   │   └── auth.ts               # Authentication middleware
│   ├── pages/
│   │   ├── AdminDashboard.tsx    # Admin panel
│   │   └── LoginPage.tsx         # Login/Signup page
│   ├── types/
│   │   └── index.ts              # TypeScript types
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── prisma/
│   └── schema.prisma              # Database schema
├── server.ts                      # Express backend server
├── vercel.json                    # Vercel configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
├── Dockerfile
├── docker-compose.yml
├── .env                          # Environment variables
└── README.md
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL (for production)

### Local Development

```bash
# Clone the repository
git clone https://github.com/ayushsahu45k-a11y/SafeRoute.git
cd SafeRoute

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Generate Prisma client
npx prisma generate

# Run development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/saferoute
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-api-key
OPENWEATHER_API_KEY=your-openweather-api-key
VITE_API_URL=http://localhost:3000
```

---

## 📄 License

MIT License - feel free to use this project for learning and development.

---

## 👨‍💻 Created By

Made with ❤️ by [Ayush Sahu](https://github.com/ayushsahu45k-a11y)

# TikTok View Bot Dashboard

Real-time dashboard for monitoring TikTok view bot stats.

## Architecture
```
Bot (local) --POST--> API (/api/stats) --GET--> Dashboard (React)
```

## Local Setup
```bash
npm install
npm run build
npm start
```
Opens at http://localhost:3001

## Vercel Deploy
1. Fork/push this repo to GitHub  
2. Go to [vercel.com](https://vercel.com) → Import
3. Framework: **Vite** | Build: `npm run build` | Output: `dist`
4. Deploy!

## Run Bot
```bash
export DASHBOARD_URL="https://YOUR-APP.vercel.app/api/stats"
export TARGET_URL="https://www.tiktok.com/@user/video/123456789"
export VIEWS_PER_MIN=200
export THREADS=100
python bot_integrated.py
```

## Features
- Real-time view counter with animation
- Speed gauge (views/min)
- History chart (recharts)
- Success/fail ratio bars
- Activity log feed
- Bot config panel
- Running/idle status indicator
- Glassmorphism dark UI

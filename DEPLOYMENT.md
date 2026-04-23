# Deployment Guide

## Quick Start (Local)

```bash
npm start
```

Runs both:
- Frontend: http://localhost:5174
- Backend: http://localhost:4000

---

## Separate Deployment

### 1. Deploy UI to Vercel

```bash
npm run build
# Connect to Vercel and deploy
```

Set environment variable in Vercel:
```
VITE_API_URL = https://your-server-url.com
```

### 2. Deploy Server to Render or Railway

#### Option A: Render.com
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect your repo
4. Build command: `npm install`
5. Start command: `node mock-server.js`
6. Add environment variable: `PORT=4000`

#### Option B: Railway.app
1. Connect GitHub repo to Railway
2. Deploy automatically
3. Railway auto-detects Node.js
4. No extra config needed

#### Option C: Docker (Universal)
```bash
docker build -t frigate-server .
docker run -p 4000:4000 frigate-server
```

---

## Environment Variables

- `PORT` - Server port (default: 4000)
- `VITE_API_URL` - Frontend API endpoint

---

## API Endpoints (Minimal)

- `GET /api/profile` - User profile
- `GET /api/config` - System config
- `GET /api/cameras` - Camera list
- `GET /api/events` - Detection events
- `GET /api/stats` - CPU/memory stats
- `WS /ws` - Real-time stats stream

---

## Size Optimization

- **Server**: ~50MB (with node_modules)
- **UI Build**: ~300KB (gzipped)
- **Total**: ~1MB runtime

Perfect for free-tier deployments!

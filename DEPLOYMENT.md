# NeuroShield AI Deployment

This project is full-stack:
- Frontend: Next.js (in this repo)
- Backend: Flask API (`app.py`)

## 1) Deploy Backend (Render)

1. Create a new **Web Service** on Render from this GitHub repo.
2. Configure:
- Environment: `Python 3`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT`
3. Set environment variables:
- `GEMINI_API_KEY` = your key
- `CORS_ORIGINS` = `http://localhost:3000,https://<your-frontend-domain>`
4. Deploy and copy backend URL, for example:
- `https://neuroshield-api.onrender.com`

## 2) Deploy Frontend (Vercel)

1. Import this repo in Vercel.
2. Framework preset: `Next.js`.
3. Set environment variable:
- `NEXT_PUBLIC_API_BASE_URL` = your backend URL from Render
  - Example: `https://neuroshield-api.onrender.com`
4. Deploy.

## 3) Verify

- Open frontend URL.
- Create account / login.
- Run a scan.
- Check history/reports load correctly.

## Local development

Backend:
- `python app.py`

Frontend:
- `npm install`
- `npm run dev`

Set local frontend env:
- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5000`

## Notes

- SQLite (`auth.db`) works for small deployments but for production scale use PostgreSQL.
- If browser API requests fail with CORS, update `CORS_ORIGINS` on backend to include your frontend domain.

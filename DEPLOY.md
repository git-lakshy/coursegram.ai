# Deployment guide, free tier stack

Frontend on Vercel, backend on Render, database on Neon. All three have free tiers.

## 1. Database, Neon

1. Create an account at https://neon.tech and create a project.
2. Copy the pooled connection string, it looks like
   postgres://user:password@host/dbname?sslmode=require

## 2. Firebase authentication

1. Create a project at https://console.firebase.google.com.
2. Build, Authentication, Get started, enable Email/Password.
3. Project settings, General, Your apps, add a Web app, copy the config values.
4. Note the project id, the backend needs it to verify ID tokens.

## 3. Backend, Render

1. Push this repository to GitHub.
2. Render dashboard, New, Web service, connect the repo.
3. Render detects backend/render.yaml (blueprint) or configure manually:
   - Root directory: backend
   - Build: pip install -r requirements.txt
   - Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 2
4. Set environment variables:
   - DATABASE_URL, the Neon connection string
   - LLM_PROVIDER=nvidia, NVIDIA_API_KEY, LLM_MODEL
   - SECRET_KEY, any long random string
   - FIREBASE_PROJECT_ID, from step 2
   - ALLOWED_ORIGINS, the frontend URL from step 4

Tables are created automatically on first request.

## 4. Frontend, Vercel

1. Vercel dashboard, Add New, Project, import the repo.
2. Root directory: frontend. Framework preset: Vite. Build: npm run build, output: dist
3. Environment variables:
   - VITE_API_BASE_URL, the Render backend URL, for example https://coursegram-api.onrender.com
   - VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID
4. Deploy, then add the deployed Vercel URL to ALLOWED_ORIGINS on Render and redeploy.

## Local development

Everything works without Neon or Firebase: omit DATABASE_URL and the Firebase
VITE_ variables and the API returns a clear 503 for database backed endpoints
and the frontend falls back to local email and password auth.

With a database configured, local auth still works: the backend stores
password hashes in Postgres. With Firebase configured, the frontend uses
Firebase sign in and the backend verifies ID tokens.

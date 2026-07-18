# Local development

## Supported setup

The documented Windows environment uses PowerShell, Git, Python 3.12 or newer, and Node.js 20.19.6 or newer. Commands below assume the clean clone is at `D:\Ominilab-OpenAI`.

## One-time installation

```powershell
Set-Location "D:\Ominilab-OpenAI"

py -3.13 -m venv .\backend_Ominilab\.venv
.\backend_Ominilab\.venv\Scripts\python.exe -m pip install --upgrade pip
.\backend_Ominilab\.venv\Scripts\python.exe -m pip install -r .\backend_Ominilab\requirements.txt
Copy-Item .\backend_Ominilab\.env.example .\backend_Ominilab\.env

npm --prefix .\frontend_Ominilab ci
Copy-Item .\frontend_Ominilab\.env.example .\frontend_Ominilab\.env
```

If Python 3.13 is unavailable, replace `py -3.13` with an installed Python 3.12+ executable.

For local AI calls, edit `backend_Ominilab\.env` and set `OPENAI_API_KEY`. Never put that value in a frontend environment file or Git.

## Start the application

Backend window:

```powershell
Set-Location "D:\Ominilab-OpenAI\backend_Ominilab"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Frontend window:

```powershell
Set-Location "D:\Ominilab-OpenAI"
npm --prefix .\frontend_Ominilab run dev
```

Open:

- Site: `http://localhost:3003`
- Swagger UI: `http://localhost:8000/docs`
- Health: `http://localhost:8000/api/lab/health`

The sample account is `judge` / `ominilab-demo`. Registration is also enabled.

## Verify backend and frontend together

```powershell
Set-Location "D:\Ominilab-OpenAI"
.\ops\check-local.ps1
```

The script performs Python compilation, backend smoke tests against a temporary SQLite database, a locked `npm ci`, and an Astro production build. It sets production public URLs only for the build and restores the previous environment afterward.

Individual checks:

```powershell
.\backend_Ominilab\.venv\Scripts\python.exe -m compileall -q .\backend_Ominilab

Push-Location .\backend_Ominilab
.\.venv\Scripts\python.exe -m pytest -q tests
Pop-Location

npm --prefix .\frontend_Ominilab run build
```

## Normal Git workflow

```powershell
git status -sb
git diff
.\ops\check-local.ps1
git add <specific-files>
git diff --cached --check
git commit -m "Describe the change"
git push origin main
```

Pushing `main` triggers GitHub Actions validation and, after validation succeeds, automatic production deployment. Confirm both jobs and the public health endpoint before considering a release complete.

## Configuration

Backend variables are documented in `backend_Ominilab/.env.example`. Important values:

- `APP_SECRET`: JWT signing secret.
- `DATABASE_PATH`: SQLite file path.
- `CORS_ORIGINS`: comma-separated allowed frontend origins.
- `DEMO_USERNAME`, `DEMO_PASSWORD`: account seeded only when absent.
- `OPENAI_API_KEY`, `OPENAI_MODEL`: server-only OpenAI configuration.
- `PUBLIC_WS_HOST`: hostname embedded into downloadable firmware source.

Frontend variables:

- `PUBLIC_API_URL`: FastAPI origin; WebSocket URL is derived automatically.
- `PUBLIC_SITE_URL`: canonical site origin used during production builds.

## Common Windows mistakes

- In PowerShell use `Set-Location "D:\Ominilab-OpenAI"`, not CMD's `cd /d`.
- PowerShell environment syntax is `$env:NAME="value"`; CMD uses `set NAME=value`.
- If `npm ci` reports `EPERM` for Rollup, close Astro/Node processes and editors holding `node_modules`, then retry.
- LF-to-CRLF warnings are informational if `git diff --cached --check` is clean.

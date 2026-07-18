# Ominilab Backend

Minimal, open-source FastAPI backend for six ESP32 physics experiments:

1. Harmonic motion with BMI160
2. Specific heat capacity of water
3. Electromagnetic induction
4. Capacitor charge and discharge
5. Incandescent lamp I-V characteristic
6. Resistor I-V characteristic

The backend contains only simple username/password authentication, an SQLite user database, public firmware delivery, WebSocket relay, and an OpenAI-powered lab assistant.

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for the API reference.

## Demo account

The values in `.env` under `DEMO_USERNAME` and `DEMO_PASSWORD` create a public judge account at startup. Change or disable them for any non-demo deployment.

## Architecture

- `/api/auth/*`: register, login, current user
- `/api/lab/ws/esp32/{device_id}`: ESP32 data channel
- `/api/lab/ws/client/{device_id}`: browser data channel
- `/api/lab/firmware/*`: public-source WebSerial bundles for authenticated users
- `/api/ai/explain`: GPT-5.6 Responses API adapter for experiment feedback

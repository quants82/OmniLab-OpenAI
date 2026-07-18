# Ominilab: AI-Powered Open Physics Sandbox

Ominilab turns low-cost ESP32 components into an open, globally accessible physics laboratory. Students flash public MicroPython firmware, stream real measurements to a browser, inspect live charts, and receive experiment-grounded feedback from GPT-5.6.

## Six focused experiments

1. Harmonic motion with BMI160
2. Specific heat capacity of water
3. Electromagnetic induction
4. Capacitor charge and discharge
5. Incandescent lamp I-V characteristic
6. Resistor I-V characteristic

## Build Week scope and transparency

This submission inherits the proven visual interface and hardware foundation of the VatLi365 educational ecosystem. For OpenAI Build Week 2026, the project has been isolated into a new, minimal, open-source product:

- A standalone FastAPI WebSocket backend for ESP32 telemetry
- Simple username/password authentication and a minimal SQLite user database
- Public, browser-flashable firmware for only the six experiments above
- A GPT-5.6 Responses API adapter for questions and feedback grounded in experiment data
- An English-first submission interface

No Teacher/Student roles, PRO membership, private device approval, encrypted firmware, email marketing, quiz system, document generation, or unrelated VatLi365 modules are included.

## Architecture

```text
ESP32 firmware --WSS--> FastAPI relay --WSS--> Astro/React experiment UI
                                                 |
                                                 +--> GPT-5.6 Responses API
```

- [`frontend_Ominilab`](./frontend_Ominilab): Astro + React UI, WebSerial flasher, public MicroPython sources
- [`backend_Ominilab`](./backend_Ominilab): FastAPI, WebSockets, SQLite authentication, OpenAI API adapter

## Run locally

### Backend

```bash
cd backend_Ominilab
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend_Ominilab
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:3003`. API documentation is available at `http://localhost:8000/docs`.

## Demo access

The backend seeds a judge account using `DEMO_USERNAME` and `DEMO_PASSWORD` from `.env`. The sample values are `judge` / `ominilab-demo`; change them before any non-demo deployment.

## Configuration

- Set `OPENAI_API_KEY` on the backend only. Never expose it in the frontend.
- Set `OPENAI_MODEL=gpt-5.6` for the Build Week integration.
- Set `PUBLIC_WS_HOST` to the public backend hostname before flashing ESP32 devices.
- Set `PUBLIC_API_URL` in the frontend to the public backend origin.

## Codex evidence

Codex Session ID: `[add session ID before submission]`

## License

Released under the [MIT License](./LICENSE). The ESP32 source files are included
in the repository in readable form and are uploaded to the device without
application-level encryption.

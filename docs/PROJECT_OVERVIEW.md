# Project overview

## Goal

Ominilab is a standalone, open-source physics laboratory for OpenAI Build Week 2026. It connects public ESP32/MicroPython programs to an English-first browser interface and uses GPT-5.6 to explain measurements. The smallest complete user journey is:

1. Register or sign in.
2. Select one of six labs.
3. Flash its public firmware to an ESP32.
4. Enter the device identifier shown by the firmware.
5. Stream, visualize, record, and analyze measurements.
6. Use AI feedback where the experiment exposes it.

## Complete feature map

| Experiment | Hardware/data | Browser analysis | Device ID prefix |
| --- | --- | --- | --- |
| Harmonic motion with BMI160 | BMI160 acceleration and gravity magnitude | Calibration, displacement/velocity/acceleration reconstruction, period/frequency/angular frequency, amplitude, CSV, mass/spring survey regression, AI questions and answer evaluation | `ESP32-SHM2-` |
| Specific heat capacity of water | DS18B20 temperature plus INA226 voltage/current/power | Manual records, temperature-time chart, linear trend, average power, two-point specific-heat calculation, CSV | `ESP32-SH-` |
| Electromagnetic induction | ADS1115 induced-voltage samples | Live oscilloscope-style history, pause, pan, zoom, automatic range | `ESP32-Induction-` |
| Capacitor charge and discharge | INA226 voltage/current plus physical switch state | Smoothed voltage/current, charge and stored-energy calculations, time and relationship views | `ESP32-Capacitor-` |
| Incandescent lamp I-V | INA226 voltage/current | Manual I-V points, nonlinear power regression, instantaneous resistance, save/compare curve | `ESP32-Lamp-` |
| Resistor I-V | INA226 voltage/current | Manual I-V points, linear regression, resistance calculation, save/compare curve | `ESP32-Resistor-` |

## Shared application features

- Username/password register, login, logout, and session restoration.
- JWT Bearer tokens stored by the frontend in browser local storage.
- One SQLite `users` table; no classes, roles, subscriptions, or lab-result storage.
- Authenticated firmware manifest and source bundle endpoints.
- Browser WebSerial flasher for ESP32, ESP32-C3, ESP32-S2, ESP32-S3, and ESP32-C6 MicroPython base images.
- Public source bundles that install each experiment as `main.py` plus required helper files.
- In-memory, bidirectional WebSocket relay: one active ESP32 and multiple browser clients per device ID.
- OpenAI Responses API adapter fixed by server configuration (`OPENAI_MODEL`, currently `gpt-5.6`).
- Deterministic harmonic-motion judge replay, explicitly labeled as synthetic in both the UI and GPT-5.6 prompt.
- Static Astro output served by Nginx; FastAPI serves REST, WebSocket, and OpenAPI routes.

## Deliberately excluded

Teacher/Student permissions, PRO features, payment, email marketing, private hardware approval, subscription checks, flash encryption, secure boot, quizzes, document generation, and unrelated VatLi365 modules are outside this repository.

## Repository map

```text
backend_Ominilab/
  routers/              Authentication, lab relay/firmware, OpenAI adapter
  tests/                Backend smoke tests
frontend_Ominilab/
  esp32/                Public MicroPython experiment programs and drivers
  public/firmware/base/ MicroPython binary images for supported ESP32 families
  src/components/       React experiment UIs, authentication, flasher
  src/pages/            Astro routes
ops/                    Local verification and production deployment
docs/                   Project and operator documentation
.agents/skills/         Project-scoped Codex skills
```

## Runtime architecture

```text
Browser --HTTPS /api/auth, /api/lab/firmware, /api/ai--> Nginx --> FastAPI :8010
Browser --WSS /api/lab/ws/client/{device_id}-----------> Nginx --> relay
ESP32   --WSS /api/lab/ws/esp32/{device_id}------------> Nginx --> relay
Browser --HTTPS static pages----------------------------> Nginx --> Astro dist
FastAPI --HTTPS Responses API---------------------------> OpenAI
FastAPI ------------------------------------------------> SQLite users database
```

The relay is intentionally ephemeral: telemetry is not persisted, and connected-device state is lost on backend restart.

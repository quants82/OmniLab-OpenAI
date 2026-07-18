# Ominilab: Open Hardware, Real Physics, Grounded AI

[![Live demo](https://img.shields.io/badge/live-ominilab.vatli365.vn-0f766e)](https://ominilab.vatli365.vn)
[![CI and deploy](https://github.com/quants82/Ominilab-OpenAI/actions/workflows/ci-deploy.yml/badge.svg)](https://github.com/quants82/Ominilab-OpenAI/actions/workflows/ci-deploy.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

**OpenAI Build Week 2026 · Education track**

Ominilab turns low-cost ESP32 kits into an open, remotely observable physics laboratory. Learners flash readable MicroPython in the browser, collect real sensor measurements, inspect live charts, and use GPT-5.6 to reason from the experiment they actually performed.

## Judge in 60 seconds

- Live product: [https://ominilab.vatli365.vn](https://ominilab.vatli365.vn)
- Test account: `judge` / `ominilab-demo`
- Judge guide: [`docs/JUDGE_QUICKSTART.md`](./docs/JUDGE_QUICKSTART.md)
- Public API: [https://ominilab.vatli365.vn/docs](https://ominilab.vatli365.vn/docs)
- Six public firmware programs: [`frontend_Ominilab/esp32`](./frontend_Ominilab/esp32)
- Build Week work and Codex collaboration: [`docs/BUILD_WEEK_DELTA.md`](./docs/BUILD_WEEK_DELTA.md)
- Ready-to-paste Devpost copy: [`docs/DEVPOST_SUBMISSION.md`](./docs/DEVPOST_SUBMISSION.md)

Hardware is needed to create new physical measurements. For reproducible judging without a kit, the harmonic-motion lab includes an explicitly labeled synthetic replay that exercises the live charts, calculated quantities, and GPT-5.6 learning flow without pretending that generated data came from a BMI160.

## The education problem

Traditional school experiments are valuable but often constrained by scarce equipment, short class periods, manual transcription, one-screen-per-bench observation, opaque vendor firmware, and feedback that arrives after the moment of inquiry. Pure simulations scale well but do not teach sensor noise, calibration, uncertainty, wiring, or the difference between a model and the physical world.

Ominilab joins the strengths of both approaches:

| Traditional constraint | Ominilab response |
| --- | --- |
| Limited lab stations and local-only observation | One ESP32 streams to multiple browser observers through a device-scoped WebSocket channel |
| Long setup before students see data | Browser-based MicroPython flashing and a focused six-lab catalog |
| Manual readings and copied tables | Live sensor telemetry, charts, calculated quantities, regression, and CSV export |
| Black-box hardware/software | MIT-licensed application, readable firmware, file hashes, and an inspectable OpenAPI contract |
| Generic or delayed feedback | GPT-5.6 receives measured quantities and generates experiment-specific questions and answer feedback |
| Simulation hides real measurement problems | Learners work with physical sensors, calibration, sampling, noise, and uncertainty |

## Six focused experiments

1. Harmonic motion with BMI160
2. Specific heat capacity of water
3. Electromagnetic induction
4. Capacitor charge and discharge
5. Incandescent lamp I-V characteristic
6. Resistor I-V characteristic

The harmonic-motion lab is the flagship GPT-5.6 experience: measured period, frequency, angular frequency, amplitude, maximum velocity, and acceleration ground generated questions and answer evaluation. The backend—not the browser—selects `gpt-5.6` and calls the OpenAI Responses API.

## Why this is different

Ominilab is not only a simulation, data logger, AI chat window, or remote-control dashboard. Its core loop is:

```text
build the apparatus -> flash auditable firmware -> measure reality
-> visualize and calculate -> explain evidence with GPT-5.6 -> revise the experiment
```

This makes AI answerable to physical evidence. Students can compare the model response with their waveform, regression, calibration quality, and repeated trials instead of accepting a context-free explanation.

## Educational and global potential

Ominilab is intended for secondary physics, introductory university labs, STEM clubs, teacher demonstrations, and remote or hybrid learning. It combines physics inquiry, data literacy, electronics, coding, systems thinking, and critical AI literacy in one workflow.

The application is English-first, web-based, open source, and deployable in OpenAI-supported countries. ESP32 hardware is widely available, firmware is public, and the server stores no experiment telemetry. Full multilingual localization, offline AI fallback, accessibility testing, and multi-school pilots are future work—not completed claims. See the measurable evaluation plan in [`docs/EDUCATION_IMPACT.md`](./docs/EDUCATION_IMPACT.md).

## Build Week scope and transparency

The VatLi365 educational interface and hardware foundation existed before the submission period. For Build Week, Codex helped isolate it into a new standalone product, remove unrelated Teacher/Student/PRO modules, create a minimal FastAPI backend and SQLite authentication, open the firmware delivery path, integrate GPT-5.6, make the UI English-first, deploy an independent production service, and add CI/CD, tests, documentation, and project skills.

Only work added during the competition period is presented for judging. Dated commits and the detailed prior/new boundary are documented in [`docs/BUILD_WEEK_DELTA.md`](./docs/BUILD_WEEK_DELTA.md).

## How we collaborated with Codex

Codex was an engineering collaborator throughout Build Week, not a one-prompt code generator and not the product owner. We worked in a repeated evidence-driven loop:

```text
human goal and constraints -> Codex audits, proposes, and implements
-> human reviews decisions and runs the real system
-> Codex diagnoses evidence and refines the change -> tests and deployment proof
```

### Where Codex accelerated the workflow

| Phase | Codex contribution | Entrant decision, review, or verification | Evidence |
| --- | --- | --- | --- |
| Product reduction | Audited the inherited VatLi365 code and traced which backend, frontend, firmware, and data paths were unrelated to a standalone lab product. | Chose the final boundary: exactly six representative experiments, simple login, no Teacher/Student roles, no PRO tier, and no unrelated platform features. | [`PROJECT_OVERVIEW.md`](./docs/PROJECT_OVERVIEW.md) and the [dated commit history](https://github.com/quants82/Ominilab-OpenAI/commits/main/) |
| Open architecture | Helped design and implement the minimal FastAPI/JWT/SQLite backend, public firmware manifest and bundles, device-scoped WebSocket relay, and server-only OpenAI adapter. | Required readable MicroPython, no application-level firmware encryption, minimal stored data, and compatibility with the existing ESP32 apparatus. | [`backend_Ominilab`](./backend_Ominilab), [`frontend_Ominilab/esp32`](./frontend_Ominilab/esp32), and [OpenAPI](https://ominilab.vatli365.vn/docs) |
| Reliability and debugging | Used observed errors and screenshots to diagnose the clipped login modal, sticky-header stacking context, Nginx routing, SSH host verification, private-key encoding, database paths, and deployment startup timing. | Ran each Windows and Linux command, checked outputs, approved the fixes, and verified authentication, HTTPS health, GPT-5.6, and bidirectional secure WebSockets on production. | [UI/deployment commit sequence](https://github.com/quants82/Ominilab-OpenAI/compare/dbd7fb7...2e5e89d) and [`DEPLOYMENT.md`](./docs/DEPLOYMENT.md) |
| CI/CD and operations | Converted the manual deployment sequence into repeatable local checks, backend tests, GitHub Actions validation, locked SSH deployment, and post-restart health checks. | Chose the independent subdomain and isolated Linux service; created the required server users, secrets, Nginx/TLS configuration, and retained control of production credentials. | [GitHub Actions](https://github.com/quants82/Ominilab-OpenAI/actions) and [`ops`](./ops) |
| Naming migration | Traced repository, directory, database, service, credential, frontend, and documentation references and proposed a recoverable migration order. | Chose `Ominilab` as the canonical brand, created backups, executed the migration, and verified the live title, database, login, and health endpoint. | [Commit `043f59d`](https://github.com/quants82/Ominilab-OpenAI/commit/043f59d) and [`CURRENT_STATUS.md`](./docs/CURRENT_STATUS.md) |
| Judge readiness | Mapped the official requirements to repository evidence, strengthened the English-first explanation, added contract tests and a clearly labeled synthetic replay, and drafted the submission/video/checklists. | Set the education focus, required honest separation of demonstrated results from future impact, and retained responsibility for physical validation and the final submission. | [`RULES_ALIGNMENT.md`](./docs/RULES_ALIGNMENT.md), [`EDUCATION_IMPACT.md`](./docs/EDUCATION_IMPACT.md), and [`HARDWARE_ACCEPTANCE.md`](./docs/HARDWARE_ACCEPTANCE.md) |

Codex accelerated cross-layer tracing, implementation, debugging, command generation, and documentation. The entrant made the key product, engineering, education, security, naming, and deployment decisions; supplied the apparatus knowledge; executed privileged operations; reviewed every consequential change; and remains responsible for the final hardware results and claims.

### Distinct roles of Codex and GPT-5.6

- **Codex helped build Ominilab:** repository audit, scoped refactoring, backend/frontend work, debugging, tests, deployment automation, migration planning, and judge-facing evidence.
- **GPT-5.6 is part of the running learning experience:** the harmonic-motion lab sends the declared data source and run statistics—period, frequency, angular frequency, amplitude, maximum velocity, and maximum acceleration—to the backend. GPT-5.6 generates leveled questions and evaluates a learner's answer against that specific run.
- **The browser cannot choose another model:** the API key and `OPENAI_MODEL=gpt-5.6` remain server-side, and the [backend contract test](./backend_Ominilab/tests/test_smoke.py) verifies that a browser-supplied model value cannot override the configured model.

The more detailed chronological account, including the pre-existing/new-work boundary, is in [`docs/BUILD_WEEK_DELTA.md`](./docs/BUILD_WEEK_DELTA.md). The primary Codex `/feedback` Session ID is listed under **Competition evidence** below.

## Architecture

```text
ESP32 MicroPython --WSS--> FastAPI relay --WSS--> Astro/React lab UI
                                                |
                                                +--> OpenAI Responses API (GPT-5.6)
```

- [`backend_Ominilab`](./backend_Ominilab): FastAPI, SQLite authentication, firmware API, WebSockets, OpenAI adapter
- [`frontend_Ominilab`](./frontend_Ominilab): Astro/React UI, live charts, WebSerial flasher, public MicroPython source
- [`ops`](./ops): local verification and production deployment scripts
- [`.agents/skills`](./.agents/skills): reusable Codex project skills

## Run locally on Windows

```powershell
Set-Location "D:\Ominilab-OpenAI"

py -3.13 -m venv .\backend_Ominilab\.venv
.\backend_Ominilab\.venv\Scripts\python.exe -m pip install -r .\backend_Ominilab\requirements.txt
Copy-Item .\backend_Ominilab\.env.example .\backend_Ominilab\.env

npm --prefix .\frontend_Ominilab ci
Copy-Item .\frontend_Ominilab\.env.example .\frontend_Ominilab\.env
```

Backend:

```powershell
Set-Location "D:\Ominilab-OpenAI\backend_Ominilab"
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

Frontend:

```powershell
Set-Location "D:\Ominilab-OpenAI"
npm --prefix .\frontend_Ominilab run dev
```

Open `http://localhost:3003`; API documentation is at `http://localhost:8000/docs`.

Before committing:

```powershell
.\ops\check-local.ps1
```

## Documentation

- [Project overview](./docs/PROJECT_OVERVIEW.md)
- [Judge quick start](./docs/JUDGE_QUICKSTART.md)
- [Build Week delta and Codex collaboration](./docs/BUILD_WEEK_DELTA.md)
- [Educational impact and evaluation](./docs/EDUCATION_IMPACT.md)
- [Devpost submission draft](./docs/DEVPOST_SUBMISSION.md)
- [Three-minute demo script](./docs/VIDEO_SCRIPT.md)
- [Submission compliance checklist](./docs/SUBMISSION_CHECKLIST.md)
- [Official rules alignment and evidence map](./docs/RULES_ALIGNMENT.md)
- [Development](./docs/DEVELOPMENT.md)
- [API and data flow](./docs/API_AND_DATA_FLOW.md)
- [ESP32 firmware](./docs/ESP32_FIRMWARE.md)
- [Six-lab hardware acceptance checklist](./docs/HARDWARE_ACCEPTANCE.md)
- [Deployment](./docs/DEPLOYMENT.md)
- [Operations](./docs/OPERATIONS.md)
- [Current status](./docs/CURRENT_STATUS.md)

## Security, privacy, and openness

- The OpenAI key and JWT signing secret stay on the backend.
- Passwords are PBKDF2-SHA256 hashed; the frontend receives JWTs.
- Experiment telemetry is relayed in memory and is not stored in the database.
- WebSocket channels currently use device IDs rather than JWT authentication; this limitation is disclosed.
- Firmware is uploaded without application-level encryption or secure boot requirements.

## Competition evidence

Primary Codex `/feedback` Session ID: **`019f7484-26c0-7c91-b955-b437da0e7170`**

Public YouTube demo: **`[REQUIRED BEFORE SUBMISSION]`**

## License

Released under the [MIT License](./LICENSE). Third-party Python and npm packages remain under their respective licenses.

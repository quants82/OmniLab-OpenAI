# Devpost submission draft

This document is English-first and ready to adapt into the Devpost form. Replace every bracketed placeholder before submission.

## Project name

Ominilab

## Tagline

Open ESP32 physics labs where real measurements ground live analysis and GPT-5.6 feedback.

## Track

Education

## Links

- Live demo: https://ominilab.vatli365.vn
- Repository: https://github.com/quants82/Ominilab-OpenAI
- Public API: https://ominilab.vatli365.vn/docs
- YouTube demo: `[PUBLIC YOUTUBE URL]`
- Primary Codex `/feedback` Session ID: `019f7484-26c0-7c91-b955-b437da0e7170`

## Inspiration

Hands-on physics matters because reality includes noise, calibration, uncertainty, wiring mistakes, and results that do not perfectly match a textbook. Yet many schools have too few lab stations, short class periods, closed data-logging systems, and limited time for individual feedback. Simulations scale, but they cannot replace the engineering and scientific judgment developed by measuring a real system.

Ominilab asks a different question: can low-cost open hardware preserve the authenticity of a physical experiment while the web and GPT-5.6 make it observable, explainable, and reusable anywhere?

## What it does

Ominilab provides six focused ESP32 physics experiments covering mechanics, thermal physics, electromagnetism, and circuits. A learner signs in, chooses a lab, flashes readable MicroPython from the browser, connects the apparatus, and streams sensor data through a FastAPI WebSocket relay to a live Astro/React dashboard.

The dashboards reconstruct quantities such as displacement, velocity, acceleration, period, power, charge, energy, and resistance; show charts; support regression or CSV export; and expose the relationship between raw measurements and conclusions.

In the flagship harmonic-motion lab, GPT-5.6 receives statistics from the learner's measured run. It generates leveled questions and evaluates answers against the actual period and amplitude instead of providing generic tutoring detached from the experiment.

Judges without hardware can run a deterministic, explicitly labeled synthetic replay through the same charting, calculation, and GPT-5.6 learning path. The interface and prompt disclose the synthetic source so this reproducibility aid cannot be mistaken for a physical BMI160 measurement.

## How we built it

- Public MicroPython programs for BMI160, DS18B20, INA226, and ADS1115-based kits.
- Browser WebSerial flashing for five ESP32 families.
- FastAPI REST endpoints for authentication, firmware manifests, source bundles, and GPT-5.6.
- Bidirectional WebSocket relay linking one physical kit with multiple browser observers.
- Astro, React, Tailwind, Chart.js, KaTeX, and regression-based analysis.
- SQLite containing only users; experiment telemetry stays in memory.
- Nginx, systemd, Let's Encrypt, GitHub Actions validation, and automatic production deployment.

Codex helped turn a pre-existing educational interface and hardware foundation into this independent Build Week product: scoping away unrelated commercial/school-management modules, designing the minimal backend, opening firmware delivery, debugging responsive authentication, creating the deployment architecture and CI/CD, executing a safe naming migration, and documenting repeatable maintenance and judging workflows.

## Challenges

The hardest challenge was joining physical hardware, constrained MicroPython, browser flashing, secure WebSockets, real-time visualization, and server-side AI into one reproducible workflow. Deployment also required careful isolation from other services on a shared Linux host, strict SSH host verification, protected secrets, and health-checked automation.

A product challenge was deciding what **not** to include. We removed roles, subscriptions, proprietary firmware controls, and unrelated education-platform modules so judges and educators can audit the core lab experience.

## Accomplishments

- Six working public firmware bundles and matching experiment dashboards.
- A live independent HTTPS deployment with automated validation and deployment.
- A secure server-side GPT-5.6 Responses API integration grounded in measured physics.
- Readable firmware, hashes, OpenAPI documentation, MIT licensing, and a minimal data model.
- A workflow that connects hands-on science, electronics, data analysis, coding, and critical AI literacy.

## What we learned

Real-time educational AI is most useful when it is constrained by evidence. A model response becomes more teachable when learners can challenge it with a waveform, unit, regression, calibration state, or repeated trial. We also learned that openness is a product feature: source visibility helps learners understand the entire path from sensor register to graph rather than treating the device as a black box.

## What's next

- Structured internationalization and curriculum mappings for additional countries.
- Accessibility and low-bandwidth audits.
- Measured school pilots using pre/post concepts, setup time, graph interpretation, error rates, participation, and AI-critique rubrics.
- Grounded AI reflection across all six experiments.
- Optional teacher orchestration designed without recreating a heavy school-management platform.

## Testing instructions

Open the live demo and sign in with `judge` / `ominilab-demo`. Follow `docs/JUDGE_QUICKSTART.md` to run the labeled synthetic harmonic-motion replay and verify the six firmware entries, public source bundles, health endpoint, and GPT-5.6 response without rebuilding. Compatible ESP32 hardware is required only for new physical measurements and WebSerial flashing.

## Disclosure of prior work

The VatLi365 visual/hardware foundation predated Build Week. The independent backend, reduced open-source product scope, public firmware delivery, GPT-5.6 workflow, English-first competition UI, production deployment, CI/CD, tests, documentation, and skills were created or meaningfully extended during the submission period. See `docs/BUILD_WEEK_DELTA.md` and the dated Git history.

# Build Week delta and Codex collaboration

## Pre-existing foundation

Before the submission period, VatLi365 already provided an educational visual language, hardware experimentation knowledge, and earlier lab-interface foundations. Ominilab does not claim those pre-existing elements as new Build Week work.

The eligible submission is the meaningful extension created during the competition period: a new independent, minimal, open-source product built with Codex and integrating GPT-5.6.

## What was added during Build Week

- Isolated a public standalone repository and independent production subdomain.
- Reduced the product to six physics experiments and removed unrelated Teacher/Student roles, PRO membership, marketing, quizzes, document generation, and device ownership logic.
- Built a minimal FastAPI backend with JWT authentication, one-table SQLite storage, public firmware delivery, an in-memory bidirectional WebSocket relay, and an OpenAI Responses API adapter.
- Made six MicroPython applications and their required drivers readable and browser-flashable without application-level encryption.
- Added an English-first Astro/React competition interface and public judge login.
- Integrated GPT-5.6 into the harmonic-motion learning loop using measured period, frequency, angular frequency, amplitude, velocity, and acceleration to generate questions and evaluate answers.
- Deployed an isolated Ubuntu/Nginx/systemd/Let's Encrypt production service.
- Added backend smoke tests, a full local verification script, GitHub Actions validation, automatic SSH deployment, and post-deploy health verification.
- Fixed the login modal for short viewports by rendering it outside the sticky header.
- Standardized product and server naming to `Ominilab`/`ominilab`.
- Created comprehensive operator documentation, `AGENTS.md`, and three reusable project skills for maintenance, experiment changes, and deployment.
- Added a judge-first evidence page and a deterministic, explicitly labeled harmonic-motion replay that exercises analysis and GPT-5.6 without claiming synthetic values as physical measurements.

## How Codex accelerated the work

Codex was used as an active engineering collaborator rather than a one-shot code generator:

1. **Scope decision:** helped audit the inherited system and identify the minimum competition product: authentication, lab telemetry, open firmware, and AI—without school-management or commercial modules.
2. **Architecture decision:** separated static Astro delivery, FastAPI REST/WebSocket services, SQLite users, server-only OpenAI access, and public MicroPython bundles.
3. **Open-source decision:** replaced protected delivery assumptions with readable source bundles, deterministic filenames, hashes, and explicit no-encryption metadata.
4. **Reliability work:** diagnosed the viewport-clipped login modal, chose a React portal, and verified production rendering.
5. **Deployment work:** designed the dedicated Unix users, systemd unit, Nginx routing, TLS, deployment lock, health retries, and rollback documentation.
6. **CI/CD debugging:** iterated through database paths, SSH host-key pinning, raw/Base64 private-key handling, GitHub secrets, and automatic production deployment until both jobs passed.
7. **Naming migration:** planned and verified the repository, folder, service, database, demo credential, and public-brand migration without losing production data.
8. **Documentation and governance:** created the judge-facing documentation, durable repo instructions, and project skills that encode repeatable workflows.

The entrant made the product-boundary, education, hardware, security, naming, and deployment decisions; reviewed commands before execution; tested the available hardware and production paths; and retained responsibility for the final implementation. The remaining six-lab physical acceptance work is explicitly tracked rather than claimed as complete.

## How GPT-5.6 is meaningfully used

The browser sends experiment context—not a generic “teach me physics” message—to the backend. In the harmonic-motion lab, the context includes measured values such as period, frequency, angular frequency, amplitude, maximum velocity, and maximum acceleration. GPT-5.6 then:

- creates questions at recall, understanding, and application levels;
- evaluates a learner response against the measured run;
- returns a score, feedback, and a corrected explanation.

The API key and model choice stay on the server. `backend_Ominilab/routers/ai.py` calls the Responses API with `OPENAI_MODEL=gpt-5.6`; the browser cannot silently choose a cheaper or unrelated model.

## Dated evidence

The public Git history begins on July 18, 2026 and records the independent release, UI fixes, production deployment, CI/CD, security debugging, naming migration, documentation, and skills. The production workflow for commit `4857de8` passed validation and deployment on July 19, 2026.

Before submission, add the primary `/feedback` Codex Session ID to the root README and Devpost form. The ID must come from the thread where the majority of core functionality was built.

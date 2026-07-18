# OpenAI Build Week rules alignment

This is an evidence map, not a substitute for the [official rules](https://openai.devpost.com/rules), [FAQ](https://openai.devpost.com/details/faqs), or final Devpost form. It deliberately leaves incomplete requirements visible.

## Required submission elements

| Requirement | Ominilab evidence | Status |
| --- | --- | --- |
| Build with Codex | Dated history and concrete collaboration decisions in [`BUILD_WEEK_DELTA.md`](./BUILD_WEEK_DELTA.md) | Complete except primary `/feedback` Session ID |
| Meaningful GPT-5.6 use | Server-fixed model in `backend_Ominilab/routers/ai.py`; measured/replay statistics in `HarmonicMotionBMI160Experiment.tsx`; contract test in `backend_Ominilab/tests/test_smoke.py` | Implemented and tested |
| Working project | [Live HTTPS deployment](https://ominilab.vatli365.vn), judge account, health endpoint, CI/CD | Available |
| Public code and setup guidance | Public MIT repository, root README, development and deployment guides | Available |
| Clear demo video, no more than three minutes | [`VIDEO_SCRIPT.md`](./VIDEO_SCRIPT.md) | Recording and public YouTube URL still required |
| Explain Codex and GPT-5.6 in the video | Dedicated 1:20-1:42 and 1:57-2:25 segments in the script | Scripted; recording required |
| English or English translation | Product, README, submission copy, and video script are English-first | Available; final video must include English narration/captions |
| Free judge access | `judge` / `ominilab-demo`; no payment or private invitation | Available |
| Existing-project disclosure | Pre-existing VatLi365 foundation separated from Build Week changes in [`BUILD_WEEK_DELTA.md`](./BUILD_WEEK_DELTA.md) | Documented |
| One category | Education | Chosen; must be selected once in Devpost |

## Stage-one viability

- The public site, API, authentication, six firmware records, and deployment health are live.
- The GPT-5.6 adapter has been verified on production; its model is selected only by the backend.
- The harmonic-motion lab has an explicitly labeled synthetic replay for hardware-free judging.
- The physical demonstration remains essential evidence that Ominilab is a real lab platform rather than only a simulation.

## Judging criteria

| Criterion | Primary evidence |
| --- | --- |
| Technological implementation | Public MicroPython, browser WebSerial flashing, FastAPI REST/WebSockets, React/Chart.js analysis, GPT-5.6 Responses API, deterministic hashes, backend tests, CI/CD |
| Design | One coherent sign-in-to-experiment workflow, six focused labs, responsive UI, live deployment, judge route, OpenAPI documentation |
| Potential impact | Specific school-lab constraints, multi-observer architecture, open commodity hardware, inquiry/STEM model, measurable pilot plan in [`EDUCATION_IMPACT.md`](./EDUCATION_IMPACT.md) |
| Quality of the idea | Real measurements constrain AI feedback; the system combines hands-on uncertainty with web reach instead of replacing experiments with generic chat or idealized simulation |

## Claims discipline

The submission may claim a working technical platform, not proven universal learning gains. It may describe pilot hypotheses and multinational deployment potential, but must not claim completed controlled studies, complete localization, full accessibility compliance, or hardware validation that has not been performed.

## Blocking items before submission

1. Add the primary Codex `/feedback` Session ID to the README and Devpost form.
2. Record and publish the final physical demo at or below three minutes.
3. Complete and document real-hardware acceptance for all six experiments.
4. Confirm third-party asset and firmware-base-image licensing.
5. Test every public link and credential in a signed-out browser.

# Educational impact and evaluation plan

## Intended learners and settings

- Secondary-school physics students.
- Introductory university laboratories.
- STEM clubs, maker programs, and teacher professional development.
- Schools with limited laboratory inventory.
- Remote or hybrid classes that need shared observation of one physical apparatus.

## Learning model

Ominilab supports an inquiry cycle:

```text
predict -> assemble -> measure -> visualize -> calculate
-> explain with evidence -> critique AI feedback -> repeat
```

The six labs connect multiple STEM domains:

- **Science:** mechanics, thermodynamics, electromagnetism, and circuits.
- **Technology:** sensors, WebSerial, WebSockets, browser applications, and APIs.
- **Engineering:** apparatus construction, wiring, calibration, failure diagnosis, and iteration.
- **Mathematics:** units, graphs, regression, slopes, exponentials, uncertainty, and model comparison.
- **AI literacy:** grounding, checking model claims against data, and treating AI feedback as a hypothesis rather than authority.

## Improvements over common lab formats

| Format | Strength | Common limitation | Ominilab contribution |
| --- | --- | --- | --- |
| Hands-on bench lab | Real equipment and uncertainty | Scarce stations, local observation, manual data | Retains hardware while adding live shared telemetry and analysis |
| Simulation | Cheap, repeatable, scalable | Idealized behavior; no wiring, calibration, or sensor noise | Uses physical data and exposes the measurement pipeline |
| Commercial data logger | Integrated and reliable | Cost, closed firmware, vendor dependence | Low-cost commodity hardware and auditable source |
| Generic AI tutor | Immediate dialogue | Often detached from what the learner actually measured | Prompts and evaluation are grounded in experiment statistics |
| Recorded demonstration | Accessible to many viewers | Passive and not interactive | Multiple live observers can follow one apparatus and inspect data |

## Credible impact claims

The current implementation demonstrates technical feasibility and a complete learning workflow. It does **not** yet prove statistically significant learning gains, teacher time savings, or cost reductions across schools. Those outcomes require pilots and comparison data.

The credible near-term hypotheses are:

1. Browser flashing reduces time from kit connection to first measurement.
2. Live charts and computed quantities reduce transcription errors and increase time available for interpretation.
3. Multiple browser observers improve participation around scarce apparatus.
4. Public firmware improves debugging and supports engineering/computing objectives.
5. Measurement-grounded AI feedback improves the specificity of reflection questions.
6. Asking learners to critique AI against physical evidence strengthens data and AI literacy.

## Pilot evaluation

Compare Ominilab with the same experiment taught using the school's normal workflow. Collect:

- time to first valid measurement;
- apparatus setup and recovery time;
- percentage of learners who can identify variables, units, and graph relationships;
- pre/post concept questions tied to each experiment;
- graph-interpretation and uncertainty-analysis rubric scores;
- transcription and calculation error counts;
- number of active observers per apparatus;
- quality of claim-evidence-reasoning explanations;
- ability to identify or correct an unsupported AI statement;
- teacher workload and classroom-management observations;
- hardware and maintenance cost per usable station;
- learner and teacher accessibility/usability feedback.

Report sample size, context, comparison condition, missing data, and negative findings. Do not turn pilot observations into universal claims.

## International deployment

Existing strengths:

- English-first web UI and no school-specific account hierarchy.
- Open-source software and public firmware.
- Commodity ESP32-family support.
- HTTPS/WSS deployment and remote multi-observer architecture.
- No experiment telemetry retained in the central database.

Work required for responsible multinational use:

- internationalization framework and reviewed translations;
- local curriculum mappings and unit conventions;
- accessibility audit against WCAG guidance;
- low-bandwidth and intermittent-network behavior;
- region-appropriate electrical safety documentation;
- local hardware sourcing and sensor calibration guidance;
- compliance with local student privacy and AI-use rules;
- availability only where OpenAI services and the competition/product terms permit use;
- teacher controls and age-appropriate AI interaction if deployed to minors at scale.

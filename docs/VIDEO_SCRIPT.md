# Three-minute demonstration script

Target duration: 2 minutes 45 seconds. Language: English. Upload publicly to YouTube. Use original narration and no unlicensed music, footage, logos, or other third-party material.

| Time | Screen | Suggested narration |
| --- | --- | --- |
| 0:00–0:15 | Physical apparatus, then live home page | “Physics is learned by testing reality, but many classrooms have too few lab stations, closed equipment, and little time for feedback. Ominilab turns a low-cost ESP32 into an open, remotely observable physics lab.” |
| 0:15–0:30 | Six-experiment catalog | “It includes six focused experiments across mechanics, thermal physics, electromagnetism, and circuits. The same workflow connects hardware, live data, analysis, and reflection.” |
| 0:30–0:52 | Flash ESP32 page and a readable firmware file in GitHub | “A learner chooses a board and flashes public MicroPython directly in the browser. The application firmware is readable and unencrypted, so the sensor-to-graph pipeline can be audited and modified.” |
| 0:52–1:20 | Harmonic-motion apparatus moving and chart updating | “This BMI160 measures acceleration from a real oscillator. FastAPI relays the secure WebSocket stream to the browser, which calibrates the sensor and reconstructs displacement, velocity, acceleration, period, and amplitude.” |
| 1:20–1:42 | GPT-5.6 questions and answer feedback | “GPT-5.6 is not a generic chatbot here. It receives statistics from this measured run, generates questions at multiple cognitive levels, and evaluates the learner's answer against the actual experiment.” |
| 1:42–1:57 | Quickly show specific heat, induction, capacitor, lamp, resistor pages | “The same open platform supports heat capacity, induction, capacitor charge and discharge, and linear and nonlinear current-voltage investigations.” |
| 1:57–2:25 | Git history, Codex task, CI green, architecture diagram | “Codex helped us isolate a pre-existing education and hardware foundation into a new independent Build Week product: remove unrelated commercial modules, design the minimal backend, open the firmware path, debug responsive authentication, automate deployment, and document every decision. GPT-5.6 powers the measured-data learning loop.” |
| 2:25–2:42 | Split screen: several browser observers and physical kit | “One apparatus can support multiple observers, while open commodity hardware reduces lock-in. Ominilab combines hands-on science, data literacy, electronics, coding, and critical AI literacy.” |
| 2:42–2:55 | Live URL, repository, judge account | “The live product, public MIT-licensed repository, test account, API, firmware, and Build Week evidence are available now. Ominilab makes AI answerable to real physics.” |

## Recording checklist

- Keep the final exported duration at or below 3:00.
- Narrate what Codex did with specific decisions; do not say only “Codex generated the code.”
- Say “GPT-5.6” and show its measured-data role.
- Show the physical device producing a changing chart.
- Show the public firmware source and live production URL.
- Include readable captions; provide English translation if narration is not English.
- Do not show API keys, JWTs, SSH keys, private dashboards, terminal history containing secrets, or student information.
- Test the YouTube URL in a signed-out/private browser window.

# Three-minute demonstration script

Target duration: 2 minutes 50 seconds. Language: English. Upload publicly to YouTube. Use original narration and no unlicensed music, footage, logos, or other third-party material.

This cut demonstrates two experiments end to end: **Harmonic Motion with BMI160** (the GPT-5.6 flagship) and **Specific Heat Capacity of Water**. The remaining four labs appear only as a catalog shot.

| Time | Screen / camera | Narration (read aloud) |
| --- | --- | --- |
| 0:00–0:15 | Close-up of the real apparatus (spring, mass, ESP32 with BMI160), then cut to `https://ominilab.vatli365.vn` | "Physics is learned by measuring reality. But many classrooms have too few lab stations and closed equipment. Ominilab turns a low-cost ESP32 into an open, remotely observable physics laboratory." |
| 0:15–0:35 | Sign in as `judge`. Show the six-experiment catalog, then the Flash ESP32 page with a readable MicroPython source file | "We built this with Codex for OpenAI Build Week. A learner signs in, picks one of six experiments, and flashes public, readable MicroPython right in the browser. Nothing is encrypted — the whole path from sensor to graph can be audited." |
| 0:35–1:00 | **Experiment 1 — camera on hardware.** Type the device ID shown by the ESP32, click Connect, pull the mass down and release. Cut to the live x(t), v(t), a(t) charts updating | "First, harmonic motion. The BMI160 streams real acceleration at 200 hertz through a secure WebSocket relay. The browser calibrates the sensor and reconstructs displacement, velocity, and acceleration — live." |
| 1:00–1:20 | Zoom on the Measurements panel: period, angular frequency, amplitude, detected cycles. Show the fitted x(t) = A·cos(ωt) formula | "From the waveform, Ominilab measures the period, angular frequency, and amplitude of this exact oscillator — not a simulation." |
| 1:20–1:48 | Click "Ask the AI assistant" → "Generate questions". Show the three Bloom-level questions. Type an answer and click Evaluate; show the score and feedback | "Now the key idea: GPT-5.6 receives the statistics of this measured run. It generates questions at three cognitive levels, grounded in my own data, and grades my answer against the real period and amplitude. The AI is answerable to the experiment." |
| 1:48–2:15 | **Experiment 2 — camera on hardware.** Water cell with heater, DS18B20 probe, INA226 board. Connect, start heating. Cut to the temperature–time chart rising and the power reading | "Second, specific heat. A temperature probe and a power meter stream into the same platform. As the heater warms the water, the browser plots temperature against time and tracks the electrical energy delivered." |
| 2:15–2:30 | Show the linear trend and the computed specific heat value next to the accepted 4186 J/(kg·K) | "From the slope and the measured power, Ominilab computes the specific heat capacity of water — and the learner compares their measured value with the accepted one." |
| 2:30–2:45 | Fast montage: dated Git history, green GitHub Actions run, `/judges` page | "Codex worked as our engineering collaborator: it scoped the product, built the minimal FastAPI backend, opened the firmware path, automated deployment, and documented the evidence — while we made the product and physics decisions." |
| 2:45–2:55 | Live URL, repository page, judge credentials on screen | "Ominilab is live, MIT-licensed, and open for testing today — with a hardware-free judge replay included. Ominilab makes AI answerable to real physics." |

## Recording checklist

- Keep the final exported duration at or below 3:00.
- Show the physical device producing a changing chart for **both** experiments.
- Narrate what Codex did with specific decisions; do not say only "Codex generated the code."
- Say "GPT-5.6" on camera and show the generate → answer → evaluate loop.
- Show the public firmware source and the live production URL.
- Include readable captions; provide an English translation if any narration is not English.
- Do not show API keys, JWTs, SSH keys, private dashboards, or terminal history containing secrets.
- Test the YouTube URL in a signed-out/private browser window before submitting.

## Practical filming notes

- Film hardware shots in landscape with strong lighting; keep the ESP32 and sensor in frame while the chart reacts.
- Record the browser at 1920×1080 with 100 % zoom; hide bookmarks and other tabs.
- If reading English is difficult in one take, record the narration separately and lay it over the screen recording.
- The GPT-5.6 segment (1:20–1:48) is the heart of the video — do not cut it short.

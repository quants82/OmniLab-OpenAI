# Judge quick start

## Fastest evaluation path

1. Open [https://ominilab.vatli365.vn](https://ominilab.vatli365.vn).
2. Sign in with `judge` / `ominilab-demo`.
3. Browse the six experiment dashboards and the **Flash ESP32** workflow.
4. Open **Harmonic Motion with BMI160**, select **Run hardware-free judge demo**, and wait for at least six cycles.
5. Open the AI learning panel, generate questions, and inspect how the prompt is grounded in the run. The UI and AI prompt both identify this path as a synthetic replay.
6. Open the [public API documentation](https://ominilab.vatli365.vn/docs).
7. Inspect the readable firmware in `frontend_Ominilab/esp32` and the six-item registry in `backend_Ominilab/routers/lab.py`.

No payment, private invitation, school account, Teacher/Student role, or PRO membership is required. The test account remains available free of charge through the judging period.

## Verify the live backend without installing anything

Health endpoint:

```text
https://ominilab.vatli365.vn/api/lab/health
```

Expected essentials:

```json
{"status":"ok","experiments":6}
```

## Verify authentication, firmware, and GPT-5.6

PowerShell:

```powershell
$baseUrl = "https://ominilab.vatli365.vn"
$login = Invoke-RestMethod "$baseUrl/api/auth/login" `
  -Method Post -ContentType "application/json" `
  -Body '{"username":"judge","password":"ominilab-demo"}'
$headers = @{ Authorization = "Bearer $($login.access_token)" }

$firmware = Invoke-RestMethod "$baseUrl/api/lab/firmware" -Headers $headers
$firmware.firmwares | Select-Object id, title

$body = @{
  messages = @(@{
    role = "user"
    content = "Explain why repeated measurements improve a physics experiment."
  })
  max_tokens = 120
} | ConvertTo-Json -Depth 5

Invoke-RestMethod "$baseUrl/api/ai/explain" `
  -Method Post -Headers $headers -ContentType "application/json" -Body $body
```

The returned `model` must be `gpt-5.6`; the firmware list must contain exactly six experiment IDs.

## What can be tested without ESP32 hardware

- A deterministic, explicitly labeled harmonic-motion replay with displacement, velocity, acceleration, period, amplitude, and GPT-5.6-grounded questions.
- Complete public website, responsive authentication, navigation, experiment theory, dashboards, and API documentation.
- Register/login/current-user flow.
- Six-entry firmware manifest and Base64 source bundles with SHA-256 hashes.
- GPT-5.6 Responses API adapter.
- CI/CD history, backend smoke test, static frontend build, and production health.
- Public MicroPython source, supported board images, device prefixes, and WebSocket relay implementation.

## What requires hardware

- WebSerial flashing of an ESP32-family board.
- Physical sensor measurements, calibration, wiring, and real-time waveforms.
- End-to-end device-to-browser WebSocket telemetry from the selected apparatus.

The demonstration video must show this physical path. The sponsor may request access to the hardware; the entrant should keep a working kit available through judging.

## Evidence map for the four judging criteria

| Criterion | Evidence |
| --- | --- |
| Technological Implementation | FastAPI relay, six public firmware bundles, sensor-specific React analysis, GPT-5.6 Responses API, tests, CI/CD, three project Codex skills |
| Design | Live HTTPS product, simple login, browser flashing, coherent six-lab catalog, responsive modal, English-first UI |
| Potential Impact | Low-cost open hardware, multiple remote observers, inquiry/data/AI literacy loop, measurable pilot plan |
| Quality of the Idea | Physical measurements ground AI feedback; open firmware and remote observation bridge hands-on labs and scalable digital learning |

## Known limitations

- New physical data requires compatible hardware.
- GPT-5.6 educational interaction is currently deepest in the harmonic-motion flagship lab.
- The UI is English-first rather than fully localized.
- WebSocket channels are selected by device ID and do not currently require JWT authentication.
- Educational outcomes have an evaluation plan but no completed controlled pilot data yet.

These limitations are disclosed to keep the submission reproducible and technically honest.

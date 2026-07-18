# Ominilab Frontend

English-first Astro/React interface for six open ESP32 physics experiments.

## Included experiments

1. Harmonic motion with BMI160
2. Specific heat capacity of water
3. Electromagnetic induction
4. Capacitor charge and discharge
5. Incandescent lamp I-V characteristic
6. Resistor I-V characteristic

## Local development

```bash
npm install
copy .env.example .env
npm run dev
```

The FastAPI backend runs at `http://localhost:8000` by default. Override it with `PUBLIC_API_URL`.

## Public firmware

The `esp32/` directory contains only the six experiment programs and their required public drivers. The **Flash ESP32** page installs MicroPython and uploads the selected source through WebSerial. Use desktop Chrome or Edge.

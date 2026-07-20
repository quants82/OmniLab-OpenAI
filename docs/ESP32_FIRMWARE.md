# ESP32 firmware

## Open-source model

All application firmware is readable MicroPython under `frontend_Ominilab/esp32`. The browser flasher installs a public MicroPython base image, then writes the chosen experiment program as `main.py` with its helper files. Flash encryption, secure boot, subscription validation, ownership approval, and hidden binary application code are intentionally absent.

`vatli_auth.py` keeps a legacy compatibility filename, but it only handles Wi-Fi setup and device/MAC identification. It contains no subscription or device-secret check.

## Firmware inventory

| Experiment ID | Main source | Extra files | Device prefix |
| --- | --- | --- | --- |
| `harmonic-motion-bmi160` | `esp32_shm_bmi160.py` | `vatli_auth.py` | `ESP32-SHM2-` |
| `specific-heat` | `esp32_specific_heat.py` | `ina226.py`, `i2c_lcd.py`, `vatli_auth.py` | `ESP32-SH-` |
| `induction` | `esp32_induction.py` | `ads1115.py`, `vatli_auth.py` | `ESP32-Induction-` |
| `capacitor` | `esp32_capacitor.py` | `vatli_auth.py` | `ESP32-Capacitor-` |
| `lamp-va` | `esp32_lamp_va.py` | `vatli_auth.py` | `ESP32-Lamp-` |
| `resistor-va` | `esp32_resistor_va.py` | `vatli_auth.py` | `ESP32-Resistor-` |

The authoritative bundle registry is `backend_Ominilab/routers/lab.py`. If a filename, experiment ID, or helper changes, update that registry, its smoke test, the flasher UI, and this document together.

## Supported base images

The repository includes MicroPython 1.28.0 images for ESP32, ESP32-C3, ESP32-S2, ESP32-S3, and ESP32-C6 under `frontend_Ominilab/public/firmware/base`. Flash addresses come from the backend manifest.

## Browser flashing

1. Use desktop Chrome or Edge; WebSerial is required.
2. Sign in to Ominilab.
3. Open `/nap-firmware` and select the board family and experiment.
4. Connect the ESP32 by USB and grant the browser serial permission.
5. Flash the base image and public bundle.
6. Reboot the ESP32 and complete its Wi-Fi setup if required.
7. Read the device suffix/MAC from serial output and enter it on the matching experiment page.

Production bundles embed `ominilab.vatli365.vn` through `PUBLIC_WS_HOST`; firmware uses secure `wss://` connections.

## Safe firmware change checklist

1. Preserve the device prefix shared with the React experiment component.
2. Preserve JSON field names or update the browser parser in the same commit.
3. Keep the program compatible with the supported MicroPython runtime and constrained memory.
4. Avoid CPython-only modules and large allocations in sample loops.
5. Confirm reconnect behavior and error reporting when sensors or Wi-Fi are unavailable.
6. Request the bundle and verify its `sha256`, output paths, and host substitution.
7. Test real hardware when the change touches pins, buses, calibration, timing, or sensor drivers.

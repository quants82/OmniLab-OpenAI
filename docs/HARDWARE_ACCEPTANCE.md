# Six-lab hardware acceptance checklist

Use this document before recording the competition video. Record board model, sensor/module revision, apparatus values, browser, date, tester, result, and evidence link for every run. Do not mark a lab complete from source review alone.

## Common checks for every lab

- [ ] Flash the selected MicroPython base image and public application bundle from the browser.
- [ ] Complete Wi-Fi configuration without editing a secret into source control.
- [ ] Confirm the displayed device ID matches the experiment prefix documented in [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md).
- [ ] Connect over `wss://ominilab.vatli365.vn` and receive live values in the correct dashboard.
- [ ] Observe the same device from two browsers at once.
- [ ] Exercise start, stop/pause, resume, disconnect, reconnect, and page reload.
- [ ] Check labels, units, sign conventions, timebase, empty states, and invalid device-ID handling.
- [ ] Export/save data where supported and verify that the resulting values are parseable.
- [ ] Compare at least one result with a reference instrument or independent calculation.
- [ ] Photograph wiring and record electrical/thermal safety precautions.

## 1. Harmonic motion with BMI160

- [ ] Calibration identifies the correct gravity axis in each supported mounting orientation.
- [ ] A stationary sensor produces a near-zero dynamic signal after calibration.
- [ ] Displacement and acceleration have the expected opposite phase; velocity is approximately quarter-cycle shifted.
- [ ] Period agrees with a stopwatch/video reference within a declared tolerance.
- [ ] At least six cycles converge before GPT-5.6 questions are enabled.
- [ ] A generated question and evaluated answer explicitly use the measured run values.
- [ ] The synthetic judge replay remains clearly labeled and cannot be confused with a BMI160 run.

## 2. Specific heat capacity of water

- [ ] DS18B20 temperature and INA226 voltage/current/power update together.
- [ ] Room-temperature readings agree with reference instruments within documented sensor tolerances.
- [ ] Heating produces a plausible monotonic temperature trend and positive electrical energy.
- [ ] Mass, interval, and two-point calculation reject missing or impossible inputs.
- [ ] Calculated specific heat is discussed with heat-loss, container, sensor-lag, and power uncertainties; it is not presented as an exact constant.
- [ ] Heater voltage, current, insulation, hot-water handling, and maximum run time are documented.

## 3. Electromagnetic induction

- [ ] The zero-input baseline is stable enough to see a magnet event.
- [ ] Reversing magnet motion reverses induced-voltage polarity.
- [ ] Faster flux change produces a visibly larger peak under comparable geometry.
- [ ] Pause, pan, zoom, automatic range, and reconnect behave correctly.
- [ ] Sample rate and ADS1115 input range are recorded with the apparatus evidence.

## 4. Capacitor charge and discharge

- [ ] Physical switch state matches the dashboard state.
- [ ] Charge and discharge traces are exponential and monotonic after smoothing.
- [ ] Estimated time constant is compared with the independent `R x C` value.
- [ ] Charge and stored energy use correct units and remain non-negative.
- [ ] Capacitor polarity, voltage rating, discharge procedure, and current limiting are documented.

## 5. Incandescent lamp I-V characteristic

- [ ] Voltage and current agree with a reference meter at representative points.
- [ ] The saved I-V curve is nonlinear and instantaneous resistance rises as the filament heats.
- [ ] Regression and comparison views remain stable with repeated or near-zero points.
- [ ] Supply current limit, hot-surface handling, and lamp rating are documented.

## 6. Resistor I-V characteristic

- [ ] Voltage and current agree with a reference meter at representative points.
- [ ] Linear regression reports a high `R²` for a suitable resistor and supply range.
- [ ] Calculated resistance agrees with color code/reference meter within combined tolerance.
- [ ] Near-zero voltage/current and repeated points do not produce misleading infinite or NaN output.
- [ ] Resistor power rating and supply current limit are documented.

## Acceptance record

| Lab | Board and sensor | Reference comparison | Browser(s) | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Harmonic motion |  |  |  | Pending |  |
| Specific heat |  |  |  | Pending |  |
| Induction |  |  |  | Pending |  |
| Capacitor |  |  |  | Pending |  |
| Lamp I-V |  |  |  | Pending |  |
| Resistor I-V |  |  |  | Pending |  |

Keep evidence free of Wi-Fi passwords, API keys, JWTs, SSH material, and student-identifying information.

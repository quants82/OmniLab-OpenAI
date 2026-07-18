import React from 'react';
import { Info, ListChecks } from 'lucide-react';

const theories: Record<string, { theory: string; steps: string[] }> = {
  'harmonic-motion': {
    theory: 'For ideal simple harmonic motion, acceleration is proportional to displacement and points toward equilibrium: a = -ω²x. The period is T = 2π√(m/k).',
    steps: ['Attach the BMI160 kit firmly to the oscillating mass.', 'Enter the 12-character device ID shown by the ESP32.', 'Keep the sensor still for calibration, then start recording.', 'Displace the mass, release it, and compare x(t), v(t), and a(t).'],
  },
  'specific-heat': {
    theory: 'Electrical energy Q = Pt raises the water temperature. Ignoring losses, the specific heat capacity is c = Q/(mΔT). A linear fit improves the estimate.',
    steps: ['Measure the water mass and enter it in kilograms.', 'Connect the temperature and power sensors.', 'Start heating and record points across a useful temperature range.', 'Fit the data and compare the measured value with the accepted value.'],
  },
  induction: {
    theory: 'Faraday’s law states that the induced emf is proportional to the rate of change of magnetic flux: ε = -dΦ/dt. The sign follows Lenz’s law.',
    steps: ['Connect the induction coil to the measurement circuit.', 'Enter the ESP32 device ID and connect.', 'Move the magnet through the coil at different speeds.', 'Compare pulse direction, peak voltage, and duration.'],
  },
  capacitor: {
    theory: 'For an RC circuit, capacitor voltage changes exponentially. During charging, Uc = U0(1-e^(-t/RC)); during discharge, Uc = U0e^(-t/RC).',
    steps: ['Build the RC circuit with the specified component values.', 'Connect the ESP32 and select charge or discharge.', 'Record the voltage curve.', 'Estimate the time constant τ = RC from the graph.'],
  },
  'va-characteristic': {
    theory: 'An ohmic resistor has an approximately linear I-V graph. A filament lamp is nonlinear because its resistance increases as the filament heats.',
    steps: ['Connect the component to the controlled measurement circuit.', 'Enter the ESP32 device ID and connect.', 'Sweep the voltage while recording current.', 'Fit or inspect the I-V curve and explain its shape.'],
  },
};

export function ExperimentTheory({ id }: { id: string }) {
  const data = theories[id];
  if (!data) return null;
  return <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900"><Info className="text-blue-600" size={20}/>Physics principle</h3>
        <p className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">{data.theory}</p>
      </div>
      <div>
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900"><ListChecks className="text-emerald-600" size={20}/>Procedure</h3>
        <ol className="mt-4 space-y-3">
          {data.steps.map((step, index) => <li key={step} className="flex gap-3 text-sm leading-relaxed text-slate-600"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-700">{index + 1}</span>{step}</li>)}
        </ol>
      </div>
    </div>
  </section>;
}

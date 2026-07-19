import React, { useEffect, useRef, useState } from 'react';
import { ESPLoader, Transport } from 'esptool-js';
import { AlertTriangle, CheckCircle2, Loader2, Lock, Usb, Zap } from 'lucide-react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { API_CONFIG } from '../config/api.config';

type ChipFamily = 'ESP32' | 'ESP32-C3' | 'ESP32-S2' | 'ESP32-S3' | 'ESP32-C6';
type Build = { base_file: string; address: string; ready: boolean; delivery: 'mpy' };
type Firmware = { id: string; title: string; source: string; builds: Partial<Record<ChipFamily, Build>> };
type BundleFile = { path: string; size: number; sha256: string; data: string };
type Bundle = { experiment_id: string; mpy_version: number; files: BundleFile[] };

const wait = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));

function familyFromChip(name: string): ChipFamily {
  const value = name.toUpperCase();
  if (value.includes('ESP32-S3')) return 'ESP32-S3';
  if (value.includes('ESP32-S2')) return 'ESP32-S2';
  if (value.includes('ESP32-C6')) return 'ESP32-C6';
  if (value.includes('ESP32-C3')) return 'ESP32-C3';
  return 'ESP32';
}

function decodeBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function api(path: string) {
  const response = await fetch(`${API_CONFIG.python.apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('jwt_token') || ''}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.detail || `Request failed (${response.status})`);
  return body;
}

async function uploadSourceBundle(port: any, bundle: Bundle, onProgress: (value: number) => void) {
  await port.open({ baudRate: 115200, bufferSize: 8192 });
  const reader = port.readable.getReader();
  const writer = port.writable.getWriter();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let responseBuffer = '';
  let reading = true;

  const pump = (async () => {
    while (reading) {
      try {
        const result = await reader.read();
        if (result.done) break;
        responseBuffer += decoder.decode(result.value, { stream: true });
      } catch {
        break;
      }
    }
  })();

  const write = (value: string) => writer.write(encoder.encode(value));
  const executeRaw = async (code: string) => {
    responseBuffer = '';
    await write(code + '\x04');
    const deadline = Date.now() + 12000;
    while (!responseBuffer.includes('\x04>')) {
      if (Date.now() > deadline) throw new Error('ESP32 did not respond in raw REPL mode.');
      await wait(30);
    }
    if (!responseBuffer.includes('OK')) throw new Error('ESP32 rejected a source upload command.');
  };

  try {
    responseBuffer = '';
    await write('\x03\x03\x01');
    const deadline = Date.now() + 12000;
    while (!(responseBuffer.includes('raw REPL') && responseBuffer.includes('>'))) {
      if (Date.now() > deadline) throw new Error('Could not enter MicroPython raw REPL.');
      await wait(30);
    }

    const files = [...bundle.files].sort((left, right) => Number(left.path === 'main.py') - Number(right.path === 'main.py'));
    const total = files.reduce((sum, file) => sum + file.size, 0);
    let uploaded = 0;
    for (const file of files) {
      const bytes = decodeBase64(file.data);
      await executeRaw(`import ubinascii\nf=open('${file.path}','wb')`);
      for (let offset = 0; offset < bytes.length; offset += 384) {
        const chunk = bytes.slice(offset, offset + 384);
        let binary = '';
        chunk.forEach(byte => { binary += String.fromCharCode(byte); });
        await executeRaw(`f.write(ubinascii.a2b_base64('${btoa(binary)}'))`);
        uploaded += chunk.length;
        onProgress(65 + Math.round((uploaded / Math.max(total, 1)) * 34));
      }
      await executeRaw(`f.close()\nimport os\nassert os.stat('${file.path}')[6]==${bytes.length}`);
    }
    await write('\x02\x04');
  } finally {
    reading = false;
    try { await reader.cancel(); } catch { /* no-op */ }
    try { await pump; } catch { /* no-op */ }
    reader.releaseLock();
    writer.releaseLock();
    try { await port.close(); } catch { /* no-op */ }
  }
}

function Flasher() {
  const { isAuthenticated, isLoading } = useAuth();
  const [firmwares, setFirmwares] = useState<Firmware[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [port, setPort] = useState<any>(null);
  const [chipName, setChipName] = useState('');
  const [family, setFamily] = useState<ChipFamily | null>(null);
  const [deviceId, setDeviceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const terminalLog = useRef('');

  useEffect(() => {
    if (!isAuthenticated) return;
    api('/api/lab/firmware')
      .then(result => setFirmwares(Array.isArray(result.firmwares) ? result.firmwares : []))
      .catch(reason => setError(reason.message));
  }, [isAuthenticated]);

  const terminal = {
    clean: () => { terminalLog.current = ''; },
    write: (value: string) => { terminalLog.current += value; },
    writeLine: (value: string) => { terminalLog.current += `${value}\n`; },
  };

  const inspect = async () => {
    setBusy(true); setError(''); setMessage(''); setProgress(0);
    let transport: any;
    try {
      const selectedPort = await (navigator as any).serial.requestPort();
      transport = new Transport(selectedPort, false);
      const loader = new ESPLoader({ transport, baudrate: 115200, terminal } as any);
      const detectedChip = String(await loader.main());
      let mac = '';
      try { mac = String(await (loader as any).chip.readMac(loader)).replace(/[:\-\s]/g, '').toUpperCase(); } catch { /* optional */ }
      setPort(selectedPort);
      setChipName(detectedChip);
      setFamily(familyFromChip(detectedChip));
      setDeviceId(mac);
      setMessage('ESP32 detected. Select an experiment and flash the public source.');
    } catch (reason: any) {
      setError(reason?.message || String(reason));
    } finally {
      try { await transport?.disconnect(); } catch { /* no-op */ }
      setBusy(false);
    }
  };

  const flash = async () => {
    const firmware = firmwares.find(item => item.id === selectedId);
    const build = family && firmware?.builds[family];
    if (!port || !firmware || !family || !build) return;
    setBusy(true); setError(''); setMessage(''); setProgress(0);
    let transport: any;
    try {
      const bundle = await api(`/api/lab/firmware/${firmware.id}/bundle`);
      transport = new Transport(port, false);
      // 460800 drops the serial port mid-write on some boards/cables
      // (ESP32-C3 USB-JTAG, CH340 clones); 115200 matches the detect step.
      const loader = new ESPLoader({ transport, baudrate: 115200, terminal } as any);
      await loader.main();
      const baseResponse = await fetch(build.base_file, { cache: 'no-store' });
      if (!baseResponse.ok) throw new Error(`Could not download MicroPython base firmware (${baseResponse.status}).`);
      const base = new Uint8Array(await baseResponse.arrayBuffer());
      await loader.writeFlash({
        fileArray: [{ data: base, address: parseInt(build.address.replace(/^0x/i, ''), 16) || 0 }],
        flashMode: 'keep', flashFreq: 'keep', flashSize: 'keep', eraseAll: true, compress: true,
        reportProgress: (_index: number, written: number) => setProgress(Math.round((written / base.length) * 60)),
      } as any);
      try { await loader.after('hard_reset'); } catch { /* manual reset is acceptable */ }
      await transport.disconnect();
      transport = null;
      await wait(2500);
      await uploadSourceBundle(port, bundle, setProgress);
      setProgress(100);
      setMessage('Firmware installed. Configure Wi-Fi on the ESP32, then enter its 12-character device ID in the experiment page.');
    } catch (reason: any) {
      setError(reason?.message || String(reason));
    } finally {
      try { await transport?.disconnect(); } catch { /* no-op */ }
      setBusy(false);
    }
  };

  if (isLoading) return <Center><Loader2 className="animate-spin"/>Loading account…</Center>;
  if (!isAuthenticated) return <Center><Lock/>Sign in to flash experiment firmware.</Center>;
  if (typeof navigator !== 'undefined' && !('serial' in navigator)) return <Center><AlertTriangle/>Use desktop Chrome or Edge with WebSerial support.</Center>;

  const available = family ? firmwares.filter(item => item.builds[family]?.ready) : firmwares;
  return <main className="min-h-[75vh] bg-slate-50 px-4 py-12">
    <div className="mx-auto max-w-3xl space-y-6">
      <div><p className="text-xs font-black uppercase tracking-[.2em] text-blue-600">Open firmware workflow</p><h1 className="mt-2 text-4xl font-black text-slate-900">Flash an ESP32 in the browser</h1><p className="mt-3 text-slate-600">The selected MicroPython source and drivers are public in this repository and uploaded without encryption.</p></div>
      {error && <Notice tone="rose"><AlertTriangle size={18}/>{error}</Notice>}
      {message && <Notice tone="green"><CheckCircle2 size={18}/>{message}</Notice>}

      <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <Step number="1" title="Connect the ESP32 over USB" />
        <button onClick={inspect} disabled={busy} className="primary-button mt-5">{busy ? <Loader2 className="animate-spin" size={17}/> : <Usb size={17}/>} Detect device</button>
        {family && <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2"><Info label="Chip" value={`${family} · ${chipName}`}/><Info label="Device ID" value={deviceId || 'Read after restart'} mono/></div>}
      </section>

      {family && <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
        <Step number="2" title="Select one of the six experiments" />
        <select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
          <option value="">Select an experiment…</option>
          {available.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
        <button onClick={flash} disabled={busy || !selectedId} className="primary-button mt-4 w-full justify-center py-4">{busy ? <Loader2 className="animate-spin" size={18}/> : <Zap size={18}/>} Flash MicroPython + source</button>
        {(busy || progress > 0) && <div className="mt-4"><div className="mb-1 text-right text-xs font-black text-blue-700">{progress}%</div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-blue-600 transition-all" style={{width:`${progress}%`}}/></div></div>}
      </section>}
    </div>
    <style>{`.primary-button{display:inline-flex;align-items:center;gap:.5rem;border-radius:.75rem;background:#2563eb;color:white;padding:.75rem 1rem;font-size:.875rem;font-weight:800}.primary-button:disabled{opacity:.4}`}</style>
  </main>;
}

function Center({children}:{children:React.ReactNode}) { return <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 p-6"><div className="flex max-w-lg flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-600 shadow-sm">{children}</div></div>; }
function Step({number,title}:{number:string;title:string}) { return <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">{number}</span><h2 className="font-black text-slate-900">{title}</h2></div>; }
function Info({label,value,mono=false}:{label:string;value:string;mono?:boolean}) { return <div><div className="text-[10px] font-black uppercase text-slate-400">{label}</div><div className={`break-all text-sm font-bold text-slate-700 ${mono?'font-mono':''}`}>{value}</div></div>; }
function Notice({children,tone}:{children:React.ReactNode;tone:'rose'|'green'}) { return <div className={`flex items-center gap-2 rounded-2xl border p-4 text-sm ${tone==='green'?'border-emerald-200 bg-emerald-50 text-emerald-700':'border-rose-200 bg-rose-50 text-rose-700'}`}>{children}</div>; }

export default function ESP32Flasher() { return <AuthProvider><Flasher/></AuthProvider>; }

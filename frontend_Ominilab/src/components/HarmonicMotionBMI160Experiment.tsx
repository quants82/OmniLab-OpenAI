import { ExperimentTheory } from './shared/ExperimentTheory';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Line, Scatter } from 'react-chartjs-2';
import {
    Globe, Power, RefreshCw, Activity, Play, Square, Waves, Radio, Cpu,
    Pause, ZoomIn, Sparkles, BookOpen, ChevronDown, ChevronUp,
    Send, CheckCircle, AlertCircle, BarChart2, FileText, Trash2, PlusCircle,
    Wifi, WifiOff, Zap, Thermometer, Weight, Disc, Timer, Ruler
} from 'lucide-react';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedLab from './auth/ProtectedLab';
import { API_CONFIG } from '../config/api.config';

ChartJS.register(...registerables);

// ─── Types ───────────────────────────────────────────────────────────────────
interface DataPoint {
    tSec: number; a: number; v: number; x: number; quality: number;
}
interface AIQuestion {
    level: 'easy' | 'medium' | 'hard'; text: string; answer: string;
    evaluation: { score: number; feedback: string; correct: string } | null;
    evaluating: boolean;
}
interface ExperimentStats {
    period: number; frequency: number; omega: number;
    amplitude: number; vmax: number; amax: number;
}
interface SurveyRow {
    id: number; param: number; T: number; Tsq: number;
}
// ─── Signal Processor ────────────────────────────────────────────────────────
class SignalProcessor {
    t0 = 0; lastT = 0;
    sumX = 0; sumY = 0; sumZ = 0; calibCount = 0;
    gMean = 9.81; gravAxis: 'x' | 'y' | 'z' = 'z';
    aEma = 0; aDC = 0;
    crossState = 0; lastCrossT = 0; periodAcc = 0.85; crossCount = 0;
    xEma = 0; xHistory: { t: number; x: number }[] = [];
    peakA = 0; env = 0;
    axisOverride: 'x' | 'y' | 'z' | null = null;
    gMeanOverride: number | null = null;

    reset() {
        this.t0 = 0; this.lastT = 0;
        this.sumX = 0; this.sumY = 0; this.sumZ = 0; this.calibCount = 0;
        this.gMean = 9.81; this.gravAxis = 'z';
        this.aEma = 0; this.aDC = 0;
        this.crossState = 0; this.lastCrossT = 0; this.periodAcc = 0.85; this.crossCount = 0;
        this.xEma = 0; this.xHistory = [];
        this.peakA = 0; this.env = 0;
        this.axisOverride = null; this.gMeanOverride = null;
    }

    setAxisFromCalib(axis: 'x' | 'y' | 'z', g: number) {
        this.axisOverride = axis; this.gMeanOverride = g;
        this.gravAxis = axis; this.gMean = g;
    }

    process(t_ms: number, ax: number, ay: number, az: number, gm: number): DataPoint | null {
        if (this.t0 === 0 || t_ms < this.t0) {
            this.t0 = t_ms; this.lastT = t_ms;
            this.sumX = ax; this.sumY = ay; this.sumZ = az; this.calibCount = 1;
            return null;
        }
        const tSec = (t_ms - this.t0) / 1000.0;
        this.lastT = t_ms;

        if (!this.axisOverride && tSec < 1.5) {
            this.sumX += ax; this.sumY += ay; this.sumZ += az; this.calibCount++;
            const n = this.calibCount;
            const mX = Math.abs(this.sumX / n), mY = Math.abs(this.sumY / n), mZ = Math.abs(this.sumZ / n);
            if      (mX >= mY && mX >= mZ) { this.gravAxis = 'x'; this.gMean = this.sumX / n; }
            else if (mY >= mX && mY >= mZ) { this.gravAxis = 'y'; this.gMean = this.sumY / n; }
            else                           { this.gravAxis = 'z'; this.gMean = this.sumZ / n; }
            return { tSec: 0, a: 0, v: 0, x: 0, quality: 1 };
        }

        const plotT = this.axisOverride ? tSec : tSec - 1.5;
        if (plotT < 0) return { tSec: 0, a: 0, v: 0, x: 0, quality: 1 };

        const aVal = this.gravAxis === 'x' ? ax : this.gravAxis === 'y' ? ay : az;
        this.aEma = 0.10 * (aVal - this.gMean) + 0.90 * this.aEma;
        this.aDC  = 0.001 * this.aEma + 0.999 * this.aDC;
        const a_filtered = this.aEma - this.aDC;
        const quality = gm < 0.3 ? 1 : gm < 0.8 ? 0.5 : 0;

        // Chuẩn hóa chiều: gMean > 0 → trục cảm biến chỉ lên; gMean < 0 → chỉ xuống.
        // Nhân gSign để "kéo vật xuống = giá trị âm" bất kể hướng gắn cảm biến.
        const gSign = this.gMean >= 0 ? 1 : -1;
        const a_phys = a_filtered * gSign;

        const absA = Math.abs(a_phys);
        this.peakA = Math.max(absA, this.peakA * 0.9995);
        this.env = absA > this.env ? 0.20 * absA + 0.80 * this.env : 0.997 * this.env + 0.003 * absA;

        const zcThresh = Math.max(this.peakA * 0.20, 0.003);
        if (a_phys > zcThresh && this.crossState <= 0) {
            if (this.lastCrossT > 0) {
                const fullT = plotT - this.lastCrossT;
                if (fullT > 0.10 && fullT < 8.0) this.periodAcc = 0.75 * this.periodAcc + 0.25 * fullT;
            }
            this.lastCrossT = plotT; this.crossState = 1; this.crossCount++;
        } else if (a_phys < -zcThresh && this.crossState >= 0) {
            this.crossState = -1;
        }

        const T = Math.max(this.periodAcc, 0.2);
        const omega = (2 * Math.PI) / T;
        // x = -a/ω²: cùng pipeline với a_phys → cùng cắt trục 0, đúng ngược pha
        const x_now = -(a_phys / (omega * omega)) * 100;

        this.xHistory.push({ t: plotT, x: x_now });
        const histCutoff = plotT - 2.0;
        while (this.xHistory.length > 2 && this.xHistory[0].t < histCutoff) this.xHistory.shift();

        const targetT = plotT - T / 4;
        let x_delayed = 0;
        if (targetT > 0 && this.xHistory.length > 1) {
            for (let i = this.xHistory.length - 1; i >= 0; i--) {
                if (this.xHistory[i].t <= targetT) {
                    const lo = this.xHistory[i], hi = this.xHistory[Math.min(i + 1, this.xHistory.length - 1)];
                    x_delayed = hi.t > lo.t ? lo.x + (targetT - lo.t) / (hi.t - lo.t) * (hi.x - lo.x) : lo.x;
                    break;
                }
            }
        }
        return { tSec: plotT, a: a_phys, v: -omega * x_delayed, x: x_now, quality };
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function peakOf(arr: number[]) { return arr.length ? Math.max(...arr.map(Math.abs)) : 0; }

function linearRegression(xs: number[], ys: number[]) {
    const n = xs.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
    const xMean = xs.reduce((a, b) => a + b, 0) / n;
    const yMean = ys.reduce((a, b) => a + b, 0) / n;
    const ssXX = xs.reduce((s, x) => s + (x - xMean) ** 2, 0);
    const ssXY = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
    const ssYY = ys.reduce((s, y) => s + (y - yMean) ** 2, 0);
    if (ssXX === 0) return { slope: 0, intercept: yMean, r2: 0 };
    const slope = ssXY / ssXX;
    const intercept = yMean - slope * xMean;
    const r2 = ssYY > 0 ? (ssXY ** 2) / (ssXX * ssYY) : 1;
    return { slope, intercept, r2 };
}

const AI_URL = `${API_CONFIG.python.apiUrl}/api/ai/explain`;

async function callAI(messages: object[], temperature = 0.7, max_tokens = 600): Promise<string> {
    const res = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('jwt_token') || ''}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, temperature, max_tokens, response_format: { type: 'json_object' } })
    });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error ${res.status}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || '{}';
}

async function generateAIQuestions(stats: ExperimentStats): Promise<AIQuestion[]> {
    const content = await callAI([
        {
            role: 'system',
            content: `You are a concise physics lab tutor. Create exactly three questions grounded in the measured harmonic-motion data, increasing in Bloom difficulty. Return JSON only: {"questions":[{"level":"easy","text":"..."},{"level":"medium","text":"..."},{"level":"hard","text":"..."}]}`
        },
        {
            role: 'user',
            content: `Measured results: T=${stats.period.toFixed(3)}s, f=${stats.frequency.toFixed(3)}Hz, ω=${stats.omega.toFixed(2)}rad/s, A=${stats.amplitude.toFixed(2)}cm, Vmax=${stats.vmax.toFixed(2)}cm/s, amax=${stats.amax.toFixed(3)}m/s²`
        }
    ]);
    const raw = JSON.parse(content);
    return (raw.questions || []).map((q: any) => ({
        level: q.level || 'medium', text: q.text || '', answer: '', evaluation: null, evaluating: false
    }));
}

async function evaluateAnswer(question: string, answer: string, stats: ExperimentStats) {
    const content = await callAI([
        {
            role: 'system',
            content: `You are a physics lab tutor. Context: T=${stats.period.toFixed(3)}s, A=${stats.amplitude.toFixed(2)}cm. Evaluate the learner's answer against the experiment. Return JSON only: {"score":0-10,"feedback":"...","correct":"..."}`
        },
        { role: 'user', content: `Question: ${question}\nLearner answer: ${answer}` }
    ], 0.4, 300);
    return JSON.parse(content);
}

function HarmonicMotionBMI160Content() {
    const [macInput, setMacInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [dataLog, setDataLog] = useState<DataPoint[]>([]);
    const [period, setPeriod] = useState(0.85);
    const [status, setStatus] = useState<'idle' | 'calib' | 'live' | 'paused'>('idle');
    const [gravAxisLabel, setGravAxisLabel] = useState('auto');
    const [viewMode, setViewMode] = useState<'3T' | '5T' | '10T' | 'ALL'>('5T');
    const [aiOpen, setAiOpen] = useState(false);
    const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [surveyOpen, setSurveyOpen] = useState(false);
    const [surveyMode, setSurveyMode] = useState<'mass' | 'spring'>('mass');
    const [surveyRows, setSurveyRows] = useState<SurveyRow[]>([]);
    const [paramInput, setParamInput] = useState('');
    const [converging, setConverging] = useState(false);
    const [crossCount, setCrossCount] = useState(0);
    const [showX, setShowX] = useState(true);
    const [showV, setShowV] = useState(true);
    const [showA, setShowA] = useState(true);

    const ws = useRef<WebSocket | null>(null);
    const isRecRef = useRef(false);
    const bufferRef = useRef<DataPoint[]>([]);
    const processor = useRef(new SignalProcessor());
    const renderTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const statusRef = useRef<'idle' | 'calib' | 'live' | 'paused'>('idle');

    useEffect(() => { isRecRef.current = isRecording; }, [isRecording]);

    const startRenderLoop = useCallback(() => {
        if (renderTimer.current) clearInterval(renderTimer.current);
        renderTimer.current = setInterval(() => {
            if (!bufferRef.current.length) return;
            setDataLog([...bufferRef.current]);
            setPeriod(parseFloat(processor.current.periodAcc.toFixed(3)));
            setConverging(processor.current.crossCount < 6);
            setCrossCount(processor.current.crossCount);
        }, 80);
    }, []);

    const stopRenderLoop = useCallback(() => { if (renderTimer.current) { clearInterval(renderTimer.current); renderTimer.current = null; } }, []);

    const toggleConnection = () => {
        if (isConnected) { ws.current?.close(); setIsConnected(false); setStatus('idle'); }
        else {
            const mac = macInput.trim().replace(/:/g, '').toUpperCase();
            if (mac.length !== 12) { alert('Device ID must contain 12 hexadecimal characters.'); return; }
            const socket = new WebSocket(`${API_CONFIG.websocket.baseUrl}/api/lab/ws/client/ESP32-SHM2-${mac}`);
            socket.onopen = () => setIsConnected(true);
            socket.onmessage = (event) => {
                if (!isRecRef.current) return;
                try {
                    const raw = JSON.parse(event.data);
                    if (raw.event === 'calib_done') { processor.current.setAxisFromCalib(raw.axis, raw.g ?? 9.81); setGravAxisLabel(raw.axis); return; }
                    if (raw.event !== undefined) return; // bỏ qua các event khác (calibrating, stopped, device_online...)
                    if (typeof raw.t !== 'number') return; // bảo vệ processor khỏi NaN
                    const pt = processor.current.process(raw.t, raw.ax, raw.ay, raw.az, raw.gm);
                    if (pt === null) return;
                    if (pt.tSec === 0) {
                        if (statusRef.current !== 'calib') { statusRef.current = 'calib'; setStatus('calib'); }
                    } else {
                        if (statusRef.current !== 'live') { statusRef.current = 'live'; setStatus('live'); }
                        bufferRef.current.push(pt);
                        while (bufferRef.current.length > 2000) bufferRef.current.shift();
                    }
                } catch { }
            };
            socket.onclose = () => { statusRef.current = 'idle'; setIsConnected(false); setIsRecording(false); setStatus('idle'); };
            ws.current = socket;
        }
    };

    const handleRecalib = useCallback(() => {
        if (!ws.current || !isConnected) return;
        ws.current.send('calib');
        processor.current.reset();
        bufferRef.current = [];
        setDataLog([]);
        setCrossCount(0);
        statusRef.current = 'calib';
        setStatus('calib');
    }, [isConnected]);

    const handleDownloadCSV = useCallback(() => {
        if (!dataLog.length) return;
        const header = 't_s,x_cm,v_cms,a_ms2,quality\n';
        const rows = dataLog.map(d =>
            `${d.tSec.toFixed(4)},${d.x.toFixed(4)},${d.v.toFixed(4)},${d.a.toFixed(6)},${d.quality}`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'dao-dong-dieu-hoa.csv'; a.click();
        URL.revokeObjectURL(url);
    }, [dataLog]);

    const handleRecord = () => {
        if (isPaused) { setIsPaused(false); startRenderLoop(); return; }
        const next = !isRecording;
        setIsRecording(next);
        if (next) {
            if (!bufferRef.current.length) {
                // Lần đầu bấm Start: reset hoàn toàn và hiệu chuẩn lại
                processor.current.reset();
                statusRef.current = 'calib';
                setStatus('calib');
            } else {
                // Resume sau STOP: giữ nguyên dữ liệu và trạng thái xử lý
                statusRef.current = 'live';
                setStatus('live');
            }
            startRenderLoop();
        } else {
            stopRenderLoop();
        }
    };

    const displayData = useMemo(() => {
        if (viewMode === 'ALL' || !dataLog.length) return dataLog;
        const pts = Math.round((viewMode === '3T' ? 3 : viewMode === '10T' ? 10 : 5) * period * 200);
        return dataLog.slice(-pts);
    }, [dataLog, viewMode, period]);

    const xData = displayData.map(d => d.x); const vData = displayData.map(d => d.v); const aData = displayData.map(d => d.a);
    const A_cm = peakOf(xData); const Vm_cms = peakOf(vData); const Am_ms2 = peakOf(aData);
    const omega = period > 0.1 ? (2 * Math.PI / period) : 0;
    const stats = { period, frequency: period > 0.1 ? 1/period : 0, omega, amplitude: A_cm, vmax: Vm_cms, amax: Am_ms2 };

    const chartData = useMemo(() => ({
        labels: displayData.map(d => d.tSec.toFixed(2)),
        datasets: [
            { label: 'x (cm)', data: showX ? displayData.map(d => d.x) : [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 3, yAxisID: 'yx', pointRadius: 0, tension: 0.4, fill: showX },
            { label: 'v (cm/s)', data: showV ? displayData.map(d => d.v) : [], borderColor: '#7c3aed', borderWidth: 2, yAxisID: 'yv', pointRadius: 0, tension: 0.4 },
            { label: 'a (m/s²)', data: showA ? displayData.map(d => d.a) : [], borderColor: '#e11d48', borderWidth: 2, yAxisID: 'ya', pointRadius: 0, tension: 0.4 },
        ]
    }), [displayData, showX, showV, showA]);

    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        scales: {
            x: { grid: { color: '#f8fafc' }, ticks: { maxTicksLimit: 12 } },
            yx: {
                type: 'linear' as const,
                position: 'left' as const,
                display: showX,
                grid: { color: '#f1f5f9' },
                ticks: { color: '#2563eb' },
                title: { display: showX, text: 'x (cm)', color: '#2563eb', font: { size: 10, weight: 'bold' as const } },
            },
            yv: {
                type: 'linear' as const,
                position: 'right' as const,
                display: showV,
                grid: { drawOnChartArea: false },
                ticks: { color: '#7c3aed' },
                title: { display: showV, text: 'v (cm/s)', color: '#7c3aed', font: { size: 10, weight: 'bold' as const } },
            },
            ya: {
                type: 'linear' as const,
                position: 'right' as const,
                display: showA,
                offset: showA && showV,
                grid: { drawOnChartArea: false },
                ticks: { color: '#e11d48' },
                title: { display: showA, text: 'a (m/s²)', color: '#e11d48', font: { size: 10, weight: 'bold' as const } },
            },
        },
        plugins: { legend: { display: false } },
    }), [showX, showV, showA]);

    const handleGenerateAI = async () => {
        setAiLoading(true);
        try { setAiQuestions(await generateAIQuestions(stats)); }
        catch { alert('AI error — please try again'); }
        finally { setAiLoading(false); }
    };

    const handleEvaluate = async (idx: number) => {
        const q = aiQuestions[idx];
        if (!q.answer.trim()) return;
        setAiQuestions(prev => prev.map((x, i) => i === idx ? { ...x, evaluating: true } : x));
        try {
            const ev = await evaluateAnswer(q.text, q.answer, stats);
            setAiQuestions(prev => prev.map((x, i) => i === idx ? { ...x, evaluation: ev, evaluating: false } : x));
        } catch {
            setAiQuestions(prev => prev.map((x, i) => i === idx ? { ...x, evaluating: false } : x));
        }
    };

    const handleAddSurveyRow = () => {
        const val = parseFloat(paramInput);
        if (isNaN(val) || val <= 0 || period < 0.1) return;
        setSurveyRows(prev => [...prev, { id: Date.now(), param: val, T: period, Tsq: period * period }]);
        setParamInput('');
    };

    return (
        <div className="min-h-screen bg-[#fdfcf0] text-slate-800 p-4 md:p-6 pb-20 flex flex-col gap-6 font-sans">
            {/* Header */}
            <header className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Harmonic Motion with BMI160</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-[10px] font-bold uppercase text-blue-600">Experiment 2 (advanced) · Physics 11</span>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {isConnected ? <Wifi size={12}/> : <WifiOff size={12}/>}
                            {isConnected ? `READY (${gravAxisLabel.toUpperCase()})` : 'NOT CONNECTED'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                    <input
                        value={macInput}
                        onChange={e => setMacInput(e.target.value.toUpperCase())}
                        placeholder="12-character device ID"
                        className="bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono w-56 px-4 py-2 text-blue-700 font-bold"
                        disabled={isConnected}
                    />
                    <button
                        onClick={toggleConnection}
                        className={`px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase transition-all active:scale-95 shadow-sm border ${isConnected ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-600 text-white border-blue-700'}`}
                    >
                        {isConnected ? 'Disconnect' : 'Connect'}
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sidebar */}
                <aside className="lg:col-span-3 flex flex-col gap-6">
                    <button
                        onClick={handleRecord}
                        disabled={!isConnected}
                        className={`w-full py-8 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-3 shadow-lg ${!isConnected ? 'opacity-30 border-slate-200 bg-white cursor-not-allowed' : isRecording ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-rose-100' : 'bg-blue-600 border-blue-700 text-white shadow-blue-100 hover:bg-blue-700'}`}
                    >
                        {isRecording ? <Square size={32} className="animate-pulse" fill="currentColor"/> : <Play size={32} fill="currentColor"/>}
                        <span className="text-xs font-black uppercase tracking-widest">{isRecording ? 'Stop measuring' : 'Start measuring'}</span>
                    </button>

                    {isConnected && (
                        <button
                            onClick={handleRecalib}
                            title="Keep the device still — the ESP32 will recalibrate the gravity axis for one second"
                            className="w-full py-3 rounded-2xl border-2 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase active:scale-95 bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
                        >
                            <RefreshCw size={15}/> Recalibrate device
                        </button>
                    )}

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Activity size={14} className="text-blue-500"/> Measurements
                        </h3>
                        <div className="space-y-4">
                             <ReadoutSmall label="Period T" val={period} unit="s" color="text-blue-600" />
                             <ReadoutSmall label="Angular frequency ω" val={omega} unit="rad/s" color="text-orange-600" />
                             <ReadoutSmall label="Amplitude A" val={A_cm} unit="cm" color="text-emerald-600" />
                        </div>
                        <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase ${converging ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            <span>Detected cycles</span>
                            <span className="font-mono text-sm">{crossCount} {converging ? '⚠' : '✓'}</span>
                        </div>
                        <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                             {(['3T', '5T', '10T', 'ALL'] as const).map(m => (
                                 <button key={m} onClick={()=>setViewMode(m)} className={`py-1 rounded-lg text-[9px] font-black uppercase border transition-all ${viewMode===m?'bg-blue-600 text-white border-blue-700 shadow-sm':'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>{m}</button>
                             ))}
                        </div>
                    </div>

                    <button onClick={()=>setAiOpen(!aiOpen)} className={`w-full py-4 border-2 rounded-3xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${aiOpen ? 'bg-amber-500 text-white border-amber-600' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'}`}>
                         <Sparkles size={16}/> Ask the AI assistant
                    </button>
                    <button onClick={()=>setSurveyOpen(!surveyOpen)} className={`w-full py-4 border-2 rounded-3xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${surveyOpen ? 'bg-blue-600 text-white border-blue-700' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'}`}>
                         <BarChart2 size={16}/> Explore T²–m / T²–1/k
                    </button>
                </aside>

                {/* Main View */}
                <div className="lg:col-span-9 flex flex-col gap-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 h-[550px] relative overflow-hidden">
                        <div className="absolute top-8 left-8 z-10 flex items-center justify-between w-[calc(100%-4rem)]">
                            <div>
                                <h2 className="font-bold text-xl uppercase tracking-tight text-slate-900">Real-time graphs</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">200 Hz · independent Y axes</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {([
                                    { key: 'x', label: 'x(t)', unit: 'cm',   color: '#2563eb', bg: '#eff6ff', show: showX, set: setShowX },
                                    { key: 'v', label: 'v(t)', unit: 'cm/s', color: '#7c3aed', bg: '#f5f3ff', show: showV, set: setShowV },
                                    { key: 'a', label: 'a(t)', unit: 'm/s²', color: '#e11d48', bg: '#fff1f2', show: showA, set: setShowA },
                                ] as const).map(({ key, label, unit, color, bg, show, set }) => (
                                    <button
                                        key={key}
                                        onClick={() => set(s => !s)}
                                        style={show
                                            ? { borderColor: color, color, backgroundColor: bg }
                                            : { borderColor: '#e2e8f0', color: '#94a3b8', backgroundColor: 'transparent' }}
                                        className="px-2.5 py-1.5 rounded-xl border text-[10px] font-black uppercase transition-all"
                                    >
                                        {label} <span className="font-normal opacity-70 text-[9px]">{unit}</span>
                                    </button>
                                ))}
                                {dataLog.length > 0 && (
                                    <button
                                        onClick={handleDownloadCSV}
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl text-[10px] font-black uppercase transition-all border border-slate-200"
                                    >
                                        <FileText size={11}/> CSV
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="w-full h-full pt-16">
                             <Line data={chartData} options={chartOptions} />
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl flex flex-wrap gap-8 items-center font-mono text-xs">
                         <div className="flex items-center gap-2"><span className="text-slate-500">x(t) =</span> <span className="text-blue-400">{A_cm.toFixed(2)}·cos({omega.toFixed(2)}t) cm</span></div>
                         <div className="flex items-center gap-2"><span className="text-slate-500">v(t) =</span> <span className="text-purple-400">−{(A_cm * omega).toFixed(2)}·sin({omega.toFixed(2)}t) cm/s</span></div>
                    </div>

                </div>
            </main>
            {/* ─── AI Questions Panel ─── */}
            {aiOpen && (
                <section className="max-w-7xl mx-auto w-full bg-white rounded-3xl border border-amber-200 shadow-sm p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <Sparkles size={18} className="text-amber-500"/> AI analysis of measured results
                        </h3>
                        <button onClick={handleGenerateAI} disabled={aiLoading || period < 0.1}
                            className="px-5 py-2 bg-amber-500 text-white rounded-xl text-[11px] font-black uppercase disabled:opacity-40 hover:bg-amber-600 transition-all flex items-center gap-2">
                            {aiLoading ? <RefreshCw size={14} className="animate-spin"/> : <Sparkles size={14}/>}
                            {aiLoading ? 'Generating...' : 'Generate questions'}
                        </button>
                    </div>
                    {converging && <p className="text-amber-600 text-xs font-medium mb-4 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2">⚠️ The period has not converged — measure at least six more cycles for accurate questions.</p>}
                    {aiQuestions.length === 0 && !aiLoading && (
                        <p className="text-slate-400 text-sm text-center py-8">Select "Generate questions" after measuring to create Bloom-level questions from the experimental results.</p>
                    )}
                    <div className="space-y-6">
                        {aiQuestions.map((q, i) => {
                            const levelColor = q.level === 'easy' ? 'bg-emerald-100 text-emerald-700' : q.level === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
                            const levelLabel = q.level === 'easy' ? 'Recall' : q.level === 'medium' ? 'Understand' : 'Apply';
                            return (
                                <div key={i} className="border border-slate-100 rounded-2xl p-6 bg-slate-50/50 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-black uppercase ${levelColor}`}>{levelLabel}</span>
                                        <p className="text-sm text-slate-700 font-medium">{q.text}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <input value={q.answer}
                                            onChange={e => setAiQuestions(prev => prev.map((x, j) => j===i ? {...x, answer: e.target.value} : x))}
                                            placeholder="Enter your answer..."
                                            className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white focus:ring-2 focus:ring-amber-400 outline-none"/>
                                        <button onClick={() => handleEvaluate(i)} disabled={!q.answer.trim() || q.evaluating}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase disabled:opacity-40 hover:bg-blue-700 transition-all flex items-center gap-1.5">
                                            {q.evaluating ? <RefreshCw size={12} className="animate-spin"/> : <Send size={12}/>} Evaluate
                                        </button>
                                    </div>
                                    {q.evaluation && (
                                        <div className={`rounded-xl p-4 text-sm space-y-1 ${q.evaluation.score >= 7 ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                                            <div className="flex items-center gap-2 font-black">
                                                {q.evaluation.score >= 7 ? <CheckCircle size={14} className="text-emerald-500"/> : <AlertCircle size={14} className="text-rose-500"/>}
                                                Score: {q.evaluation.score}/10
                                            </div>
                                            <p className="text-slate-600">{q.evaluation.feedback}</p>
                                            {q.evaluation.score < 8 && <p className="text-slate-500 italic text-xs">Suggested answer: {q.evaluation.correct}</p>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ─── Survey Panel ─── */}
            {surveyOpen && (() => {
                const sxs = surveyMode === 'mass' ? surveyRows.map(r => r.param / 1000) : surveyRows.map(r => 1 / r.param);
                const sys = surveyRows.map(r => r.Tsq);
                const reg = surveyRows.length >= 2 ? linearRegression(sxs, sys) : null;
                const result = reg && reg.slope > 0 ? (surveyMode === 'mass' ? (4*Math.PI*Math.PI/reg.slope).toFixed(3) : (reg.slope/(4*Math.PI*Math.PI)*1000).toFixed(1)) : null;
                const xMin = sxs.length ? Math.min(...sxs)*0.85 : 0;
                const xMax = sxs.length ? Math.max(...sxs)*1.15 : 1;
                const scatterData = {
                    datasets: [
                        { label: 'Measured data', data: surveyRows.map((r, i) => ({ x: sxs[i], y: r.Tsq })), backgroundColor: '#3b82f6', pointRadius: 7, showLine: false },
                        ...(reg ? [{ label: 'Regression', data: [{ x: xMin, y: reg.slope*xMin+reg.intercept }, { x: xMax, y: reg.slope*xMax+reg.intercept }], borderColor: '#f43f5e', backgroundColor: 'transparent', pointRadius: 0, showLine: true, borderWidth: 2 }] : []),
                    ]
                };
                return (
                    <section className="max-w-7xl mx-auto w-full bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-base font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <BarChart2 size={18} className="text-blue-500"/> Experimental survey
                            </h3>
                            <div className="flex gap-2">
                                {(['mass', 'spring'] as const).map(m => (
                                    <button key={m} onClick={() => { setSurveyMode(m); setSurveyRows([]); setParamInput(''); }}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${surveyMode===m ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                                        {m === 'mass' ? 'T²~m (find k)' : 'T²~1/k (find m)'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="flex gap-2">
                                    <input value={paramInput} onChange={e => setParamInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddSurveyRow()}
                                        placeholder={surveyMode === 'mass' ? 'Mass m (g)' : 'Spring constant k (N/m)'}
                                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 outline-none"/>
                                    <button onClick={handleAddSurveyRow} disabled={period < 0.1}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase disabled:opacity-40 hover:bg-blue-700 flex items-center gap-1.5">
                                        <PlusCircle size={14}/> Add
                                    </button>
                                </div>
                                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50">
                                            <tr className="text-[10px] font-black uppercase text-slate-500">
                                                <th className="px-3 py-2 text-left">#</th>
                                                <th className="px-3 py-2 text-right">{surveyMode === 'mass' ? 'm (g)' : 'k (N/m)'}</th>
                                                <th className="px-3 py-2 text-right">T (s)</th>
                                                <th className="px-3 py-2 text-right">T² (s²)</th>
                                                <th className="px-3 py-2"/>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {surveyRows.map((row, i) => (
                                                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                                                    <td className="px-3 py-2 text-slate-400">{i+1}</td>
                                                    <td className="px-3 py-2 text-right font-mono">{row.param}</td>
                                                    <td className="px-3 py-2 text-right font-mono">{row.T.toFixed(3)}</td>
                                                    <td className="px-3 py-2 text-right font-mono">{row.Tsq.toFixed(4)}</td>
                                                    <td className="px-3 py-2">
                                                        <button onClick={() => setSurveyRows(prev => prev.filter(r => r.id !== row.id))} className="text-slate-300 hover:text-rose-400 transition-colors"><Trash2 size={14}/></button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {surveyRows.length === 0 && (
                                                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400 text-xs">Add at least three points — one for each period measurement</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {reg && result && (
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-1">
                                        <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Linear-regression result</p>
                                        <p className="font-mono font-black text-blue-700 text-lg">{surveyMode === 'mass' ? `k = ${result} N/m` : `m = ${result} g`}</p>
                                        <p className="text-xs text-slate-500">Slope = {reg.slope.toFixed(5)} &nbsp;·&nbsp; R² = {reg.r2.toFixed(4)}</p>
                                    </div>
                                )}
                            </div>
                            <div className="h-72">
                                <Scatter data={scatterData} options={{
                                    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
                                    scales: {
                                        x: { type: 'linear', title: { display: true, text: surveyMode === 'mass' ? 'm (kg)' : '1/k (m/N)', font: { size: 11 } } },
                                        y: { title: { display: true, text: 'T² (s²)', font: { size: 11 } } }
                                    },
                                    plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } }
                                }}/>
                            </div>
                        </div>
                    </section>
                );
            })()}

            <div className="max-w-7xl mx-auto w-full">
                <ExperimentTheory id="harmonic-motion" />
            </div>
        </div>
    );
}

function ReadoutSmall({ label, val, unit, color }: any) {
    return (
        <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black font-mono tracking-tighter ${color}`}>{val.toFixed(3)}</span>
                <span className="text-[9px] font-bold text-slate-400">{unit}</span>
            </div>
        </div>
    );
}

export default function HarmonicMotionBMI160Experiment() {
    return <AuthProvider><ProtectedLab><HarmonicMotionBMI160Content /></ProtectedLab></AuthProvider>;
}

import { ExperimentTheory } from './shared/ExperimentTheory';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { API_CONFIG } from '../config/api.config';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedLab from './auth/ProtectedLab';
import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    CategoryScale,
    Filler
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import {
    Trash2, Globe, Wifi, Cpu, Power, RefreshCw, Save,
    Activity, Zap, Info, ChevronRight, FileText, Lock, Plus,
    WifiOff, Disc, Ruler, Weight, Timer
} from 'lucide-react';

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface RecordPoint {
    id: number;
    u: number;
    i: number;
}

interface SavedExperiment {
    points: RecordPoint[];
    rValue: number;
    linePoints: { x: number, y: number }[];
}

function ResistorVAContent() {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [statusMsg, setStatusMsg] = useState('Enter the device ID and select Connect');
    const [deviceId, setDeviceId] = useState('');
    const [liveVal, setLiveVal] = useState({ u: 0, i: 0, m: "N/A" });
    const [recordedPoints, setRecordedPoints] = useState<RecordPoint[]>([]);
    const [savedExp, setSavedExp] = useState<SavedExperiment | null>(null);

    const ws = useRef<WebSocket | null>(null);
    const alpha = 0.2;
    const lastU = useRef<number>(0);
    const lastI = useRef<number>(0);

    useEffect(() => {
        lastU.current = liveVal.u;
        lastI.current = liveVal.i;
    }, [liveVal]);

    const toggleConnection = useCallback(() => {
        if (status !== 'disconnected') {
            ws.current?.close();
            return;
        }
        const mac = deviceId.trim().replace(/:/g, '').toUpperCase();
        if (mac.length !== 12) { alert('Device ID must contain 12 hexadecimal characters.'); return; }

        const targetId = `ESP32-Resistor-${mac}`;
        const url = `${API_CONFIG.websocket.baseUrl}/api/lab/ws/client/${targetId}`;

        setStatus('connecting'); setStatusMsg('Connecting...');
        const socket = new WebSocket(url);

        socket.onopen = () => { setStatus('connected'); setStatusMsg('✓ Connected'); };
        socket.onmessage = (event) => {
            try {
                const raw = JSON.parse(event.data);
                if (raw.event !== undefined) {
                    if (raw.event === 'calib_done' && processor.current.setAxisFromCalib) {
                        processor.current.setAxisFromCalib(raw.axis, raw.g);
                    }
                    return;
                }
                if (raw.t !== undefined && typeof raw.t !== 'number') return;
                const cleanI = Math.abs(raw.i) < 2 ? 0 : raw.i;
                const fU = alpha * raw.u + (1 - alpha) * lastU.current;
                let fI = alpha * cleanI + (1 - alpha) * lastI.current;
                if (Math.abs(fI) < 0.1) fI = 0;
                setLiveVal({ u: fU, i: fI, m: raw.m || "N/A" });
            } catch (e) { }
        };
        socket.onclose = () => { setStatus('disconnected'); setStatusMsg('Disconnected'); setLiveVal({ u: 0, i: 0, m: "N/A" }); };
        ws.current = socket;
    }, [deviceId, status]);

    const handleRecord = () => {
        if (status !== 'connected') return;
        setRecordedPoints(prev => [...prev, { id: Date.now(), u: liveVal.u, i: liveVal.i }]);
    };

    const calculateRegression = (points: RecordPoint[]) => {
        if (points.length < 1) return null;
        let sumUI = 0, sumU2 = 0;
        points.forEach(p => { sumUI += p.u * p.i; sumU2 += p.u * p.u; });
        if (sumU2 === 0) return null;
        const slopeG = sumUI / sumU2;
        const R = slopeG !== 0 ? 1000 / slopeG : 0;
        const maxU = Math.max(...points.map(p => p.u), 4);
        return { R, slopeG, linePoints: [{ x: 0, y: 0 }, { x: maxU, y: slopeG * maxU }] };
    };

    const currentAnalysis = useMemo(() => calculateRegression(recordedPoints), [recordedPoints]);

    const saveCurrentCurve = () => {
        if (!currentAnalysis) return;
        setSavedExp({ points: [...recordedPoints], rValue: currentAnalysis.R, linePoints: currentAnalysis.linePoints });
        setRecordedPoints([]);
    };

    const scatterData = {
        datasets: [
            savedExp && { label: `Characteristic 1 (${savedExp.rValue.toFixed(1)} Ω)`, data: savedExp.linePoints, borderColor: '#94a3b8', borderWidth: 2, pointRadius: 0, showLine: true, zIndex: 4 },
            savedExp && { label: `Measurements 1`, data: savedExp.points.map(p => ({ x: p.u, y: p.i })), backgroundColor: '#cbd5e1', pointRadius: 5, zIndex: 5 },
            { label: `Current measurements`, data: recordedPoints.map(p => ({ x: p.u, y: p.i })), backgroundColor: '#f43f5e', pointRadius: 8, zIndex: 10 },
            currentAnalysis && { label: 'New characteristic', data: currentAnalysis.linePoints, borderColor: '#10b981', borderWidth: 4, pointRadius: 0, showLine: true, zIndex: 8 },
            status === 'connected' && { label: 'Live', data: [{ x: liveVal.u, y: liveVal.i }], backgroundColor: 'transparent', borderColor: '#3b82f6', borderWidth: 2, pointRadius: 12, pointStyle: 'crossRot', zIndex: 100 }
        ].filter(Boolean) as any[]
    };

    return (
        <div className="min-h-screen bg-[#fdfcf0] text-slate-800 p-4 md:p-6 pb-20 flex flex-col gap-6 font-sans">
            {/* Header */}
            <header className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Resistor I-V Characteristic</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-[10px] font-bold uppercase text-blue-600">Experiment 17 · Physics 11</span>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${status === 'connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {status === 'connected' ? <Wifi size={12}/> : <WifiOff size={12}/>}
                            {statusMsg}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                    <input
                        value={deviceId}
                        onChange={e => setDeviceId(e.target.value.toUpperCase())}
                        placeholder="12-character device ID"
                        className="bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono w-56 px-4 py-2 text-blue-700 font-bold"
                        disabled={status !== 'disconnected'}
                    />
                    <button
                        onClick={toggleConnection}
                        className={`px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase transition-all active:scale-95 shadow-sm border ${status === 'connected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-600 text-white border-blue-700'}`}
                    >
                        {status === 'connected' ? 'Disconnect' : 'Connect'}
                    </button>
                    <button onClick={() => { setRecordedPoints([]); setSavedExp(null); }} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm">
                        <RefreshCw size={16}/>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Panel */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Monitor Card */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100 flex flex-col items-center">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Voltage U</span>
                                <div className="text-5xl font-black text-slate-800 font-mono tracking-tighter">{liveVal.u.toFixed(3)}<small className="text-xl ml-1 text-amber-600">V</small></div>
                                <div className="w-full h-1.5 bg-amber-200/30 rounded-full mt-4 overflow-hidden">
                                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(100, (liveVal.u / 4.2) * 100)}%` }}/>
                                </div>
                            </div>
                            <div className="p-5 bg-sky-50 rounded-3xl border border-sky-100 flex flex-col items-center">
                                <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest mb-1">Current I</span>
                                <div className="text-5xl font-black text-slate-800 font-mono tracking-tighter">{liveVal.i.toFixed(1)}<small className="text-xl ml-1 text-sky-600">mA</small></div>
                                <div className="w-full h-1.5 bg-sky-200/30 rounded-full mt-4 overflow-hidden">
                                    <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${Math.min(100, (liveVal.i / 500) * 100)}%` }}/>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleRecord}
                            disabled={status !== 'connected'}
                            className={`w-full py-8 rounded-3xl border-2 transition-all flex flex-col items-center justify-center gap-2 shadow-lg ${status === 'connected' ? 'bg-blue-600 border-blue-700 text-white shadow-blue-100 hover:bg-blue-700' : 'bg-slate-50 border-slate-200 text-slate-300'}`}
                        >
                            <Plus size={32} fill="currentColor"/>
                            <span className="text-xs font-black uppercase tracking-widest">Record point</span>
                        </button>
                    </div>

                    {/* Results Card */}
                    {(currentAnalysis || savedExp) && (
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white border border-slate-800 shadow-xl space-y-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform duration-700"><Zap size={120}/></div>
                            <div className="relative z-10 space-y-6">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 border-b border-white/5 pb-2">
                                    <Activity size={14} className="text-emerald-400"/> Characteristic analysis
                                </h3>
                                {savedExp && (
                                    <div className="flex justify-between items-center text-sm border-b border-white/5 pb-4">
                                        <span className="text-slate-400">Resistance R1:</span>
                                        <span className="font-mono font-bold text-slate-300">{savedExp.rValue.toFixed(1)} Ω</span>
                                    </div>
                                )}
                                {currentAnalysis && (
                                    <div className="flex flex-col gap-2">
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase">Resistance R2 (current)</span>
                                        <div className="text-5xl font-black text-emerald-400 font-mono tracking-tighter">{currentAnalysis.R.toFixed(1)}<small className="text-xl ml-1 uppercase">Ω</small></div>
                                    </div>
                                )}
                                <button onClick={saveCurrentCurve} disabled={!currentAnalysis} className="w-full py-3 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase hover:bg-white/10 transition-all disabled:opacity-30">
                                    <Lock size={12} className="inline mr-1"/> Save and compare
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    {/* Chart Card */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-[500px] flex flex-col gap-4">
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                            <Activity size={18} className="text-rose-500" /> Resistor I–V characteristic
                        </h3>
                        <div className="flex-1 w-full relative">
                            <Scatter
                                data={scatterData}
                                options={{
                                    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
                                    scales: {
                                        x: { type: 'linear', min: 0, max: 4, title: { display: true, text: 'Voltage U (V)', font: { weight: 'bold' } }, grid: { color: '#f8fafc' } },
                                        y: { type: 'linear', min: 0, title: { display: true, text: 'Current I (mA)', font: { weight: 'bold' } }, grid: { color: '#f8fafc' } }
                                    },
                                    plugins: { legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } } }
                                }}
                            />
                        </div>
                    </div>

                    {/* Table Card */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 h-[400px]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-700 uppercase text-[10px] tracking-widest flex items-center gap-2"><Disc size={16} className="text-blue-500"/> Experimental data</h3>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{recordedPoints.length} measurements</span>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                                    <tr className="text-[10px] font-black uppercase text-slate-400">
                                        <th className="p-5 italic pl-8">STT</th>
                                        <th className="p-5 text-center text-amber-600">U (V)</th>
                                        <th className="p-5 text-center text-sky-600">I (mA)</th>
                                        <th className="p-5 text-right pr-8">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 font-mono">
                                    {recordedPoints.map((p, idx) => (
                                        <tr key={p.id} className="hover:bg-blue-50/30 transition-all group">
                                            <td className="p-5 pl-8 text-slate-400 font-bold italic">#{recordedPoints.length - idx}</td>
                                            <td className="p-5 text-center font-black text-slate-700">{p.u.toFixed(3)}</td>
                                            <td className="p-5 text-center font-black text-slate-700">{p.i.toFixed(1)}</td>
                                            <td className="p-5 text-right pr-8">
                                                <button onClick={() => setRecordedPoints(prev => prev.filter(x => x.id !== p.id))} className="text-slate-200 hover:text-rose-500 transition-all font-bold text-xl leading-none">&times;</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
            <div className="max-w-7xl mx-auto w-full">
                <ExperimentTheory id="va-characteristic" />
            </div>
        </div>
    );
}

export default function ResistorVAExperiment() {
    return <AuthProvider><ProtectedLab><ResistorVAContent /></ProtectedLab></AuthProvider>;
}

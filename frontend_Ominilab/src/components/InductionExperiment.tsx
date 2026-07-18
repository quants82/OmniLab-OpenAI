import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedLab from './auth/ProtectedLab';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
    Globe, Wifi, Trash2, Activity, Zap, Info, Cpu,
    RefreshCw, Pause, Play, WifiOff, Disc
} from 'lucide-react';
import { ExperimentTheory } from './shared/ExperimentTheory';
import { API_CONFIG } from '../config/api.config';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const HISTORY_LIMIT = 5000;

function InductionExperimentContent() {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [statusMsg, setStatusMsg] = useState('Enter the device ID and select Connect');
    const [deviceId, setDeviceId] = useState('');

    const [zoomRange, setZoomRange] = useState(2000);
    const [isAutoMode, setIsAutoMode] = useState(true);
    const [isLive, setIsLive] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [scrollOffset, setScrollOffset] = useState(0);
    const [displayPoints, setDisplayPoints] = useState(300);
    const [signalVal, setSignalVal] = useState(0);
    const [renderTick, setRenderTick] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef<{ x: number, offset: number } | null>(null);
    const dataBuffer = useRef<number[]>(new Array(HISTORY_LIMIT).fill(0));
    const lastMessageTimeRef = useRef<number>(Date.now());

    const stateRefs = useRef({ isLive, scrollOffset, displayPoints, zoomRange, isAutoMode, status, isPaused });

    useEffect(() => {
        stateRefs.current = { isLive, scrollOffset, displayPoints, zoomRange, isAutoMode, status, isPaused };
    }, [isLive, scrollOffset, displayPoints, zoomRange, isAutoMode, status, isPaused]);

    const chartData = useMemo(() => {
        const fullHistory = dataBuffer.current;
        const currentDisplayPoints = displayPoints;
        const currentScrollOffset = scrollOffset;
        const currentIsLive = isLive;
        const visibleSlice = currentIsLive
            ? fullHistory.slice(-currentDisplayPoints)
            : fullHistory.slice(-currentDisplayPoints - currentScrollOffset, -currentScrollOffset || undefined);
        const paddedSlice = visibleSlice.length < currentDisplayPoints
            ? [...new Array(currentDisplayPoints - visibleSlice.length).fill(0), ...visibleSlice]
            : visibleSlice;
        return {
            labels: new Array(currentDisplayPoints).fill(''),
            datasets: [{
                label: 'Current',
                data: paddedSlice,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 3,
                fill: true
            }]
        };
    }, [renderTick, displayPoints, scrollOffset, isLive]);

    const options: ChartOptions<'line'> = useMemo(() => ({
        responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
        scales: {
            x: { display: false, grid: { display: false } },
            y: {
                min: -zoomRange, max: zoomRange,
                grid: { color: (ctx) => ctx.tick.value === 0 ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.03)', lineWidth: (ctx) => ctx.tick.value === 0 ? 2 : 1 },
                ticks: { display: true, font: { size: 10, weight: 'bold' as const }, callback: (value) => `${value}` }
            }
        },
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
    }), [zoomRange]);

    useEffect(() => {
        if (!isAutoMode || !isLive) return;
        const visibleSlice = dataBuffer.current.slice(-displayPoints);
        const currentAbsMax = Math.max(...visibleSlice.map(Math.abs));
        const targetRange = Math.max(800, Math.ceil((currentAbsMax * 1.25) / 100) * 100);
        if (targetRange > zoomRange) setZoomRange(targetRange);
        else if (targetRange < zoomRange * 0.4) setZoomRange(prev => Math.max(800, prev - 200));
    }, [renderTick, isAutoMode, isLive, displayPoints]);

    const processValue = useCallback((val: number) => {
        if (stateRefs.current.isPaused) return;
        dataBuffer.current.shift();
        dataBuffer.current.push(val);
        setSignalVal(val);
        setRenderTick(t => t + 1);
        lastMessageTimeRef.current = Date.now();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            if (stateRefs.current.status === 'connected' && (Date.now() - lastMessageTimeRef.current > 300)) processValue(0);
        }, 100);
        return () => clearInterval(timer);
    }, [processValue]);

    useEffect(() => {
        const el = chartContainerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const { shiftKey, deltaY } = e;
            const factor = deltaY > 0 ? 1.15 : 0.85;
            if (shiftKey) { setIsAutoMode(false); setZoomRange(prev => Math.max(100, Math.min(15000, Math.round(prev * factor)))); }
            else { setDisplayPoints(prev => Math.max(40, Math.min(2000, Math.round(prev * factor)))); }
        };
        const onMouseDown = (e: MouseEvent) => { dragStartRef.current = { x: e.clientX, offset: stateRefs.current.scrollOffset }; el.style.cursor = 'grabbing'; };
        const onMouseMove = (e: MouseEvent) => {
            const rect = el.getBoundingClientRect();
            const yInContainer = e.clientY - rect.top;
            const isOverAxis = yInContainer > rect.height - 60;
            if (isOverAxis) el.style.cursor = 'col-resize';
            else if (dragStartRef.current) el.style.cursor = 'grabbing';
            else el.style.cursor = 'grab';
            if (!dragStartRef.current) return;
            const dx = e.clientX - dragStartRef.current.x;
            if (e.ctrlKey || isOverAxis) {
                const stretchFactor = dx / 150;
                setDisplayPoints(prev => Math.max(40, Math.min(2000, prev - Math.round(stretchFactor * 40))));
                dragStartRef.current.x = e.clientX;
            } else {
                const ptsPerPixel = stateRefs.current.displayPoints / 500;
                const newOffset = Math.max(0, Math.min(HISTORY_LIMIT - stateRefs.current.displayPoints, dragStartRef.current.offset + Math.round(dx * ptsPerPixel)));
                setScrollOffset(newOffset);
                if (newOffset > 0) setIsLive(false);
                else setIsLive(true);
            }
        };
        const onMouseUp = () => { dragStartRef.current = null; el.style.cursor = 'grab'; };
        el.addEventListener('wheel', onWheel, { passive: false });
        el.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            el.removeEventListener('wheel', onWheel); el.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    const toggleConnection = useCallback(() => {
        if (status !== 'disconnected') {
            wsRef.current?.close();
            return;
        }
        const mac = deviceId.trim().replace(/:/g, '').toUpperCase();
        if (mac.length !== 12) { alert('Device ID must contain 12 hexadecimal characters.'); return; }
        const targetId = `ESP32-Induction-${mac}`;
        const wsUrl = `${API_CONFIG.websocket.baseUrl}/api/lab/ws/client/${targetId}`;
        setStatus('connecting'); setStatusMsg('Connecting...');
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => { setStatus('connected'); setStatusMsg('✓ Connected'); };
        ws.onmessage = (event) => {
            try { const data = JSON.parse(event.data); processValue(data.v || data.val || 0); } catch (e) { }
        };
        ws.onclose = () => { setStatus('disconnected'); setStatusMsg('Connection lost'); };
        wsRef.current = ws;
    }, [deviceId, status, processValue]);

    const resetStats = () => {
        dataBuffer.current = new Array(HISTORY_LIMIT).fill(0);
        setScrollOffset(0); setIsLive(true);
        if (isAutoMode) setZoomRange(800);
        processValue(0);
    };

    return (
        <div className="min-h-screen bg-[#fdfcf0] text-slate-800 p-4 md:p-6 pb-20 flex flex-col gap-6 font-sans">
            {/* Header */}
            <header className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Electromagnetic Induction</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-[10px] font-bold uppercase text-blue-600">Experiment 23 · Physics 11</span>
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
                    <button onClick={resetStats} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm">
                        <RefreshCw size={16}/>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-9 flex flex-col gap-6">
                    <div ref={chartContainerRef} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 h-[550px] relative overflow-hidden group">
                        <div className="absolute top-8 left-8 z-20 flex gap-3">
                            {!isLive && (
                                <button onClick={() => { setScrollOffset(0); setIsLive(true); }} className="bg-emerald-500 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black shadow-lg shadow-emerald-100 animate-pulse flex items-center gap-2 border border-emerald-600 hover:bg-emerald-600 transition-all">
                                    <RefreshCw size={14}/> LIVE
                                </button>
                            )}
                            <button onClick={() => setIsPaused(!isPaused)} className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black shadow-sm transition-all border ${isPaused ? 'bg-amber-500 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                {isPaused ? <Play size={14} fill="currentColor"/> : <Pause size={14} fill="currentColor"/>}
                                {isPaused ? 'RESUME' : 'PAUSE'}
                            </button>
                        </div>
                        <div className="absolute top-8 right-8 flex flex-col items-end gap-3 z-20">
                            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-200 shadow-inner">
                                <button onClick={() => setIsAutoMode(!isAutoMode)} className={`px-4 py-1.5 text-[10px] font-black rounded-xl transition-all mr-1 ${isAutoMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>AUTO</button>
                                {[5000, 2000, 800].map(r => (
                                    <button key={r} onClick={() => { setZoomRange(r); setIsAutoMode(false); }} className={`px-4 py-1.5 text-[10px] font-black rounded-xl transition-all ${!isAutoMode && zoomRange === r ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {r === 5000 ? '1X' : r === 2000 ? '2.5X' : '6X'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="w-full h-full p-8 pt-24">
                            <Line key={`${displayPoints}-${zoomRange}`} data={chartData} options={options} />
                        </div>
                        {!isLive && (
                            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-2 rounded-full text-[9px] font-black tracking-widest uppercase flex items-center gap-2 shadow-xl border border-slate-800 animate-pulse">
                                <Activity size={12}/> REVIEW DATA HISTORY
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-3 flex flex-col gap-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col items-center gap-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Disc size={16} className="text-blue-500" /> Current direction
                        </h3>
                        <div className="w-full grid grid-cols-1 gap-4">
                            <div className={`p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${signalVal > 100 ? 'bg-rose-50 border-rose-500 shadow-lg shadow-rose-100' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${signalVal > 100 ? 'bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' : 'bg-slate-200 text-slate-400'}`}><Zap size={24}/></div>
                                <span className="text-[10px] font-black uppercase">Positive direction (+)</span>
                            </div>
                            <div className={`p-5 rounded-3xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${signalVal < -100 ? 'bg-amber-50 border-amber-500 shadow-lg shadow-amber-100' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${signalVal < -100 ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-slate-200 text-slate-400'}`}><Zap size={24}/></div>
                                <span className="text-[10px] font-black uppercase">Negative direction (-)</span>
                            </div>
                        </div>
                        <div className="w-full bg-slate-900 rounded-[2rem] p-6 text-center shadow-inner">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Voltage pulse</span>
                            <div className="text-4xl font-black text-white font-mono tabular-nums leading-none tracking-tighter">{signalVal}</div>
                        </div>
                    </div>
                </div>
            </main>
            <div className="max-w-7xl mx-auto w-full">
                <ExperimentTheory id="induction" />
            </div>
        </div>
    );
}

export default function InductionExperiment() {
    return <AuthProvider><ProtectedLab><InductionExperimentContent /></ProtectedLab></AuthProvider>;
}

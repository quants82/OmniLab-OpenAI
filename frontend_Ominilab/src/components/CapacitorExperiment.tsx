import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
    Filler,
    ScatterController,
    CategoryScale
} from 'chart.js';
import { Line, Scatter } from 'react-chartjs-2';
import {
    Trash2, Globe, Wifi, WifiOff, Cpu, Power, RefreshCw,
    Eye, EyeOff, Clock, TrendingUp, Zap, Battery
} from 'lucide-react';
import { ExperimentTheory } from './shared/ExperimentTheory';
import { API_CONFIG } from '../config/api.config';

ChartJS.register(LinearScale, CategoryScale, PointElement, LineElement, Title, Tooltip, Legend, Filler, ScatterController);

interface DataPoint {
    x: number;
    v: number;
    i: number;
    sw: number;
    q: number;
    w: number;
}

function CapacitorExperimentContent() {
    const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [statusMsg, setStatusMsg] = useState('Enter the device ID and select Connect');
    const [deviceId, setDeviceId] = useState('');
    const [isPhysicalSwitchOn, setIsPhysicalSwitchOn] = useState(false);
    const [capacitance, setCapacitance] = useState(1000);
    const [liveVal, setLiveVal] = useState({ v: 0, i: 0, w: 0 });

    // MẶC ĐỊNH: Chỉ hiện q theo t
    const [showU, setShowU] = useState(false);
    const [showQ, setShowQ] = useState(true);
    const [showW, setShowW] = useState(false);

    const [displayMode, setDisplayMode] = useState<'time' | 'relation'>('time');

    const [displayPoints, setDisplayPoints] = useState<DataPoint[]>([]);
    const allPointsRef = useRef<DataPoint[]>([]);
    const relationPointsRef = useRef<DataPoint[]>([]);

    const lastSwitchState = useRef<number>(0);
    const ws = useRef<WebSocket | null>(null);
    const startTimeRef = useRef<number>(0);
    const lastElapsedRef = useRef<number>(0);
    const renderInterval = useRef<any>(null);

    const alpha = 0.05;
    const lastV = useRef<number>(0);

    const getSmoothedPoints = (points: DataPoint[]) => {
        if (points.length < 5) return points;
        return points.map((p, i) => {
            if (i < 4) return p;
            const window = points.slice(i - 4, i + 1);
            const avgV = window.reduce((sum, curr) => sum + curr.v, 0) / 5;
            return {
                ...p,
                v: avgV,
                q: (avgV * capacitance) / 1000,
                w: 0.5 * (capacitance / 1000) * (avgV * avgV)
            };
        });
    };

    const toggleConnection = useCallback(() => {
        if (status !== 'disconnected') {
            ws.current?.close();
            return;
        }
        const mac = deviceId.trim().replace(/:/g, '').toUpperCase();
        if (mac.length !== 12) { alert('Device ID must contain 12 hexadecimal characters.'); return; }

        startTimeRef.current = Date.now();
        lastElapsedRef.current = 0;
        allPointsRef.current = [];
        relationPointsRef.current = [];
        setDisplayPoints([]);

        const targetId = `ESP32-Capacitor-${mac}`;
        const url = `${API_CONFIG.websocket.baseUrl}/api/lab/ws/client/${targetId}`;

        setStatus('connecting');
        setStatusMsg('Connecting...');

        const socket = new WebSocket(url);

        socket.onopen = () => {
            setStatus('connected');
            setStatusMsg('✓ Connected');
            renderInterval.current = setInterval(() => {
                setDisplayPoints(getSmoothedPoints([...allPointsRef.current]));
            }, 40);
        };

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
                const now = Date.now();
                let elapsed = (now - startTimeRef.current) / 1000;
                if (elapsed <= lastElapsedRef.current) elapsed = lastElapsedRef.current + 0.001;
                lastElapsedRef.current = elapsed;

                if (raw.sw === 1 && lastSwitchState.current === 0) {
                    allPointsRef.current = [];
                    relationPointsRef.current = [];
                    startTimeRef.current = Date.now();
                    elapsed = 0;
                }
                lastSwitchState.current = raw.sw;
                setIsPhysicalSwitchOn(raw.sw === 1);

                const actualV = raw.v * 2.0;
                const fV = alpha * actualV + (1 - alpha) * lastV.current;
                lastV.current = fV;

                const calcW = 0.5 * (capacitance / 1000) * (fV * fV);
                const newPoint = { x: elapsed, v: fV, i: raw.i, sw: raw.sw, q: (fV * capacitance) / 1000, w: calcW };

                setLiveVal({ v: fV, i: raw.i, w: calcW });
                allPointsRef.current.push(newPoint);
                if (elapsed > 30) {
                    const cutoff = elapsed - 30;
                    while (allPointsRef.current.length > 0 && allPointsRef.current[0].x < cutoff) {
                        allPointsRef.current.shift();
                    }
                }
                relationPointsRef.current.push(newPoint);
            } catch (e) { }
        };

        socket.onclose = () => { setStatus('disconnected'); setStatusMsg('Disconnected'); clearInterval(renderInterval.current); };
        ws.current = socket;
    }, [deviceId, capacitance, status]);

    const dynamicScales = useMemo(() => {
        const points = displayMode === 'time' ? displayPoints : relationPointsRef.current;
        if (points.length === 0) return { uMax: 4, qMax: 5, wMax: 5 };

        const uMax = Math.max(3.5, ...points.map(p => p.v)) * 1.1;
        const qMax = Math.max(4, ...points.map(p => p.q)) * 1.1;
        const wMax = Math.max(4, ...points.map(p => p.w)) * 1.1;
        return { uMax, qMax, wMax };
    }, [displayPoints, displayMode, capacitance]);

    const datasetsTime = [
        showU && {
            label: 'Voltage U (V)',
            data: displayPoints.map(d => ({ x: d.x, y: d.v })),
            borderColor: '#f43f5e',
            backgroundColor: '#f43f5e12',
            borderWidth: 6,
            pointRadius: 0,
            yAxisID: 'yU',
            tension: 0.45,
            fill: true,
        },
        showQ && {
            label: 'Charge q (mC)',
            data: displayPoints.map(d => ({ x: d.x, y: d.q })),
            borderColor: '#8b5cf6',
            borderWidth: 5,
            pointRadius: 0,
            yAxisID: 'yQ',
            tension: 0.4,
            fill: false
        },
        showW && {
            label: 'Energy W (mJ)',
            data: displayPoints.map(d => ({ x: d.x, y: d.w })),
            borderColor: '#10b981',
            borderWidth: 4,
            borderDash: [5, 5],
            pointRadius: 0,
            yAxisID: 'yW',
            tension: 0.4,
            fill: false
        }
    ].filter(Boolean) as any[];

    const relationData = useMemo(() => getSmoothedPoints([...relationPointsRef.current]), [displayPoints, displayMode]);
    const latestRelPoint = relationData.length > 0 ? relationData[relationData.length - 1] : null;

    const sortedRelationData = useMemo(() => {
        const uniquePoints = new Map<number, DataPoint>();
        relationData.forEach(p => {
            const roundedV = Math.round(p.v * 50) / 50;
            if (!uniquePoints.has(roundedV) || uniquePoints.get(roundedV)!.w < p.w) {
                uniquePoints.set(roundedV, p);
            }
        });
        return Array.from(uniquePoints.values()).sort((a, b) => a.v - b.v);
    }, [relationData]);

    const dynamicFillData = useMemo(() => {
        if (!latestRelPoint) return [];
        return sortedRelationData.filter(d => d.v <= latestRelPoint.v + 0.05);
    }, [sortedRelationData, latestRelPoint]);

    const datasetsRelation = [
        showQ && latestRelPoint && {
            label: 'Projection q',
            data: [{ x: 0, y: latestRelPoint.q }, { x: latestRelPoint.v, y: latestRelPoint.q }],
            borderColor: '#8b5cf666',
            borderWidth: 2,
            borderDash: [3, 3],
            pointRadius: 0,
            showLine: true,
            yAxisID: 'yQ'
        },
        showW && latestRelPoint && {
            label: 'Projection W',
            data: [{ x: 0, y: latestRelPoint.w }, { x: latestRelPoint.v, y: latestRelPoint.w }],
            borderColor: '#10b98166',
            borderWidth: 2,
            borderDash: [3, 3],
            pointRadius: 0,
            showLine: true,
            yAxisID: 'yW'
        },
        showQ && {
            label: 'Trace q',
            data: sortedRelationData.map(d => ({ x: d.v, y: d.q })),
            borderColor: '#8b5cf622',
            borderWidth: 2,
            pointRadius: 0,
            showLine: true,
            yAxisID: 'yQ',
            tension: 0
        },
        showW && {
            label: 'Trace W',
            data: sortedRelationData.map(d => ({ x: d.v, y: d.w })),
            borderColor: '#10b98122',
            borderWidth: 2,
            pointRadius: 0,
            showLine: true,
            yAxisID: 'yW',
            tension: 0.3
        },
        showQ && {
            label: 'q Area',
            data: dynamicFillData.map(d => ({ x: d.v, y: d.q })),
            borderColor: '#8b5cf6',
            backgroundColor: '#8b5cf633',
            borderWidth: 8,
            pointRadius: 0,
            showLine: true,
            yAxisID: 'yQ',
            tension: 0,
            fill: 'origin'
        },
        showW && {
            label: 'W Area',
            data: dynamicFillData.map(d => ({ x: d.v, y: d.w })),
            borderColor: '#10b981',
            backgroundColor: '#10b98144',
            borderWidth: 8,
            pointRadius: 0,
            showLine: true,
            yAxisID: 'yW',
            tension: 0.3,
            fill: 'origin'
        },
        showQ && latestRelPoint && {
            label: 'Current q',
            data: [{ x: latestRelPoint.v, y: latestRelPoint.q }],
            backgroundColor: '#fff',
            borderColor: '#8b5cf6',
            borderWidth: 4,
            pointRadius: 10,
            yAxisID: 'yQ'
        },
        showW && latestRelPoint && {
            label: 'Current W',
            data: [{ x: latestRelPoint.v, y: latestRelPoint.w }],
            backgroundColor: '#fff',
            borderColor: '#10b981',
            borderWidth: 4,
            pointRadius: 10,
            yAxisID: 'yW'
        }
    ].filter(Boolean) as any[];

    const currentTime = displayPoints.length > 0 ? displayPoints[displayPoints.length - 1].x : 30;
    const xMin = Math.max(0, currentTime - 30);
    const xMax = Math.max(30, currentTime);

    return (
        <div className="min-h-screen bg-[#fdfcf0] text-slate-800 p-4 md:p-6 pb-20 flex flex-col gap-6 font-sans">
            {/* Header */}
            <header className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col">
                    <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Capacitor Charge & Discharge</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="px-2 py-0.5 bg-blue-50 border border-blue-100 rounded text-[10px] font-bold uppercase text-blue-600">Experiment 14 · Physics 11</span>
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
                        className={`px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase transition-all active:scale-95 shadow-sm border ${status === 'connected' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-600 text-gray-900 border-blue-700'}`}
                    >
                        {status === 'connected' ? 'Disconnect' : 'Connect'}
                    </button>
                    <button onClick={() => { allPointsRef.current = []; relationPointsRef.current = []; setDisplayPoints([]); startTimeRef.current = Date.now(); }} className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm" title="Reset">
                        <RefreshCw size={16}/>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Panel */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* Status Monitor */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center">
                                <span className="text-[10px] font-black text-gray-600 uppercase mb-2">Capacitance (uF)</span>
                                <input
                                    type="number"
                                    value={capacitance}
                                    onChange={e => setCapacitance(Number(e.target.value))}
                                    className="text-2xl font-black text-blue-700 bg-transparent text-center w-full focus:outline-none font-mono"
                                />
                            </div>
                            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center transition-all ${isPhysicalSwitchOn ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-slate-50 border-slate-200 text-gray-600'}`}>
                                <Power size={20} className={isPhysicalSwitchOn ? 'animate-pulse mb-1' : 'mb-1'} />
                                <span className="text-[10px] font-black uppercase">{isPhysicalSwitchOn ? 'CHARGING' : 'DISCHARGING'}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-rose-700 uppercase">Voltage</span>
                                    <span className="text-2xl font-black text-rose-600 font-mono">{liveVal.v.toFixed(2)}<small className="text-xs ml-0.5">V</small></span>
                                </div>
                                <div className="w-10 h-10 rounded-full border-4 border-rose-200 shadow-inner" style={{ backgroundColor: `rgba(244, 63, 94, ${liveVal.v / 4.2})` }}/>
                            </div>
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col">
                                <span className="text-[10px] font-bold text-emerald-500 uppercase">Stored energy</span>
                                <span className="text-3xl font-black text-emerald-700 font-mono">{liveVal.w.toFixed(2)}<small className="text-sm ml-1 font-bold">mJ</small></span>
                            </div>
                        </div>
                    </div>

                    {/* Mode Selector */}
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-2">
                        <button onClick={() => setDisplayMode('time')} className={`flex items-center justify-between px-6 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all ${displayMode === 'time' ? 'bg-blue-600 text-gray-900 shadow-lg shadow-blue-100' : 'bg-slate-50 text-gray-600 hover:bg-slate-100'}`}>
                            <div className="flex items-center gap-3"><Clock size={18} /> Over time</div>
                            {displayMode === 'time' && <Zap size={14} fill="white"/>}
                        </button>
                        <button onClick={() => setDisplayMode('relation')} className={`flex items-center justify-between px-6 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all ${displayMode === 'relation' ? 'bg-blue-600 text-gray-900 shadow-lg shadow-blue-100' : 'bg-slate-50 text-gray-600 hover:bg-slate-100'}`}>
                            <div className="flex items-center gap-3"><TrendingUp size={18} /> U–q–W relationship</div>
                            {displayMode === 'relation' && <Zap size={14} fill="white"/>}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Chart */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 h-[600px] relative overflow-hidden">
                        {/* Legend/Toggles Overlay */}
                        <div className="absolute top-6 right-6 z-10 flex gap-4 bg-white/80 backdrop-blur-md p-3 rounded-2xl border border-slate-100 shadow-sm">
                            {displayMode === 'time' && (
                                <button onClick={() => setShowU(!showU)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showU ? 'bg-rose-100 text-rose-600' : 'text-gray-700'}`} title="Voltage U">
                                    {showU ? <Eye size={20}/> : <EyeOff size={20}/>}
                                </button>
                            )}
                            <button onClick={() => setShowQ(!showQ)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showQ ? 'bg-violet-100 text-violet-600' : 'text-gray-700'}`} title="Charge q">
                                {showQ ? <Eye size={20}/> : <EyeOff size={20}/>}
                            </button>
                            <button onClick={() => setShowW(!showW)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${showW ? 'bg-emerald-100 text-emerald-600' : 'text-gray-700'}`} title="Energy W">
                                {showW ? <Eye size={20}/> : <EyeOff size={20}/>}
                            </button>
                        </div>

                        <div className="w-full h-full">
                            {displayMode === 'time' ? (
                                <Line
                                    data={{ datasets: datasetsTime }}
                                    options={{
                                        responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
                                        scales: {
                                            x: { type: 'linear', min: xMin, max: xMax, ticks: { font: { weight: 'bold' }, color: '#cbd5e1' }, grid: { color: '#f8fafc' } },
                                            yQ: {
                                                type: 'linear', position: 'left', min: 0, max: dynamicScales.qMax,
                                                display: showQ, title: { display: true, text: 'CHARGE q (mC)', color: '#8b5cf6', font: { weight: 'bold' } },
                                                ticks: { color: '#8b5cf6', font: { weight: 'bold' } }, grid: { color: '#f1f5f9' }
                                            },
                                            yW: {
                                                type: 'linear', position: 'left', min: 0, max: dynamicScales.wMax,
                                                display: showW, title: { display: true, text: 'ENERGY W (mJ)', color: '#10b981', font: { weight: 'bold' } },
                                                ticks: { color: '#10b981', font: { weight: 'bold' } }, grid: { display: !showQ }
                                            },
                                            yU: {
                                                type: 'linear', position: 'right', min: 0, max: dynamicScales.uMax,
                                                display: showU, title: { display: true, text: 'VOLTAGE U (V)', color: '#f43f5e', font: { weight: 'bold' } },
                                                ticks: { color: '#f43f5e', font: { weight: 'bold' } }, grid: { display: false }
                                            }
                                        },
                                        plugins: { legend: { display: false }, tooltip: { enabled: true } }
                                    }}
                                />
                            ) : (
                                <Scatter
                                    data={{ datasets: datasetsRelation }}
                                    options={{
                                        responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
                                        scales: {
                                            x: {
                                                type: 'linear', min: 0, max: dynamicScales.uMax,
                                                title: { display: true, text: 'VOLTAGE U (V)', font: { weight: 'bold', size: 14 }, color: '#f43f5e' },
                                                grid: { color: '#f8fafc' }
                                            },
                                            yQ: {
                                                type: 'linear', position: 'left', min: 0, max: dynamicScales.qMax,
                                                display: showQ, title: { display: true, text: 'CHARGE q (mC)', color: '#8b5cf6', font: { weight: 'bold' } },
                                                ticks: { color: '#8b5cf6', font: { weight: 'bold' } }, grid: { color: '#f1f5f9' }
                                            },
                                            yW: {
                                                type: 'linear', position: 'left', min: 0, max: dynamicScales.wMax,
                                                display: showW, title: { display: true, text: 'ENERGY W (mJ)', color: '#10b981', font: { weight: 'bold' } },
                                                ticks: { color: '#10b981', font: { weight: 'bold' } }, grid: { display: !showQ }
                                            }
                                        },
                                        plugins: { legend: { display: false }, tooltip: { enabled: false } }
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <div className="max-w-7xl mx-auto w-full">
                <ExperimentTheory id="capacitor" />
            </div>
        </div>
    );
}

export default function CapacitorExperiment() { return <AuthProvider><ProtectedLab><CapacitorExperimentContent /></ProtectedLab></AuthProvider>; }

import { ExperimentTheory } from './shared/ExperimentTheory';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AuthProvider } from '../contexts/AuthContext';
import ProtectedLab from './auth/ProtectedLab';
// @ts-ignore
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ScatterController, LineController } from 'chart.js';
import { Scatter } from 'react-chartjs-2';
// @ts-ignore
import regression from 'regression';
import { Plus, Trash2 } from 'lucide-react';
import { API_CONFIG } from '../config/api.config';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ScatterController, LineController);

interface HeatData {
    id: number;
    time: number;       // s
    temp: number;       // Celsius
    power: number;      // Watts
    energy: number;     // Joules (Cumulative P * dt) or simple P * t
}

function SpecificHeatExperiment() {
    const [isConnected, setIsConnected] = useState(false);
    const [deviceId, setDeviceId] = useState("");

    // Configuration
    const [massWater, setMassWater] = useState(0.13); // kg

    // Live Data
    const [currentTemp, setCurrentTemp] = useState(0);
    const [currentPower, setCurrentPower] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Records
    const [recordedPoints, setRecordedPoints] = useState<HeatData[]>([]);

    // Connection Status Log
    const [wsStatus, setWsStatus] = useState("Enter the device ID and select Connect");

    const wsRef = useRef<WebSocket | null>(null);

    // Keep the on-screen clock in step with the device LCD: anchor to the
    // last t received, then tick locally between packets. Freeze when the
    // timer has not started (t = 0) or packets stop arriving.
    const timeAnchorRef = useRef<{ t: number; at: number }>({ t: 0, at: 0 });
    useEffect(() => {
        const id = window.setInterval(() => {
            const { t, at } = timeAnchorRef.current;
            if (t > 0 && at && Date.now() - at < 3000) {
                setCurrentTime(t + (Date.now() - at) / 1000);
            }
        }, 250);
        return () => window.clearInterval(id);
    }, []);

    // --- WebSocket ---
    const toggleConnection = () => {
        if (isConnected) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setIsConnected(false);
            setWsStatus("Disconnected manually");
        } else {
            connectWs();
        }
    };

    const connectWs = () => {
        try {
            const mac = deviceId.trim().replace(/:/g, '').toUpperCase();
            if (mac.length !== 12) { alert('Device ID must contain 12 hexadecimal characters.'); return; }
            const targetId = `ESP32-SH-${mac}`;
            const wsUrl = `${API_CONFIG.websocket.baseUrl}/api/lab/ws/client/${targetId}`;

            console.log("Connecting to WS:", wsUrl);
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                setIsConnected(true);
                setWsStatus("✓ Connected");
            };

            ws.onclose = (ev) => {
                setIsConnected(false);
                setWsStatus(`Disconnected (code: ${ev.code})`);
            };

            ws.onerror = (err) => {
                setWsStatus("WebSocket connection error!");
            };

            ws.onmessage = (ev) => {
                processMessage(ev.data);
            };

            wsRef.current = ws;
        } catch (e: any) {
            setWsStatus("Exception: " + e.message);
        }
    };

    const processMessage = (msg: string) => {
        if (msg.startsWith("RESULT=")) {
            try {
                const json = JSON.parse(msg.substring(7));
                const t = parseFloat(json.t);
                const temp = parseFloat(json.temp);
                const P = parseFloat(json.P);

                if (!isNaN(t)) { timeAnchorRef.current = { t, at: Date.now() }; setCurrentTime(t); }
                if (!isNaN(temp)) setCurrentTemp(temp);
                if (!isNaN(P)) setCurrentPower(P);

                setWsStatus(`Received: T=${temp.toFixed(2)}°C, P=${P.toFixed(2)}W`);

                if (json.cmd === "record") {
                    const point: HeatData = {
                        id: Date.now(),
                        time: isNaN(t) ? 0 : t,
                        temp: isNaN(temp) ? 0 : temp,
                        power: isNaN(P) ? 0 : P,
                        energy: 0
                    };
                    setRecordedPoints(prev => [...prev, point]);
                }
            } catch (e) {
                console.error("Parse error:", e);
            }
        }
    };

    const handleRecord = () => {
        const point: HeatData = {
            id: Date.now(),
            time: currentTime,
            temp: currentTemp,
            power: currentPower,
            energy: 0
        };
        setRecordedPoints(prev => [...prev, point]);
    };

    const resetData = () => {
        if (confirm("Delete all current measurements?")) {
            setRecordedPoints([]);
        }
    };

    const deletePoint = (id: number) => {
        setRecordedPoints(prev => prev.filter(p => p.id !== id));
    };

    const analyzeData = () => {
        if (recordedPoints.length < 2) return null;
        const dataForReg = recordedPoints.map(p => [p.time, p.temp]);
        const result = regression.linear(dataForReg, { precision: 10 });
        const slope = result.equation[0];
        const avgPower = recordedPoints.reduce((s, p) => s + p.power, 0) / recordedPoints.length;
        let c_calc = 0;
        if (slope > 0 && massWater > 0) {
            c_calc = avgPower / (massWater * slope);
        }
        return { slope, intercept: result.equation[1], c_calc, avgPower, r2: result.r2 };
    };

    const analysis = analyzeData();

    const exportExcel = () => {
        const headers = "STT,Thoi_Gian(s),Nhit_Do(C),Cong_Suat(W)";
        const rows = recordedPoints.map((d, i) => `${i + 1},${d.time},${d.temp},${d.power}`);
        const csv = [headers, ...rows].join("\n");
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `specific_heat_data_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const [showDataPoints, setShowDataPoints] = useState(true);
    const [showTrendline, setShowTrendline] = useState(true);
    const [startIndex, setStartIndex] = useState<string>("1");
    const [endIndex, setEndIndex] = useState<string>("");

    useEffect(() => {
        if (recordedPoints.length > 0) {
            setEndIndex(recordedPoints.length.toString());
        }
    }, [recordedPoints.length]);

    const calculateTwoPoints = useMemo(() => {
        const i1 = parseInt(startIndex) - 1;
        const i2 = parseInt(endIndex) - 1;
        if (isNaN(i1) || isNaN(i2) || i1 < 0 || i2 >= recordedPoints.length || i1 >= i2) return null;
        const p1 = recordedPoints[i1];
        const p2 = recordedPoints[i2];
        const dt = p2.time - p1.time;
        const dT = p2.temp - p1.temp;
        let sumP = 0;
        for (let k = i1; k <= i2; k++) sumP += recordedPoints[k].power;
        const avgP = sumP / (i2 - i1 + 1);
        const energy = avgP * dt;
        const c_2p = (massWater > 0 && Math.abs(dT) > 0.01) ? energy / (massWater * dT) : 0;
        return { p1, p2, dt, dT, avgP, c_2p };
    }, [startIndex, endIndex, recordedPoints, massWater]);

    const trendlineData = useMemo(() => {
        if (!analysis || !showTrendline || recordedPoints.length < 2) return [];
        const m = analysis.slope;
        const c = analysis.intercept;
        const maxTime = Math.max(...recordedPoints.map(p => p.time), currentTime, 60);
        return [{ x: 0, y: c }, { x: maxTime, y: m * maxTime + c }];
    }, [analysis, showTrendline, recordedPoints, currentTime]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8 text-slate-800">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800"><span className="text-blue-600">Omini</span>lab Physics</h1>
                        <p className="text-slate-500 text-sm">Specific Heat Capacity of Water</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="flex flex-col items-end mr-4">
                            <span className={`px-3 py-1 text-[10px] font-bold rounded-full mb-1 ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {isConnected ? '● ONLINE' : '○ OFFLINE'}
                            </span>
                            <p className="text-[10px] text-gray-600 font-mono uppercase">{wsStatus}</p>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200">
                            <input
                                value={deviceId}
                                onChange={e => setDeviceId(e.target.value.toUpperCase())}
                                placeholder="12-character device ID"
                                className="bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono w-56 px-4 py-2 text-blue-700 font-bold"
                                disabled={isConnected}
                            />
                            <button onClick={toggleConnection} className={`px-6 py-2 rounded-xl text-[11px] font-bold uppercase transition-all active:scale-95 shadow-sm border ${isConnected ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-600 text-white border-blue-700'}`}>
                                {isConnected ? 'Disconnect' : 'Connect'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 uppercase text-xs">Experiment setup</h3>
                                <button onClick={resetData} className="text-[10px] font-bold text-red-500 hover:underline">CLEAR DATA</button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Water mass (kg)</label>
                                <input type="number" value={massWater} onChange={e => setMassWater(parseFloat(e.target.value) || 0)} step="0.001" className="w-full border p-2 rounded-lg bg-slate-50 font-mono text-sm outline-none" />
                            </div>
                        </div>
                        <div className="bg-amber-50 text-gray-900 p-6 rounded-2xl shadow-lg border border-amber-200 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-3 bg-white/5 rounded-xl border border-gray-200">
                                    <div className="text-[10px] uppercase text-gray-600 font-bold mb-1">Temperature (t)</div>
                                    <div className="text-3xl font-black text-red-600 tabular-nums">{currentTemp.toFixed(2)}°C</div>
                                </div>
                                <div className="text-center p-3 bg-white/5 rounded-xl border border-gray-200">
                                    <div className="text-[10px] uppercase text-gray-600 font-bold mb-1">Power (P)</div>
                                    <div className="text-3xl font-black text-yellow-700 tabular-nums">{currentPower.toFixed(2)}W</div>
                                </div>
                            </div>
                            <div className="text-center py-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                                <div className="text-[10px] text-blue-700 font-bold mb-1 uppercase tracking-wider">Time (τ)</div>
                                <div className="text-5xl font-black text-blue-700 tabular-nums">{Math.floor(currentTime)}<span className="text-xl ml-1">s</span></div>
                            </div>
                            <button onClick={handleRecord} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-gray-900 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2">
                                <Plus className="w-5 h-5" /> RECORD MEASUREMENT
                            </button>
                        </div>
                        {analysis && (
                            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-emerald-800 uppercase text-xs">Analysis result</h3>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-white px-2 py-0.5 rounded-full border border-emerald-100">R² = {analysis.r2.toFixed(4)}</span>
                                </div>
                                <div className="space-y-3 text-sm text-emerald-700">
                                    <div className="flex justify-between"><span>Slope:</span><span className="font-mono font-bold">{analysis.slope.toFixed(5)} °C/s</span></div>
                                    <div className="flex justify-between"><span>Average power:</span><span className="font-mono font-bold">{analysis.avgPower.toFixed(2)} W</span></div>
                                    <div className="border-t border-emerald-200 my-2 pt-3 flex justify-between items-baseline">
                                        <span className="font-bold">Specific heat capacity c:</span>
                                        <div className="text-right"><div className="text-2xl font-black text-blue-700 leading-none">{analysis.c_calc.toFixed(0)}</div><div className="text-[10px] uppercase font-bold text-blue-500">J/kg.K</div></div>
                                    </div>
                                    <div className="text-[10px] text-right text-emerald-500 italic mt-1">(Reference ≈ 4186 J/kg.K)</div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 h-[500px]">
                            <Scatter
                                data={{
                                    datasets: [
                                        ...(showDataPoints ? [{ label: 'Measured points', data: recordedPoints.map(p => ({ x: p.time, y: p.temp })), backgroundColor: 'rgba(239, 68, 68, 1)', pointRadius: 6 }] : []),
                                        ...(showTrendline && trendlineData.length > 0 ? [{ type: 'scatter' as const, showLine: true, label: `Regression line`, data: trendlineData, borderColor: 'rgba(147, 51, 234, 1)', borderWidth: 2, pointRadius: 0 }] : []),
                                        ...(calculateTwoPoints ? [{ label: 'Selected points', data: [{ x: calculateTwoPoints.p1.time, y: calculateTwoPoints.p1.temp }, { x: calculateTwoPoints.p2.time, y: calculateTwoPoints.p2.temp }], backgroundColor: 'transparent', borderColor: '#10b981', borderWidth: 2, pointRadius: 10, pointStyle: 'circle' }] : [])
                                    ]
                                }}
                                options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { type: 'linear', title: { display: true, text: 'Time τ (s)' } }, y: { title: { display: true, text: 'Temperature T (°C)' } } } }}
                            />
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-700 uppercase text-xs">Data table</h3><button onClick={exportExcel} className="text-[10px] font-bold text-blue-600 hover:underline">EXPORT CSV</button></div>
                            <div className="max-h-[250px] overflow-y-auto font-mono text-xs">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 sticky top-0"><tr><th className="p-3">STT</th><th className="p-3">Time (s)</th><th className="p-3">Temperature (°C)</th><th className="p-3">Power (W)</th><th className="p-3 text-center">Delete</th></tr></thead>
                                    <tbody className="divide-y">
                                        {recordedPoints.map((p, i) => (
                                            <tr key={p.id} className="hover:bg-blue-50/50 transition-colors">
                                                <td className="p-3">{i + 1}</td><td className="p-3">{p.time.toFixed(1)}</td><td className="p-3 font-bold text-red-600">{p.temp.toFixed(3)}</td><td className="p-3 text-slate-500">{p.power.toFixed(2)}</td>
                                                <td className="p-3 text-center"><button onClick={() => deletePoint(p.id)} className="text-red-600 hover:text-red-600 p-1"><Trash2 className="w-3 h-3" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <ExperimentTheory id="specific-heat" />
            </div>
        </div>
    );
}

export default function Wrapper() { return <AuthProvider><ProtectedLab><SpecificHeatExperiment /></ProtectedLab></AuthProvider>; }

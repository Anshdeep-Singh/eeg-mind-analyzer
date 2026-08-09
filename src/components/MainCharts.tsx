import React, { useState } from 'react';
import { ProcessedEEGFrame } from '../types/eeg';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Brush,
  ReferenceLine
} from 'recharts';
import { AreaChart as AreaIcon, LineChart as LineIcon, Activity, Zap, Heart, Eye } from 'lucide-react';

interface Props {
  frames: ProcessedEEGFrame[];
}

export const MainCharts: React.FC<Props> = ({ frames }) => {
  const [activeTab, setActiveTab] = useState<'relative' | 'mindstates' | 'absolute' | 'asymmetry' | 'heart'>('relative');

  if (!frames || frames.length === 0) return null;

  // Custom Tooltip Formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const frame = frames.find(f => f.timeFormatted === label || f.timeSec === label);
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1 z-50">
          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex justify-between gap-4">
            <span>Time: {payload[0]?.payload?.timeFormatted || label}</span>
            {frame?.isBlink && <span className="text-amber-400 font-normal">👁 Eye Blink Filtered</span>}
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex justify-between items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-slate-100">
                {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
                {activeTab === 'relative' ? '%' : activeTab === 'mindstates' ? '/100' : ''}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const hasHeartRate = frames.some(f => f.heartRate && f.heartRate > 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 my-6 shadow-md">
      {/* Header Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Time-Series Brain Dynamics Timeline
          </h2>
          <p className="text-xs text-slate-400">Interactive brushable timeline with second-by-second precision</p>
        </div>

        {/* Tab Switchers */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('relative')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'relative'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AreaIcon className="w-3.5 h-3.5" /> Relative % Spectrum
          </button>

          <button
            onClick={() => setActiveTab('mindstates')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'mindstates'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Focus vs Calm Scores
          </button>

          <button
            onClick={() => setActiveTab('absolute')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'absolute'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" /> Raw Waves (Bels)
          </button>

          <button
            onClick={() => setActiveTab('asymmetry')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'asymmetry'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" /> Frontal Asymmetry
          </button>

          {hasHeartRate && (
            <button
              onClick={() => setActiveTab('heart')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'heart'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" /> Heart Rate (PPG)
            </button>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'relative' ? (
            /* Stacked Relative Power % */
            <AreaChart data={frames} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorDelta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorTheta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorAlpha" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorBeta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="colorGamma" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Brush dataKey="timeFormatted" height={26} stroke="#334155" fill="#0f172a" />
              
              <Area type="monotone" dataKey="relDelta" stackId="1" name="Delta (0.5-4Hz Rest)" stroke="#8b5cf6" fill="url(#colorDelta)" />
              <Area type="monotone" dataKey="relTheta" stackId="1" name="Theta (4-8Hz Deep Flow)" stroke="#06b6d4" fill="url(#colorTheta)" />
              <Area type="monotone" dataKey="relAlpha" stackId="1" name="Alpha (8-13Hz Calm)" stroke="#10b981" fill="url(#colorAlpha)" />
              <Area type="monotone" dataKey="relBeta" stackId="1" name="Beta (13-30Hz Active Focus)" stroke="#3b82f6" fill="url(#colorBeta)" />
              <Area type="monotone" dataKey="relGamma" stackId="1" name="Gamma (30-44Hz Alert)" stroke="#f59e0b" fill="url(#colorGamma)" />
            </AreaChart>
          ) : activeTab === 'mindstates' ? (
            /* Focus vs Calm vs Meditation Line Chart */
            <LineChart data={frames} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Brush dataKey="timeFormatted" height={26} stroke="#334155" fill="#0f172a" />
              <ReferenceLine y={60} stroke="#334155" strokeDasharray="4 4" label={{ value: 'High State Threshold', fill: '#64748b', fontSize: 10 }} />

              <Line type="monotone" dataKey="focusScore" name="Focus / Engagement" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="calmScore" name="Calm / Tranquility" stroke="#10b981" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="meditationDepth" name="Meditation Depth" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cognitiveLoad" name="Cognitive Strain" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
            </LineChart>
          ) : activeTab === 'absolute' ? (
            /* Absolute Bels Lines */
            <LineChart data={frames} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" Bels" />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Brush dataKey="timeFormatted" height={26} stroke="#334155" fill="#0f172a" />

              <Line type="monotone" dataKey="deltaBels" name="Delta Bels" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="thetaBels" name="Theta Bels" stroke="#06b6d4" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="alphaBels" name="Alpha Bels" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="betaBels" name="Beta Bels" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="gammaBels" name="Gamma Bels" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          ) : activeTab === 'asymmetry' ? (
            /* Frontal Asymmetry Line Chart */
            <LineChart data={frames} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" Bels" />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Brush dataKey="timeFormatted" height={26} stroke="#334155" fill="#0f172a" />
              <ReferenceLine y={0} stroke="#f59e0b" strokeWidth={1.5} label={{ value: 'Equilibrium (0)', fill: '#f59e0b', fontSize: 11 }} />

              <Line type="monotone" dataKey="frontalAsymmetry" name="Frontal Asymmetry (AF8 Alpha - AF7 Alpha)" stroke="#10b981" strokeWidth={2.5} dot={false} />
            </LineChart>
          ) : (
            /* Heart Rate Line Chart */
            <LineChart data={frames} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit=" BPM" />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Brush dataKey="timeFormatted" height={26} stroke="#334155" fill="#0f172a" />

              <Line type="monotone" dataKey="heartRate" name="Heart Rate (BPM)" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

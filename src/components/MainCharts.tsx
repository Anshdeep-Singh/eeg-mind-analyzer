import React, { useState, useMemo } from 'react';
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
  ReferenceLine,
} from 'recharts';
import { AreaChart as AreaIcon, LineChart as LineIcon, Activity, Zap, Heart, Filter } from 'lucide-react';

interface Props {
  frames: ProcessedEEGFrame[];
}

type TabType = 'relative' | 'mindstates' | 'absolute' | 'asymmetry' | 'heart';

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload?: ProcessedEEGFrame }>;
  label?: string | number;
  frames: ProcessedEEGFrame[];
  activeTab: TabType;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, frames, activeTab }) => {
  if (active && payload && payload.length) {
    const frame = frames.find((f) => f.timeFormatted === label || f.timeSec === label || f.timeStamp === label);
    const exactTs = frame?.timeStamp || payload[0]?.payload?.timeStamp;
    const relTime = payload[0]?.payload?.timeFormatted || label;
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 z-50">
        <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex justify-between items-center gap-4">
          <div className="flex flex-col">
            {exactTs && <span className="text-cyan-300 font-mono text-[11px]">Timestamp: {exactTs}</span>}
            <span className="text-[10px] text-slate-400 font-normal">Elapsed: {relTime}</span>
          </div>
          <div className="flex items-center gap-1.5 font-normal">
            {frame?.isBlink && <span className="text-amber-400">👁 Blink</span>}
            {frame?.isMotionArtifact && <span className="text-purple-400">⚡ Motion Noise</span>}
            {frame && (!frame.isGoodFit || frame.hsiAverage > 2.5) && (
              <span className="text-rose-400 font-bold">⚠️ Bad Contact</span>
            )}
          </div>
        </div>
        {payload.map((entry, index: number) => (
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

interface FilterPillProps {
  id: string;
  label: string;
  color: string;
  visibleLines: Record<string, boolean>;
  toggleLine: (key: string) => void;
}

const FilterPill: React.FC<FilterPillProps> = ({ id, label, color, visibleLines, toggleLine }) => {
  const isVisible = visibleLines[id] ?? true;
  return (
    <button
      type="button"
      onClick={() => toggleLine(id)}
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
        isVisible
          ? 'bg-slate-800 text-slate-100 border-slate-700 shadow-sm'
          : 'bg-slate-950/60 text-slate-500 border-slate-900 line-through opacity-60'
      }`}
    >
      <span
        className="w-2.5 h-2.5 rounded-full inline-block transition-opacity"
        style={{ backgroundColor: color, opacity: isVisible ? 1 : 0.3 }}
      />
      {label}
    </button>
  );
};

export const MainCharts: React.FC<Props> = ({ frames }) => {
  const [activeTab, setActiveTab] = useState<TabType>('relative');

  // Line Visibility Filter State
  const [visibleLines, setVisibleLines] = useState<Record<string, boolean>>({
    // Relative % Spectrum
    relDelta: true,
    relTheta: true,
    relAlpha: true,
    relBeta: true,
    relGamma: true,
    // Focus vs Calm
    focusScore: true,
    calmScore: true,
    meditationDepth: true,
    cognitiveLoad: true,
    // Raw Waves Bels
    deltaBels: true,
    thetaBels: true,
    alphaBels: true,
    betaBels: true,
    gammaBels: true,
    // Frontal Asymmetry
    frontalAsymmetry: true,
    asymmetryAvgLine: true,
    asymmetryZeroLine: true,
    // Heart Rate
    heartRate: true,
  });

  // Toggle helper
  const toggleLine = (key: string) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Compute Session Average Frontal Alpha Asymmetry (FAA)
  const avgFAA = useMemo(() => {
    if (!frames || frames.length === 0) return 0;
    const sum = frames.reduce((acc, f) => acc + (f.frontalAsymmetry || 0), 0);
    return sum / frames.length;
  }, [frames]);

  const hasHeartRate = frames?.some((f) => f.heartRate && f.heartRate > 0) ?? false;

  if (!frames || frames.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 my-6 shadow-xl">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Timeline
          </h2>
          <p className="text-xs text-slate-400">Interactive brushable timeline with second-by-second precision</p>
        </div>

        {/* Tab Switchers */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('relative')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'relative' ? 'bg-cyan-600 text-white shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <AreaIcon className="w-3.5 h-3.5" /> Relative % Spectrum
          </button>

          <button
            onClick={() => setActiveTab('mindstates')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'mindstates' ? 'bg-cyan-600 text-white shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Focus vs Calm Scores
          </button>

          <button
            onClick={() => setActiveTab('absolute')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'absolute' ? 'bg-cyan-600 text-white shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LineIcon className="w-3.5 h-3.5" /> Raw Waves (Bels)
          </button>

          <button
            onClick={() => setActiveTab('asymmetry')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'asymmetry' ? 'bg-cyan-600 text-white shadow-md font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" /> Frontal Asymmetry
          </button>

          {hasHeartRate && (
            <button
              onClick={() => setActiveTab('heart')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'heart' ? 'bg-cyan-600 text-white shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" /> Heart Rate (PPG)
            </button>
          )}
        </div>
      </div>

      {/* Interactive Line Filter Controls Bar */}
      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span>Toggle Line Visibility:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {activeTab === 'relative' && (
            <>
              <FilterPill id="relDelta" label="Delta (0.5-4Hz)" color="#8b5cf6" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="relTheta" label="Theta (4-8Hz)" color="#06b6d4" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="relAlpha" label="Alpha (8-13Hz)" color="#10b981" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="relBeta" label="Beta (13-30Hz)" color="#3b82f6" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="relGamma" label="Gamma (30-44Hz)" color="#f59e0b" visibleLines={visibleLines} toggleLine={toggleLine} />
            </>
          )}

          {activeTab === 'mindstates' && (
            <>
              <FilterPill id="focusScore" label="Focus / Engagement" color="#3b82f6" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="calmScore" label="Calm / Tranquility" color="#10b981" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="meditationDepth" label="Meditation Depth" color="#8b5cf6" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="cognitiveLoad" label="Cognitive Strain" color="#f43f5e" visibleLines={visibleLines} toggleLine={toggleLine} />
            </>
          )}

          {activeTab === 'absolute' && (
            <>
              <FilterPill id="deltaBels" label="Delta Bels" color="#8b5cf6" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="thetaBels" label="Theta Bels" color="#06b6d4" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="alphaBels" label="Alpha Bels" color="#10b981" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="betaBels" label="Beta Bels" color="#3b82f6" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="gammaBels" label="Gamma Bels" color="#f59e0b" visibleLines={visibleLines} toggleLine={toggleLine} />
            </>
          )}

          {activeTab === 'asymmetry' && (
            <>
              <FilterPill id="frontalAsymmetry" label="FAA (AF8 Alpha - AF7 Alpha)" color="#10b981" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="asymmetryAvgLine" label={`Session Average (${avgFAA >= 0 ? '+' : ''}${avgFAA.toFixed(3)} Bels)`} color="#c084fc" visibleLines={visibleLines} toggleLine={toggleLine} />
              <FilterPill id="asymmetryZeroLine" label="Equilibrium (0.0 Bels)" color="#eab308" visibleLines={visibleLines} toggleLine={toggleLine} />
            </>
          )}

          {activeTab === 'heart' && (
            <FilterPill id="heartRate" label="Heart Rate (BPM)" color="#f43f5e" visibleLines={visibleLines} toggleLine={toggleLine} />
          )}
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="h-[430px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'relative' ? (
            /* Stacked Relative Power % Area Chart (with top padding to prevent Gamma clipping) */
            <AreaChart data={frames} margin={{ top: 25, right: 15, left: -10, bottom: 0 }}>
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
              {/* YAxis domain fixed at [0, 100] with explicit rounding tickFormatter to prevent 100003% glitch */}
              <YAxis
                stroke="#64748b"
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(val) => `${Math.round(val)}%`}
                tick={{ fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip frames={frames} activeTab={activeTab} />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
              <Brush dataKey="timeFormatted" height={26} stroke="#334155" fill="#0f172a" />

              {visibleLines.relDelta && (
                <Area type="monotone" dataKey="relDelta" stackId="1" name="Delta (0.5-4Hz Rest)" stroke="#8b5cf6" fill="url(#colorDelta)" />
              )}
              {visibleLines.relTheta && (
                <Area type="monotone" dataKey="relTheta" stackId="1" name="Theta (4-8Hz Deep Flow)" stroke="#06b6d4" fill="url(#colorTheta)" />
              )}
              {visibleLines.relAlpha && (
                <Area type="monotone" dataKey="relAlpha" stackId="1" name="Alpha (8-13Hz Calm)" stroke="#10b981" fill="url(#colorAlpha)" />
              )}
              {visibleLines.relBeta && (
                <Area type="monotone" dataKey="relBeta" stackId="1" name="Beta (13-30Hz Active Focus)" stroke="#3b82f6" fill="url(#colorBeta)" />
              )}
              {visibleLines.relGamma && (
                <Area type="monotone" dataKey="relGamma" stackId="1" name="Gamma (30-44Hz Alert)" stroke="#f59e0b" fill="url(#colorGamma)" />
              )}
            </AreaChart>
          ) : activeTab === 'mindstates' ? (
            /* Focus vs Calm vs Meditation Line Chart */
            <LineChart data={frames} margin={{ top: 20, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip frames={frames} activeTab={activeTab} />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
              <Brush dataKey="timeFormatted" height={26} stroke="#334155" fill="#0f172a" />
              <ReferenceLine y={60} stroke="#334155" strokeDasharray="4 4" label={{ value: 'High State Threshold', fill: '#64748b', fontSize: 10 }} />

              {visibleLines.focusScore && (
                <Line type="monotone" dataKey="focusScore" name="Focus / Engagement" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
              )}
              {visibleLines.calmScore && (
                <Line type="monotone" dataKey="calmScore" name="Calm / Tranquility" stroke="#10b981" strokeWidth={2.5} dot={false} />
              )}
              {visibleLines.meditationDepth && (
                <Line type="monotone" dataKey="meditationDepth" name="Meditation Depth" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              )}
              {visibleLines.cognitiveLoad && (
                <Line type="monotone" dataKey="cognitiveLoad" name="Cognitive Strain" stroke="#f43f5e" strokeWidth={1.5} strokeDasharray="3 3" dot={false} />
              )}
            </LineChart>
          ) : activeTab === 'absolute' ? (
            /* Absolute Bels Lines */
            <LineChart data={frames} margin={{ top: 20, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" Bels" />
              <Tooltip content={<CustomTooltip frames={frames} activeTab={activeTab} />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
              <Brush dataKey="timeFormatted" height={26} stroke="#334155" fill="#0f172a" />

              {visibleLines.deltaBels && (
                <Line type="monotone" dataKey="deltaBels" name="Delta Bels" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              )}
              {visibleLines.thetaBels && (
                <Line type="monotone" dataKey="thetaBels" name="Theta Bels" stroke="#06b6d4" strokeWidth={2} dot={false} />
              )}
              {visibleLines.alphaBels && (
                <Line type="monotone" dataKey="alphaBels" name="Alpha Bels" stroke="#10b981" strokeWidth={2} dot={false} />
              )}
              {visibleLines.betaBels && (
                <Line type="monotone" dataKey="betaBels" name="Beta Bels" stroke="#3b82f6" strokeWidth={2} dot={false} />
              )}
              {visibleLines.gammaBels && (
                <Line type="monotone" dataKey="gammaBels" name="Gamma Bels" stroke="#f59e0b" strokeWidth={2} dot={false} />
              )}
            </LineChart>
          ) : activeTab === 'asymmetry' ? (
            /* Frontal Asymmetry Line Chart with Session Average Line & Equilibrium */
            <LineChart data={frames} margin={{ top: 25, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit=" Bels" />
              <Tooltip content={<CustomTooltip frames={frames} activeTab={activeTab} />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
              <Brush dataKey="timeFormatted" height={26} stroke="#334155" fill="#0f172a" />

              {/* Equilibrium (0.0) Line */}
              {visibleLines.asymmetryZeroLine && (
                <ReferenceLine
                  y={0}
                  stroke="#eab308"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{
                    value: 'Equilibrium (0.0 Bels)',
                    fill: '#eab308',
                    fontSize: 11,
                    position: 'right',
                  }}
                />
              )}

              {/* Session Average FAA Baseline Line */}
              {visibleLines.asymmetryAvgLine && (
                <ReferenceLine
                  y={avgFAA}
                  stroke="#c084fc"
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    value: `Session Average (${avgFAA >= 0 ? '+' : ''}${avgFAA.toFixed(3)} Bels)`,
                    fill: '#c084fc',
                    fontSize: 11,
                    position: 'left',
                  }}
                />
              )}

              {/* Instantaneous FAA Curve */}
              {visibleLines.frontalAsymmetry && (
                <Line
                  type="monotone"
                  dataKey="frontalAsymmetry"
                  name="Frontal Asymmetry (AF8 Alpha - AF7 Alpha)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={false}
                />
              )}
            </LineChart>
          ) : (
            /* Heart Rate Line Chart */
            <LineChart data={frames} margin={{ top: 20, right: 15, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit=" BPM" />
              <Tooltip content={<CustomTooltip frames={frames} activeTab={activeTab} />} />
              <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
              <Brush dataKey="timeFormatted" height={26} stroke="#334155" fill="#0f172a" />

              {visibleLines.heartRate && (
                <Line type="monotone" dataKey="heartRate" name="Heart Rate (BPM)" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

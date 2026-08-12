import React, { useState, useEffect, useMemo } from 'react';
import { ProcessedEEGFrame } from '../types/eeg';
import { formatTimeSec } from '../utils/eegProcessor';
import { Play, Pause, RotateCcw, Activity, Eye, Zap, Heart, Flame, Info, Layers, Compass, BarChart2 } from 'lucide-react';
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
  ReferenceLine,
} from 'recharts';

interface Props {
  frames: ProcessedEEGFrame[];
}

type WaveBand = 'total' | 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
type ViewMode = 'replayer' | 'session_average';

const BAND_DESCRIPTIONS: Record<WaveBand, { label: string; range: string; meaning: string; color: string }> = {
  total: {
    label: 'Total Power (All Bands)',
    range: '1 - 44 Hz',
    meaning: 'Overall metabolic electrical activity firing across all cortical frequency bands.',
    color: 'text-purple-400',
  },
  delta: {
    label: 'Delta (δ)',
    range: '1 - 4 Hz',
    meaning: 'Deep sleep, restorative physical state, or muscle movement noise artifacts during waking.',
    color: 'text-blue-400',
  },
  theta: {
    label: 'Theta (θ)',
    range: '4 - 8 Hz',
    meaning: 'Deep relaxation, hypnagogia, creative intuition, emotional memory, and deep meditation.',
    color: 'text-cyan-400',
  },
  alpha: {
    label: 'Alpha (α)',
    range: '7.5 - 13 Hz',
    meaning: 'Calm alertness, relaxed focus, mental readiness, and stress reduction.',
    color: 'text-emerald-400',
  },
  beta: {
    label: 'Beta (β)',
    range: '13 - 30 Hz',
    meaning: 'Active cognitive concentration, analytical thinking, problem solving, or mental workload.',
    color: 'text-amber-400',
  },
  gamma: {
    label: 'Gamma (γ)',
    range: '30 - 44 Hz',
    meaning: 'Peak cognitive processing, information binding, rapid insight, and sensory synthesis.',
    color: 'text-rose-400',
  },
};

export const BrainStateReplayer: React.FC<Props> = ({ frames }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedBand, setSelectedBand] = useState<WaveBand>('alpha');
  const [viewMode, setViewMode] = useState<ViewMode>('replayer');
  const [liveChartMode, setLiveChartMode] = useState<'sensors' | 'waves'>('sensors');
  const [windowScopeSec, setWindowScopeSec] = useState<number>(20); // 15s close-up ECG, 30s, 60s, or 0 (full)
  const [ecgDisplayType, setEcgDisplayType] = useState<'lines' | 'stacked'>('lines');
  const [visibleWaves, setVisibleWaves] = useState<Record<string, boolean>>({
    relDelta: true,
    relTheta: true,
    relAlpha: true,
    relBeta: true,
    relGamma: true,
  });

  if (!frames || frames.length === 0) return null;

  const currentFrame = frames[currentIndex] || frames[0];
  const totalDurationSec = frames[frames.length - 1]?.timeSec || 0;
  const totalDurationFormatted = formatTimeSec(totalDurationSec, { prefix: '' });

  // Playback loop
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, frames.length]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentIndex(Number(e.target.value));
  };

  // Helper to extract power value for a channel given a band
  const getChannelPower = (channelObj: any, band: WaveBand): number => {
    if (!channelObj) return 0;
    if (band === 'total') {
      return (channelObj.alpha || 0) + (channelObj.beta || 0) + (channelObj.theta || 0) + (channelObj.delta || 0) + (channelObj.gamma || 0);
    }
    return channelObj[band] || 0;
  };

  // Chart Data for Live Synchronized Timeline
  const liveChartData = useMemo(() => {
    return frames.map((f) => ({
      timeFormatted: f.timeFormatted,
      timeSec: f.timeSec,
      AF7: getChannelPower(f.channels.AF7, selectedBand),
      AF8: getChannelPower(f.channels.AF8, selectedBand),
      TP9: getChannelPower(f.channels.TP9, selectedBand),
      TP10: getChannelPower(f.channels.TP10, selectedBand),
      relDelta: f.relDelta,
      relTheta: f.relTheta,
      relAlpha: f.relAlpha,
      relBeta: f.relBeta,
      relGamma: f.relGamma,
    }));
  }, [frames, selectedBand]);

  // Sliding Window Chart Data (ECG / Oscilloscope rolling view)
  const slidingChartData = useMemo(() => {
    if (!liveChartData || liveChartData.length === 0) return [];
    if (windowScopeSec === 0) return liveChartData; // Full session overview

    const currentSec = currentFrame?.timeSec || 0;
    const startSec = Math.max(0, currentSec - windowScopeSec);
    const endSec = Math.max(windowScopeSec, currentSec);

    const sliced = liveChartData.filter((d) => d.timeSec >= startSec && d.timeSec <= endSec);

    if (sliced.length < 3) {
      return liveChartData.slice(0, Math.min(30, liveChartData.length));
    }
    return sliced;
  }, [liveChartData, currentFrame, windowScopeSec]);

  const toggleWaveVisibility = (waveKey: string) => {
    setVisibleWaves((prev) => ({ ...prev, [waveKey]: !prev[waveKey] }));
  };

  // Tooltip for Live Synchronized Timeline
  const LiveChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1 font-mono z-50">
          <div className="text-cyan-300 font-bold border-b border-slate-800 pb-1">
            Elapsed Time: {label}
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex justify-between items-center gap-3">
              <span style={{ color: entry.color }}>{entry.name}:</span>
              <span className="font-bold text-slate-100">
                {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                {liveChartMode === 'waves' ? '%' : ' Bels'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Compute min/max limits for selected band across all frames for accurate normalization
  const bandBounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    frames.forEach((f) => {
      ['AF7', 'AF8', 'TP9', 'TP10'].forEach((ch) => {
        const val = getChannelPower(f.channels[ch as keyof typeof f.channels], selectedBand);
        if (val < min) min = val;
        if (val > max) max = val;
      });
    });

    if (min === max) {
      min = 0;
      max = 1;
    }
    return { min, max };
  }, [frames, selectedBand]);

  // Compute Session Overall Averages per electrode
  const sessionAverages = useMemo(() => {
    const valid = frames.filter((f) => f.isGoodFit);
    const count = valid.length || 1;

    const averages = {
      AF7: 0,
      AF8: 0,
      TP9: 0,
      TP10: 0,
    };

    valid.forEach((f) => {
      averages.AF7 += getChannelPower(f.channels.AF7, selectedBand);
      averages.AF8 += getChannelPower(f.channels.AF8, selectedBand);
      averages.TP9 += getChannelPower(f.channels.TP9, selectedBand);
      averages.TP10 += getChannelPower(f.channels.TP10, selectedBand);
    });

    averages.AF7 /= count;
    averages.AF8 /= count;
    averages.TP9 /= count;
    averages.TP10 /= count;

    return averages;
  }, [frames, selectedBand]);

  // Convert power value to scientific thermal color (Blue -> Cyan -> Green -> Yellow -> Red) and scale radius
  const getThermalVisuals = (power: number) => {
    const norm = Math.min(1, Math.max(0, (power - bandBounds.min) / (bandBounds.max - bandBounds.min || 1)));

    // Hue: 240 (Deep Blue) down to 0 (Crimson Red)
    const hue = Math.round(240 * (1 - norm));
    const hslColor = `hsl(${hue}, 95%, 50%)`;

    // Dynamic aura size: 14px to 54px radius
    const outerRadius = 14 + norm * 40;
    const innerRadius = 5 + norm * 8;
    const auraOpacity = 0.25 + norm * 0.65;

    return {
      hue,
      color: hslColor,
      outerRadius,
      innerRadius,
      auraOpacity,
      normPercent: Math.round(norm * 100),
    };
  };

  // Generate multi-color timeline activity heatmap track for scrubber bar
  const timelineActivitySegments = useMemo(() => {
    if (!frames || frames.length === 0) return [];

    // Up to 100 timeline slices across the recording
    const sliceCount = Math.min(100, frames.length);
    const chunkSize = Math.max(1, Math.floor(frames.length / sliceCount));
    const segments = [];

    for (let i = 0; i < sliceCount; i++) {
      const startIdx = i * chunkSize;
      const endIdx = Math.min(frames.length, (i + 1) * chunkSize);
      const chunk = frames.slice(startIdx, endIdx);

      if (chunk.length === 0) continue;

      let sumFocus = 0;
      let sumCognitive = 0;
      let sumBadContact = 0;

      chunk.forEach((f) => {
        sumFocus += f.focusScore || 0;
        sumCognitive += f.cognitiveLoad || 0;
        if (!f.isGoodFit || !f.headBandOn) sumBadContact++;
      });

      const avgFocus = sumFocus / chunk.length;
      const avgCognitive = sumCognitive / chunk.length;
      const isBadContact = sumBadContact / chunk.length > 0.5;

      let colorClass = 'bg-blue-900/60'; // Low / Calm
      let label = 'Low Activity / Calm';

      if (isBadContact) {
        colorClass = 'bg-rose-900/80 border-b-2 border-rose-500';
        label = 'Bad Contact / Lost Signal';
      } else if (avgFocus >= 75 || avgCognitive >= 75) {
        colorClass = 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)] z-10'; // Peak High Activity
        label = `Peak High Activity (Focus: ${Math.round(avgFocus)}%)`;
      } else if (avgFocus >= 55 || avgCognitive >= 55) {
        colorClass = 'bg-cyan-400'; // High / Active Activity
        label = `High Activity (Focus: ${Math.round(avgFocus)}%)`;
      } else if (avgFocus >= 35) {
        colorClass = 'bg-emerald-500/80'; // Moderate Activity
        label = `Moderate Activity (Focus: ${Math.round(avgFocus)}%)`;
      }

      const startTime = chunk[0]?.timeFormatted || '00:00';
      const endTime = chunk[chunk.length - 1]?.timeFormatted || '00:00';

      segments.push({
        startIdx,
        endIdx,
        colorClass,
        tooltip: `${startTime} - ${endTime} | ${label}`,
        isPeak: avgFocus >= 75 || avgCognitive >= 75,
      });
    }

    return segments;
  }, [frames]);

  // Determine current frame values or session averages depending on active view mode
  const sensorValues = useMemo(() => {
    if (viewMode === 'session_average') {
      return sessionAverages;
    }
    return {
      AF7: getChannelPower(currentFrame.channels.AF7, selectedBand),
      AF8: getChannelPower(currentFrame.channels.AF8, selectedBand),
      TP9: getChannelPower(currentFrame.channels.TP9, selectedBand),
      TP10: getChannelPower(currentFrame.channels.TP10, selectedBand),
    };
  }, [viewMode, sessionAverages, currentFrame, selectedBand]);

  const af7Vis = getThermalVisuals(sensorValues.AF7);
  const af8Vis = getThermalVisuals(sensorValues.AF8);
  const tp9Vis = getThermalVisuals(sensorValues.TP9);
  const tp10Vis = getThermalVisuals(sensorValues.TP10);

  // Connection lost / Bad fit flags per sensor (HSI >= 3 or headband off)
  const isAF7Lost = viewMode === 'replayer' && (!currentFrame.headBandOn || (currentFrame.channels.AF7?.hsi ?? 1) >= 3);
  const isAF8Lost = viewMode === 'replayer' && (!currentFrame.headBandOn || (currentFrame.channels.AF8?.hsi ?? 1) >= 3);
  const isTP9Lost = viewMode === 'replayer' && (!currentFrame.headBandOn || (currentFrame.channels.TP9?.hsi ?? 1) >= 3);
  const isTP10Lost = viewMode === 'replayer' && (!currentFrame.headBandOn || (currentFrame.channels.TP10?.hsi ?? 1) >= 3);

  // Regional comparisons
  const frontalAvg = (sensorValues.AF7 + sensorValues.AF8) / 2;
  const temporalAvg = (sensorValues.TP9 + sensorValues.TP10) / 2;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 my-6 shadow-xl">
      {/* Top Navigation & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
            Topographical Brain Spatial Activity & Heatmap
          </h2>
          <p className="text-xs text-slate-400">
            Interactive thermal power mapping across Muse headband sensors (AF7, AF8, TP9, TP10)
          </p>
        </div>

        {/* View Mode Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('replayer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              viewMode === 'replayer' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Live Scrubber Replayer
          </button>
          <button
            onClick={() => setViewMode('session_average')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              viewMode === 'session_average' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Session Average Heatmap
          </button>
        </div>
      </div>

      {/* Wave Band Selector Bar */}
      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 mb-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" /> Select Wave Frequency Band to Map:
          </span>

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(BAND_DESCRIPTIONS) as WaveBand[]).map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBand(b)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  selectedBand === b
                    ? 'bg-slate-800 text-white border border-cyan-500/50 shadow-md font-bold'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                }`}
              >
                {BAND_DESCRIPTIONS[b].label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Band Explanation Badge */}
        <div className="pt-2 border-t border-slate-800/60 flex items-start gap-2 text-xs">
          <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className={`font-semibold ${BAND_DESCRIPTIONS[selectedBand].color}`}>
              {BAND_DESCRIPTIONS[selectedBand].label} ({BAND_DESCRIPTIONS[selectedBand].range}):
            </span>{' '}
            <span className="text-slate-300">{BAND_DESCRIPTIONS[selectedBand].meaning}</span>
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Head Map SVG Graphic with Thermal Glow */}
        <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col items-center justify-center relative overflow-visible">
          {/* Subtle background pulse */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-500 via-cyan-500 to-transparent blur-2xl pointer-events-none" />

          <span className="text-xs font-bold text-slate-200 mb-3 flex items-center gap-1.5 z-10">
            {viewMode === 'session_average'
              ? 'Session Overall Average Spatial Heatmap'
              : `Live Spatial Activity at ${currentFrame.timeFormatted} / ${totalDurationFormatted}`}
          </span>

          <svg viewBox="0 0 340 310" className="w-full max-w-[280px] h-auto filter drop-shadow-xl z-10 overflow-visible">
            <defs>
              {/* Radial Thermal Filters - Expanded filter region to prevent edge clipping */}
              <filter id="glow-af7" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="10" result="blur" />
              </filter>
              <filter id="glow-af8" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="10" result="blur" />
              </filter>
              <filter id="glow-tp9" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="10" result="blur" />
              </filter>
              <filter id="glow-tp10" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="10" result="blur" />
              </filter>

              {/* Scalp Regional Interpolation Gradients */}
              <linearGradient id="frontal-bridge" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={af7Vis.color} stopOpacity={af7Vis.auraOpacity * 0.5} />
                <stop offset="100%" stopColor={af8Vis.color} stopOpacity={af8Vis.auraOpacity * 0.5} />
              </linearGradient>

              <linearGradient id="left-hemisphere" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={af7Vis.color} stopOpacity={af7Vis.auraOpacity * 0.4} />
                <stop offset="100%" stopColor={tp9Vis.color} stopOpacity={tp9Vis.auraOpacity * 0.4} />
              </linearGradient>

              <linearGradient id="right-hemisphere" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={af8Vis.color} stopOpacity={af8Vis.auraOpacity * 0.4} />
                <stop offset="100%" stopColor={tp10Vis.color} stopOpacity={tp10Vis.auraOpacity * 0.4} />
              </linearGradient>
            </defs>

            {/* Nose outline */}
            <path d="M 162 55 L 170 32 L 178 55 Z" fill="#334155" stroke="#64748b" strokeWidth="1.5" />

            {/* Scalp Outline */}
            <circle cx="170" cy="155" r="90" fill="#090d16" stroke="#334155" strokeWidth="2.5" />

            {/* Left Ear */}
            <path d="M 75 140 C 66 145, 66 170, 75 175" fill="none" stroke="#475569" strokeWidth="3" />
            {/* Right Ear */}
            <path d="M 265 140 C 274 145, 274 170, 265 175" fill="none" stroke="#475569" strokeWidth="3" />

            {/* Inter-electrode Scalp Diffusion Connections */}
            <line x1="128" y1="85" x2="212" y2="85" stroke="url(#frontal-bridge)" strokeWidth="12" strokeLinecap="round" />
            <line x1="128" y1="85" x2="88" y2="160" stroke="url(#left-hemisphere)" strokeWidth="10" strokeLinecap="round" />
            <line x1="212" y1="85" x2="252" y2="160" stroke="url(#right-hemisphere)" strokeWidth="10" strokeLinecap="round" />

            {/* --- SENSOR AF7 (Left Forehead) --- */}
            <g>
              {isAF7Lost ? (
                <>
                  <circle cx="128" cy="85" r="22" fill="#ef4444" fillOpacity="0.2" stroke="#ef4444" strokeWidth="2" className="animate-pulse" />
                  <circle cx="128" cy="85" r="14" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.5" />
                  <line x1="122" y1="79" x2="134" y2="91" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="134" y1="79" x2="122" y2="91" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  <text x="128" y="118" textAnchor="middle" fill="#f87171" fontSize="10" className="font-mono font-bold">
                    AF7 (NO SIGNAL)
                  </text>
                </>
              ) : (
                <>
                  <circle
                    cx="128"
                    cy="85"
                    r={af7Vis.outerRadius}
                    fill={af7Vis.color}
                    fillOpacity={af7Vis.auraOpacity}
                    filter="url(#glow-af7)"
                    className="transition-all duration-300"
                  />
                  <circle
                    cx="128"
                    cy="85"
                    r={af7Vis.outerRadius * 0.6}
                    fill={af7Vis.color}
                    fillOpacity={0.6}
                    className="transition-all duration-300"
                  />
                  <circle cx="128" cy="85" r={af7Vis.innerRadius} fill="#ffffff" />
                  <text x="128" y="115" textAnchor="middle" fill="#cbd5e1" fontSize="11" className="font-mono font-semibold">
                    AF7 (Left)
                  </text>
                </>
              )}
            </g>

            {/* --- SENSOR AF8 (Right Forehead) --- */}
            <g>
              {isAF8Lost ? (
                <>
                  <circle cx="212" cy="85" r="22" fill="#ef4444" fillOpacity="0.2" stroke="#ef4444" strokeWidth="2" className="animate-pulse" />
                  <circle cx="212" cy="85" r="14" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.5" />
                  <line x1="206" y1="79" x2="218" y2="91" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="218" y1="79" x2="206" y2="91" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  <text x="212" y="118" textAnchor="middle" fill="#f87171" fontSize="10" className="font-mono font-bold">
                    AF8 (NO SIGNAL)
                  </text>
                </>
              ) : (
                <>
                  <circle
                    cx="212"
                    cy="85"
                    r={af8Vis.outerRadius}
                    fill={af8Vis.color}
                    fillOpacity={af8Vis.auraOpacity}
                    filter="url(#glow-af8)"
                    className="transition-all duration-300"
                  />
                  <circle
                    cx="212"
                    cy="85"
                    r={af8Vis.outerRadius * 0.6}
                    fill={af8Vis.color}
                    fillOpacity={0.6}
                    className="transition-all duration-300"
                  />
                  <circle cx="212" cy="85" r={af8Vis.innerRadius} fill="#ffffff" />
                  <text x="212" y="115" textAnchor="middle" fill="#cbd5e1" fontSize="11" className="font-mono font-semibold">
                    AF8 (Right)
                  </text>
                </>
              )}
            </g>

            {/* --- SENSOR TP9 (Left Temporal) --- */}
            <g>
              {isTP9Lost ? (
                <>
                  <circle cx="88" cy="160" r="22" fill="#ef4444" fillOpacity="0.2" stroke="#ef4444" strokeWidth="2" className="animate-pulse" />
                  <circle cx="88" cy="160" r="14" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.5" />
                  <line x1="82" y1="154" x2="94" y2="166" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="94" y1="154" x2="82" y2="166" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  <text x="88" y="193" textAnchor="middle" fill="#f87171" fontSize="10" className="font-mono font-bold">
                    TP9 (NO SIGNAL)
                  </text>
                </>
              ) : (
                <>
                  <circle
                    cx="88"
                    cy="160"
                    r={tp9Vis.outerRadius}
                    fill={tp9Vis.color}
                    fillOpacity={tp9Vis.auraOpacity}
                    filter="url(#glow-tp9)"
                    className="transition-all duration-300"
                  />
                  <circle
                    cx="88"
                    cy="160"
                    r={tp9Vis.outerRadius * 0.6}
                    fill={tp9Vis.color}
                    fillOpacity={0.6}
                    className="transition-all duration-300"
                  />
                  <circle cx="88" cy="160" r={tp9Vis.innerRadius} fill="#ffffff" />
                  <text x="88" y="190" textAnchor="middle" fill="#cbd5e1" fontSize="11" className="font-mono font-semibold">
                    TP9
                  </text>
                </>
              )}
            </g>

            {/* --- SENSOR TP10 (Right Temporal) --- */}
            <g>
              {isTP10Lost ? (
                <>
                  <circle cx="252" cy="160" r="22" fill="#ef4444" fillOpacity="0.2" stroke="#ef4444" strokeWidth="2" className="animate-pulse" />
                  <circle cx="252" cy="160" r="14" fill="#7f1d1d" stroke="#f87171" strokeWidth="1.5" />
                  <line x1="246" y1="154" x2="258" y2="166" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="258" y1="154" x2="246" y2="166" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
                  <text x="252" y="193" textAnchor="middle" fill="#f87171" fontSize="10" className="font-mono font-bold">
                    TP10 (NO SIGNAL)
                  </text>
                </>
              ) : (
                <>
                  <circle
                    cx="252"
                    cy="160"
                    r={tp10Vis.outerRadius}
                    fill={tp10Vis.color}
                    fillOpacity={tp10Vis.auraOpacity}
                    filter="url(#glow-tp10)"
                    className="transition-all duration-300"
                  />
                  <circle
                    cx="252"
                    cy="160"
                    r={tp10Vis.outerRadius * 0.6}
                    fill={tp10Vis.color}
                    fillOpacity={0.6}
                    className="transition-all duration-300"
                  />
                  <circle cx="252" cy="160" r={tp10Vis.innerRadius} fill="#ffffff" />
                  <text x="252" y="190" textAnchor="middle" fill="#cbd5e1" fontSize="11" className="font-mono font-semibold">
                    TP10
                  </text>
                </>
              )}
            </g>
          </svg>

          {/* Thermal Color Bar Legend */}
          <div className="w-full mt-3 pt-3 border-t border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="text-blue-400 font-bold">Low Power (Quiet)</span>
              <span className="text-emerald-400 font-bold">Medium</span>
              <span className="text-rose-400 font-bold">High (Intense)</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-500 via-emerald-500 via-yellow-400 to-rose-600 border border-slate-700 shadow-inner" />
            <div className="text-[10px] text-slate-400 text-center font-mono pt-1">
              <span className="text-rose-400 font-bold">✖ Red Indicator</span> = Bad contact / No Signal (HSI ≥ 3), distinct from low brain activity.
            </div>
          </div>
        </div>

        {/* Right Section: Replayer Controls or Regional Summary Cards */}
        <div className="lg:col-span-2 space-y-4">
          {viewMode === 'replayer' ? (
            <>
              {/* Scrubber Gauge Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-blue-400" /> Focus
                  </span>
                  <span className="text-xl font-bold text-blue-400">{currentFrame.focusScore}/100</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-emerald-400" /> Calm
                  </span>
                  <span className="text-xl font-bold text-emerald-400">{currentFrame.calmScore}/100</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" /> Meditation
                  </span>
                  <span className="text-xl font-bold text-indigo-400">{currentFrame.meditationDepth}/100</span>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-amber-400" /> Signal
                  </span>
                  <span className="text-xs font-bold text-amber-300 block mt-1">
                    {currentFrame.isBlink ? '👁 Blink Artifact' : currentFrame.isGoodFit ? '✓ Good Fit' : '⚠ Bad Contact'}
                  </span>
                </div>
              </div>

              {/* Time Scrubber Slider with Activity Heatmap Track */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-bold">Timeline Scrubber</span>
                    <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded flex items-center gap-1 font-sans">
                      <Flame className="w-3 h-3 text-amber-400 animate-bounce" />
                      Activity Timeline
                    </span>
                  </div>
                  <span className="text-cyan-400 font-bold bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800 self-start sm:self-auto font-mono text-[11px]">
                    {currentFrame.timeStamp ? `${currentFrame.timeStamp} (${currentFrame.timeFormatted})` : `${currentFrame.timeFormatted} / ${totalDurationFormatted}`}
                  </span>
                </div>

                {/* Scrubber Container with Heatmap Track */}
                <div className="relative pt-1 pb-1">
                  {/* Timeline Activity Bar */}
                  <div className="flex w-full h-3 rounded-md overflow-hidden bg-slate-900 border border-slate-800 mb-1.5 cursor-pointer shadow-inner">
                    {timelineActivitySegments.map((seg, idx) => (
                      <div
                        key={idx}
                        onClick={() => setCurrentIndex(seg.startIdx)}
                        className={`h-full flex-1 transition-all hover:opacity-80 ${seg.colorClass}`}
                        title={seg.tooltip}
                      />
                    ))}
                  </div>

                  <input
                    type="range"
                    min="0"
                    max={frames.length - 1}
                    value={currentIndex}
                    onChange={handleSliderChange}
                    className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Scrubber Activity Legend */}
                <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900 gap-2">
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]"></span> Peak Activity (&ge; 75%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400"></span> High Activity (&ge; 55%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Moderate
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-900"></span> Calm / Low
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-cyan-400">Hover / click timeline segments to jump</span>
                </div>

                {/* Playback Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md flex-1 sm:flex-none justify-center"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? 'Pause' : 'Play Replay'}
                    </button>

                    <button
                      onClick={() => {
                        setCurrentIndex(0);
                        setIsPlaying(false);
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs shrink-0"
                      title="Reset to Start"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Speed Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-1 bg-slate-900 p-1.5 rounded-lg border border-slate-800 max-w-full overflow-x-auto">
                    <span className="text-[10px] text-slate-400 px-1 font-semibold shrink-0">Speed:</span>
                    <div className="flex items-center gap-1 flex-1 sm:flex-none">
                      {[1, 2, 5, 10].map((spd) => (
                        <button
                          key={spd}
                          onClick={() => setPlaybackSpeed(spd)}
                          className={`px-2.5 py-1 text-xs font-mono rounded transition-all flex-1 sm:flex-none text-center ${
                            playbackSpeed === spd ? 'bg-cyan-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Session Average Regional Breakdown Panel */
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-purple-400" />
                Session Regional Activation Analysis ({BAND_DESCRIPTIONS[selectedBand].label.split(' ')[0]})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Frontal Cortex Card */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <span>Frontal Cortex (AF7 + AF8)</span>
                    <span style={{ color: af7Vis.color }}>{af7Vis.normPercent > af8Vis.normPercent ? af7Vis.normPercent : af8Vis.normPercent}% Peak</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Governs executive planning, focus, decision-making, and emotional approach motivation.
                  </p>
                  <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-300">
                    <span>Left AF7: {sessionAverages.AF7.toFixed(2)} Bels</span>
                    <span>Right AF8: {sessionAverages.AF8.toFixed(2)} Bels</span>
                  </div>
                </div>

                {/* Temporal Lobe Card */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <span>Temporal Lobes (TP9 + TP10)</span>
                    <span style={{ color: tp9Vis.color }}>{tp9Vis.normPercent > tp10Vis.normPercent ? tp9Vis.normPercent : tp10Vis.normPercent}% Peak</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Governs auditory processing, memory encoding, deep relaxation, and meditative states.
                  </p>
                  <div className="flex items-center justify-between text-xs font-mono pt-1 text-slate-300">
                    <span>Left TP9: {sessionAverages.TP9.toFixed(2)} Bels</span>
                    <span>Right TP10: {sessionAverages.TP10.toFixed(2)} Bels</span>
                  </div>
                </div>
              </div>

              {/* Hemispheric Dominance Balance Bar */}
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-300">
                  <span>Frontal vs. Temporal Power Share</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {((frontalAvg / (frontalAvg + temporalAvg || 1)) * 100).toFixed(1)}% Frontal / {((temporalAvg / (frontalAvg + temporalAvg || 1)) * 100).toFixed(1)}% Temporal
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                  <div
                    className="bg-cyan-500 h-full transition-all duration-500"
                    style={{ width: `${(frontalAvg / (frontalAvg + temporalAvg || 1)) * 100}%` }}
                  />
                  <div
                    className="bg-purple-500 h-full transition-all duration-500"
                    style={{ width: `${(temporalAvg / (frontalAvg + temporalAvg || 1)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Synchronized Moving Wave Chart Container */}
      {viewMode === 'replayer' && (
        <div className="mt-6 pt-5 border-t border-slate-800 space-y-3">
          {/* Main Chart Header & Mode Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <div>
                <span className="text-xs font-bold text-slate-100 block">Live Scrubber ECG / Audio Oscilloscope Dynamics</span>
                <span className="text-[10px] text-slate-400">Close-up real-time sliding waveform view (moves right to left with scrubber)</span>
              </div>
            </div>

            {/* Mode Switcher: 4 Sensors vs All 5 Waves */}
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setLiveChartMode('sensors')}
                className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center gap-1.5 ${
                  liveChartMode === 'sensors'
                    ? 'bg-cyan-600 text-white shadow font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> 4 Sensors Live ({BAND_DESCRIPTIONS[selectedBand].label.split(' ')[0]})
              </button>
              <button
                type="button"
                onClick={() => setLiveChartMode('waves')}
                className={`px-3 py-1 rounded text-xs font-semibold transition flex items-center gap-1.5 ${
                  liveChartMode === 'waves'
                    ? 'bg-cyan-600 text-white shadow font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" /> All 5 Waves ECG Spectrum
              </button>
            </div>
          </div>

          {/* ECG Oscilloscope Toolbar: Window Scope, Trace Style, Wave Filters */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Window Scope Selector (Sliding Viewport) */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold text-[11px]">Sliding Scope:</span>
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                {[
                  { label: '15s ECG View', value: 15 },
                  { label: '30s Window', value: 30 },
                  { label: '60s Window', value: 60 },
                  { label: 'Full Session', value: 0 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setWindowScopeSec(opt.value)}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition ${
                      windowScopeSec === opt.value
                        ? 'bg-cyan-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* If 5 Waves Mode: Trace Display Style & Interactive Wave Filters */}
            {liveChartMode === 'waves' && (
              <div className="flex flex-wrap items-center gap-3">
                {/* Trace Style Switcher */}
                <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEcgDisplayType('lines')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
                      ecgDisplayType === 'lines'
                        ? 'bg-purple-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ECG Traces (Lines)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEcgDisplayType('stacked')}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition ${
                      ecgDisplayType === 'stacked'
                        ? 'bg-purple-600 text-white font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Stacked Area
                  </button>
                </div>

                {/* Wave Solo/Toggle Filter Chips */}
                <div className="flex items-center gap-1 flex-wrap">
                  {[
                    { key: 'relDelta', label: 'δ Delta', color: 'text-purple-400 border-purple-800' },
                    { key: 'relTheta', label: 'θ Theta', color: 'text-cyan-400 border-cyan-800' },
                    { key: 'relAlpha', label: 'α Alpha', color: 'text-emerald-400 border-emerald-800' },
                    { key: 'relBeta', label: 'β Beta', color: 'text-blue-400 border-blue-800' },
                    { key: 'relGamma', label: 'γ Gamma', color: 'text-amber-400 border-amber-800' },
                  ].map((w) => (
                    <button
                      key={w.key}
                      type="button"
                      onClick={() => toggleWaveVisibility(w.key)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition ${
                        visibleWaves[w.key]
                          ? `bg-slate-900 ${w.color} font-bold`
                          : 'bg-slate-950 text-slate-600 border-slate-800 opacity-50 line-through'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Synchronized Recharts Area/Line Display */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {liveChartMode === 'sensors' ? (
                  /* 4 Sensors Line Chart */
                  <LineChart data={slidingChartData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" Bels" />
                    <Tooltip content={<LiveChartTooltip />} />
                    <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '11px' }} />
                    <ReferenceLine
                      x={currentFrame.timeFormatted}
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      label={{ value: '▶ LIVE', fill: '#38bdf8', fontSize: 10, fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="AF7" name="AF7 (Left Forehead)" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="AF8" name="AF8 (Right Forehead)" stroke="#818cf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="TP9" name="TP9 (Left Temporal)" stroke="#34d399" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="TP10" name="TP10 (Right Temporal)" stroke="#f43f5e" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                ) : ecgDisplayType === 'lines' ? (
                  /* 5 Waves ECG Oscilloscope Multi-Trace Line Chart */
                  <LineChart data={slidingChartData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" domain={[0, 'auto']} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip content={<LiveChartTooltip />} />
                    <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '11px' }} />
                    <ReferenceLine
                      x={currentFrame.timeFormatted}
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      label={{ value: '▶ LIVE', fill: '#38bdf8', fontSize: 10, fontWeight: 'bold' }}
                    />
                    {visibleWaves.relDelta && (
                      <Line type="monotone" dataKey="relDelta" name="Delta (δ 0.5-4Hz)" stroke="#8b5cf6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    )}
                    {visibleWaves.relTheta && (
                      <Line type="monotone" dataKey="relTheta" name="Theta (θ 4-8Hz)" stroke="#06b6d4" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    )}
                    {visibleWaves.relAlpha && (
                      <Line type="monotone" dataKey="relAlpha" name="Alpha (α 8-13Hz)" stroke="#10b981" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    )}
                    {visibleWaves.relBeta && (
                      <Line type="monotone" dataKey="relBeta" name="Beta (β 13-30Hz)" stroke="#3b82f6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    )}
                    {visibleWaves.relGamma && (
                      <Line type="monotone" dataKey="relGamma" name="Gamma (γ 30-44Hz)" stroke="#f59e0b" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    )}
                  </LineChart>
                ) : (
                  /* 5 Waves Stacked Relative Spectrum Chart */
                  <AreaChart data={slidingChartData} margin={{ top: 15, right: 15, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="liveDelta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="liveTheta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="liveAlpha" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="liveBeta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="liveGamma" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis stroke="#64748b" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip content={<LiveChartTooltip />} />
                    <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: '11px' }} />
                    <ReferenceLine
                      x={currentFrame.timeFormatted}
                      stroke="#38bdf8"
                      strokeWidth={2.5}
                      label={{ value: '▶ LIVE', fill: '#38bdf8', fontSize: 10, fontWeight: 'bold' }}
                    />
                    {visibleWaves.relDelta && (
                      <Area type="monotone" dataKey="relDelta" stackId="1" name="Delta (0.5-4Hz Rest)" stroke="#8b5cf6" fill="url(#liveDelta)" isAnimationActive={false} />
                    )}
                    {visibleWaves.relTheta && (
                      <Area type="monotone" dataKey="relTheta" stackId="1" name="Theta (4-8Hz Deep Flow)" stroke="#06b6d4" fill="url(#liveTheta)" isAnimationActive={false} />
                    )}
                    {visibleWaves.relAlpha && (
                      <Area type="monotone" dataKey="relAlpha" stackId="1" name="Alpha (8-13Hz Calm)" stroke="#10b981" fill="url(#liveAlpha)" isAnimationActive={false} />
                    )}
                    {visibleWaves.relBeta && (
                      <Area type="monotone" dataKey="relBeta" stackId="1" name="Beta (13-30Hz Active Focus)" stroke="#3b82f6" fill="url(#liveBeta)" isAnimationActive={false} />
                    )}
                    {visibleWaves.relGamma && (
                      <Area type="monotone" dataKey="relGamma" stackId="1" name="Gamma (30-44Hz Alert)" stroke="#f59e0b" fill="url(#liveGamma)" isAnimationActive={false} />
                    )}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Live Readout Bar for Current Cursor Position */}
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between text-xs font-mono gap-2">
              <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                Active Replay Frame ({currentFrame.timeFormatted}):
              </span>
              {liveChartMode === 'sensors' ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sky-300">AF7: {sensorValues.AF7.toFixed(2)} Bels</span>
                  <span className="text-indigo-300">AF8: {sensorValues.AF8.toFixed(2)} Bels</span>
                  <span className="text-emerald-300">TP9: {sensorValues.TP9.toFixed(2)} Bels</span>
                  <span className="text-rose-300">TP10: {sensorValues.TP10.toFixed(2)} Bels</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-purple-400">Delta: {currentFrame.relDelta.toFixed(1)}%</span>
                  <span className="text-cyan-400">Theta: {currentFrame.relTheta.toFixed(1)}%</span>
                  <span className="text-emerald-400 font-bold">Alpha: {currentFrame.relAlpha.toFixed(1)}%</span>
                  <span className="text-blue-400">Beta: {currentFrame.relBeta.toFixed(1)}%</span>
                  <span className="text-amber-400">Gamma: {currentFrame.relGamma.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

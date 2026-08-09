import React, { useState, useEffect, useMemo } from 'react';
import { ProcessedEEGFrame } from '../types/eeg';
import { formatTimeSec } from '../utils/eegProcessor';
import { Play, Pause, RotateCcw, Activity, Eye, Zap, Heart, Flame, Info, Layers, Compass } from 'lucide-react';

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
              {/* Outer Thermal Aura */}
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
              {/* Core Dot */}
              <circle cx="128" cy="85" r={af7Vis.innerRadius} fill="#ffffff" />
              <text x="128" y="115" textAnchor="middle" fill="#cbd5e1" fontSize="11" className="font-mono font-semibold">
                AF7 (Left)
              </text>
            </g>

            {/* --- SENSOR AF8 (Right Forehead) --- */}
            <g>
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
            </g>

            {/* --- SENSOR TP9 (Left Temporal) --- */}
            <g>
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
            </g>

            {/* --- SENSOR TP10 (Right Temporal) --- */}
            <g>
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

              {/* Time Scrubber Slider */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Timeline Scrubber</span>
                  <span className="text-cyan-400 font-bold bg-slate-900 px-2.5 py-0.5 rounded border border-slate-800">
                    {currentFrame.timeFormatted} / {totalDurationFormatted} ({currentFrame.timeSec.toFixed(1)}s)
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={frames.length - 1}
                  value={currentIndex}
                  onChange={handleSliderChange}
                  className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
                />

                {/* Playback Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      {isPlaying ? 'Pause' : 'Play Replay'}
                    </button>

                    <button
                      onClick={() => {
                        setCurrentIndex(0);
                        setIsPlaying(false);
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
                      title="Reset to Start"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Speed Buttons */}
                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 px-1 font-semibold">Speed:</span>
                    {[1, 2, 5].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2 py-0.5 text-xs font-mono rounded ${
                          playbackSpeed === spd ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
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
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { ProcessedEEGFrame } from '../types/eeg';
import { Play, Pause, RotateCcw, FastForward, Activity, Eye, Zap, Heart } from 'lucide-react';

interface Props {
  frames: ProcessedEEGFrame[];
}

export const BrainStateReplayer: React.FC<Props> = ({ frames }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x

  if (!frames || frames.length === 0) return null;

  const currentFrame = frames[currentIndex] || frames[0];

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentIndex(prev => {
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

  // Sensor glow intensity helper (0 to 1) based on Alpha power Bels
  const getSensorColor = (bels: number) => {
    // Normal Bels range around -0.5 to 1.5
    const norm = Math.min(1, Math.max(0, (bels + 0.5) / 2.0));
    const r = Math.round(16 + norm * 200);
    const g = Math.round(185 + norm * 70);
    const b = Math.round(129);
    return `rgba(${r}, ${g}, ${b}, ${0.3 + norm * 0.7})`;
  };

  const tp9Alpha = currentFrame.channels.TP9.alpha;
  const af7Alpha = currentFrame.channels.AF7.alpha;
  const af8Alpha = currentFrame.channels.AF8.alpha;
  const tp10Alpha = currentFrame.channels.TP10.alpha;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 my-6 shadow-md">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-400 animate-pulse" />
            Interactive Mind State Replayer & Sensor Head Map
          </h2>
          <p className="text-xs text-slate-400">Replay session second-by-second to observe localized sensor power</p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-cyan-400 font-bold bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            {currentFrame.timeFormatted} ({currentFrame.timeSec.toFixed(0)}s)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Head Map SVG Graphic */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col items-center justify-center relative">
          <span className="text-[11px] font-semibold text-slate-400 mb-2">4-Channel Sensor Spatial Activity (Muse)</span>

          <svg viewBox="0 0 200 220" className="w-48 h-52 filter drop-shadow-lg">
            {/* Nose outline */}
            <path d="M 92 25 L 100 10 L 108 25 Z" fill="#334155" stroke="#64748b" strokeWidth="1.5" />

            {/* Head Circle */}
            <circle cx="100" cy="115" r="80" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />

            {/* Left Ear */}
            <path d="M 16 100 C 10 105, 10 125, 16 130" fill="none" stroke="#475569" strokeWidth="3" />
            {/* Right Ear */}
            <path d="M 184 100 C 190 105, 190 125, 184 130" fill="none" stroke="#475569" strokeWidth="3" />

            {/* Forehead Sensors: AF7 (Left) and AF8 (Right) */}
            {/* AF7 */}
            <g>
              <circle cx="65" cy="55" r="14" fill={getSensorColor(af7Alpha)} className="transition-all duration-300" />
              <circle cx="65" cy="55" r="6" fill="#38bdf8" />
              <text x="65" y="80" textAnchor="middle" fill="#94a3b8" fontSize="10" className="font-mono">AF7 (Left)</text>
            </g>

            {/* AF8 */}
            <g>
              <circle cx="135" cy="55" r="14" fill={getSensorColor(af8Alpha)} className="transition-all duration-300" />
              <circle cx="135" cy="55" r="6" fill="#38bdf8" />
              <text x="135" y="80" textAnchor="middle" fill="#94a3b8" fontSize="10" className="font-mono">AF8 (Right)</text>
            </g>

            {/* Ear Temporal Sensors: TP9 (Left Ear) and TP10 (Right Ear) */}
            {/* TP9 */}
            <g>
              <circle cx="32" cy="120" r="14" fill={getSensorColor(tp9Alpha)} className="transition-all duration-300" />
              <circle cx="32" cy="120" r="6" fill="#818cf8" />
              <text x="32" y="145" textAnchor="middle" fill="#94a3b8" fontSize="10" className="font-mono">TP9</text>
            </g>

            {/* TP10 */}
            <g>
              <circle cx="168" cy="120" r="14" fill={getSensorColor(tp10Alpha)} className="transition-all duration-300" />
              <circle cx="168" cy="120" r="6" fill="#818cf8" />
              <text x="168" y="145" textAnchor="middle" fill="#94a3b8" fontSize="10" className="font-mono">TP10</text>
            </g>
          </svg>

          <div className="flex items-center gap-4 text-[10px] text-slate-400 mt-2 font-mono">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> High Alpha</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" /> Rest</span>
          </div>
        </div>

        {/* Live Gauges at Scrubber Point */}
        <div className="lg:col-span-2 space-y-4">
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
                <Eye className="w-3.5 h-3.5 text-amber-400" /> Status
              </span>
              <span className="text-xs font-bold text-amber-300 block mt-1">
                {currentFrame.isBlink ? '👁 Blink Artifact' : currentFrame.isGoodFit ? '✓ Good Fit' : '⚠ Bad Contact'}
              </span>
            </div>
          </div>

          {/* Time Scrubber Slider */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
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
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
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
                {[1, 2, 5].map(spd => (
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
        </div>
      </div>
    </div>
  );
};

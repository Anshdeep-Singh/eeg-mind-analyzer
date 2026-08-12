import React from 'react';
import { BookOpen, Waves, Shield, HelpCircle } from 'lucide-react';

export const BrainwaveGuide: React.FC = () => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 my-6 shadow-md">
      <div className="flex items-center space-x-2 pb-4 mb-4 border-b border-slate-800">
        <BookOpen className="w-5 h-5 text-cyan-400" />
        <h2 className="text-base font-bold text-white">Brainwave Reference Guide</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
        {/* Delta */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-purple-400">Delta Band (0.5 – 4 Hz)</span>
            <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800">Deep Rest</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Associated with deep stage-3/4 sleep, unconscious rest, and bodily restoration. Prominent in waking states usually indicates deep drowsiness or eye movement artifacts.
          </p>
        </div>

        {/* Theta */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-400">Theta Band (4 – 8 Hz)</span>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">Deep Meditation & Intuition</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Linked with deep meditation, visualization, hypnagogic states, creativity, and inner memory processing.
          </p>
        </div>

        {/* Alpha */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-400">Alpha Band (8 – 13 Hz)</span>
            <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">Calm Alertness</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            The bridge wave. Present during relaxed mindfulness, eyes closed tranquility, and mental calm without sleepiness.
          </p>
        </div>

        {/* Beta */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-blue-400">Beta Band (13 – 30 Hz)</span>
            <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800">Active Thinking</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Dominant during focused mental work, logic, decision-making, conversation, and problem-solving.
          </p>
        </div>

        {/* Gamma */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-400">Gamma Band (30 – 44 Hz)</span>
            <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800">Peak Insight</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            High-frequency binding wave associated with sudden "aha!" insights, high-level information synthesis, and heightened perception.
          </p>
        </div>

        {/* Sensor Locations & Units */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200">Sensors & Units</span>
            <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">Bels & HSI</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            <strong>Sensors:</strong> AF7 (Left Forehead), AF8 (Right Forehead), TP9 (Left Ear), TP10 (Right Ear).<br />
            <strong>Power:</strong> Measured in Bels (Power = 10^Bels μV²).<br />
            <strong>HSI Fit:</strong> 1 = Good, 2 = Medium, 4 = Bad fit.
          </p>
        </div>
      </div>
    </div>
  );
};

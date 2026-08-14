import React, { useState } from 'react';
import { BookOpen, Waves, Shield, Activity, Brain, Compass, Sparkles, AlertCircle, Layers } from 'lucide-react';

export const BrainwaveGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'bands' | 'sensors' | 'matrix' | 'ratios' | 'artifacts'>('bands');
  const [selectedSensor, setSelectedSensor] = useState<'AF7' | 'AF8' | 'TP9' | 'TP10'>('AF7');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 my-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-cyan-950/80 text-cyan-400 rounded-xl border border-cyan-800/80 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Brainwave & Neuro-Sensor Reference Guide</h2>
            <p className="text-xs text-slate-400">
              Interactive clinical reference for 4-channel EEG band frequencies, sensor topography, and cognitive indices.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('bands')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'bands'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Frequency Bands</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sensors')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'sensors'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Sensors & Regions</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'matrix'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Wave x Sensor Meanings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ratios')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'ratios'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Ratios & Indices</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('artifacts')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'artifacts'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Units & Artifacts</span>
          </button>
        </div>
      </div>

      {/* TAB 1: FREQUENCY BANDS OVERVIEW */}
      {activeTab === 'bands' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Delta */}
          <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-400 text-sm">Delta Band (0.5 – 4.0 Hz)</span>
              <span className="text-[10px] bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-800 font-mono font-semibold">
                Deep Rest / NREM
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Dominant during stage 3/4 deep NREM sleep, unconscious physical healing, and cellular regeneration.
            </p>
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-300 block">Waking State Meaning:</span>
              <p className="text-slate-400 text-[11px] leading-snug">
                In alert waking states, prominent Delta usually indicates eye blinks (EOG artifact), head movement, or severe drowsiness / cognitive fatigue.
              </p>
            </div>
          </div>

          {/* Theta */}
          <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 text-sm">Theta Band (4.0 – 8.0 Hz)</span>
              <span className="text-[10px] bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono font-semibold">
                Meditation & Memory
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Associated with deep meditation, hypnagogic twilight states, vivid imagery, emotional memory consolidation, and intuitive insight.
            </p>
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-300 block">Location Key:</span>
              <p className="text-slate-400 text-[11px] leading-snug">
                <strong>Frontal Theta (FM-Theta):</strong> Working memory load & meditative focus.<br />
                <strong>Temporal Theta:</strong> Subconscious imagery & emotional daydreaming.
              </p>
            </div>
          </div>

          {/* Alpha */}
          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 text-sm">Alpha Band (8.0 – 13.0 Hz)</span>
              <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-mono font-semibold">
                Calm Alertness
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              The "neural idle rhythm" and bridge between conscious thought and subconscious depth. Prominent during relaxed mindfulness with eyes closed.
            </p>
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-300 block">Sensory Gating:</span>
              <p className="text-slate-400 text-[11px] leading-snug">
                Suppression of Alpha indicates active task engagement (cortical desynchronization). High Alpha reflects quiet sensory readiness.
              </p>
            </div>
          </div>

          {/* Beta */}
          <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-400 text-sm">Beta Band (13.0 – 30.0 Hz)</span>
              <span className="text-[10px] bg-blue-950/80 text-blue-300 px-2 py-0.5 rounded border border-blue-800 font-mono font-semibold">
                Active Logic & Focus
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Dominant during active problem-solving, decision-making, logical analysis, conversation, and focused mental work.
            </p>
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-300 block">Low vs High Beta:</span>
              <p className="text-slate-400 text-[11px] leading-snug">
                <strong>13–20 Hz (SMR/Low Beta):</strong> Calm, attentive focus.<br />
                <strong>20–30 Hz (High Beta):</strong> Analytical strain, agitation, or jaw tension.
              </p>
            </div>
          </div>

          {/* Gamma */}
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">Gamma Band (30.0 – 44.0 Hz)</span>
              <span className="text-[10px] bg-amber-950/80 text-amber-300 px-2 py-0.5 rounded border border-amber-800 font-mono font-semibold">
                Peak Insight & Binding
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              High-frequency binding wave associated with multi-sensory integration, sudden "aha!" creative epiphanies, and heightened perceptual synthesis.
            </p>
            <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-300 block">Artifact Caution:</span>
              <p className="text-slate-400 text-[11px] leading-snug">
                Gamma power easily overlaps with high-frequency muscle micro-tremors (EMG) and rapid microsaccadic eye movements.
              </p>
            </div>
          </div>

          {/* Summary Box */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200 text-sm">Spectral Hierarchy</span>
              <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800 font-mono">
                0.5 – 44 Hz
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Lower frequencies (Delta, Theta) reflect internal, autonomic, and subconscious processes. Higher frequencies (Beta, Gamma) reflect active cortical processing and external task engagement. Alpha acts as the central regulator.
            </p>
            <div className="pt-2 border-t border-slate-900 flex justify-between text-[10px] text-slate-400 font-mono">
              <span>Deep Sleep</span>
              <span>➔</span>
              <span>Meditation</span>
              <span>➔</span>
              <span>Mindfulness</span>
              <span>➔</span>
              <span>Task Focus</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SENSOR TOPOGRAPHY & REGIONS */}
      {activeTab === 'sensors' && (
        <div className="space-y-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Brain className="w-4 h-4 text-cyan-400" />
              Standard 10-20 Muse 4-Electrode Topography
            </h3>
            <p className="text-slate-300 leading-relaxed">
              The headband configuration measures electrical activity from two prefrontal forehead electrodes (<strong>AF7</strong>, <strong>AF8</strong>) and two temporal mastoid electrodes (<strong>TP9</strong>, <strong>TP10</strong>). Prefrontal contacts capture executive control and emotional valence, while temporal contacts capture sensory gating, auditory tracking, and autonomic rest.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* AF7 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono font-bold text-xs">
                    AF7
                  </span>
                  <span className="font-bold text-white">Left Prefrontal Forehead</span>
                </div>
                <span className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">Anterior Left</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Positioned over the left dorsolateral prefrontal cortex (DL-PFC). Core center for verbal logic, analytical reasoning, working memory execution, and approach-oriented emotional motivation.
              </p>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-start gap-1.5 text-[11px]">
                  <span className="font-bold text-indigo-400 shrink-0">Approach Motivation:</span>
                  <span className="text-slate-300">Lower AF7 Alpha relative to AF8 indicates higher left prefrontal activation, linked to goal pursuit, enthusiasm, and resilience.</span>
                </div>
                <div className="flex items-start gap-1.5 text-[11px]">
                  <span className="font-bold text-indigo-400 shrink-0">Task Engagement:</span>
                  <span className="text-slate-300">Elevated AF7 Beta indicates active problem solving and analytical focus.</span>
                </div>
              </div>
            </div>

            {/* AF8 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/30 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-mono font-bold text-xs">
                    AF8
                  </span>
                  <span className="font-bold text-white">Right Prefrontal Forehead</span>
                </div>
                <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider">Anterior Right</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Positioned over the right dorsolateral prefrontal cortex (DL-PFC). Core center for spatial intuition, emotional vigilance, threat appraisal, and behavioral inhibition.
              </p>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-start gap-1.5 text-[11px]">
                  <span className="font-bold text-purple-400 shrink-0">Avoidance / Reflection:</span>
                  <span className="text-slate-300">Suppressed AF8 Alpha indicates right prefrontal activation, associated with cautious reflection, anxiety, or withdrawal orientation.</span>
                </div>
                <div className="flex items-start gap-1.5 text-[11px]">
                  <span className="font-bold text-purple-400 shrink-0">Pattern Intuition:</span>
                  <span className="text-slate-300">Elevated AF8 Theta and Beta correlate with holistic spatial visualization and rapid threat appraisal.</span>
                </div>
              </div>
            </div>

            {/* TP9 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono font-bold text-xs">
                    TP9
                  </span>
                  <span className="font-bold text-white">Left Temporal (Behind Ear)</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">Posterior Left</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Positioned behind the left ear over parieto-temporal networks. Responsible for language comprehension, auditory processing, inner monologue, and somatic grounding.
              </p>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-start gap-1.5 text-[11px]">
                  <span className="font-bold text-cyan-400 shrink-0">Inner Quiet:</span>
                  <span className="text-slate-300">High TP9 Alpha signifies quiet auditory standby and reduction in internal verbal chatter.</span>
                </div>
                <div className="flex items-start gap-1.5 text-[11px]">
                  <span className="font-bold text-cyan-400 shrink-0">EMG Caution:</span>
                  <span className="text-slate-300">Jaw clenching and temporalis muscle tension directly manifest as high-amplitude Beta/Gamma spikes on TP9.</span>
                </div>
              </div>
            </div>

            {/* TP10 */}
            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold text-xs">
                    TP10
                  </span>
                  <span className="font-bold text-white">Right Temporal (Behind Ear)</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Posterior Right</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Positioned behind the right ear over parieto-temporal networks. Responsible for environmental spatial awareness, tone/pitch perception, and autonomic calm.
              </p>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-start gap-1.5 text-[11px]">
                  <span className="font-bold text-emerald-400 shrink-0">Autonomic Calm:</span>
                  <span className="text-slate-300">Strong TP10 Alpha power reflects deep physical tranquility, reduced sensory stress, and parasympathetic tone.</span>
                </div>
                <div className="flex items-start gap-1.5 text-[11px]">
                  <span className="font-bold text-emerald-400 shrink-0">Visual/Spatial Flow:</span>
                  <span className="text-slate-300">Elevated TP10 Theta accompanies non-verbal daydreaming and spatial visualization in meditative flow states.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WAVE X SENSOR MEANINGS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="font-bold text-white">Select Sensor to Inspect Wave Meanings:</span>
            <div className="flex items-center gap-1.5">
              {(['AF7', 'AF8', 'TP9', 'TP10'] as const).map((sensor) => (
                <button
                  key={sensor}
                  type="button"
                  onClick={() => setSelectedSensor(sensor)}
                  className={`px-3 py-1 rounded-lg font-mono text-xs font-bold transition-all ${
                    selectedSensor === sensor
                      ? 'bg-cyan-600 text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {sensor}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Content for Selected Sensor */}
          <div className="bg-slate-950 p-4 sm:p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  Wave Interpretations at Electrode Location: <span className="text-cyan-400 font-mono">{selectedSensor}</span>
                </h3>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-mono">
                {selectedSensor === 'AF7' && 'Left Prefrontal Forehead'}
                {selectedSensor === 'AF8' && 'Right Prefrontal Forehead'}
                {selectedSensor === 'TP9' && 'Left Temporal Mastoid'}
                {selectedSensor === 'TP10' && 'Right Temporal Mastoid'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Alpha at Selected Sensor */}
              <div className="p-3 bg-slate-900/90 rounded-lg border border-emerald-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">Alpha Wave (8–13 Hz)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Sensory / Idling</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedSensor === 'AF7' && 'Suppression indicates active left prefrontal verbal/logical focus. High Alpha indicates quiet baseline idle state and relaxed approach orientation.'}
                  {selectedSensor === 'AF8' && 'Suppression reflects right prefrontal vigilance or anxiety. High Alpha indicates suppressed right prefrontal stress and relaxed mood.'}
                  {selectedSensor === 'TP9' && 'High Alpha indicates left temporal auditory idling, reduced internal verbal chatter, and quiet mental stillness.'}
                  {selectedSensor === 'TP10' && 'High Alpha signifies strong somatic relaxation, sensory gating, physical calm, and parasympathetic dominance.'}
                </p>
              </div>

              {/* Theta at Selected Sensor */}
              <div className="p-3 bg-slate-900/90 rounded-lg border border-cyan-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-400">Theta Wave (4–8 Hz)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Memory / Depth</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedSensor === 'AF7' && 'Frontal Midline Theta (FM-Theta): Reflects intense working memory load, mental arithmetic concentration, or deep absorption during meditation.'}
                  {selectedSensor === 'AF8' && 'Reflects intuitive spatial visualization, deep emotional memory processing, or hypnagogic drowsiness.'}
                  {selectedSensor === 'TP9' && 'Reflects subconscious memory integration, vivid emotional imagery, and hypnagogic dream-like states.'}
                  {selectedSensor === 'TP10' && 'Reflects somatic relaxation, spatial visualization, deep flow, and subconscious restorative rest.'}
                </p>
              </div>

              {/* Beta at Selected Sensor */}
              <div className="p-3 bg-slate-900/90 rounded-lg border border-blue-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-400">Beta Wave (13–30 Hz)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Cognition / Strain</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedSensor === 'AF7' && 'Active executive cognition, logical analytical task work, and active decision-making. Very high Beta suggests cognitive overload.'}
                  {selectedSensor === 'AF8' && 'Active emotional appraisal, risk assessment, or vigilance. Very high Beta indicates stress or acute worry.'}
                  {selectedSensor === 'TP9' && 'Active speech tracking or temporal muscle tension (jaw clenching EMG artifact).'}
                  {selectedSensor === 'TP10' && 'Spatial attention or neck/jaw muscle contraction artifact (EMG contamination).'}
                </p>
              </div>

              {/* Gamma at Selected Sensor */}
              <div className="p-3 bg-slate-900/90 rounded-lg border border-amber-500/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400">Gamma Wave (30–44 Hz)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Insight / Binding</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {selectedSensor === 'AF7' && 'Peak cognitive insight during complex problem-solving. Also prone to saccadic eye blink/movement artifacts.'}
                  {selectedSensor === 'AF8' && 'Rapid pattern synthesis and sudden intuitive "aha!" recognition. Watch for eye muscle artifact.'}
                  {selectedSensor === 'TP9' && 'Auditory signal integration and cross-modal sensory processing. High levels can reflect jaw tension.'}
                  {selectedSensor === 'TP10' && 'Multi-sensory perceptual integration and spatial binding. Frequently contaminated by temporalis muscle activity.'}
                </p>
              </div>

              {/* Delta at Selected Sensor */}
              <div className="p-3 bg-slate-900/90 rounded-lg border border-purple-500/20 space-y-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-400">Delta Wave (0.5–4 Hz)</span>
                  <span className="text-[10px] text-slate-400 font-mono">Deep Rest / Artifact</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {(selectedSensor === 'AF7' || selectedSensor === 'AF8') &&
                    'In waking states, Delta spikes on prefrontal sensors are almost exclusively caused by vertical eye blinks and ocular movement (EOG artifacts). During sleep, high prefrontal Delta signals deep restorative NREM sleep.'}
                  {(selectedSensor === 'TP9' || selectedSensor === 'TP10') &&
                    'In waking states, Delta power on temporal sensors indicates head movement, loose electrode contact, or heavy physical fatigue. During sleep, reflects deep slow-wave physical recovery.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CLINICAL RATIOS & COGNITIVE INDICES */}
      {activeTab === 'ratios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Frontal Alpha Asymmetry (FAA) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-indigo-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-400 text-sm">Frontal Alpha Asymmetry (FAA)</span>
              <span className="text-[10px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800 font-mono">
                ln(AF8 Alpha) - ln(AF7 Alpha)
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Compares prefrontal cortex activation between hemispheres. Because higher Alpha power reflects relative cortical idling, subtracting left from right yields an index of affective motivation.
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="text-emerald-400">
                <strong>FAA &gt; +0.05 Bels:</strong> Approach Motivation (Left Activation &gt; Right). Optimism, positive valence, resilience.
              </div>
              <div className="text-purple-400">
                <strong>FAA &lt; -0.05 Bels:</strong> Withdrawal Orientation (Right Activation &gt; Left). Internalized reflection, vigilance, cautious appraisal.
              </div>
            </div>
          </div>

          {/* Theta / Beta Ratio (TBR) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-cyan-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-400 text-sm">Theta / Beta Ratio (TBR)</span>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800 font-mono">
                Frontal Theta / Frontal Beta
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Standard clinical marker for executive control and cognitive arousal. Evaluates the balance between slow internal waves (Theta) and fast task-focused waves (Beta).
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="text-amber-400">
                <strong>TBR &gt; 3.0:</strong> Executive Under-Arousal. Mind-wandering, distractibility, cognitive fatigue, or ADHD-like state.
              </div>
              <div className="text-cyan-400">
                <strong>TBR &lt; 1.8:</strong> High Analytical Focus. Active task engagement, intense logical problem solving.
              </div>
            </div>
          </div>

          {/* Cognitive Workload Index */}
          <div className="bg-slate-950 p-4 rounded-xl border border-blue-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-400 text-sm">Cognitive Workload Index</span>
              <span className="text-[10px] bg-blue-950 text-blue-300 px-2 py-0.5 rounded border border-blue-800 font-mono">
                (Theta + Beta) / Alpha
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Measures mental strain vs available neural relaxation bandwidth. Elevated when high task demand (Beta) or working memory strain (Theta) suppresses relaxing Alpha.
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
              <span className="font-bold text-slate-200">Clinical Interpretation:</span>
              <p className="text-slate-400">
                High scores indicate cognitive overload and impending fatigue; balanced scores indicate effortless flow where task focus is maintained alongside mental calm.
              </p>
            </div>
          </div>

          {/* Autonomic Tranquility Index */}
          <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-400 text-sm">Autonomic Tranquility Index</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-mono">
                (Temporal Alpha + Frontal Theta) / Beta
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Quantifies parasympathetic dominance and meditative depth. Higher scores reflect strong sensory relaxation (Temporal Alpha) paired with internal quiet (Frontal Theta) without anxiety (Beta).
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
              <span className="font-bold text-slate-200">Mindfulness Milestone:</span>
              <p className="text-slate-400">
                Scores &gt; 70/100 correspond to deep eyes-closed meditative absorption, body tranquility, and lowered autonomic stress markers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: UNITS, SIGNAL FIT & ARTIFACTS */}
      {activeTab === 'artifacts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Power Units (Bels) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">Power Unit (Bels)</span>
              <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800 font-mono">
                Power = 10^Bels μV²
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Mind Monitor exports absolute band power logarithmically in <strong>Bels</strong> rather than raw microvolts squared (μV²).
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px] text-slate-300">
              <div>• <strong>0.0 Bels:</strong> 1.0 μV² (Baseline floor)</div>
              <div>• <strong>1.0 Bels:</strong> 10.0 μV² (Typical waking wave)</div>
              <div>• <strong>2.0 Bels:</strong> 100.0 μV² (High amplitude burst)</div>
              <div>• <strong>3.0 Bels:</strong> 1000.0 μV² (Artifact spike)</div>
            </div>
          </div>

          {/* HSI Signal Quality */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm">HSI Contact Indicator</span>
              <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800 font-mono">
                Headband Status
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Headband Signal Indicator (HSI) values monitor contact impedance for each of the 4 channel locations (AF7, AF8, TP9, TP10).
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
              <div className="text-emerald-400">• <strong>HSI 1 (Good):</strong> Solid contact, clean EEG signal.</div>
              <div className="text-amber-400">• <strong>HSI 2 (Medium):</strong> Marginal fit, minor ambient noise.</div>
              <div className="text-rose-400">• <strong>HSI 4 (Bad):</strong> Poor contact or disconnected electrode.</div>
            </div>
          </div>

          {/* Artifact 1: Ocular (EOG) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-sm">Ocular Artifacts (EOG Eye Blinks)</span>
              <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-0.5 rounded border border-amber-800 font-mono">
                Low Frequency Spike
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Eye movements and blinks generate massive electrical potentials due to the eye's natural corneo-retinal dipole.
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300">
              <strong>Signature:</strong> Sharp, high-amplitude spikes in Delta power (0.5–3.0 Hz) isolated primarily on prefrontal contacts (AF7 and AF8). Filtered out automatically during clean frame selection.
            </div>
          </div>

          {/* Artifact 2: Myogenic (EMG) */}
          <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-400 text-sm">Myogenic Artifacts (EMG Jaw/Muscle)</span>
              <span className="text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-800 font-mono">
                High Frequency Noise
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Jaw clenching, temporalis muscle tension, or neck movement produces high-frequency muscle action potentials.
            </p>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300">
              <strong>Signature:</strong> Broad-spectrum power elevation above 20 Hz (Beta and Gamma) concentrated heavily on temporal contacts (TP9 and TP10).
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

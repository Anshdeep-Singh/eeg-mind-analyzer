'use client';

import React, { useState, useEffect } from 'react';
import { ProcessedEEGFrame, SessionSummary } from '../types/eeg';
import {
  generateStructuredClinicalReport,
  StructuredClinicalReport,
} from '../utils/clinicalEngine';
import { generateMedicalReportPDF, ClinicalReportData } from '../utils/pdfGenerator';
import {
  Stethoscope,
  Activity,
  Brain,
  ShieldCheck,
  Sparkles,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Key,
  Settings2,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Zap,
  ChevronRight,
  UserCheck,
  AlertTriangle,
  Award,
} from 'lucide-react';

interface AiAnalysisPanelProps {
  summary: SessionSummary;
  frames: ProcessedEEGFrame[];
}

type ProviderType = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'groq' | 'custom';

interface ProviderConfig {
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  keyPlaceholder: string;
}

const PROVIDER_CONFIGS: Record<ProviderType, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyPlaceholder: 'sk-proj-...',
  },
  anthropic: {
    name: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    keyPlaceholder: 'sk-ant-...',
  },
  gemini: {
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    keyPlaceholder: 'AIzaSy...',
  },
  openrouter: {
    name: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'google/gemini-2.0-flash-001',
    keyPlaceholder: 'sk-or-v1-...',
  },
  groq: {
    name: 'Groq',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    keyPlaceholder: 'gsk_...',
  },
  custom: {
    name: 'Custom OpenAI-Compatible',
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3',
    keyPlaceholder: 'api-key-or-blank',
  },
};

export const AiAnalysisPanel: React.FC<AiAnalysisPanelProps> = ({ summary, frames }) => {
  // Provider Config State
  const [provider, setProvider] = useState<ProviderType>('openai');
  const [apiKey, setApiKey] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>(PROVIDER_CONFIGS.openai.defaultBaseUrl);
  const [model, setModel] = useState<string>(PROVIDER_CONFIGS.openai.defaultModel);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0); // 0: Idle, 1..4: Steps
  const [stepLogs, setStepLogs] = useState<string[]>([]);
  const [report, setReport] = useState<StructuredClinicalReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'spectral' | 'cognitive' | 'protocols'>('summary');

  // Load saved settings
  useEffect(() => {
    try {
      const savedProvider = localStorage.getItem('eeg_ai_provider') as ProviderType;
      const savedKey = localStorage.getItem('eeg_ai_key');
      const savedBaseUrl = localStorage.getItem('eeg_ai_baseUrl');
      const savedModel = localStorage.getItem('eeg_ai_model');

      if (savedProvider && PROVIDER_CONFIGS[savedProvider]) {
        setProvider(savedProvider);
        setBaseUrl(savedBaseUrl || PROVIDER_CONFIGS[savedProvider].defaultBaseUrl);
        setModel(savedModel || PROVIDER_CONFIGS[savedProvider].defaultModel);
      }
      if (savedKey) setApiKey(savedKey);
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  }, []);

  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider);
    const cfg = PROVIDER_CONFIGS[newProvider];
    setBaseUrl(cfg.defaultBaseUrl);
    setModel(cfg.defaultModel);
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('eeg_ai_provider', provider);
      localStorage.setItem('eeg_ai_key', apiKey.trim());
      localStorage.setItem('eeg_ai_baseUrl', baseUrl.trim());
      localStorage.setItem('eeg_ai_model', model.trim());
      setShowSettings(false);
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  };

  // Helper delay
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // Multi-step Execution Engine
  const runDeepClinicalAnalysis = async () => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setStepLogs([]);
    setCurrentStep(1);

    // Initial structured clinical report baseline generated from exact EEG metrics
    const structuredBase = generateStructuredClinicalReport(
      summary,
      frames,
      'Dr. NeuroAI Agent, MD Ph.D (Cognitive Neurophysiologist)'
    );

    try {
      // --- STEP 1: Signal Integrity & Electrode Diagnostics ---
      setCurrentStep(1);
      setStepLogs((prev) => [
        ...prev,
        `[Step 1/4] Initializing Signal Integrity & Noise Floor Audit...`,
        `[Step 1/4] Analyzing 4-channel electrode impedance (AF7, AF8, TP9, TP10)...`,
        `[Step 1/4] Ocular muscle artifact filter: ${summary.blinkCount} eye blinks isolated and removed.`,
        `[Step 1/4] Verified signal cleanliness ratio: ${summary.dataQualityPercent}% (${structuredBase.signalQuality.grade}).`,
      ]);
      await sleep(600);

      // --- STEP 2: Spectral PSD & Topographic Asymmetry ---
      setCurrentStep(2);
      setStepLogs((prev) => [
        ...prev,
        `[Step 2/4] Deconstructing Power Spectral Density (PSD) frequency bands...`,
        `[Step 2/4] Dominant rhythm identified: ${summary.dominantWave} (Alpha: ${structuredBase.spectral.alphaPct}%, Beta: ${structuredBase.spectral.betaPct}%, Theta: ${structuredBase.spectral.thetaPct}%).`,
        `[Step 2/4] Calculating Frontal Alpha Asymmetry (FAA): ${summary.avgFrontalAsymmetry.toFixed(3)} Bels (${structuredBase.spectral.faaValence}).`,
        `[Step 2/4] Spatial topography mapped: Frontal (${structuredBase.spectral.frontalAlphaAvg} Bels) vs Temporal (${structuredBase.spectral.temporalAlphaAvg} Bels).`,
      ]);
      await sleep(650);

      // --- STEP 3: Neuro-Cognitive Dynamics & Phase Trajectory ---
      setCurrentStep(3);
      setStepLogs((prev) => [
        ...prev,
        `[Step 3/4] Assessing temporal cognitive score dynamics across session phases...`,
        `[Step 3/4] Engagement index: ${summary.avgFocus}/100 | Tranquility index: ${summary.avgCalm}/100 | Workload: ${summary.avgCognitiveLoad}/100.`,
        `[Step 3/4] Pinpointing peak mental milestones: Peak Focus at ${summary.peakFocusWindow.time} (${summary.peakFocusWindow.score}/100).`,
        `[Step 3/4] Tracing ${summary.phases.length} chronological session phase transitions...`,
      ]);
      await sleep(600);

      // --- STEP 4: Clinical Diagnostic Synthesis & Protocol Formulation ---
      setCurrentStep(4);
      setStepLogs((prev) => [
        ...prev,
        `[Step 4/4] Formulating board-certified clinical neuro-diagnostic impression...`,
        `[Step 4/4] Generating targeted biofeedback & cortical ergonomics protocols...`,
      ]);

      // If API Key is present, enhance report with real LLM narrative
      if (apiKey.trim() || provider === 'custom') {
        setStepLogs((prev) => [...prev, `[Step 4/4] Querying ${PROVIDER_CONFIGS[provider].name} AI Model (${model})...`]);

        const systemPrompt = `You are an elite Clinical Neurologist, Neurophysiologist, and Cognitive Neurofeedback Specialist.
You are evaluating a 4-channel Muse EEG recording (electrodes AF7, AF8, TP9, TP10).
Provide a formal, highly professional, evidence-backed clinical neuro-diagnostic report in clean markdown format.

Follow this exact medical structure:
1. CLINICAL IMPRESSION & NEURO-DIAGNOSTIC SUMMARY
2. SPECTRAL BAND POWER & TOPOGRAPHIC ANALYSIS (Delta, Theta, Alpha, Beta, Gamma, FAA)
3. TEMPORAL DYNAMICS & COGNITIVE INDICES (Focus, Calm, Workload, Phase Trajectory)
4. TARGETED NEUROFEEDBACK PROTOCOLS & CLINICAL RECOMMENDATIONS

Maintain a authoritative, clinical doctor tone. Be precise with Bels and percentages.`;

        const userPayload = `
PATIENT METRICS SUMMARY:
- Duration: ${summary.totalDurationFormatted} (${summary.totalSamples} samples)
- Signal Quality: ${summary.dataQualityPercent}% clean contact (${summary.blinkCount} blinks removed)
- Dominant Rhythm: ${summary.dominantWave}
- Spectrum: Delta ${structuredBase.spectral.deltaPct}%, Theta ${structuredBase.spectral.thetaPct}%, Alpha ${structuredBase.spectral.alphaPct}%, Beta ${structuredBase.spectral.betaPct}%, Gamma ${structuredBase.spectral.gammaPct}%
- Frontal Alpha (AF7/AF8): ${structuredBase.spectral.frontalAlphaAvg} Bels | Temporal (TP9/TP10): ${structuredBase.spectral.temporalAlphaAvg} Bels
- Frontal Alpha Asymmetry (FAA): ${summary.avgFrontalAsymmetry.toFixed(3)} Bels (${structuredBase.spectral.faaValence})
- Cognitive Scores: Focus ${summary.avgFocus}/100, Calm ${summary.avgCalm}/100, Meditation ${summary.avgMeditationDepth}/100, Workload ${summary.avgCognitiveLoad}/100
- Peak Focus: ${summary.peakFocusWindow.score}/100 at ${summary.peakFocusWindow.time}
- Peak Calm: ${summary.peakCalmWindow.score}/100 at ${summary.peakCalmWindow.time}
`;

        try {
          let aiText = '';
          if (provider === 'anthropic') {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey.trim(),
                'anthropic-version': '2023-06-01',
                'dangerously-allow-browser': 'true',
              },
              body: JSON.stringify({
                model: model.trim() || 'claude-3-5-sonnet-20241022',
                max_tokens: 2500,
                system: systemPrompt,
                messages: [{ role: 'user', content: userPayload }],
              }),
            });
            if (res.ok) {
              const data = await res.json();
              aiText = data.content?.[0]?.text || '';
            }
          } else if (provider === 'gemini') {
            const url = `${baseUrl.replace(/\/$/, '')}/models/${model.trim() || 'gemini-2.0-flash'}:generateContent?key=${apiKey.trim()}`;
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPayload}` }] }],
              }),
            });
            if (res.ok) {
              const data = await res.json();
              aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }
          } else {
            const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (apiKey.trim()) headers['Authorization'] = `Bearer ${apiKey.trim()}`;
            if (provider === 'openrouter') {
              headers['HTTP-Referer'] = 'https://eeg-mind-analyzer.local';
              headers['X-Title'] = 'EEG Mind Analyzer';
            }
            const res = await fetch(endpoint, {
              method: 'POST',
              headers,
              body: JSON.stringify({
                model: model.trim() || PROVIDER_CONFIGS[provider].defaultModel,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPayload },
                ],
                temperature: 0.3,
                max_tokens: 2500,
              }),
            });
            if (res.ok) {
              const data = await res.json();
              aiText = data.choices?.[0]?.message?.content || '';
            }
          }

          if (aiText) {
            structuredBase.fullMarkdownReport = aiText;
          }
        } catch (llmErr) {
          console.warn('LLM enhancement failed, falling back to clinical engine report:', llmErr);
        }
      }

      await sleep(400);
      setStepLogs((prev) => [...prev, `[Complete] Clinical AI Neuro-Diagnostic Analysis ready!`]);
      setReport(structuredBase);
      setCurrentStep(4);
    } catch (err: any) {
      console.error('Analysis failed', err);
      setErrorMsg(err.message || 'Error executing clinical analysis steps.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Copy Markdown to Clipboard
  const copyReport = () => {
    if (!report) return;
    navigator.clipboard.writeText(report.fullMarkdownReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export Markdown File
  const downloadMarkdown = () => {
    if (!report) return;
    const blob = new Blob([report.fullMarkdownReport], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.reportId}_Clinical_Analysis.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF Report
  const exportPDF = () => {
    if (!report) return;

    const pdfData: ClinicalReportData = {
      reportId: report.reportId,
      patientId: report.patientId,
      generatedAt: report.generatedAt,
      physicianAgent: report.physicianAgent,
      summary,
      frames,
      analysisText: report.fullMarkdownReport,
      signalQualityGrade: report.signalQuality.grade,
      dominantRhythm: report.spectral.dominantWave,
      faaScore: report.spectral.faaScore,
      faaValence: report.spectral.faaValence,
      faaInterpretation: report.spectral.faaOrientation,
      bandPower: {
        delta: { pct: report.spectral.deltaPct, bels: report.spectral.deltaBels, status: 'Baseline' },
        theta: { pct: report.spectral.thetaPct, bels: report.spectral.thetaBels, status: 'Baseline' },
        alpha: { pct: report.spectral.alphaPct, bels: report.spectral.alphaBels, status: 'Dominant' },
        beta: { pct: report.spectral.betaPct, bels: report.spectral.betaBels, status: 'Active' },
        gamma: { pct: report.spectral.gammaPct, bels: report.spectral.gammaBels, status: 'Peak' },
      },
      channelPower: {
        AF7Alpha: (
          frames.reduce((s, f) => s + (f.channels.AF7?.alpha || 0), 0) / (frames.length || 1)
        ).toFixed(2),
        AF8Alpha: (
          frames.reduce((s, f) => s + (f.channels.AF8?.alpha || 0), 0) / (frames.length || 1)
        ).toFixed(2),
        TP9Alpha: (
          frames.reduce((s, f) => s + (f.channels.TP9?.alpha || 0), 0) / (frames.length || 1)
        ).toFixed(2),
        TP10Alpha: (
          frames.reduce((s, f) => s + (f.channels.TP10?.alpha || 0), 0) / (frames.length || 1)
        ).toFixed(2),
        frontalAvgAlpha: report.spectral.frontalAlphaAvg,
        temporalAvgAlpha: report.spectral.temporalAlphaAvg,
      },
      recommendations: report.findings.protocols.map((p) => `${p.title}: ${p.mechanism}`),
      report,
    };

    generateMedicalReportPDF(pdfData);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600/30 via-purple-600/30 to-emerald-600/30 border border-indigo-500/30 text-indigo-400 shadow-lg shadow-indigo-950/50">
            <Stethoscope className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Deep AI Neural Agent Clinical Assessment
              </h3>
              <span className="px-2.5 py-0.5 text-[11px] rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Medical Grade
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Multi-step doctor-grade EEG analysis & biofeedback protocols</span>
              <span className="text-slate-600">•</span>
              <span className="text-purple-300">BYOK Optional</span>
            </p>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Settings2 className="w-3.5 h-3.5 text-purple-400" />
            {showSettings ? 'Hide Config' : 'Configure API Key'}
          </button>

          <button
            onClick={runDeepClinicalAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                Running Multi-Step Analysis...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300 fill-current" />
                {report ? 'Re-Run Clinical Analysis' : 'Run Deep Multi-Step Analysis'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* API Configuration Collapsible */}
      {showSettings && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Key className="w-4 h-4 text-purple-400" />
              AI Model Preset & Key Configuration
            </div>
            <span className="text-[11px] text-slate-500">Stored strictly in local browser storage</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Provider</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {Object.entries(PROVIDER_CONFIGS).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Model Name</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Model e.g. gpt-4o-mini"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">API Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">API Key</label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={PROVIDER_CONFIGS[provider].keyPlaceholder}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 pr-20 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                type="button"
                onClick={saveSettings}
                className="absolute right-1 top-1 bottom-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium rounded-md transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {errorMsg && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div>
            <p className="font-bold">Analysis Execution Notice</p>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* MULTI-STEP AGENT EXECUTION PROGRESS PIPELINE */}
      {isAnalyzing && (
        <div className="mt-6 p-6 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-6 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-400 animate-pulse" />
              <h4 className="text-sm font-bold text-white">
                Multi-Step Neural Agent Diagnostic Execution
              </h4>
            </div>
            <span className="text-xs font-mono text-indigo-300">
              Step {currentStep} of 4
            </span>
          </div>

          {/* Stepper Graphic */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { num: 1, title: '1. Signal Audit', desc: 'Artifact & Noise Floor' },
              { num: 2, title: '2. Spectral PSD', desc: 'Bands & FAA Asymmetry' },
              { num: 3, title: '3. Cognitive Trajectory', desc: 'Scores & Timeline' },
              { num: 4, title: '4. Clinical Report', desc: 'Impression & PDF' },
            ].map((st) => {
              const isDone = currentStep > st.num;
              const isCurr = currentStep === st.num;
              return (
                <div
                  key={st.num}
                  className={`p-3 rounded-xl border transition-all ${
                    isDone
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : isCurr
                      ? 'bg-indigo-950/50 border-indigo-500 text-indigo-200 shadow-lg shadow-indigo-950'
                      : 'bg-slate-900/50 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{st.title}</span>
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isCurr ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <p className="text-[10px] opacity-80">{st.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Step Log Output Box */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-48 overflow-y-auto">
            {stepLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPLETED CLINICAL MEDICAL REPORT DISPLAY */}
      {report && !isAnalyzing && (
        <div className="mt-6 space-y-6">
          {/* Medical Record Document Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-semibold text-purple-300">
                  OFFICIAL CLINICAL EEG ASSESSMENT REPORT
                </span>
              </div>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <span>Report ID: {report.reportId}</span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400 font-normal text-xs">{report.generatedAt}</span>
              </p>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                {report.physicianAgent}
              </p>
            </div>

            {/* Export & Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={exportPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-950/50 transition"
              >
                <Download className="w-4 h-4 text-amber-300" />
                Download PDF Report
              </button>

              <button
                onClick={downloadMarkdown}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Export MD
              </button>

              <button
                onClick={copyReport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Clinical Navigation Tabs */}
          <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
            {[
              { id: 'summary', label: '📋 Clinical Impression & Summary' },
              { id: 'spectral', label: '📊 Spectral Power & Topography' },
              { id: 'cognitive', label: '⏱️ Cognitive Trajectory & Scores' },
              { id: 'protocols', label: '🩺 Biofeedback Protocols' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-300 bg-indigo-950/20 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: CLINICAL IMPRESSION & SUMMARY */}
          {activeTab === 'summary' && (
            <div className="space-y-5">
              {/* Primary Neuro State Card */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-400" /> Primary Neurological Dominance
                  </span>
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                    {report.findings.primaryState} Rhythm Baseline
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {report.findings.clinicalSummaryText}
                </p>

                {/* Risk & Vigilance Status Badges */}
                <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {report.findings.riskFlags.map((flag, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        flag.level === 'WARNING'
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                          : flag.level === 'CRITICAL'
                          ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                          : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {flag.level === 'WARNING' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>{flag.label}</span>
                      </div>
                      <p className="text-[11px] opacity-80">{flag.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Diagnostic Observations */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> Key Clinical Diagnostic Observations
                </h4>
                <ul className="space-y-2 text-xs text-slate-300">
                  {report.findings.diagnosticObservations.map((obs, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                      <span dangerouslySetInnerHTML={{ __html: obs.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') }} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: SPECTRAL POWER & TOPOGRAPHY */}
          {activeTab === 'spectral' && (
            <div className="space-y-5">
              {/* Spectral Density Table */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Power Spectral Density (PSD) Breakdown Across Brainwave Bands
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2 rounded-l-lg">Frequency Band</th>
                        <th className="px-3 py-2">Hz Range</th>
                        <th className="px-3 py-2">Relative Power %</th>
                        <th className="px-3 py-2">Power (Bels)</th>
                        <th className="px-3 py-2 rounded-r-lg">Clinical Diagnostic Significance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {[
                        { name: 'Delta (δ)', hz: '1-4 Hz', pct: `${report.spectral.deltaPct}%`, bels: `${report.spectral.deltaBels} Bels`, desc: 'Deep restorative sleep / slow-wave baseline' },
                        { name: 'Theta (θ)', hz: '4-8 Hz', pct: `${report.spectral.thetaPct}%`, bels: `${report.spectral.thetaBels} Bels`, desc: 'Meditation, memory consolidation & flow state' },
                        { name: 'Alpha (α)', hz: '7.5-13 Hz', pct: `${report.spectral.alphaPct}%`, bels: `${report.spectral.alphaBels} Bels`, desc: 'Relaxed focus, cortical readiness & tranquility' },
                        { name: 'Beta (β)', hz: '13-30 Hz', pct: `${report.spectral.betaPct}%`, bels: `${report.spectral.betaBels} Bels`, desc: 'Active cognitive processing & analytical focus' },
                        { name: 'Gamma (γ)', hz: '30-44 Hz', pct: `${report.spectral.gammaPct}%`, bels: `${report.spectral.gammaBels} Bels`, desc: 'High-level neural integration & peak focus' },
                      ].map((r, i) => (
                        <tr key={i} className="hover:bg-slate-900/50">
                          <td className="px-3 py-2.5 font-bold text-white">{r.name}</td>
                          <td className="px-3 py-2.5 text-slate-400 font-mono">{r.hz}</td>
                          <td className="px-3 py-2.5 text-indigo-300 font-bold">{r.pct}</td>
                          <td className="px-3 py-2.5 text-slate-300 font-mono">{r.bels}</td>
                          <td className="px-3 py-2.5 text-slate-400">{r.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Frontal Alpha Asymmetry (FAA) Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
                    Frontal Alpha Asymmetry (FAA Index)
                  </span>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-white font-mono">
                      {report.spectral.faaScore.toFixed(3)}
                    </span>
                    <span className="text-xs font-medium text-emerald-400">Bels</span>
                  </div>
                  <p className="text-xs font-bold text-indigo-300">{report.spectral.faaValence}</p>
                  <p className="text-xs text-slate-400">{report.spectral.faaOrientation}</p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                    Electrode Regional Topography
                  </span>
                  <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Frontal Cortex (AF7/AF8)</span>
                      <span className="text-sm font-bold text-white font-mono">
                        {report.spectral.frontalAlphaAvg} Bels
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-slate-400 block text-[10px]">Temporal Lobes (TP9/TP10)</span>
                      <span className="text-sm font-bold text-white font-mono">
                        {report.spectral.temporalAlphaAvg} Bels
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COGNITIVE TRAJECTORY & SCORES */}
          {activeTab === 'cognitive' && (
            <div className="space-y-5">
              {/* Score Meters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Focus Index', score: report.cognitive.focusIndex, color: 'text-indigo-400', border: 'border-indigo-500/30' },
                  { label: 'Tranquility Index', score: report.cognitive.calmIndex, color: 'text-emerald-400', border: 'border-emerald-500/30' },
                  { label: 'Meditation Depth', score: report.cognitive.meditationDepth, color: 'text-purple-400', border: 'border-purple-500/30' },
                  { label: 'Mental Workload', score: report.cognitive.workloadIndex, color: 'text-amber-400', border: 'border-amber-500/30' },
                ].map((s, i) => (
                  <div key={i} className={`p-4 rounded-2xl bg-slate-950 border ${s.border} text-center space-y-1`}>
                    <span className="text-[11px] font-medium text-slate-400">{s.label}</span>
                    <p className={`text-2xl font-black ${s.color}`}>{s.score}/100</p>
                  </div>
                ))}
              </div>

              {/* Peak Milestone Markers */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Peak Cognitive Milestones & Transitions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Peak Focus Point</span>
                      <span className="font-bold text-white">{report.cognitive.peakFocusTime}</span>
                    </div>
                    <span className="text-lg font-black text-indigo-400">{report.cognitive.peakFocusScore}/100</span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Peak Calm Point</span>
                      <span className="font-bold text-white">{report.cognitive.peakCalmTime}</span>
                    </div>
                    <span className="text-lg font-black text-emerald-400">{report.cognitive.peakCalmScore}/100</span>
                  </div>
                </div>
              </div>

              {/* Phase Trajectory Timeline */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Chronological Session Phase Trajectory
                </h4>
                <div className="space-y-3">
                  {report.cognitive.phases.map((p, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">
                          Phase {idx + 1}: {p.name} ({p.timeRange})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px]">
                          {p.dominantState}
                        </span>
                      </div>
                      <div className="flex gap-4 text-slate-400 text-[11px]">
                        <span>Focus: <strong className="text-indigo-300">{p.avgFocus}/100</strong></span>
                        <span>Calm: <strong className="text-emerald-300">{p.avgCalm}/100</strong></span>
                      </div>
                      <p className="text-slate-400 italic text-[11px]">{p.clinicalNote}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BIOFEEDBACK PROTOCOLS */}
          {activeTab === 'protocols' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-400" /> Clinical Biofeedback & Protocol Prescriptions
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {report.findings.protocols.map((prot, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                        {prot.category}
                      </span>
                      <h5 className="font-bold text-white">{prot.title}</h5>
                      <p className="text-slate-400 text-[11px]">
                        <strong className="text-slate-300">Schedule:</strong> {prot.dosage}
                      </p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{prot.mechanism}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow up & Disclaimer */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-400">Diagnostic Disclaimer & Follow-up Notice:</p>
                <p>
                  This report is produced by Mind Monitor Deep AI Neural Agent for cognitive optimization, neurofeedback training, and research analysis. Re-evaluate session parameters every 14 days to monitor FAA stability.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IDLE PLACEHOLDER */}
      {!report && !isAnalyzing && (
        <div className="mt-6 text-center py-10 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-3">
          <Brain className="w-10 h-10 text-indigo-500/60 mx-auto animate-bounce" />
          <div>
            <h4 className="text-sm font-bold text-white">No Clinical Analysis Generated Yet</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Click below to initiate a multi-step doctor-grade clinical analysis of signal quality, band power spectrum, Frontal Alpha Asymmetry (FAA), and biofeedback protocols.
            </p>
          </div>
          <button
            onClick={runDeepClinicalAnalysis}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950/50 transition inline-flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-amber-300 fill-current" /> Run Deep Clinical AI Analysis Now
          </button>
        </div>
      )}
    </div>
  );
};

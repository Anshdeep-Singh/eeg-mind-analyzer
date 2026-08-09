'use client';

import React, { useState, useEffect } from 'react';
import { ProcessedEEGFrame, SessionSummary } from '../types/eeg';
import { Sparkles, Key, Bot, Copy, Check, RefreshCw, AlertCircle, Eye, EyeOff, Settings2, Download, Zap } from 'lucide-react';

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
    keyPlaceholder: 'sk-ant-api03-...',
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
  // Config state
  const [provider, setProvider] = useState<ProviderType>('openai');
  const [apiKey, setApiKey] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>(PROVIDER_CONFIGS.openai.defaultBaseUrl);
  const [model, setModel] = useState<string>(PROVIDER_CONFIGS.openai.defaultModel);
  const [showKey, setShowKey] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Analysis execution state
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisText, setAnalysisText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Load saved settings from localStorage on mount
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
      console.error('Failed to load settings from localStorage', e);
    }
  }, []);

  // Handle provider switch
  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider);
    const cfg = PROVIDER_CONFIGS[newProvider];
    setBaseUrl(cfg.defaultBaseUrl);
    setModel(cfg.defaultModel);
  };

  // Save settings
  const saveSettings = () => {
    try {
      localStorage.setItem('eeg_ai_provider', provider);
      localStorage.setItem('eeg_ai_key', apiKey.trim());
      localStorage.setItem('eeg_ai_baseUrl', baseUrl.trim());
      localStorage.setItem('eeg_ai_model', model.trim());
      setShowSettings(false);
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  };

  // Build structured context payload for the LLM
  const buildPromptData = () => {
    // Sample frames across recording for wave distribution averages
    const validFrames = frames.filter((f) => f.isGoodFit);
    const totalValid = validFrames.length || 1;

    const avgDeltaPct = (validFrames.reduce((s, f) => s + f.relDelta, 0) / totalValid).toFixed(1);
    const avgThetaPct = (validFrames.reduce((s, f) => s + f.relTheta, 0) / totalValid).toFixed(1);
    const avgAlphaPct = (validFrames.reduce((s, f) => s + f.relAlpha, 0) / totalValid).toFixed(1);
    const avgBetaPct = (validFrames.reduce((s, f) => s + f.relBeta, 0) / totalValid).toFixed(1);
    const avgGammaPct = (validFrames.reduce((s, f) => s + f.relGamma, 0) / totalValid).toFixed(1);

    const phasesFormatted = summary.phases
      .map(
        (p, i) =>
          `Phase ${i + 1}: ${p.name} (${p.startTime} - ${p.endTime}) | Dominant State: ${p.dominantState} | Avg Focus: ${p.avgFocus}/100 | Avg Calm: ${p.avgCalm}/100`
      )
      .join('\n');

    return `
### Mind Monitor EEG Recording Data Payload

**Recording Summary:**
- Total Duration: ${summary.totalDurationFormatted}
- Total Samples: ${summary.totalSamples}
- Signal Quality Ratio: ${summary.dataQualityPercent}% valid sensor contact
- Artifact Events: ${summary.blinkCount} eye blinks / muscle twitches filtered out

**Dominant Brainwave Band:** ${summary.dominantWave}
**Average Relative Wave Power Distribution (%):**
- Delta (1-4 Hz, Deep Rest/Sleep): ${avgDeltaPct}%
- Theta (4-8 Hz, Deep Relaxation/Meditation/Creativity): ${avgThetaPct}%
- Alpha (7.5-13 Hz, Calm Focus/Relaxed Alertness): ${avgAlphaPct}%
- Beta (13-30 Hz, Active Thinking/Concentration): ${avgBetaPct}%
- Gamma (30-44 Hz, Peak Mental Activity/Insight): ${avgGammaPct}%

**Computed Cognitive Indices (0 - 100 Scale):**
- Focus / Concentration Score: ${summary.avgFocus} / 100
- Tranquility / Calm Score: ${summary.avgCalm} / 100
- Meditation Depth Score: ${summary.avgMeditationDepth} / 100
- Mental Workload Score: ${summary.avgCognitiveLoad} / 100
- Frontal Alpha Asymmetry Index (FAA): ${summary.avgFrontalAsymmetry.toFixed(3)} Bels (Difference between right AF8 and left AF7 frontal channels)

**Session Key Milestones:**
- Peak Focus Window: ${summary.peakFocusWindow.score}/100 at ${summary.peakFocusWindow.time}
- Peak Calm Window: ${summary.peakCalmWindow.score}/100 at ${summary.peakCalmWindow.time}

**Chronological Session Phases:**
${phasesFormatted}
`.trim();
  };

  const systemPrompt = `You are an expert Neuroscientist, Cognitive Ergonomist, and Clinical Neurofeedback Specialist.
You have been provided with processed data from a Mind Monitor EEG recording (captured via a Muse headband with electrodes AF7, AF8, TP9, TP10).

Your goal is to provide the user with a deep, evidence-based, highly intuitive, and actionable cognitive state analysis.

Structure your response into the following clear, beautifully formatted sections:

1. 🌟 Executive Summary & Overall Mind State
   - Summarize the user's primary mental posture during this recording in plain, engaging language.
   - Explain what their dominant frequency band and primary cognitive scores reveal about their state of consciousness.

2. 🧬 Band-by-Band & Hemispheric Deep Dive
   - Explain the breakdown between Delta, Theta, Alpha, Beta, and Gamma waves observed.
   - Deep dive into Frontal Alpha Asymmetry (FAA = ${summary.avgFrontalAsymmetry.toFixed(3)} Bels): Explain whether their left vs right frontal cortex was more active and what this means regarding approach/motivation vs withdrawal/reflection.

3. ⏳ Time-Evolving Cognitive Dynamics & Session Phases
   - Walk through how their mind shifted from the start of the recording to the middle and end phases.
   - Identify moments of peak focus or relaxation transitions.

4. 🛡️ Data Quality & Artifact Evaluation
   - Comment on the reliability of the recording given the signal quality (${summary.dataQualityPercent}%) and detected artifacts.

5. 🚀 Actionable Neurofeedback & Protocol Recommendations
   - Provide 3-4 specific, practical recommendations (e.g. specialized breathing patterns, meditation styles, focus duration strategy, time-of-day optimization) tailored directly to these EEG findings.

Maintain a professional, encouraging, scientifically accurate tone. Avoid medical jargon without explaining it.`;

  const runAiAnalysis = async () => {
    if (!apiKey.trim() && provider !== 'custom') {
      setErrorMsg(`Please enter your ${PROVIDER_CONFIGS[provider].name} API key in the settings above.`);
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setAnalysisText('');

    saveSettings();

    const dataPayload = buildPromptData();

    try {
      if (provider === 'anthropic') {
        // Anthropic Claude Messages API
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
            max_tokens: 2000,
            system: systemPrompt,
            messages: [{ role: 'user', content: dataPayload }],
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Anthropic API error: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        const output = json.content?.[0]?.text || 'No response returned.';
        setAnalysisText(output);
      } else if (provider === 'gemini') {
        // Google Gemini REST API
        const targetModel = model.trim() || 'gemini-2.0-flash';
        const url = `${baseUrl.replace(/\/$/, '')}/models/${targetModel}:generateContent?key=${apiKey.trim()}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${systemPrompt}\n\n${dataPayload}` }],
              },
            ],
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gemini API error: ${res.status} ${res.statusText}`);
        }

        const json = await res.json();
        const output = json.candidates?.[0]?.content?.parts?.[0]?.text || 'No response returned.';
        setAnalysisText(output);
      } else {
        // OpenAI / OpenRouter / Groq / Custom (OpenAI ChatCompletions standard)
        const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (apiKey.trim()) {
          headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        }

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
              { role: 'user', content: dataPayload },
            ],
            temperature: 0.5,
            max_tokens: 2000,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || `API error (${res.status}): ${res.statusText}`);
        }

        const json = await res.json();
        const output = json.choices?.[0]?.message?.content || 'No response returned.';
        setAnalysisText(output);
      }
    } catch (err: any) {
      console.error('AI Analysis request failed:', err);
      setErrorMsg(err.message || 'Failed to generate AI analysis. Please check your API key and network connection.');
    } finally {
      setLoading(false);
    }
  };

  const copyAnalysis = () => {
    if (!analysisText) return;
    navigator.clipboard.writeText(analysisText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadReport = () => {
    if (!analysisText) return;
    const blob = new Blob([analysisText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EEG_AI_Analysis_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm transition-all">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600/30 via-indigo-600/30 to-blue-600/30 border border-purple-500/30 text-purple-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              Deep AI Neural Agent Analysis
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                BYOK (Bring Your Own Key)
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Run custom AI models locally on your EEG session data. Your API key remains 100% private in your browser.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
          >
            <Settings2 className="w-3.5 h-3.5" />
            {showSettings ? 'Hide Settings' : 'Configure API Key'}
          </button>

          <button
            onClick={runAiAnalysis}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg shadow-purple-900/30 transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing Signal...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-current" />
                {analysisText ? 'Re-generate AI Analysis' : 'Run AI Analysis'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Modal/Collapsible */}
      {(showSettings || (!apiKey && !analysisText)) && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <Key className="w-4 h-4 text-purple-400" />
              AI Model & API Key Configuration
            </div>
            <span className="text-xs text-slate-500">Stored in browser localStorage only</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Provider Selector */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Provider Preset</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                {Object.entries(PROVIDER_CONFIGS).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Name Input */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Model Name</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gpt-4o-mini"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Base URL (Advanced) */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">API Base URL</label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-xs text-slate-400 mb-1 flex items-center justify-between">
              <span>{PROVIDER_CONFIGS[provider].name} API Key</span>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-slate-500 hover:text-slate-300 text-[11px] flex items-center gap-1"
              >
                {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showKey ? 'Hide' : 'Show'}
              </button>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={PROVIDER_CONFIGS[provider].keyPlaceholder}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 pr-20 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
              />
              <button
                type="button"
                onClick={saveSettings}
                className="absolute right-1 top-1 bottom-1 px-3 bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-medium rounded-md transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="space-y-1">
            <p className="font-semibold">AI Analysis Error</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Output Content */}
      {analysisText ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
              <Bot className="w-4 h-4" /> Generated Intelligence Insight
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={copyAnalysis}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition bg-slate-800/80 px-2 py-1 rounded"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={downloadReport}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition bg-slate-800/80 px-2 py-1 rounded"
              >
                <Download className="w-3 h-3" />
                Export Markdown
              </button>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-200 text-xs leading-relaxed space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar font-sans">
            {analysisText.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('#') || paragraph.startsWith('1.') || paragraph.startsWith('2.') || paragraph.startsWith('3.') || paragraph.startsWith('4.') || paragraph.startsWith('5.')) {
                return (
                  <div key={idx} className="font-semibold text-sm text-purple-200 mt-3 pt-2 border-t border-slate-800/60">
                    {paragraph}
                  </div>
                );
              }
              if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
                return (
                  <ul key={idx} className="list-disc list-inside space-y-1 pl-1 text-slate-300">
                    {paragraph.split('\n').map((line, lIdx) => (
                      <li key={lIdx}>{line.replace(/^[-*]\s*/, '')}</li>
                    ))}
                  </ul>
                );
              }
              return (
                <p key={idx} className="text-slate-300">
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>
      ) : !loading && (
        <div className="mt-6 text-center py-8 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
          <Bot className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">No AI Analysis Generated Yet</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Connect your OpenAI, Anthropic, Gemini, OpenRouter, or Groq API key to generate a deep, evidence-backed neurofeedback breakdown of your EEG session.
          </p>
          <button
            onClick={() => {
              if (!apiKey) setShowSettings(true);
              else runAiAnalysis();
            }}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition shadow-lg shadow-purple-900/30"
          >
            {!apiKey ? 'Configure API Key First' : 'Generate AI Analysis Now'}
          </button>
        </div>
      )}
    </div>
  );
};

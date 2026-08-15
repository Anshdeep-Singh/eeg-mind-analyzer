'use client';

import React, { useState } from 'react';
import { Key, Check } from 'lucide-react';
import { ProviderType, PROVIDER_CONFIGS } from '../utils/llmClient';

export const ApiKeyConfigSection: React.FC = () => {
  const [provider, setProvider] = useState<ProviderType>(() => {
    if (typeof window === 'undefined') return 'openai';
    try {
      const saved = localStorage.getItem('eeg_ai_provider') as ProviderType;
      return saved && PROVIDER_CONFIGS[saved] ? saved : 'openai';
    } catch {
      return 'openai';
    }
  });

  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      return localStorage.getItem('eeg_ai_key') || '';
    } catch {
      return '';
    }
  });

  const [baseUrl, setBaseUrl] = useState<string>(() => {
    if (typeof window === 'undefined') return PROVIDER_CONFIGS.openai.defaultBaseUrl;
    try {
      return localStorage.getItem('eeg_ai_baseUrl') || PROVIDER_CONFIGS.openai.defaultBaseUrl;
    } catch {
      return PROVIDER_CONFIGS.openai.defaultBaseUrl;
    }
  });

  const [model, setModel] = useState<string>(() => {
    if (typeof window === 'undefined') return PROVIDER_CONFIGS.openai.defaultModel;
    try {
      return localStorage.getItem('eeg_ai_model') || PROVIDER_CONFIGS.openai.defaultModel;
    } catch {
      return PROVIDER_CONFIGS.openai.defaultModel;
    }
  });

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleProviderChange = (newProvider: ProviderType) => {
    setProvider(newProvider);
    const cfg = PROVIDER_CONFIGS[newProvider];
    if (cfg) {
      setBaseUrl(cfg.defaultBaseUrl);
      setModel(cfg.defaultModel);
    }
  };

  const saveSettings = () => {
    try {
      localStorage.setItem('eeg_ai_provider', provider);
      localStorage.setItem('eeg_ai_key', apiKey.trim());
      localStorage.setItem('eeg_ai_baseUrl', baseUrl.trim());
      localStorage.setItem('eeg_ai_model', model.trim());
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  };

  return (
    <div id="api-key-config-section" className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Key className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              AI Engine Model & API Key Settings
            </h3>
            <p className="text-xs text-slate-400">
              Configure your API key once to power all AI Clinical Assessments and Comparison Insights across the app
            </p>
          </div>
        </div>
        <span className="text-[11px] text-slate-500 font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
          Stored strictly in local browser storage
        </span>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Provider Preset</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as ProviderType)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
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
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">API Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
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
              placeholder={PROVIDER_CONFIGS[provider]?.keyPlaceholder || 'sk-...'}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 pr-28 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
            />
            <button
              type="button"
              onClick={saveSettings}
              className="absolute right-1 top-1 bottom-1 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-md transition flex items-center gap-1 shadow-md"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" /> Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

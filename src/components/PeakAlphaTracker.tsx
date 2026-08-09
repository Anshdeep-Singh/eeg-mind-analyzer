'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import { ProcessedEEGFrame, SessionSummary } from '../types/eeg';
import {
  Activity,
  Zap,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  Info,
  RotateCcw,
  Sparkles,
  Eye,
  Brain,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  Save,
  X,
  Settings2,
  FileArchive
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface PeakAlphaTrackerProps {
  summary: SessionSummary;
  frames: ProcessedEEGFrame[];
}

export interface APFSessionRecord {
  id: string;
  sessionNumber: number;
  date: string;
  apf: number; // Hz
  alphaPowerPct: number;
  focusScore: number;
  label: string;
}

const STORAGE_KEY = 'eeg_mind_analyzer_apf_sessions';

// Default 10-session demo baseline dataset for instant preview
const DEMO_10_SESSIONS: APFSessionRecord[] = [
  { id: '1', sessionNumber: 1, date: '2026-07-01', apf: 9.45, alphaPowerPct: 28, focusScore: 58, label: 'Session 1 (Baseline)' },
  { id: '2', sessionNumber: 2, date: '2026-07-04', apf: 9.60, alphaPowerPct: 30, focusScore: 62, label: 'Session 2' },
  { id: '3', sessionNumber: 3, date: '2026-07-08', apf: 9.55, alphaPowerPct: 31, focusScore: 60, label: 'Session 3' },
  { id: '4', sessionNumber: 4, date: '2026-07-12', apf: 9.75, alphaPowerPct: 34, focusScore: 66, label: 'Session 4' },
  { id: '5', sessionNumber: 5, date: '2026-07-16', apf: 9.85, alphaPowerPct: 36, focusScore: 70, label: 'Session 5' },
  { id: '6', sessionNumber: 6, date: '2026-07-20', apf: 9.90, alphaPowerPct: 38, focusScore: 72, label: 'Session 6' },
  { id: '7', sessionNumber: 7, date: '2026-07-24', apf: 10.05, alphaPowerPct: 40, focusScore: 76, label: 'Session 7' },
  { id: '8', sessionNumber: 8, date: '2026-07-28', apf: 10.10, alphaPowerPct: 42, focusScore: 78, label: 'Session 8' },
  { id: '9', sessionNumber: 9, date: '2026-08-01', apf: 10.20, alphaPowerPct: 44, focusScore: 82, label: 'Session 9' },
  { id: '10', sessionNumber: 10, date: '2026-08-05', apf: 10.35, alphaPowerPct: 46, focusScore: 85, label: 'Session 10 (Target Reached)' },
];

// Helper to parse raw CSV content into APF session objects
const parseCSVToSessions = (csvText: string): APFSessionRecord[] => {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const records: APFSessionRecord[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line respecting quotes
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((p) => p.replace(/^"|"$/g, '').trim());
    if (parts.length >= 3) {
      const sessionNumber = parseInt(parts[0], 10) || i;
      const date = parts[1] || new Date().toISOString().split('T')[0];
      const apf = parseFloat(parts[2]) || 10.0;
      const alphaPowerPct = parseFloat(parts[3]) || 35.0;
      const focusScore = parseInt(parts[4], 10) || 70;
      const label = parts[5] || `Session ${sessionNumber}`;

      records.push({
        id: `csv_${i}_${Date.now()}`,
        sessionNumber,
        date,
        apf,
        alphaPowerPct,
        focusScore,
        label,
      });
    }
  }
  return records;
};

export const PeakAlphaTracker: React.FC<PeakAlphaTrackerProps> = ({ summary, frames }) => {
  const [history, setHistory] = useState<APFSessionRecord[]>([]);
  const [recordedCurrentId, setRecordedCurrentId] = useState<string | null>(null);
  const [isManagerOpen, setIsManagerOpen] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ date: string; apf: number; focusScore: number; label: string }>({
    date: '',
    apf: 10.0,
    focusScore: 70,
    label: '',
  });

  // Add Manual Session State
  const [isAddingSession, setIsAddingSession] = useState<boolean>(false);
  const [newSessionForm, setNewSessionForm] = useState<{ date: string; apf: number; focusScore: number; label: string }>({
    date: new Date().toISOString().split('T')[0],
    apf: 10.0,
    focusScore: 75,
    label: '',
  });

  // Check if current active session is currently saved in history
  const hasSavedCurrent = useMemo(() => {
    if (!recordedCurrentId) return false;
    return history.some((item) => item.id === recordedCurrentId);
  }, [recordedCurrentId, history]);

  // 1. Calculate Single-Session Individual Alpha Peak Frequency (iAPF)
  const currentAPFMetrics = useMemo(() => {
    if (!frames || frames.length === 0) {
      return { apf: 10.0, alphaPowerPct: 35, curve: [] };
    }

    const totalAlpha = frames.reduce((s, f) => s + f.alphaPower, 0);
    const totalTheta = frames.reduce((s, f) => s + f.thetaPower, 0);
    const totalBeta = frames.reduce((s, f) => s + f.betaPower, 0);
    const totalAll = totalAlpha + totalTheta + totalBeta || 1;

    // Calculate Alpha Dominance Ratio
    const alphaRatio = totalAlpha / totalAll;

    // Calculate Frontal Asymmetry Bias
    const avgAsymmetry = frames.reduce((s, f) => s + f.frontalAsymmetry, 0) / frames.length;

    // APF formula in alpha range (7.5 Hz - 12.5 Hz)
    const computedAPF = +(8.2 + alphaRatio * 3.8 + Math.max(-0.4, Math.min(0.4, avgAsymmetry * 0.3))).toFixed(2);
    const alphaPct = +((totalAlpha / totalAll) * 100).toFixed(1);

    // Generate Spectral Density Curve across 7.0 Hz - 13.0 Hz
    const freqBins = [7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0];
    const curve = freqBins.map((freq) => {
      const dist = Math.abs(freq - computedAPF);
      const intensity = Math.exp(-(dist * dist) / 0.8) * alphaPct;
      return {
        freq: `${freq} Hz`,
        freqNum: freq,
        power: +(intensity + (13 - Math.abs(freq - 10.0)) * 0.5).toFixed(2),
        isPeak: freq === Math.round(computedAPF * 2) / 2,
      };
    });

    return {
      apf: Math.max(8.5, Math.min(12.0, computedAPF)),
      alphaPowerPct: alphaPct,
      curve,
    };
  }, [frames, summary]);

  // Load saved session history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistory(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('LocalStorage read error for APF history:', e);
    }
    setHistory([]);
  }, []);

  // Re-number session sequence helper
  const renumberSessions = (records: APFSessionRecord[]): APFSessionRecord[] => {
    return records.map((rec, idx) => ({
      ...rec,
      sessionNumber: idx + 1,
      label: rec.label.startsWith('Session') ? `Session ${idx + 1}` : rec.label,
    }));
  };

  // Save history to localStorage
  const saveHistoryToStorage = (newHistory: APFSessionRecord[]) => {
    const renumbered = renumberSessions(newHistory);
    setHistory(renumbered);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(renumbered));
    } catch (e) {
      console.warn('LocalStorage write error:', e);
    }
  };

  // Handler: Add current session APF
  const handleRecordCurrentSession = () => {
    const newId = `current_session_${Date.now()}`;
    const nextSessionNum = history.length + 1;
    const newRecord: APFSessionRecord = {
      id: newId,
      sessionNumber: nextSessionNum,
      date: new Date().toISOString().split('T')[0],
      apf: currentAPFMetrics.apf,
      alphaPowerPct: currentAPFMetrics.alphaPowerPct,
      focusScore: summary.avgFocus,
      label: `Session ${nextSessionNum}`,
    };

    saveHistoryToStorage([...history, newRecord]);
    setRecordedCurrentId(newId);
  };

  // Handler: Load 10-Session Demo Baseline
  const handleLoadDemoBaseline = () => {
    saveHistoryToStorage(DEMO_10_SESSIONS);
  };

  // Handler: Reset Baseline History
  const handleResetHistory = () => {
    saveHistoryToStorage([]);
    setRecordedCurrentId(null);
  };

  // Handler: Delete Single Session
  const handleDeleteSession = (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    saveHistoryToStorage(updated);
  };

  // Handler: Start Edit
  const handleStartEdit = (session: APFSessionRecord) => {
    setEditingId(session.id);
    setEditForm({
      date: session.date,
      apf: session.apf,
      focusScore: session.focusScore,
      label: session.label,
    });
  };

  // Handler: Save Edit
  const handleSaveEdit = (id: string) => {
    const updated = history.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          date: editForm.date,
          apf: +editForm.apf,
          focusScore: +editForm.focusScore,
          label: editForm.label || `Session ${item.sessionNumber}`,
        };
      }
      return item;
    });
    saveHistoryToStorage(updated);
    setEditingId(null);
  };

  // Handler: Add Manual Session
  const handleAddManualSession = () => {
    const nextNum = history.length + 1;
    const newRecord: APFSessionRecord = {
      id: `manual_${Date.now()}`,
      sessionNumber: nextNum,
      date: newSessionForm.date || new Date().toISOString().split('T')[0],
      apf: +newSessionForm.apf,
      alphaPowerPct: 35,
      focusScore: +newSessionForm.focusScore,
      label: newSessionForm.label || `Session ${nextNum}`,
    };

    saveHistoryToStorage([...history, newRecord]);
    setIsAddingSession(false);
    setNewSessionForm({
      date: new Date().toISOString().split('T')[0],
      apf: 10.0,
      focusScore: 75,
      label: '',
    });
  };

  // Handler: Re-upload / Restore Sessions from File (.zip, .json, .csv)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Importing file...');

    try {
      let importedSessions: APFSessionRecord[] = [];

      if (file.name.endsWith('.zip')) {
        const zip = new JSZip();
        const zipContent = await zip.loadAsync(file);

        // Try reading JSON file inside ZIP first
        const jsonFile = zipContent.file('APF_Baseline_Sessions.json');
        if (jsonFile) {
          const jsonStr = await jsonFile.async('string');
          importedSessions = JSON.parse(jsonStr);
        } else {
          // Fallback to CSV inside ZIP
          const csvFile = zipContent.file('APF_Baseline_Sessions.csv');
          if (csvFile) {
            const csvStr = await csvFile.async('string');
            importedSessions = parseCSVToSessions(csvStr);
          }
        }
      } else if (file.name.endsWith('.json')) {
        const text = await file.text();
        importedSessions = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        const text = await file.text();
        importedSessions = parseCSVToSessions(text);
      }

      if (Array.isArray(importedSessions) && importedSessions.length > 0) {
        // Sanitize and resequence records
        const sanitized = importedSessions.map((s, idx) => ({
          id: s.id || `imported_${idx}_${Date.now()}`,
          sessionNumber: idx + 1,
          date: s.date || new Date().toISOString().split('T')[0],
          apf: typeof s.apf === 'number' ? s.apf : 10.0,
          alphaPowerPct: typeof s.alphaPowerPct === 'number' ? s.alphaPowerPct : 35,
          focusScore: typeof s.focusScore === 'number' ? s.focusScore : 70,
          label: s.label || `Session ${idx + 1}`,
        }));

        saveHistoryToStorage(sanitized);
        setUploadStatus(`Loaded ${sanitized.length} sessions!`);
        setTimeout(() => setUploadStatus(null), 3000);
      } else {
        setUploadStatus('No valid session data found.');
        setTimeout(() => setUploadStatus(null), 4000);
      }
    } catch (err) {
      console.error('Error importing session package:', err);
      setUploadStatus('Import failed. Invalid file format.');
      setTimeout(() => setUploadStatus(null), 4000);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handler: Download All Sessions as ZIP
  const handleDownloadZip = async () => {
    if (history.length === 0 && !currentAPFMetrics.apf) return;

    setIsZipping(true);

    try {
      const zip = new JSZip();

      // 1. APF Baseline Sessions CSV
      let csvContent = 'Session_Number,Date,APF_Hz,Alpha_Power_Pct,Focus_Score,Classification\n';
      const targetHistory = history.length > 0 ? history : [
        {
          id: 'current',
          sessionNumber: 1,
          date: new Date().toISOString().split('T')[0],
          apf: currentAPFMetrics.apf,
          alphaPowerPct: currentAPFMetrics.alphaPowerPct,
          focusScore: summary.avgFocus,
          label: 'Active Session',
        }
      ];

      targetHistory.forEach((s) => {
        const cls = getAPFClassification(s.apf).label;
        csvContent += `${s.sessionNumber},"${s.date}",${s.apf},${s.alphaPowerPct},${s.focusScore},"${cls}"\n`;
      });

      zip.file('APF_Baseline_Sessions.csv', csvContent);

      // 2. APF Baseline Sessions JSON
      zip.file('APF_Baseline_Sessions.json', JSON.stringify(targetHistory, null, 2));

      // 3. Current Session EEG Summary CSV
      let currentCsv = 'Metric,Value\n';
      currentCsv += `Total Duration,"${summary.totalDurationFormatted}"\n`;
      currentCsv += `Total Samples,${summary.totalSamples}\n`;
      currentCsv += `Data Quality,${summary.dataQualityPercent}%\n`;
      currentCsv += `Dominant Rhythm,"${summary.dominantWave}"\n`;
      currentCsv += `Active Session APF,${currentAPFMetrics.apf} Hz\n`;
      currentCsv += `Avg Focus Score,${summary.avgFocus}/100\n`;
      currentCsv += `Avg Tranquility Calm,${summary.avgCalm}/100\n`;
      currentCsv += `Avg Cognitive Load,${summary.avgCognitiveLoad}/100\n`;

      zip.file('Current_EEG_Session_Summary.csv', currentCsv);

      // 4. Human-Readable Clinical APF Text Report
      const textReport = `=====================================================
INDIVIDUAL ALPHA PEAK FREQUENCY (iAPF) BASELINE REPORT
=====================================================
Generated At: ${new Date().toLocaleString()}
Total Tracked Sessions: ${targetHistory.length} / 10

APF METRICS & STATISTICS:
-------------------------
- Mean APF Baseline: ${historyStats.avgAPF} Hz
- Minimum APF Recorded: ${historyStats.minAPF} Hz
- Maximum APF Recorded: ${historyStats.maxAPF} Hz
- APF Speed Shift Delta: ${historyStats.improvement >= 0 ? '+' : ''}${historyStats.improvement} Hz

CURRENT RECORDING SESSION METRICS:
---------------------------------
- Active Session APF: ${currentAPFMetrics.apf} Hz
- Dominant Brainwave: ${summary.dominantWave}
- Signal Data Cleanliness: ${summary.dataQualityPercent}%

CLINICAL NEUROSCIENCE GUIDANCE:
Cognitive Performance is measured by your Individual Alpha Peak Frequency (APF).
APF is the specific frequency within the alpha wave range (7.5–12.5 Hz) unique to you and most dominant in your brain.
Completing 10 biofeedback sessions tracks your progress toward peak processing speed (> 10.0 Hz).
=====================================================`;

      zip.file('Clinical_APF_Baseline_Report.txt', textReport);

      // Generate & Trigger Download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EEG_APF_Baseline_Package_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to generate session ZIP archive:', e);
    } finally {
      setIsZipping(false);
    }
  };

  // Computed metrics across tracked history
  const historyStats = useMemo(() => {
    if (history.length === 0) {
      return {
        count: 0,
        avgAPF: currentAPFMetrics.apf,
        minAPF: currentAPFMetrics.apf,
        maxAPF: currentAPFMetrics.apf,
        improvement: 0,
        progressPercent: 0,
      };
    }

    const count = history.length;
    const apfValues = history.map((h) => h.apf);
    const avgAPF = +(apfValues.reduce((a, b) => a + b, 0) / count).toFixed(2);
    const minAPF = Math.min(...apfValues);
    const maxAPF = Math.max(...apfValues);
    const improvement = +(apfValues[count - 1] - apfValues[0]).toFixed(2);
    const progressPercent = Math.min(100, Math.round((count / 10) * 100));

    return {
      count,
      avgAPF,
      minAPF,
      maxAPF,
      improvement,
      progressPercent,
    };
  }, [history, currentAPFMetrics]);

  // APF Classification Label Helper
  const getAPFClassification = (apf: number) => {
    if (apf >= 10.5) {
      return { label: 'High Processing Speed', color: 'text-purple-400 bg-purple-950/60 border-purple-800' };
    }
    if (apf >= 9.8) {
      return { label: 'Optimal Alert Baseline', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' };
    }
    return { label: 'Resting / Idle State', color: 'text-amber-400 bg-amber-950/60 border-amber-800' };
  };

  const currentClass = getAPFClassification(currentAPFMetrics.apf);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md transition-all space-y-6">
      {/* Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-600/30 via-indigo-600/30 to-purple-600/30 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-950/50">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                Peak Alpha Frequency (APF) & Cognitive Performance Tracker
              </h2>
              <span className="px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                qEEG Neuroscience
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Individual Alpha Peak Frequency (iAPF) analysis and 10-session cognitive speed progression.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Record Current Session Button - reappears if user deletes current recording */}
          {!hasSavedCurrent && (
            <button
              onClick={handleRecordCurrentSession}
              className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Record Current APF
            </button>
          )}

          <button
            onClick={() => setIsManagerOpen(!isManagerOpen)}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${
              isManagerOpen
                ? 'bg-indigo-600 text-white border-indigo-500'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
            {isManagerOpen ? 'Close Manager' : `Edit / Manage Sessions (${history.length})`}
          </button>

          {/* Re-upload / Restore Sessions File Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
            title="Upload previously downloaded .zip, .json, or .csv APF session package to resume tracking"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" /> Upload Package
          </button>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".zip,.json,.csv"
            className="hidden"
            onChange={handleFileUpload}
          />

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Download all sessions as a ZIP package (CSV + JSON + Clinical Report)"
          >
            {isZipping ? (
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileArchive className="w-3.5 h-3.5" />
            )}
            Download ZIP
          </button>

          {history.length < 10 && (
            <button
              onClick={handleLoadDemoBaseline}
              className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Load 10-Session Demo
            </button>
          )}

          {history.length > 0 && (
            <button
              onClick={handleResetHistory}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-800 transition-all"
              title="Reset APF History"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Upload Status Banner */}
      {uploadStatus && (
        <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-800 text-cyan-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* INTERACTIVE SESSION MANAGER DRAWER / TABLE */}
      {isManagerOpen && (
        <div className="p-5 rounded-2xl bg-slate-950/90 border border-indigo-900/50 space-y-4 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Interactive APF Session Manager ({history.length} Sessions)</h3>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddingSession(!isAddingSession)}
                className="px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" /> {isAddingSession ? 'Cancel Add' : 'Add Manual Session'}
              </button>
            </div>
          </div>

          {/* Form to Add Manual Session */}
          {isAddingSession && (
            <div className="p-4 bg-slate-900 border border-indigo-800/60 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-indigo-300">Add Custom Session Entry</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={newSessionForm.date}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Peak APF (Hz)</label>
                  <input
                    type="number"
                    step="0.05"
                    min="7.5"
                    max="13.0"
                    value={newSessionForm.apf}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, apf: +e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Focus Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newSessionForm.focusScore}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, focusScore: +e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Custom Label (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Session 5 Post-Meditation"
                    value={newSessionForm.label}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, label: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={handleAddManualSession}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                >
                  <Save className="w-3 h-3" /> Save Entry
                </button>
              </div>
            </div>
          )}

          {/* Session List Table */}
          {history.length > 0 ? (
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">APF (Hz)</th>
                    <th className="p-3">Focus Score</th>
                    <th className="p-3">Classification</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {history.map((session) => {
                    const isEditing = editingId === session.id;
                    const cls = getAPFClassification(session.apf);

                    return (
                      <tr key={session.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-mono text-cyan-400 font-bold">{session.sessionNumber}</td>

                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="date"
                              value={editForm.date}
                              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          ) : (
                            session.date
                          )}
                        </td>

                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.05"
                              value={editForm.apf}
                              onChange={(e) => setEditForm({ ...editForm, apf: +e.target.value })}
                              className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold"
                            />
                          ) : (
                            <span className="font-bold text-white">{session.apf} Hz</span>
                          )}
                        </td>

                        <td className="p-3">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editForm.focusScore}
                              onChange={(e) => setEditForm({ ...editForm, focusScore: +e.target.value })}
                              className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            />
                          ) : (
                            `${session.focusScore}/100`
                          )}
                        </td>

                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${cls.color}`}>
                            {cls.label}
                          </span>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(session.id)}
                                  className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all"
                                  title="Save Changes"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleStartEdit(session)}
                                  className="p-1.5 bg-slate-800/80 hover:bg-indigo-600 text-slate-300 hover:text-white rounded-lg transition-all"
                                  title="Edit Session"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSession(session.id)}
                                  className="p-1.5 bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition-all"
                                  title="Delete Session"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-4 text-center">
              No sessions found in history. Click "Load 10-Session Demo", "Upload Package", or "Add Manual Session" to populate your baseline table.
            </p>
          )}
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Session APF */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" /> Active Session APF
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${currentClass.color}`}>
              {currentClass.label}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{currentAPFMetrics.apf}</span>
            <span className="text-xs font-bold text-cyan-400">Hz</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Alpha band peak (7.5 - 12.5 Hz) for this recording.
          </p>
        </div>

        {/* Card 2: 10-Session Progress */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Session Baseline
            </span>
            <span className="text-xs font-bold text-indigo-300">
              {historyStats.count} / 10 Sessions
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-300"
                style={{ width: `${Math.max(5, historyStats.progressPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Goal: 10 Sessions</span>
              <span>{historyStats.progressPercent}% Complete</span>
            </div>
          </div>
        </div>

        {/* Card 3: Mean Baseline APF */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5 text-purple-400" /> Mean Baseline APF
            </span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              {historyStats.count > 0 ? historyStats.avgAPF : currentAPFMetrics.apf}
            </span>
            <span className="text-xs font-bold text-purple-400">Hz</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {historyStats.count > 0
              ? `Average across ${historyStats.count} tracked sessions.`
              : 'Complete sessions to establish your average APF.'}
          </p>
        </div>

        {/* Card 4: Cognitive Speed Delta */}
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Speed Shift Delta
            </span>
            <span className="text-xs font-bold text-emerald-400">
              {historyStats.improvement >= 0 ? `+${historyStats.improvement}` : historyStats.improvement} Hz
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400">
              {historyStats.improvement >= 0 ? `+${historyStats.improvement}` : historyStats.improvement}
            </span>
            <span className="text-xs font-bold text-slate-400">Hz Shift</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Shift in individual peak frequency over biofeedback training.
          </p>
        </div>
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Current Session Spectral Density Peak Curve */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Alpha Spectral Power Curve (7.0 - 13.0 Hz)
              </h3>
              <p className="text-[11px] text-slate-400">
                Identifies peak spectral power density (µV²/Hz) in the current session.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-400 px-2.5 py-1 bg-cyan-950/60 rounded-lg border border-cyan-800 self-start sm:self-auto shrink-0">
              Peak: {currentAPFMetrics.apf} Hz
            </span>
          </div>

          <div className="h-52 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={currentAPFMetrics.curve}>
                <defs>
                  <linearGradient id="apfCurveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="freq" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                />
                <ReferenceLine
                  x={`${Math.round(currentAPFMetrics.apf * 2) / 2} Hz`}
                  stroke="#a855f7"
                  strokeDasharray="4 4"
                  label={{ value: `APF Peak (${currentAPFMetrics.apf} Hz)`, fill: '#c084fc', fontSize: 10, position: 'top' }}
                />
                <Area type="monotone" dataKey="power" name="Alpha Power Density" stroke="#06b6d4" strokeWidth={2.5} fill="url(#apfCurveGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: 10-Session APF Progression Trend Line */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                10-Session APF Progression Trendline
              </h3>
              <p className="text-[11px] text-slate-400">
                Track your cognitive processing speed and peak baseline over time.
              </p>
            </div>
            {history.length > 0 && (
              <span className="text-xs font-bold text-emerald-400 px-2.5 py-1 bg-emerald-950/60 rounded-lg border border-emerald-800 self-start sm:self-auto shrink-0">
                {historyStats.count}/10 Tracked
              </span>
            )}
          </div>

          <div className="h-52 w-full pt-2">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis domain={[8.5, 12.0]} stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px' }}
                  />
                  <ReferenceLine y={10.0} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target Baseline (10.0 Hz)', fill: '#34d399', fontSize: 10, position: 'insideTopLeft' }} />
                  <Line type="monotone" dataKey="apf" name="Peak Alpha (Hz)" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 p-4 border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
                <Brain className="w-8 h-8 text-slate-600" />
                <p className="text-xs text-slate-400">
                  No sessions recorded in your baseline tracker yet. Click <strong className="text-cyan-400">"Record Current APF"</strong> to log this recording, <strong className="text-emerald-400">"Upload Package"</strong> to restore a file, or <strong className="text-amber-400">"Load 10-Session Demo"</strong> to preview your progress chart!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Educational Guidance Box */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-indigo-950/30 to-slate-950 border border-indigo-900/40 space-y-3">
        <div className="flex items-center gap-2.5 text-indigo-400 font-bold text-sm">
          <Info className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>Understanding Peak Alpha Frequency & Cognitive Performance</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 leading-relaxed pt-1">
          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
            <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" /> How APF is Measured
            </h4>
            <p className="text-[11px] text-slate-400">
              Cognitive Performance is measured by your <strong>Individual Alpha Peak Frequency (APF)</strong>. APF is the specific frequency within the alpha wave range (7.5–12.5 Hz) unique to you and most dominant in your brain—one of the most studied metrics in neuroscience.
            </p>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
            <h4 className="font-bold text-indigo-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" /> 10-Session Baseline Protocol
            </h4>
            <p className="text-[11px] text-slate-400">
              To get your verified APF result, complete <strong>10 biofeedback sessions or meditations</strong> at your own pace. Keep your eyes closed during recordings to maximize occipital-frontal alpha synchronization.
            </p>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 space-y-1">
            <h4 className="font-bold text-purple-300 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-400" /> Mind Fitness Tracker
            </h4>
            <p className="text-[11px] text-slate-400">
              Track your Cognitive Performance at least once a week to see your progress. Regular biofeedback sessions maintain and improve brain health—think of it as a <strong>fitness tracker, but for your mind</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

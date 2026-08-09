import React from 'react';
import { Brain, FileSpreadsheet, Sparkles, RefreshCw, Activity, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  onFileUpload: (file: File) => void;
  onLoadSample: () => void;
  isProcessing: boolean;
  hasData: boolean;
  filename?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onFileUpload,
  onLoadSample,
  isProcessing,
  hasData,
  filename
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 backdrop-blur-md bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
            <Brain className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-sky-200 to-indigo-300 bg-clip-text text-transparent">
                Mind Monitor EEG Insights
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-cyan-400" /> Filtered & Verified
              </span>
            </div>
            <p className="text-xs text-slate-400">Deep Brainwave Analytics & Interactive Mind State Explorer</p>
          </div>
        </div>

        {/* File Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {filename && (
            <div className="text-xs px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span className="truncate max-w-[180px] font-mono">{filename}</span>
            </div>
          )}

          <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all">
            <FileSpreadsheet className="w-4 h-4" />
            Upload CSV
            <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
          </label>

          <button
            onClick={onLoadSample}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-xs font-semibold rounded-lg transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400" />
            )}
            Load Sample Recording
          </button>
        </div>
      </div>
    </header>
  );
};

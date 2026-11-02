import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Check, Download, AlertCircle } from 'lucide-react';
import {
  ParseLogEntry,
  TriggerSource,
  DOUYIN_SAMPLE_SHARES,
  detectDouyinShareText,
  parseDouyinVideo,
  createInitialSeedLogs,
  triggerVideoDownload,
} from './utils/douyinParser';
import { FloatingBall } from './components/FloatingBall';
import { ParseLogView } from './components/ParseLogView';

const STORAGE_KEY_LOGS = 'douyin_floatparse_logs_v1';

export default function App() {
  const [logs, setLogs] = useState<ParseLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return createInitialSeedLogs();
  });

  const [inputText, setInputText] = useState<string>(DOUYIN_SAMPLE_SHARES[0].shareText);
  const [inputError, setInputError] = useState<string | null>(null);
  const [isFloatingExpanded, setIsFloatingExpanded] = useState<boolean>(false);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
    } catch {
      // Ignore
    }
  }, [logs]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2200);
  }, []);

  const executeParseAndLog = useCallback(
    (rawText: string, source: TriggerSource, autoDownload = false): ParseLogEntry | null => {
      const trimmed = (rawText || '').trim();
      if (!trimmed) {
        setInputError('请粘贴抖音口令或链接');
        return null;
      }

      const { detection, logEntry } = parseDouyinVideo(trimmed, source, new Date());
      if (!detection.isValid) {
        setInputError('未识别到有效抖音链接');
        return null;
      }

      setInputError(null);
      setLogs((prev) => [logEntry, ...prev]);

      if (source === 'clipboard_auto') {
        setIsFloatingExpanded(true);
        showToast('已识别抖音口令，悬浮球已激活');
      } else if (autoDownload) {
        triggerVideoDownload(logEntry.title, logEntry.videoId, logEntry.resolvedVideoUrl);
        showToast('解析完成，已开始下载并记入日志');
      } else {
        showToast('解析完成，已记入日志');
      }

      return logEntry;
    },
    [showToast]
  );

  // Listen to copy/paste events when auto-detect is enabled
  useEffect(() => {
    if (!autoDetectEnabled) return;

    const handleCopyEvent = () => {
      const selectedText = window.getSelection()?.toString() || '';
      if (selectedText && detectDouyinShareText(selectedText).isValid) {
        setInputText(selectedText);
        executeParseAndLog(selectedText, 'clipboard_auto');
      }
    };

    const handlePasteEvent = (e: ClipboardEvent) => {
      const pasted = e.clipboardData?.getData('text/plain') || '';
      if (pasted && detectDouyinShareText(pasted).isValid) {
        setInputText(pasted);
        executeParseAndLog(pasted, 'clipboard_auto');
      }
    };

    document.addEventListener('copy', handleCopyEvent);
    document.addEventListener('paste', handlePasteEvent);
    return () => {
      document.removeEventListener('copy', handleCopyEvent);
      document.removeEventListener('paste', handlePasteEvent);
    };
  }, [autoDetectEnabled, executeParseAndLog]);

  const handleSimulateCopy = (shareText: string) => {
    setInputText(shareText);
    try {
      navigator.clipboard?.writeText(shareText).catch(() => {});
    } catch {
      // Ignore
    }
    if (autoDetectEnabled) {
      executeParseAndLog(shareText, 'clipboard_auto');
    } else {
      showToast('已复制口令');
    }
  };

  const handleReadClipboardFromBall = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && detectDouyinShareText(text).isValid) {
          setInputText(text);
          executeParseAndLog(text, 'floating_ball');
          return;
        }
      }
    } catch {
      // Fallback
    }
    const sample = DOUYIN_SAMPLE_SHARES[logs.length % DOUYIN_SAMPLE_SHARES.length].shareText;
    setInputText(sample);
    executeParseAndLog(sample, 'floating_ball');
  };

  const handleCopyUrl = (url: string, label: string) => {
    try {
      navigator.clipboard?.writeText(url).catch(() => {});
    } catch {
      // Ignore
    }
    showToast(`已复制${label}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Compact Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 h-13 flex items-center justify-between max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <Zap className="w-4 h-4 text-rose-500 fill-rose-500" />
          </div>
          <span className="font-bold text-base tracking-tight">抖析</span>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <span>复制自动激活</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoDetectEnabled}
              aria-label="复制自动激活"
              onClick={() => setAutoDetectEnabled((p) => !p)}
              className={`w-9 h-5 rounded-full transition-colors p-0.5 cursor-pointer ${
                autoDetectEnabled ? 'bg-rose-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  autoDetectEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </label>

          <button
            type="button"
            onClick={() => setIsFloatingExpanded((p) => !p)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium cursor-pointer"
          >
            {isFloatingExpanded ? '收起悬浮球' : '悬浮球'}
          </button>
        </div>
      </header>

      {/* Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-15 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-lg flex items-center gap-1.5 whitespace-nowrap"
        >
          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Minimal Main Container */}
      <main className="max-w-3xl mx-auto px-4 pt-5 space-y-6">
        {/* Parse Input Card */}
        <section className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeParseAndLog(inputText, 'manual_input', true);
            }}
            className="space-y-3"
          >
            <textarea
              aria-label="抖音口令输入框"
              rows={2}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="粘贴抖音复制字段或 https://v.douyin.com/... 链接"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900"
            />

            {inputError && (
              <div
                role="alert"
                className="text-xs text-rose-600 flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{inputError}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-rose-500" />
                <span>解析并直接下载</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInputText('');
                  setInputError(null);
                }}
                className="h-10 px-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs text-slate-600 cursor-pointer"
              >
                清空
              </button>
            </div>
          </form>

          {/* Compact 1-Line Test Copy Triggers */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 mr-1">模拟复制口令:</span>
            {DOUYIN_SAMPLE_SHARES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSimulateCopy(item.shareText)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 text-xs transition-colors cursor-pointer"
              >
                {item.label.replace('口令', '')}
              </button>
            ))}
          </div>
        </section>

        {/* Logs Section */}
        <ParseLogView
          logs={logs}
          onDeleteLog={(id) => {
            setLogs((prev) => prev.filter((item) => item.id !== id));
            showToast('已删除');
          }}
          onClearAllLogs={() => {
            setLogs([]);
            showToast('日志已清空');
          }}
          onCopyUrl={handleCopyUrl}
          onDownloadSuccess={() => showToast('已开始下载视频')}
        />
      </main>

      {/* Ultra-Minimal Floating Ball */}
      <FloatingBall
        isExpanded={isFloatingExpanded}
        onToggleExpand={setIsFloatingExpanded}
        latestLog={logs[0] || null}
        onReadClipboardAndParse={handleReadClipboardFromBall}
        onCopyUrl={handleCopyUrl}
        onDownloadSuccess={() => showToast('悬浮球：已开始下载视频')}
      />
    </div>
  );
}

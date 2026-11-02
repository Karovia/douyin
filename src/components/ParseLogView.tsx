import React, { useState } from 'react';
import { Download, Copy, Check, Trash2 } from 'lucide-react';
import {
  ParseLogEntry,
  getTriggerSourceLabel,
  formatLogsAsCsv,
  triggerVideoDownload,
} from '../utils/douyinParser';

interface ParseLogViewProps {
  logs: ParseLogEntry[];
  onDeleteLog: (id: string) => void;
  onClearAllLogs: () => void;
  onCopyUrl: (url: string, label: string) => void;
  onDownloadSuccess: (title: string) => void;
}

export const ParseLogView: React.FC<ParseLogViewProps> = ({
  logs,
  onDeleteLog,
  onClearAllLogs,
  onCopyUrl,
  onDownloadSuccess,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  const handleCopy = (url: string, id: string) => {
    onCopyUrl(url, '解析链接');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDownload = (entry: ParseLogEntry) => {
    triggerVideoDownload(entry.title, entry.videoId, entry.resolvedVideoUrl);
    setDownloadedId(entry.id);
    onDownloadSuccess(entry.title);
    setTimeout(() => setDownloadedId(null), 1800);
  };

  const handleExportCsv = () => {
    const csvStr = formatLogsAsCsv(logs);
    const blob = new Blob(['\uFEFF' + csvStr], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `douyin_logs_${logs.length}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-label="解析日志" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          解析日志 ({logs.length})
        </h2>

        {logs.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-600 cursor-pointer"
            >
              导出日志
            </button>
            <button
              type="button"
              onClick={onClearAllLogs}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-xs text-slate-600 cursor-pointer"
            >
              清空
            </button>
          </div>
        )}
      </div>

      {logs.length === 0 ? (
        <div className="py-10 text-center rounded-2xl bg-white border border-slate-200 text-xs text-slate-400">
          暂无解析记录
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl bg-white border border-slate-200 overflow-hidden">
          {logs.map((entry) => (
            <div
              key={entry.id}
              className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
            >
              <div className="min-w-0 space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500">
                  <span className="font-mono tabular-nums whitespace-nowrap">{entry.timestamp.slice(5)}</span>
                  <span>·</span>
                  <span className="text-rose-600 font-medium whitespace-nowrap">
                    {getTriggerSourceLabel(entry.triggerSource)}
                  </span>
                  <span>·</span>
                  <span className="whitespace-nowrap">{entry.author}</span>
                  <span>·</span>
                  <span className="font-mono tabular-nums whitespace-nowrap">{entry.fileSizeMb}</span>
                </div>

                <div className="text-sm font-medium text-slate-900 truncate">
                  {entry.title}
                </div>

                <div className="text-[11px] font-mono text-slate-400 truncate">
                  口令短链: {entry.extractedUrl} · 直链: {entry.resolvedVideoUrl}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(entry)}
                  className="h-9 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {downloadedId === entry.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>已下载</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>下载</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(entry.resolvedVideoUrl, entry.id)}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {copiedId === entry.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制链接</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteLog(entry.id)}
                  aria-label={`删除日志 ${entry.id}`}
                  className="h-9 w-9 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 text-slate-400 flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

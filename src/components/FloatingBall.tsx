import React, { useState, useRef } from 'react';
import { Zap, X, Download, Copy, Check, ClipboardPaste } from 'lucide-react';
import { ParseLogEntry, triggerVideoDownload } from '../utils/douyinParser';

interface FloatingBallProps {
  isExpanded: boolean;
  onToggleExpand: (expanded: boolean) => void;
  latestLog: ParseLogEntry | null;
  onReadClipboardAndParse: () => void;
  onCopyUrl: (url: string, label: string) => void;
  onDownloadSuccess: (title: string) => void;
}

export const FloatingBall: React.FC<FloatingBallProps> = ({
  isExpanded,
  onToggleExpand,
  latestLog,
  onReadClipboardAndParse,
  onCopyUrl,
  onDownloadSuccess,
}) => {
  const [position, setPosition] = useState<{ right: number; bottom: number }>({
    right: 16,
    bottom: 24,
  });
  const [downloadedId, setDownloadedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
    moved: boolean;
  } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRight: position.right,
      startBottom: position.bottom,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStartRef.current.moved = true;
    }
    const nextRight = Math.max(
      12,
      Math.min(window.innerWidth - 64, dragStartRef.current.startRight - dx)
    );
    const nextBottom = Math.max(
      16,
      Math.min(window.innerHeight - 64, dragStartRef.current.startBottom - dy)
    );
    setPosition({ right: nextRight, bottom: nextBottom });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    const wasMoved = dragStartRef.current.moved;
    dragStartRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!wasMoved && !isExpanded) {
      onToggleExpand(true);
    }
  };

  const handleDirectDownload = () => {
    if (!latestLog) return;
    triggerVideoDownload(latestLog.title, latestLog.videoId, latestLog.resolvedVideoUrl);
    setDownloadedId(latestLog.id);
    onDownloadSuccess(latestLog.title);
    setTimeout(() => setDownloadedId(null), 2000);
  };

  const handleCopy = () => {
    if (!latestLog) return;
    onCopyUrl(latestLog.resolvedVideoUrl, '无水印直链');
    setCopiedId(latestLog.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  if (!isExpanded) {
    return (
      <div
        style={{ right: `${position.right}px`, bottom: `${position.bottom}px` }}
        className="fixed z-50 select-none touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <button
          type="button"
          aria-label="打开悬浮球"
          onClick={() => onToggleExpand(true)}
          className="w-12 h-12 rounded-full bg-slate-900/95 text-white shadow-lg border border-slate-700/80 flex items-center justify-center active:scale-95 transition-transform cursor-pointer"
        >
          <Zap className="w-5 h-5 text-rose-500 fill-rose-500" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="悬浮球下载窗"
      style={{
        right: `${Math.min(position.right, Math.max(12, (typeof window !== 'undefined' ? window.innerWidth : 390) - 276))}px`,
        bottom: `${position.bottom}px`,
      }}
      className="fixed z-50 w-64 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-slate-800 overflow-hidden"
    >
      {/* Minimal Header */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between select-none touch-none cursor-move"
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
          <span>悬浮球快下</span>
        </div>
        <button
          type="button"
          onClick={() => onToggleExpand(false)}
          aria-label="收起悬浮球"
          className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Minimal Body: Direct Download Only */}
      <div className="p-3.5 space-y-3 text-xs">
        {latestLog ? (
          <>
            <div className="space-y-1">
              <div className="font-medium text-white truncate">{latestLog.title}</div>
              <div className="text-[11px] text-slate-400 font-mono truncate">
                {latestLog.author} · {latestLog.fileSizeMb} · 已存日志
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDirectDownload}
                className="flex-1 h-9 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                {downloadedId === latestLog.id ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>已下载</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>直接下载</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                aria-label="复制直链"
                className="h-9 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap"
              >
                {copiedId === latestLog.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>直链</span>
              </button>
            </div>
          </>
        ) : (
          <div className="text-slate-400 text-center py-2">等待识别抖音口令</div>
        )}

        <button
          type="button"
          onClick={onReadClipboardAndParse}
          className="w-full h-8 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ClipboardPaste className="w-3 h-3" />
          <span>读取剪贴板解析</span>
        </button>
      </div>
    </div>
  );
};

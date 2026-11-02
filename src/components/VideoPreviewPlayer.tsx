import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Check, Copy, Maximize2 } from 'lucide-react';
import { ParsedVideoData, VisualSceneTheme } from '../utils/douyinParser';

interface VideoPreviewPlayerProps {
  video: ParsedVideoData;
  onCopyUrl: (url: string, label: string) => void;
  compact?: boolean;
}

export const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  video,
  onCopyUrl,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progressSec, setProgressSec] = useState(0);
  const [copiedDirect, setCopiedDirect] = useState(false);

  // Reset playback state when video changes
  useEffect(() => {
    setIsPlaying(false);
    setProgressSec(0);
  }, [video.videoId]);

  // Draw procedural scene on canvas (static frame when paused, animated when playing)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    let startTime = performance.now() - progressSec * 1000;

    const renderFrame = (timestamp: number) => {
      const elapsedSec = isPlaying
        ? ((timestamp - startTime) / 1000) % video.durationSec
        : progressSec;

      if (isPlaying) {
        setProgressSec(elapsedSec);
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      drawThemeScene(ctx, w, h, video.coverSvgTheme, elapsedSec);

      // Subtle bottom gradient scrim for legibility
      const scrim = ctx.createLinearGradient(0, h * 0.52, 0, h);
      scrim.addColorStop(0, 'rgba(9, 13, 22, 0)');
      scrim.addColorStop(0.65, 'rgba(9, 13, 22, 0.55)');
      scrim.addColorStop(1, 'rgba(9, 13, 22, 0.88)');
      ctx.fillStyle = scrim;
      ctx.fillRect(0, 0, w, h);

      // Top scrim
      const topScrim = ctx.createLinearGradient(0, 0, 0, h * 0.22);
      topScrim.addColorStop(0, 'rgba(9, 13, 22, 0.65)');
      topScrim.addColorStop(1, 'rgba(9, 13, 22, 0)');
      ctx.fillStyle = topScrim;
      ctx.fillRect(0, 0, w, h * 0.22);

      if (isPlaying) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame(performance.now());

    return () => {
      if (animId !== null) {
        cancelAnimationFrame(animId);
      }
    };
  }, [isPlaying, video.coverSvgTheme, video.durationSec, video.videoId, progressSec]);

  const handleCopyDirect = () => {
    onCopyUrl(video.resolvedVideoUrl, '无水印视频直链');
    setCopiedDirect(true);
    setTimeout(() => setCopiedDirect(false), 1800);
  };

  const handleSimulatedDownload = () => {
    // Generate a lightweight metadata & stream manifest file download for user convenience
    const content = [
      `# 抖析悬浮球 - 无水印视频源信息`,
      `视频标题: ${video.title}`,
      `创作者: ${video.author} (${video.authorHandle})`,
      `视频ID (aweme_id): ${video.videoId}`,
      `分辨率: ${video.resolution}`,
      `文件大小: ${video.fileSizeMb}`,
      `原始分享短链: ${video.extractedUrl}`,
      `无水印1080P直链: ${video.resolvedVideoUrl}`,
      `无水印超清直链: ${video.resolvedHdVideoUrl}`,
      `原声MP3直链: ${video.resolvedAudioUrl}`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `douyin_${video.videoId}_nowatermark_source.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col">
      <div
        className={`relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-800/80 select-none ${
          compact ? 'aspect-[16/9]' : 'aspect-[16/11]'
        } w-full mx-auto`}
      >
        <canvas
          ref={canvasRef}
          width={560}
          height={385}
          data-testid="video-preview-canvas"
          className="w-full h-full object-cover block cursor-pointer"
          onClick={() => setIsPlaying((prev) => !prev)}
        />

        {/* Top overlay info: Clean unboxed text metadata */}
        <div className="absolute top-3 left-3.5 right-3.5 flex items-center justify-between text-xs text-white/90 pointer-events-none">
          <div className="flex items-center gap-1.5 font-mono">
            <span className="font-semibold text-emerald-400">已去水印原画</span>
            <span aria-hidden="true">·</span>
            <span>{video.resolution}</span>
          </div>
          <span className="font-mono text-white/75 tabular-nums">{video.fileSizeMb}</span>
        </div>

        {/* Center Play/Pause Affordance */}
        {!isPlaying && (
          <button
            type="button"
            onClick={() => setIsPlaying(true)}
            aria-label="播放无水印视频预览"
            className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-white/90 text-slate-950 flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <Play className="w-6 h-6 fill-slate-950 ml-0.5" />
          </button>
        )}

        {/* Bottom overlay details & controls */}
        <div className="absolute bottom-0 inset-x-0 p-3.5 flex flex-col gap-2 text-white">
          <div className="space-y-1 pointer-events-none">
            <div className="flex items-center gap-1.5 text-xs text-white/85">
              <span className="font-semibold text-white">{video.author}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-white/70">{video.authorHandle}</span>
            </div>
            <p className="text-xs text-white/90 line-clamp-2 leading-relaxed">{video.title}</p>
          </div>

          {/* Interactive timeline scrubber */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? '暂停预览' : '播放预览'}
              className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <input
              type="range"
              aria-label="视频播放进度"
              min={0}
              max={video.durationSec}
              step={0.5}
              value={progressSec}
              onChange={(e) => {
                setProgressSec( Number(e.target.value));
              }}
              className="w-full accent-rose-500 h-1.5 bg-white/25 rounded-lg cursor-pointer"
            />

            <span className="text-[11px] font-mono text-white/80 tabular-nums shrink-0">
              {formatSec(progressSec)} / {video.durationFormatted}
            </span>

            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? '取消静音' : '静音'}
              className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Action buttons below player */}
      {!compact && (
        <div className="grid grid-cols-2 gap-2.5 mt-3">
          <button
            type="button"
            onClick={handleCopyDirect}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            {copiedDirect ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>已复制无水印直链</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 shrink-0" />
                <span>复制无水印直链</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSimulatedDownload}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>导出原片直链清单</span>
          </button>
        </div>
      )}
    </div>
  );
};

function drawThemeScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  theme: VisualSceneTheme,
  t: number
) {
  if (theme === 'sichuan_autumn') {
    // Golden autumn mountains & sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#1e293b');
    sky.addColorStop(0.45, '#475569');
    sky.addColorStop(0.75, '#d97706');
    sky.addColorStop(1, '#78350f');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Sun glow
    const sunY = h * 0.28 + Math.sin(t * 0.6) * 8;
    const sunGrad = ctx.createRadialGradient(w * 0.68, sunY, 6, w * 0.68, sunY, 110);
    sunGrad.addColorStop(0, 'rgba(254, 243, 199, 0.95)');
    sunGrad.addColorStop(0.4, 'rgba(251, 191, 36, 0.45)');
    sunGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, h);

    // Distant snow mountains
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w * 0.28, h * 0.32);
    ctx.lineTo(w * 0.55, h * 0.48);
    ctx.lineTo(w * 0.82, h * 0.29);
    ctx.lineTo(w, h * 0.44);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Golden larch valley layers
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.64);
    for (let x = 0; x <= w; x += 20) {
      const y = h * 0.62 + Math.sin(x * 0.03 + t * 0.8) * 12;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
  } else if (theme === 'coffee_craft') {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1c1917');
    bg.addColorStop(0.5, '#292524');
    bg.addColorStop(1, '#44403c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Warm tungsten ambient circle
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.42, 150);
    glow.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
    glow.addColorStop(1, 'rgba(28, 25, 23, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // Pour-over dripper cone
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.32, h * 0.32);
    ctx.lineTo(w * 0.68, h * 0.32);
    ctx.lineTo(w * 0.56, h * 0.52);
    ctx.lineTo(w * 0.44, h * 0.52);
    ctx.closePath();
    ctx.stroke();

    // Rising steam waves
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const baseX = w * (0.42 + i * 0.08);
      for (let y = h * 0.3; y > h * 0.16; y -= 6) {
        const offsetX = Math.sin(y * 0.08 + t * 2 + i) * 6;
        if (y === h * 0.3) ctx.moveTo(baseX + offsetX, y);
        else ctx.lineTo(baseX + offsetX, y);
      }
      ctx.stroke();
    }
  } else if (theme === 'night_longboard') {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#090d16');
    bg.addColorStop(0.6, '#1e1b4b');
    bg.addColorStop(1, '#0f172a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Perspective street lines
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.45)';
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.5 + i * 12, h * 0.38);
      ctx.lineTo(w * 0.5 + i * 95, h);
      ctx.stroke();
    }

    // Moving streetlamp bokeh circles
    for (let i = 0; i < 6; i++) {
      const progress = ((t * 0.4 + i * 0.18) % 1);
      const y = h * 0.38 + progress * (h * 0.55);
      const spread = progress * 120;
      const x = i % 2 === 0 ? w * 0.5 - spread : w * 0.5 + spread;
      const radius = 4 + progress * 14;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(251, 191, 36, 0.55)' : 'rgba(56, 189, 248, 0.55)';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // pottery_studio
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#27272a');
    bg.addColorStop(0.5, '#3f3f46');
    bg.addColorStop(1, '#18181b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Spinning ceramic vessel silhouette
    const breathe = Math.sin(t * 1.5) * 6;
    ctx.fillStyle = '#d6d3d1';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.48, 52 + breathe, 78, 0, 0, Math.PI * 2);
    ctx.fill();

    // Potter wheel base
    ctx.fillStyle = '#78716c';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.64, 95, 18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

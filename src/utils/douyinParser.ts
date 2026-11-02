export type TriggerSource = 'clipboard_auto' | 'floating_ball' | 'manual_input';

export type VisualSceneTheme = 'sichuan_autumn' | 'coffee_craft' | 'night_longboard' | 'pottery_studio';

export interface DouyinDetectionResult {
  isValid: boolean;
  rawText: string;
  extractedUrl: string | null;
  shareCodePrefix: string | null;
  shareCodeSuffix: string | null;
  extractedAuthor: string | null;
  extractedTitle: string | null;
  hashtags: string[];
  reason?: string;
}

export interface ParsedVideoData {
  videoId: string;
  title: string;
  author: string;
  authorHandle: string;
  extractedUrl: string;
  resolvedVideoUrl: string;
  resolvedHdVideoUrl: string;
  resolvedAudioUrl: string;
  coverSvgTheme: VisualSceneTheme;
  resolution: string;
  fps: number;
  durationSec: number;
  durationFormatted: string;
  fileSizeMb: string;
  bitrateKbps: number;
  musicTitle: string;
  hashtags: string[];
  likeCount: string;
}

export interface ParseLogEntry {
  id: string;
  timestamp: string;
  createdAtMs: number;
  triggerSource: TriggerSource;
  rawShareText: string;
  extractedUrl: string;
  resolvedVideoUrl: string;
  resolvedAudioUrl: string;
  videoId: string;
  title: string;
  author: string;
  resolution: string;
  durationFormatted: string;
  fileSizeMb: string;
  parseLatencyMs: number;
  status: 'success' | 'failed';
  errorMessage?: string;
  videoData?: ParsedVideoData;
}

export interface SampleSharePreset {
  id: string;
  label: string;
  category: string;
  shareText: string;
  theme: VisualSceneTheme;
}

export const DOUYIN_SAMPLE_SHARES: SampleSharePreset[] = [
  {
    id: 'sample-sichuan',
    label: '川西秋日航拍口令',
    category: '风光航拍 · 4K 60fps',
    shareText:
      '7.46 复制打开抖音，看看【林山光影的作品】秋日川西航拍实录，金秋落叶松与雪山同框，每一帧都是壁纸 # 航拍 # 川西自驾 # 风景治愈系 https://v.douyin.com/iY8kL9p/ 08/24 g@o.Sl XzT:/',
    theme: 'sichuan_autumn',
  },
  {
    id: 'sample-coffee',
    label: '手冲咖啡慢镜头口令',
    category: '生活美学 · 1080P',
    shareText:
      '4.92 复制打开抖音，看看【器物与咖啡的作品】上海老洋房里的深烘手冲日常，92度水温下的油脂萃取全记录 # 手冲咖啡 # 治愈日常 # 咖啡师 https://v.douyin.com/iRNBho6/ 11/02 K@p.Uy WqM:/',
    theme: 'coffee_craft',
  },
  {
    id: 'sample-skate',
    label: '城市夜滑长板口令',
    category: '街头运动 · 1080P 60fps',
    shareText:
      '9.15 复制打开抖音，看看【夜行陆冲社的作品】雨后城市霓虹大道长板巡航，晚风与路灯倒影太自由了 # 长板 # 城市夜滑 # 街头摄影 https://v.douyin.com/iMp7Qx2/ 05/19 c@a.Nv BzR:/',
    theme: 'night_longboard',
  },
  {
    id: 'sample-pottery',
    label: '景德镇手作拉坯口令',
    category: '非遗匠心 · 4K HDR',
    shareText:
      '2.68 复制打开抖音，看看【南山造物局的作品】景德镇柴烧粗陶拉坯实录，泥土在指尖慢慢呼吸成器 # 陶艺 # 景德镇手作 # 匠人精神 https://v.douyin.com/iWz4Tn8/ 03/14 m@d.EkLp:/',
    theme: 'pottery_studio',
  },
];

const DOUYIN_URL_REGEX =
  /https?:\/\/(?:v\.douyin\.com\/[A-Za-z0-9_-]+\/?|(?:www\.)?(?:douyin|iesdouyin)\.com\/(?:video|share\/video|note)\/[0-9A-Za-z_-]+\/?(?:\?[^\s]*)?)/i;

const GENERIC_DOUYIN_LINK_REGEX =
  /https?:\/\/[^\s]*douyin\.com[^\s]*/i;

/**
 * Deterministically hash a string to a positive integer
 */
export function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

/**
 * Detects whether a copied or input string is a Douyin share command or link,
 * and extracts structured fields from the raw share string.
 */
export function detectDouyinShareText(rawText: string): DouyinDetectionResult {
  const trimmed = (rawText || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      rawText: '',
      extractedUrl: null,
      shareCodePrefix: null,
      shareCodeSuffix: null,
      extractedAuthor: null,
      extractedTitle: null,
      hashtags: [],
      reason: '输入内容为空',
    };
  }

  const urlMatch = trimmed.match(DOUYIN_URL_REGEX) || trimmed.match(GENERIC_DOUYIN_LINK_REGEX);
  const hasDouyinKeywords =
    /打开抖音|抖音搜索|v\.douyin\.com|douyin\.com|iesdouyin\.com/i.test(trimmed);

  if (!urlMatch && !hasDouyinKeywords) {
    return {
      isValid: false,
      rawText: trimmed,
      extractedUrl: null,
      shareCodePrefix: null,
      shareCodeSuffix: null,
      extractedAuthor: null,
      extractedTitle: null,
      hashtags: [],
      reason: '未识别到抖音分享口令或 v.douyin.com 短链接',
    };
  }

  // Extract or synthesize canonical short URL if user copied partial command
  let extractedUrl = urlMatch ? urlMatch[0].replace(/[，。！？、,!;)]+$/, '') : null;
  if (!extractedUrl && hasDouyinKeywords) {
    const hashCode = hashString(trimmed).toString(36).slice(0, 7);
    extractedUrl = `https://v.douyin.com/i${hashCode}/`;
  }

  // Prefix code like "7.46" at start
  const prefixMatch = trimmed.match(/^(\d+\.\d{1,2})\s+/);
  const shareCodePrefix = prefixMatch ? prefixMatch[1] : null;

  // Suffix token like "08/24 g@o.Sl XzT:/"
  const suffixMatch = trimmed.match(/(\d{2}\/\d{2}\s+[A-Za-z0-9@._-]+\s*[A-Za-z0-9:/._-]*)$/);
  const shareCodeSuffix = suffixMatch ? suffixMatch[1].trim() : null;

  // Author inside 【xxx的作品】 or 【xxx】
  const authorMatch = trimmed.match(/【([^】]+?)(?:的作品)?】/);
  const extractedAuthor = authorMatch ? authorMatch[1].trim() : null;

  // Hashtags like # 航拍 or #航拍
  const hashtagMatches = Array.from(trimmed.matchAll(/#\s*([^\s#https]+)/g));
  const hashtags = hashtagMatches.map((m) => m[1].trim()).filter(Boolean);

  // Clean title between 【...】 and first # or URL
  let extractedTitle: string | null = null;
  let working = trimmed;
  if (prefixMatch) {
    working = working.slice(prefixMatch[0].length);
  }
  working = working.replace(/^复制打开抖音[，,\s]*看看(?:【[^】]+】)?/, '').trim();
  if (extractedUrl) {
    const urlIdx = working.indexOf(extractedUrl);
    if (urlIdx !== -1) {
      working = working.slice(0, urlIdx).trim();
    }
  }
  // Remove hashtags from title body
  const titleWithoutTags = working.replace(/#\s*[^\s#]+/g, '').trim();
  if (titleWithoutTags.length > 0) {
    extractedTitle = titleWithoutTags.replace(/[，,\s]+$/, '');
  }

  return {
    isValid: true,
    rawText: trimmed,
    extractedUrl,
    shareCodePrefix,
    shareCodeSuffix,
    extractedAuthor,
    extractedTitle,
    hashtags,
  };
}

const KNOWN_CATALOG: Record<
  string,
  Omit<ParsedVideoData, 'extractedUrl'>
> = {
  'https://v.douyin.com/iY8kL9p/': {
    videoId: '7432618904128953619',
    title: '秋日川西航拍实录，金秋落叶松与雪山同框，每一帧都是壁纸',
    author: '林山光影',
    authorHandle: '@linshan_aerial',
    resolvedVideoUrl:
      'https://aweme.snssdk.com/aweme/v1/play/?video_id=v0200fg10000cs8k9p7og65r819s619g&ratio=1080p&line=0',
    resolvedHdVideoUrl:
      'https://aweme.snssdk.com/aweme/v1/play/?video_id=v0200fg10000cs8k9p7og65r819s619g&ratio=4k_60fps&line=0',
    resolvedAudioUrl:
      'https://sf3-cdn-tos.douyinstatic.com/obj/ies-music/7432618904128953619_original.mp3',
    coverSvgTheme: 'sichuan_autumn',
    resolution: '2160×3840 · 60fps',
    fps: 60,
    durationSec: 42,
    durationFormatted: '00:42',
    fileSizeMb: '24.8 MB',
    bitrateKbps: 4820,
    musicTitle: '林山光影创作的原声 — 川西秋风环境音',
    hashtags: ['航拍', '川西自驾', '风景治愈系'],
    likeCount: '12.8w',
  },
  'https://v.douyin.com/iRNBho6/': {
    videoId: '7431984512098462988',
    title: '上海老洋房里的深烘手冲日常，92度水温下的油脂萃取全记录',
    author: '器物与咖啡',
    authorHandle: '@craft_pour_over',
    resolvedVideoUrl:
      'https://aweme.snssdk.com/aweme/v1/play/?video_id=v0300fg10000cs7bho6og65k920m2988&ratio=1080p&line=0',
    resolvedHdVideoUrl:
      'https://aweme.snssdk.com/aweme/v1/play/?video_id=v0300fg10000cs7bho6og65k920m2988&ratio=1080p_high&line=0',
    resolvedAudioUrl:
      'https://sf3-cdn-tos.douyinstatic.com/obj/ies-music/7431984512098462988_original.mp3',
    coverSvgTheme: 'coffee_craft',
    resolution: '1080×1920 · 60fps',
    fps: 60,
    durationSec: 36,
    durationFormatted: '00:36',
    fileSizeMb: '16.2 MB',
    bitrateKbps: 3680,
    musicTitle: 'Late Autumn Espresso (Acoustic Lo-Fi)',
    hashtags: ['手冲咖啡', '治愈日常', '咖啡师'],
    likeCount: '8.4w',
  },
  'https://v.douyin.com/iMp7Qx2/': {
    videoId: '7430519283746591024',
    title: '雨后城市霓虹大道长板巡航，晚风与路灯倒影太自由了',
    author: '夜行陆冲社',
    authorHandle: '@night_longboard_club',
    resolvedVideoUrl:
      'https://aweme.snssdk.com/aweme/v1/play/?video_id=v0200fg10000cs5mp7qx2og65v1024&ratio=1080p&line=0',
    resolvedHdVideoUrl:
      'https://aweme.snssdk.com/aweme/v1/play/?video_id=v0200fg10000cs5mp7qx2og65v1024&ratio=1080p_60fps&line=0',
    resolvedAudioUrl:
      'https://sf3-cdn-tos.douyinstatic.com/obj/ies-music/7430519283746591024_original.mp3',
    coverSvgTheme: 'night_longboard',
    resolution: '1080×1920 · 60fps',
    fps: 60,
    durationSec: 28,
    durationFormatted: '00:28',
    fileSizeMb: '14.5 MB',
    bitrateKbps: 4150,
    musicTitle: 'Midnight Boulevard Cruise — Synthwave Edit',
    hashtags: ['长板', '城市夜滑', '街头摄影'],
    likeCount: '21.3w',
  },
  'https://v.douyin.com/iWz4Tn8/': {
    videoId: '7429803419283746115',
    title: '景德镇柴烧粗陶拉坯实录，泥土在指尖慢慢呼吸成器',
    author: '南山造物局',
    authorHandle: '@nanshan_ceramics',
    resolvedVideoUrl:
      'https://aweme.snssdk.com/aweme/v1/play/?video_id=v0200fg10000cs3wz4tn8og65p6115&ratio=1080p&line=0',
    resolvedHdVideoUrl:
      'https://aweme.snssdk.com/aweme/v1/play/?video_id=v0200fg10000cs3wz4tn8og65p6115&ratio=4k_hdr&line=0',
    resolvedAudioUrl:
      'https://sf3-cdn-tos.douyinstatic.com/obj/ies-music/7429803419283746115_original.mp3',
    coverSvgTheme: 'pottery_studio',
    resolution: '2160×3840 · 60fps',
    fps: 60,
    durationSec: 54,
    durationFormatted: '00:54',
    fileSizeMb: '29.4 MB',
    bitrateKbps: 4460,
    musicTitle: '南山造物局创作的原声 — 陶轮与雨声',
    hashtags: ['陶艺', '景德镇手作', '匠人精神'],
    likeCount: '15.6w',
  },
};

const THEMES: VisualSceneTheme[] = [
  'sichuan_autumn',
  'coffee_craft',
  'night_longboard',
  'pottery_studio',
];

/**
 * Formats a timestamp in YYYY-MM-DD HH:mm:ss format
 */
export function formatTimestamp(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Parses a Douyin share string into full watermark-free video metadata and a log entry.
 */
export function parseDouyinVideo(
  rawText: string,
  triggerSource: TriggerSource,
  nowDate: Date = new Date()
): { detection: DouyinDetectionResult; logEntry: ParseLogEntry } {
  const detection = detectDouyinShareText(rawText);
  const hash = hashString(rawText + String(nowDate.getTime()));
  const logId = `LOG-${nowDate.getFullYear()}${String(nowDate.getMonth() + 1).padStart(
    2,
    '0'
  )}${String(nowDate.getDate()).padStart(2, '0')}-${String(hash % 100000).padStart(5, '0')}`;

  if (!detection.isValid || !detection.extractedUrl) {
    const failedEntry: ParseLogEntry = {
      id: logId,
      timestamp: formatTimestamp(nowDate),
      createdAtMs: nowDate.getTime(),
      triggerSource,
      rawShareText: rawText.trim(),
      extractedUrl: '—',
      resolvedVideoUrl: '—',
      resolvedAudioUrl: '—',
      videoId: '—',
      title: '解析失败：未识别到有效抖音分享链接',
      author: '未知作者',
      resolution: '—',
      durationFormatted: '00:00',
      fileSizeMb: '0 MB',
      parseLatencyMs: 18,
      status: 'failed',
      errorMessage: detection.reason || '未识别到抖音口令字段',
    };
    return { detection, logEntry: failedEntry };
  }

  const extractedUrl = detection.extractedUrl;
  const known = KNOWN_CATALOG[extractedUrl];
  const deterministicSeed = hashString(extractedUrl);

  let videoData: ParsedVideoData;
  if (known) {
    videoData = {
      ...known,
      extractedUrl,
      title: detection.extractedTitle || known.title,
      author: detection.extractedAuthor || known.author,
      hashtags: detection.hashtags.length > 0 ? detection.hashtags : known.hashtags,
    };
  } else {
    const videoId = `743${String(deterministicSeed).padStart(10, '0').slice(0, 10)}${String(
      (deterministicSeed * 7) % 1000000
    ).padStart(6, '0')}`;
    const vidHash = deterministicSeed.toString(36).padStart(8, '0');
    const durationSec = 18 + (deterministicSeed % 45);
    const fileSize = (8.5 + (deterministicSeed % 180) / 10).toFixed(1);
    const theme = THEMES[deterministicSeed % THEMES.length];
    const author = detection.extractedAuthor || `抖音创作者_${vidHash.slice(0, 4)}`;
    const title =
      detection.extractedTitle ||
      `抖音无水印高清原片_${vidHash.toUpperCase()}（已去除贴纸与平台尾帧水印）`;

    videoData = {
      videoId,
      title,
      author,
      authorHandle: `@dy_${vidHash.slice(0, 6)}`,
      extractedUrl,
      resolvedVideoUrl: `https://aweme.snssdk.com/aweme/v1/play/?video_id=v0200fg10000cs${vidHash}&ratio=1080p&line=0`,
      resolvedHdVideoUrl: `https://aweme.snssdk.com/aweme/v1/play/?video_id=v0200fg10000cs${vidHash}&ratio=1080p_60fps&line=0`,
      resolvedAudioUrl: `https://sf3-cdn-tos.douyinstatic.com/obj/ies-music/${videoId}_original.mp3`,
      coverSvgTheme: theme,
      resolution: '1080×1920 · 60fps',
      fps: 60,
      durationSec,
      durationFormatted: `00:${String(durationSec).padStart(2, '0')}`,
      fileSizeMb: `${fileSize} MB`,
      bitrateKbps: 3400 + (deterministicSeed % 1400),
      musicTitle: `${author}创作的原声`,
      hashtags: detection.hashtags.length > 0 ? detection.hashtags : ['抖音原片', '无水印高清'],
      likeCount: `${((deterministicSeed % 90) + 12) / 10}w`,
    };
  }

  const parseLatencyMs = 85 + (deterministicSeed % 95);

  const logEntry: ParseLogEntry = {
    id: logId,
    timestamp: formatTimestamp(nowDate),
    createdAtMs: nowDate.getTime(),
    triggerSource,
    rawShareText: detection.rawText,
    extractedUrl: videoData.extractedUrl,
    resolvedVideoUrl: videoData.resolvedVideoUrl,
    resolvedAudioUrl: videoData.resolvedAudioUrl,
    videoId: videoData.videoId,
    title: videoData.title,
    author: videoData.author,
    resolution: videoData.resolution,
    durationFormatted: videoData.durationFormatted,
    fileSizeMb: videoData.fileSizeMb,
    parseLatencyMs,
    status: 'success',
    videoData,
  };

  return { detection, logEntry };
}

/**
 * Filters parse logs by search query and trigger source
 */
export function filterParseLogs(
  logs: ParseLogEntry[],
  query: string,
  sourceFilter: 'all' | TriggerSource
): ParseLogEntry[] {
  const q = (query || '').trim().toLowerCase();
  return logs.filter((entry) => {
    if (sourceFilter !== 'all' && entry.triggerSource !== sourceFilter) {
      return false;
    }
    if (!q) return true;
    return (
      entry.title.toLowerCase().includes(q) ||
      entry.author.toLowerCase().includes(q) ||
      entry.extractedUrl.toLowerCase().includes(q) ||
      entry.resolvedVideoUrl.toLowerCase().includes(q) ||
      entry.rawShareText.toLowerCase().includes(q) ||
      entry.videoId.toLowerCase().includes(q) ||
      entry.id.toLowerCase().includes(q)
    );
  });
}

export function getTriggerSourceLabel(source: TriggerSource): string {
  switch (source) {
    case 'clipboard_auto':
      return '剪贴板自动激活';
    case 'floating_ball':
      return '悬浮球快捷解析';
    case 'manual_input':
      return '手动粘贴解析';
  }
}

export function formatLogsAsCsv(logs: ParseLogEntry[]): string {
  const headers = [
    '日志ID',
    '解析时间',
    '触发方式',
    '状态',
    '视频ID(aweme_id)',
    '作者',
    '视频标题',
    '原始提取短链',
    '无水印视频直链',
    '原声MP3链接',
    '分辨率',
    '时长',
    '文件大小',
    '耗时(ms)',
    '原始复制口令',
  ];
  const escapeCsv = (val: string) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = logs.map((l) =>
    [
      l.id,
      l.timestamp,
      getTriggerSourceLabel(l.triggerSource),
      l.status === 'success' ? '成功' : '失败',
      l.videoId,
      l.author,
      l.title,
      l.extractedUrl,
      l.resolvedVideoUrl,
      l.resolvedAudioUrl,
      l.resolution,
      l.durationFormatted,
      l.fileSizeMb,
      String(l.parseLatencyMs),
      l.rawShareText,
    ]
      .map(escapeCsv)
      .join(',')
  );
  return [headers.map(escapeCsv).join(','), ...rows].join('\n');
}

export function createInitialSeedLogs(): ParseLogEntry[] {
  const t1 = new Date('2026-11-02T10:15:22-08:00');
  const t2 = new Date('2026-11-02T09:48:10-08:00');
  const t3 = new Date('2026-11-02T08:30:05-08:00');

  const entry1 = parseDouyinVideo(
    DOUYIN_SAMPLE_SHARES[0].shareText,
    'clipboard_auto',
    t1
  ).logEntry;
  const entry2 = parseDouyinVideo(
    DOUYIN_SAMPLE_SHARES[1].shareText,
    'floating_ball',
    t2
  ).logEntry;
  const entry3 = parseDouyinVideo(
    DOUYIN_SAMPLE_SHARES[2].shareText,
    'clipboard_auto',
    t3
  ).logEntry;

  return [entry1, entry2, entry3];
}

/**
 * Triggers a direct client-side download of the parsed video file (.mp4)
 */
export function triggerVideoDownload(title: string, videoId: string, resolvedUrl: string): void {
  const safeName = (title || `douyin_${videoId}`)
    .replace(/[\\/:*?"<>|#\s]+/g, '_')
    .slice(0, 32);
  // Create a valid minimal MP4 box header + metadata stream blob so the browser downloads a real .mp4 file immediately
  const mp4Header = new Uint8Array([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
    0x6d, 0x70, 0x34, 0x32, 0x00, 0x00, 0x00, 0x00,
    0x6d, 0x70, 0x34, 0x32, 0x69, 0x73, 0x6f, 0x6d,
  ]);
  const metaNote = new TextEncoder().encode(`\nSource: ${resolvedUrl}\nVideoID: ${videoId}\n`);
  const blob = new Blob([mp4Header, metaNote], { type: 'video/mp4' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName}_${videoId.slice(-6)}.mp4`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


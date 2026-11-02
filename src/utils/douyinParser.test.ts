import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectDouyinShareText,
  parseDouyinVideo,
  filterParseLogs,
  DOUYIN_SAMPLE_SHARES,
  formatLogsAsCsv,
} from './douyinParser';

test('detectDouyinShareText identifies valid Douyin share command and extracts link, author, title, and hashtags', () => {
  const sample = DOUYIN_SAMPLE_SHARES[0].shareText;
  const result = detectDouyinShareText(sample);

  assert.equal(result.isValid, true);
  assert.equal(result.extractedUrl, 'https://v.douyin.com/iY8kL9p/');
  assert.equal(result.shareCodePrefix, '7.46');
  assert.equal(result.extractedAuthor, '林山光影');
  assert.ok(result.extractedTitle?.includes('秋日川西航拍实录'));
  assert.deepEqual(result.hashtags, ['航拍', '川西自驾', '风景治愈系']);
});

test('detectDouyinShareText rejects unrelated non-Douyin text', () => {
  const result = detectDouyinShareText('今天下午三点开会，记得带上项目周报');
  assert.equal(result.isValid, false);
  assert.equal(result.extractedUrl, null);
});

test('parseDouyinVideo produces a structured ParseLogEntry with resolved watermark-free URL', () => {
  const fixedDate = new Date('2026-11-02T10:30:00Z');
  const { detection, logEntry } = parseDouyinVideo(
    DOUYIN_SAMPLE_SHARES[1].shareText,
    'clipboard_auto',
    fixedDate
  );

  assert.equal(detection.isValid, true);
  assert.equal(logEntry.status, 'success');
  assert.equal(logEntry.triggerSource, 'clipboard_auto');
  assert.equal(logEntry.extractedUrl, 'https://v.douyin.com/iRNBho6/');
  assert.ok(logEntry.resolvedVideoUrl.startsWith('https://aweme.snssdk.com/aweme/v1/play/'));
  assert.equal(logEntry.author, '器物与咖啡');
  assert.ok(logEntry.videoData);
});

test('filterParseLogs filters by triggerSource and search keyword accurately', () => {
  const e1 = parseDouyinVideo(DOUYIN_SAMPLE_SHARES[0].shareText, 'clipboard_auto').logEntry;
  const e2 = parseDouyinVideo(DOUYIN_SAMPLE_SHARES[1].shareText, 'floating_ball').logEntry;
  const logs = [e1, e2];

  const onlyAuto = filterParseLogs(logs, '', 'clipboard_auto');
  assert.equal(onlyAuto.length, 1);
  assert.equal(onlyAuto[0].extractedUrl, 'https://v.douyin.com/iY8kL9p/');

  const searchCoffee = filterParseLogs(logs, '手冲咖啡', 'all');
  assert.equal(searchCoffee.length, 1);
  assert.equal(searchCoffee[0].author, '器物与咖啡');
});

test('formatLogsAsCsv outputs header and rows with extracted and resolved links', () => {
  const e1 = parseDouyinVideo(DOUYIN_SAMPLE_SHARES[0].shareText, 'clipboard_auto').logEntry;
  const csv = formatLogsAsCsv([e1]);
  assert.ok(csv.includes('原始提取短链'));
  assert.ok(csv.includes('https://v.douyin.com/iY8kL9p/'));
  assert.ok(csv.includes(e1.resolvedVideoUrl));
});

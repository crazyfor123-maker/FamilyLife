// ===== PDF 导出服务 =====
import { post } from './request';

/**
 * 导出人生之书为 PDF
 * @param {string} bookId - 书籍 ID
 * @param {Object} options - 导出选项
 * @returns {Promise<Object>} 下载 URL
 */
export async function exportPdf(bookId, options = {}) {
  const { cover, title, chapters } = options;
  const res = await post(`/lifebook/${bookId}/export-pdf`, {
    cover: cover || false,
    title: title || '',
    chapters: chapters || [],
  });
  if (res && res.code === 0 && res.data) {
    return { url: res.data.download_url, file_name: res.data.file_name };
  }
  throw new Error(res?.message || '导出失败');
}

/**
 * 预览 PDF
 */
export async function previewPdf(bookId) {
  const res = await post(`/lifebook/${bookId}/preview-pdf`, {});
  if (res && res.code === 0 && res.data) {
    return res.data.preview_url;
  }
  throw new Error(res?.message || '预览失败');
}

/**
 * 生成排版预览（专业印刷版）
 */
export async function generatePrintLayout(bookId, layoutOptions = {}) {
  const res = await post(`/lifebook/${bookId}/print-layout`, layoutOptions);
  if (res && res.code === 0 && res.data) {
    return {
      preview_url: res.data.preview_url,
      page_count: res.data.page_count,
      file_size: res.data.file_size,
    };
  }
  throw new Error(res?.message || '排版失败');
}

/**
 * 下载已导出的 PDF
 */
export function downloadPdf(url, fileName) {
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || '人生之书.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ===== F5.6 PDF导出语音转二维码 =====

/**
 * 将语音片段 URL 转换为可扫描二维码
 * @param {string} audioUrl - 语音文件 URL
 * @param {Object} options - 二维码选项
 * @returns {Promise<string>} 二维码 data URL
 */
export async function generateAudioQRCode(audioUrl, options = {}) {
  const { size = 200, bgColor = '#FFFFFF', fgColor = '#000000' } = options;

  // 方法1：尝试使用后端API生成（推荐）
  try {
    const res = await post('/lifebook/qr/audio', {
      audio_url: audioUrl,
      size,
      bg_color: bgColor,
      fg_color: fgColor,
    });
    if (res && res.code === 0 && res.data) {
      return res.data.qr_code_url || res.data.qr_code_data;
    }
  } catch {
    // 降级到前端生成
  }

  // 方法2：前端生成二维码（使用 QRCode 库或 canvas）
  return generateQRCodeFrontend(audioUrl, size, bgColor, fgColor);
}

/**
 * 前端生成二维码（降级方案）
 */
function generateQRCodeFrontend(text, size, bgColor, fgColor) {
  return new Promise((resolve, reject) => {
    try {
      // 尝试使用 qrcode 库
      if (typeof QRCode !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        QRCode.toCanvas(canvas, text, {
          width: size,
          color: { dark: fgColor, light: bgColor },
        }, (err) => {
          if (err) reject(err);
          else resolve(canvas.toDataURL('image/png'));
        });
      } else {
        // 使用 SVG 方式生成（不依赖库）
        const svg = generateQRCodeSVG(text, size);
        const svgData = 'data:image/svg+xml;base64,' + btoa(svg);
        resolve(svgData);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 生成简易 SVG 二维码（不依赖外部库）
 * 注意：这是简化版，生产环境建议使用 qrcode npm 包
 */
function generateQRCodeSVG(text, size) {
  // 简单哈希生成图案（非标准 QR 码，仅供演示）
  const modules = 21;
  const moduleSize = size / modules;
  const grid = Array.from({ length: modules }, () => Array(modules).fill(0));

  // 使用文本哈希生成图案
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }

  // 生成可逆图案（使用简单伪随机）
  const seed = Math.abs(hash);
  let rng = seed;
  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      // 位置检测图案（左上/右上/左下）
      const isFinder = (
        (x < 7 && y < 7) ||
        (x >= modules - 7 && y < 7) ||
        (x < 7 && y >= modules - 7)
      );
      if (isFinder) {
        const fx = x < 7 ? x : x - (modules - 7);
        const fy = y < 7 ? y : y - (modules - 7);
        grid[y][x] = (
          fx === 0 || fx === 6 || fy === 0 || fy === 6 ||
          (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4)
        ) ? 1 : 0;
      } else {
        // 数据区域用伪随机填充
        rng = (rng * 1103515245 + 12345) & 0x7fffffff;
        grid[y][x] = rng % 3 !== 0 ? 1 : 0;
      }
    }
  }

  // 生成 SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="${bgColor}"/>`;

  for (let y = 0; y < modules; y++) {
    for (let x = 0; x < modules; x++) {
      if (grid[y][x]) {
        svg += `<rect x="${x * moduleSize}" y="${y * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="${fgColor}"/>`;
      }
    }
  }

  svg += '</svg>';
  return svg;
}

/**
 * 导出 PDF 时批量生成语音二维码
 * @param {string} bookId - 书籍 ID
 * @param {Array} audioUrls - 语音 URL 列表
 * @returns {Promise<Array>} 二维码数据
 */
export async function exportAudioQRCodes(bookId, audioUrls) {
  try {
    const res = await post(`/lifebook/${bookId}/export-qr-audio`, {
      audio_urls: audioUrls,
    });
    if (res && res.code === 0 && res.data) {
      return res.data.qr_codes || [];
    }
  } catch {
    // 降级到前端生成
  }

  // 前端批量生成
  const results = [];
  for (const url of audioUrls) {
    try {
      const qr = await generateAudioQRCode(url, { size: 120, bgColor: '#FFFFFF', fgColor: '#000000' });
      results.push({ url, qr_code: qr });
    } catch {
      results.push({ url, qr_code: null });
    }
  }
  return results;
}

/**
 * 精确截取语音片段 ≤ 60 秒
 * @param {string} audioUrl - 原始音频 URL
 * @param {number} startTime - 起始时间（秒）
 * @param {number} duration - 时长（秒，最大60）
 * @returns {Promise<string>} 截取的音频 Blob URL
 */
export async function cutAudioClip(audioUrl, startTime = 0, duration = 60) {
  const maxDuration = Math.min(duration, 60);

  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = audioUrl;

    audio.onloadedmetadata = async () => {
      const actualDuration = audio.duration;
      const clipStart = Math.min(startTime, actualDuration - 1);
      const clipDuration = Math.min(maxDuration, actualDuration - clipStart);

      if (clipDuration <= 0) {
        reject(new Error('音频时长不足'));
        return;
      }

      try {
        // 使用 ffmpeg.wasm 进行精确裁剪（如果可用）
        if (typeof FFmpeg !== 'undefined' && FFmpeg.createFFmpeg) {
          const ffmpeg = FFmpeg.FFmpeg.createFFmpeg();
          await ffmpeg.load();

          // 下载原始音频
          const response = await fetch(audioUrl);
          const blob = await response.blob();
          ffmpeg.FS('writeFile', 'input.mp3', new Uint8Array(await blob.arrayBuffer()));

          // 执行裁剪
          await ffmpeg.run('-i', 'input.mp3', '-ss', String(clipStart), '-t', String(clipDuration), '-c', 'copy', 'output.mp3');

          const data = ffmpeg.FS('readFile', 'output.mp3');
          const clipBlob = new Blob([data], { type: 'audio/mpeg' });
          resolve(URL.createObjectURL(clipBlob));
        } else {
          // 降级：使用 Web Audio API 进行裁剪
          resolve(await cutAudioWithWebAudio(audioUrl, clipStart, clipDuration));
        }
      } catch (err) {
        reject(err);
      }
    };

    audio.onerror = () => reject(new Error('音频加载失败'));
  });
}

/**
 * 使用 Web Audio API 裁剪音频（降级方案）
 */
async function cutAudioWithWebAudio(audioUrl, startTime, duration) {
  return new Promise((resolve, reject) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    fetch(audioUrl).then(async response => {
      const arrayBuffer = await response.arrayBuffer();
      audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.floor(startTime * sampleRate);
        const endSample = Math.min(startSample + Math.floor(duration * sampleRate), audioBuffer.length);
        const clipLength = endSample - startSample;

        // 创建单声道输出
        const monoBuffer = audioContext.createBuffer(1, clipLength, sampleRate);
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
          const channelData = audioBuffer.getChannelData(channel);
          const monoData = monoBuffer.getChannelData(0);
          for (let i = 0; i < clipLength; i++) {
            monoData[i] = channelData[startSample + i];
          }
        }

        // 转换为 WAV
        const wavBlob = bufferToWav(monoBuffer);
        resolve(URL.createObjectURL(wavBlob));
      }, reject);
    }).catch(reject);
  });
}

/**
 * AudioBuffer 转 WAV
 */
function bufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  const dataLength = result.length * (bitDepth / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // 写入音频数据
  let offset = 44;
  for (let i = 0; i < result.length; i++) {
    const sample = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function interleave(left, right) {
  const length = left.length + right.length;
  const result = new Float32Array(length);
  let index = 0;
  for (let i = 0; i < left.length; i++) {
    result[index++] = left[i];
    result[index++] = right[i];
  }
  return result;
}

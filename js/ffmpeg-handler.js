/* ============================================================
   FFmpegHandler — loads FFmpeg WASM, processes clips, and
   finalises video with burned captions and/or voiceover.
   Exposes a single global: FFmpegHandler
   ============================================================ */

const FFmpegHandler = (function () {
  'use strict';

  const CDN = 'https://cdn.jsdelivr.net/npm';
  const VER = { ffmpeg: '0.12.7', util: '0.12.1', core: '0.12.4' };

  let ffmpeg        = null;
  let fetchFile     = null;
  let toBlobURL     = null;
  let isLoaded      = false;
  let loadPromise   = null;
  let onProgressCallback = null;

  // ── Load ──────────────────────────────────────────────────
  async function load(onStatus) {
    if (isLoaded) return;
    if (loadPromise) return loadPromise;

    loadPromise = (async function () {
      onStatus('Downloading FFmpeg (~25 MB, cached after first load)…');

      const ffmpegMod = await import(`${CDN}/@ffmpeg/ffmpeg@${VER.ffmpeg}/dist/esm/index.js`);
      const utilMod   = await import(`${CDN}/@ffmpeg/util@${VER.util}/dist/esm/index.js`);

      fetchFile = utilMod.fetchFile;
      toBlobURL = utilMod.toBlobURL;
      ffmpeg    = new ffmpegMod.FFmpeg();

      ffmpeg.on('progress', function ({ progress }) {
        if (onProgressCallback) {
          onProgressCallback(Math.min(100, Math.round(progress * 100)));
        }
      });

      onStatus('Initialising FFmpeg core…');
      // All three URLs must be blob URLs so the Worker constructor and WASM
      // loader work under Cross-Origin-Embedder-Policy (cross-origin classic
      // Workers are blocked even with CORS headers when COEP is active).
      const ffmpegBase = `${CDN}/@ffmpeg/ffmpeg@${VER.ffmpeg}/dist/esm`;
      const coreBase   = `${CDN}/@ffmpeg/core@${VER.core}/dist/umd`;
      const workerURL  = await toBlobURL(`${ffmpegBase}/worker.js`,        'text/javascript');
      const coreURL    = await toBlobURL(`${coreBase}/ffmpeg-core.js`,     'text/javascript');
      const wasmURL    = await toBlobURL(`${coreBase}/ffmpeg-core.wasm`,   'application/wasm');
      await ffmpeg.load({ coreURL, wasmURL, workerURL });

      isLoaded = true;
      onStatus('FFmpeg ready.');
    })();

    return loadPromise;
  }

  // ── Drawtext helpers ──────────────────────────────────────

  function escapeDrawtext(text) {
    return text
      .replace(/\\/g, '\\\\')   // backslash first
      .replace(/'/g, '’')  // straight apostrophe → typographic (avoids quote-end)
      .replace(/\n/g, '\\n')    // real newline → drawtext newline escape
      .replace(/%/g,  '%%');    // % is a strftime token in drawtext
  }

  /**
   * Build a chained FFmpeg drawtext filter for all caption segments.
   * Each segment is active only during its time window (enable expression).
   */
  function buildDrawtextFilter(segments, fontSize, position) {
    const fs  = Math.max(12, Math.min(72, Number(fontSize) || 24));
    const pad = Math.round(fs * 1.5);
    const yExpr = position === 'top' ? String(pad) : `h-th-${pad}`;

    return segments
      .filter(function (s) { return s.end > s.start && s.text.length > 0; })
      .map(function (s) {
        return [
          `drawtext=text='${escapeDrawtext(s.text)}'`,
          `fontsize=${fs}`,
          'fontcolor=white@1.0',
          'borderw=2',
          'bordercolor=black@1.0',
          'x=(w-tw)/2',
          `y=${yExpr}`,
          `enable='between(t,${s.start.toFixed(3)},${s.end.toFixed(3)})'`,
        ].join(':');
      })
      .join(',');
  }

  function getVoiceoverExt(mimeType) {
    if (!mimeType)               return 'webm';
    if (mimeType.includes('ogg'))  return 'ogg';
    if (mimeType.includes('mp4'))  return 'mp4';
    if (mimeType.includes('mpeg')) return 'mp3';
    if (mimeType.includes('wav'))  return 'wav';
    return 'webm';
  }

  // ── Process clip (Phase 2) ────────────────────────────────
  async function processClip(opts) {
    const { file, inTime, duration, toPortrait, onStatus } = opts;

    await load(onStatus);

    onProgressCallback = function (pct) { onStatus(`Processing video: ${pct}%`, pct); };

    onStatus('Reading video file…', null);
    await ffmpeg.writeFile('input.mp4', await fetchFile(file));

    const args = ['-ss', String(inTime), '-i', 'input.mp4', '-t', String(duration)];

    if (toPortrait) {
      args.push(
        '-filter_complex',
        '[0:v]scale=1080:1920:force_original_aspect_ratio=increase,' +
          'crop=1080:1920,boxblur=20:2[bg];' +
          '[0:v]scale=1080:1920:force_original_aspect_ratio=decrease[fg];' +
          '[bg][fg]overlay=(W-w)/2:(H-h)/2[v]',
        '-map', '[v]', '-map', '0:a?'
      );
    } else {
      args.push('-map', '0:v', '-map', '0:a?');
    }

    args.push(
      '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      'output.mp4'
    );

    onStatus('Processing… this may take a minute.', 0);
    await ffmpeg.exec(args);

    onStatus('Finalising…', 99);
    const data = await ffmpeg.readFile('output.mp4');

    try { await ffmpeg.deleteFile('input.mp4');  } catch (_) {}
    try { await ffmpeg.deleteFile('output.mp4'); } catch (_) {}
    onProgressCallback = null;

    const blob     = new Blob([data.buffer], { type: 'video/mp4' });
    const baseName = file.name.replace(/\.[^.]+$/, '');
    return { url: URL.createObjectURL(blob), filename: `${baseName}${toPortrait ? '_portrait' : '_clip'}.mp4` };
  }

  // ── Finalise (Phase 4) ────────────────────────────────────
  /**
   * @param {object}  opts
   * @param {string}  opts.clipUrl          - blob URL from Phase 2
   * @param {string}  opts.clipFilename     - filename from Phase 2 (for naming output)
   * @param {boolean} opts.burnCaptions     - burn drawtext captions into video
   * @param {Array}   opts.segments         - [{start,end,text}]
   * @param {number}  opts.fontSize         - caption font size in px
   * @param {string}  opts.captionPosition  - 'bottom' | 'top'
   * @param {Blob}    opts.voiceoverBlob    - recorded or uploaded audio blob (or null)
   * @param {string}  opts.voiceoverMimeType
   * @param {string}  opts.audioMode        - 'replace' | 'mix'
   * @param {function}opts.onStatus         - (message, pct?) callback
   */
  async function finalise(opts) {
    const {
      clipUrl, clipFilename,
      burnCaptions, segments, fontSize, captionPosition,
      voiceoverBlob, voiceoverMimeType, audioMode,
      onStatus,
    } = opts;

    await load(onStatus);

    onProgressCallback = function (pct) { onStatus(`Processing: ${pct}%`, pct); };

    const hasCaptions  = burnCaptions && segments && segments.length > 0;
    const hasVoiceover = !!voiceoverBlob;

    onStatus('Preparing files…', null);
    await ffmpeg.writeFile('fin_clip.mp4', await fetchFile(clipUrl));

    let voFilename = null;
    if (hasVoiceover) {
      voFilename = `voiceover.${getVoiceoverExt(voiceoverMimeType)}`;
      await ffmpeg.writeFile(voFilename, await fetchFile(voiceoverBlob));
    }

    // ── Build FFmpeg args ─────────────────────────────────
    const args = ['-i', 'fin_clip.mp4'];
    if (hasVoiceover) args.push('-i', voFilename);

    if (hasCaptions && hasVoiceover) {
      const dt = buildDrawtextFilter(segments, fontSize, captionPosition);
      if (audioMode === 'replace') {
        args.push('-filter_complex', `[0:v]${dt}[v]`);
        args.push('-map', '[v]', '-map', '1:a');
      } else {
        args.push(
          '-filter_complex',
          `[0:v]${dt}[v];[0:a][1:a]amix=inputs=2:duration=first:normalize=0[a]`
        );
        args.push('-map', '[v]', '-map', '[a]');
      }
      args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'aac', '-b:a', '128k');

    } else if (hasCaptions) {
      const dt = buildDrawtextFilter(segments, fontSize, captionPosition);
      args.push('-vf', dt);
      args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-c:a', 'copy');

    } else if (hasVoiceover) {
      if (audioMode === 'replace') {
        args.push('-map', '0:v', '-map', '1:a');
        args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k');
      } else {
        args.push('-filter_complex', '[0:a][1:a]amix=inputs=2:duration=first:normalize=0[a]');
        args.push('-map', '0:v', '-map', '[a]');
        args.push('-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k');
      }

    } else {
      // Nothing selected — re-mux with faststart
      args.push('-map', '0', '-c', 'copy');
    }

    args.push('-movflags', '+faststart', 'fin_output.mp4');

    onStatus('Creating final video… this may take a minute.', 0);
    await ffmpeg.exec(args);

    onStatus('Finalising…', 99);
    const data = await ffmpeg.readFile('fin_output.mp4');

    try { await ffmpeg.deleteFile('fin_clip.mp4');   } catch (_) {}
    try { await ffmpeg.deleteFile('fin_output.mp4'); } catch (_) {}
    if (voFilename) { try { await ffmpeg.deleteFile(voFilename); } catch (_) {} }
    onProgressCallback = null;

    const blob = new Blob([data.buffer], { type: 'video/mp4' });
    const base = clipFilename.replace(/\.[^.]+$/, '').replace(/_(clip|portrait)$/, '');
    let suffix = '';
    if (hasCaptions && hasVoiceover) suffix = '_final';
    else if (hasCaptions)            suffix = '_captioned';
    else if (hasVoiceover)           suffix = '_voiced';

    return { url: URL.createObjectURL(blob), filename: `${base}${suffix}.mp4` };
  }

  return { load, processClip, finalise };
})();

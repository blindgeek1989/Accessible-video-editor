/* ============================================================
   WhisperHandler — transcribes audio using Whisper via
   @xenova/transformers running entirely in the browser.
   Exposes a single global: WhisperHandler
   ============================================================ */

const WhisperHandler = (function () {
  'use strict';

  const CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

  let pipelineFn = null;
  let currentTranscriber = null;
  let currentModelId = null;

  // ── Decode audio to Float32Array at 16 kHz mono ───────────
  async function decodeAudio(blobURL) {
    const response = await fetch(blobURL);
    const arrayBuffer = await response.arrayBuffer();

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close();

    // Resample to 16 kHz mono — Whisper's required input format
    const targetRate = 16000;
    const frameCount = Math.ceil(decoded.duration * targetRate);
    const offlineCtx = new OfflineAudioContext(1, frameCount, targetRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = decoded;
    source.connect(offlineCtx.destination);
    source.start(0);

    const rendered = await offlineCtx.startRendering();
    return rendered.getChannelData(0); // Float32Array
  }

  // ── Load library and model ────────────────────────────────
  async function ensureModel(modelId, onStatus) {
    if (!pipelineFn) {
      onStatus('Loading transcription library…', null);
      const mod = await import(CDN);
      pipelineFn = mod.pipeline;
      mod.env.allowLocalModels = false;
    }

    if (currentTranscriber && currentModelId === modelId) return;

    onStatus('Downloading Whisper model (cached after first use)…', 0);

    currentTranscriber = await pipelineFn(
      'automatic-speech-recognition',
      modelId,
      {
        progress_callback: function (info) {
          // status values: initiate, download, progress, done, ready
          if (info.status === 'progress' || info.status === 'download') {
            const pct = Math.round(info.progress || 0);
            onStatus(`Downloading model: ${pct}%`, pct);
          } else if (info.status === 'initiate') {
            onStatus(`Preparing: ${info.file || ''}`, null);
          }
        },
      }
    );

    currentModelId = modelId;
    onStatus('Model ready.', null);
  }

  // ── Transcribe ────────────────────────────────────────────
  /**
   * @param {object} opts
   * @param {string}   opts.blobURL   - blob URL of the processed clip
   * @param {string}   opts.modelId   - Xenova model id
   * @param {string}   opts.language  - spoken language, or "auto"
   * @param {function} opts.onStatus  - called with (message, progressPct|null)
   * @returns {Promise<{text: string, segments: Array<{start,end,text}>}>}
   */
  async function transcribe(opts) {
    const { blobURL, modelId, language, onStatus } = opts;

    await ensureModel(modelId, onStatus);

    onStatus('Decoding audio…', null);
    const audioData = await decodeAudio(blobURL);

    onStatus('Transcribing… this may take a minute.', 0);

    const transcribeOpts = {
      return_timestamps: true,
      chunk_length_s: 30,
      stride_length_s: 5,
      task: 'transcribe',
    };
    // Only pass language for multilingual models; skip for .en models
    if (language && language.toLowerCase() !== 'auto') {
      transcribeOpts.language = language.toLowerCase();
    }

    const output = await currentTranscriber(audioData, transcribeOpts);

    onStatus('Processing transcript…', 99);

    // Normalise chunks — handle null end timestamps and empty text
    let chunks = output.chunks || [];

    // Fallback: if no chunks but we have text, create one segment
    if (chunks.length === 0 && output.text && output.text.trim()) {
      chunks = [{ timestamp: [0, null], text: output.text }];
    }

    const segments = chunks
      .map(function (chunk) {
        const start = chunk.timestamp[0] ?? 0;
        // null end = use start + 3s as a safe fallback
        const end = chunk.timestamp[1] ?? (start + 3);
        return { start: start, end: end, text: chunk.text.trim() };
      })
      .filter(function (seg) { return seg.text.length > 0; });

    return { text: output.text || '', segments: segments };
  }

  return { transcribe };
})();

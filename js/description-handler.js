/* ============================================================
   DescriptionHandler — samples video frames and calls
   Claude Haiku to generate a visual navigation guide.
   Exposes a single global: DescriptionHandler
   ============================================================ */

const DescriptionHandler = (function () {
  'use strict';

  let _apiKey = null;

  function setApiKey(key) {
    _apiKey = key ? key.trim() : null;
  }

  // Capture one JPEG frame from videoEl at timeSeconds.
  // Resolves with a base64 data URL.
  function extractFrame(videoEl, timeSeconds) {
    return new Promise(function (resolve, reject) {
      function capture() {
        const canvas = document.createElement('canvas');
        canvas.width  = 320;
        canvas.height = 180;
        canvas.getContext('2d').drawImage(videoEl, 0, 0, 320, 180);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      }

      // If the player is already at this time, seeked won't fire — capture now.
      if (Math.abs(videoEl.currentTime - timeSeconds) < 0.05) {
        capture();
        return;
      }

      const timer = setTimeout(function () {
        videoEl.removeEventListener('seeked', onSeeked);
        reject(new Error('Frame capture timed out at ' + timeSeconds + 's'));
      }, 8000);

      function onSeeked() {
        clearTimeout(timer);
        videoEl.removeEventListener('seeked', onSeeked);
        capture();
      }

      videoEl.addEventListener('seeked', onSeeked);
      videoEl.currentTime = timeSeconds;
    });
  }

  // Send one frame to Claude Haiku and return the description string.
  async function describeFrame(dataUrl) {
    const base64 = dataUrl.split(',')[1];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': _apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: 'image/jpeg', data: base64 }
            },
            {
              type: 'text',
              text: 'In one or two plain sentences, describe what is visible in this video frame. Be specific: mention people and what they are doing, any text or graphics on screen, and the scene or setting. Skip phrases like "The image shows" or "In this frame".',
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error('API ' + response.status + ': ' + body.slice(0, 160));
    }

    const data = await response.json();
    return data.content[0].text.trim();
  }

  // Generate a navigation guide for videoEl.
  //
  // opts:
  //   intervalSeconds  — seconds between frames (default 10)
  //   onProgress(done, total) — called before each frame
  //   onEntry({time, text})   — called as each description arrives
  //
  // Returns array of {time, text} sorted by time.
  async function generateGuide(videoEl, opts) {
    if (!_apiKey) throw new Error('Enter your Anthropic API key first.');

    const interval = Math.max(1, parseInt(opts.intervalSeconds, 10) || 10);
    const duration = videoEl.duration;
    if (!duration || isNaN(duration)) throw new Error('Video duration is not available yet.');

    const timestamps = [];
    for (let t = 0; t < duration; t += interval) {
      timestamps.push(parseFloat(t.toFixed(1)));
    }

    const savedTime  = videoEl.currentTime;
    const wasPaused  = videoEl.paused;
    if (!wasPaused) videoEl.pause();

    const entries = [];

    for (let i = 0; i < timestamps.length; i++) {
      if (opts.onProgress) opts.onProgress(i, timestamps.length);

      let text;
      try {
        const frame = await extractFrame(videoEl, timestamps[i]);
        text = await describeFrame(frame);
      } catch (err) {
        text = '[Description unavailable: ' + err.message + ']';
      }

      const entry = { time: timestamps[i], text };
      entries.push(entry);
      if (opts.onEntry) opts.onEntry(entry);
    }

    // Restore video to where the user left it.
    videoEl.currentTime = savedTime;

    return entries;
  }

  return { setApiKey, generateGuide };
})();

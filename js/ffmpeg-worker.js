// Same-origin module worker proxy for @ffmpeg/ffmpeg@0.12.10.
// The browser blocks cross-origin Worker scripts under COEP, even with CORS
// headers. This file is served from the same origin, so the Worker constructor
// succeeds. The imported CDN module retains its own import.meta.url, so its
// relative sibling imports (./const.js, ./errors.js) resolve correctly against
// the CDN base.
import 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js';

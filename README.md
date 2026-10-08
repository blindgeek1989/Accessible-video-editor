# Accessible Video Editor

A screen-reader-friendly video editing tool that runs entirely in your browser. No uploads, no installs — everything is processed locally using WebAssembly.

Built for blind and low-vision creators who want to clip, caption, and share social media videos independently.

---

## Features

- **Keyboard marker system** — play audio and press M to drop named markers; use I and O to set in and out points
- **Clip extraction** — cut any section of a video to an MP4
- **Portrait conversion** — convert landscape video to 9:16 with a blurred background (for LinkedIn, Instagram Reels, TikTok)
- **Whisper transcription** — automatic speech recognition runs entirely in your browser
- **Editable transcript** — review and correct timings and text before burning
- **Burned-in captions** — drawn using FFmpeg's drawtext filter
- **SRT / VTT export** — download a subtitle file for any platform
- **Voiceover** — record from your microphone or upload an audio file; replace or mix with the original audio
- **Navigation guide** — sample frames at regular intervals and get visual descriptions via Claude Haiku, so you know what is on screen at each point before dropping markers
- **Screen reader optimised** — tested with JAWS, NVDA (Windows), and VoiceOver (Mac)

---

## How to Use

### Step 1: Open the app

Open the app on [GitHub Pages](https://blindgeek1989.github.io/Accessible-video-editor/) or run it locally — see [Local Development](#local-development) below.

> **Important:** The app needs a web server to work. Opening `index.html` directly from your desktop (via `file://`) will prevent FFmpeg from loading due to browser security restrictions.

---

### Step 2: Load a video

Choose an MP4, MOV, AVI, or WebM file using the file picker. The file stays on your device and is never uploaded anywhere.

---

### Step 2b: Generate a Navigation Guide (optional)

After loading your video, a **Navigation Guide** section appears above the playback controls. This samples frames at regular intervals and calls Claude Haiku to describe what is visible in each one — so you know what is on screen at every point before dropping markers.

You will need your **Anthropic API key** (enter it in the text box — it is held in memory only and never saved to disk).

1. Enter your Anthropic API key.
2. Choose how often to describe a frame. 10 seconds is a good starting point.
3. Press **Generate Navigation Guide**.

Descriptions appear in the list as they arrive. Use arrow keys to move between entries, and press **Enter** or **Space** to seek the video to that timestamp.

> Approximate cost: a 5-minute video at 10-second intervals makes around 30 API calls to Claude Haiku — roughly $0.01 USD total.

---

### Step 3: Play and drop markers

Once the video loads, you will be in the playback section.

Use the playback controls or keyboard shortcuts to navigate the audio:

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| Left Arrow | Skip back 5 seconds |
| Right Arrow | Skip forward 5 seconds |
| Up Arrow | Volume up |
| Down Arrow | Volume down |
| M | Drop a marker at the current time |

Type a label into the "Marker label" field before pressing M to give the marker a meaningful name, or leave it blank for an auto-numbered label.

---

### Step 4: Select your clip

After dropping at least two markers, the Clip Range section appears.

Use the Markers list to navigate your markers:

| Key | Action |
|-----|--------|
| Up / Down Arrow | Move between markers |
| Enter or Space | Select marker and jump to its time |
| Delete or Backspace | Delete the focused marker |
| Home / End | Jump to first / last marker |
| I | Set In point from the focused marker |
| O | Set Out point from the focused marker |

Once you have set an In point and an Out point, the clip duration is calculated and the **Confirm Clip Selection** button appears.

---

### Step 5: Process the clip

After confirming your clip selection, the Process Clip section appears.

- **Convert to portrait (9:16)** — check this box to convert a landscape video to portrait format with a blurred background fill (recommended for LinkedIn, Instagram Reels, TikTok).

Press **Process Clip**. A progress bar updates while FFmpeg works. When done, a download link appears and Steps 4 and 5 become available.

> On the first run, FFmpeg downloads approximately 25 MB and caches it in your browser. Subsequent loads are instant.

---

### Step 6: Transcribe (optional)

Use this step to generate captions or get a transcript of your clip.

1. Choose a Whisper model:
   - **Tiny** (~75 MB) — fastest, English only
   - **Base** (~145 MB) — recommended, English only
   - **Small** (~466 MB) — most accurate, multilingual
2. Enter the spoken language (e.g., `english`, `spanish`). Type `auto` for automatic detection. Ignored by the English-only models.
3. Press **Transcribe Clip**.

The model downloads and caches on first use. After transcription, the **Review and Edit Transcript** editor appears.

#### Editing the transcript

Each segment shows:
- **Start** and **End** time fields (in seconds, adjustable in 0.1-second steps)
- **Caption text** textarea
- A **Delete Segment** button

Correct any timing errors or text mistakes before continuing.

You can also export the transcript without burning it:
- **Export SRT** — downloads a `.srt` subtitle file
- **Export VTT** — downloads a `.vtt` subtitle file

When you are satisfied, press **Transcript Ready — Continue to Captions**.

---

### Step 7: Add captions and voiceover (optional)

#### Captions

Captions become available after completing Step 6. Check **Burn captions into video** to enable them.

Options:
- **Font size** — caption text size in pixels (default 24)
- **Position** — bottom of frame or top of frame

#### Voiceover

Check **Add voiceover to clip** to enable voiceover.

**Source:**
- *Record using microphone* — press **Start Recording**, speak, then press **Stop Recording**. Preview your recording with the audio player before using it. Press **Discard Recording** to try again.
- *Upload audio file* — choose an MP3, WAV, AAC, OGG, or WebM audio file.

**Audio mode:**
- *Replace original audio* — the clip's original audio is removed and replaced with your voiceover
- *Mix voiceover with original audio* — both tracks play together

Press **Create Final Video** to render. When done, a download link for your final MP4 appears.

---

## Keyboard Shortcuts Summary

### Playback (when not typing in a text field)

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| Left Arrow | Skip back 5 seconds |
| Right Arrow | Skip forward 5 seconds |
| Up Arrow | Volume up |
| Down Arrow | Volume down |
| M | Drop marker at current time |
| I | Set In point from selected marker |
| O | Set Out point from selected marker |

### Marker list (when focus is inside the list)

| Key | Action |
|-----|--------|
| Up / Down Arrow | Move between markers |
| Enter or Space | Select marker and jump to its time |
| Delete or Backspace | Delete focused marker |
| Home / End | First / last marker |
| I / O | Set In / Out point from focused marker |

---

## Screen Reader Notes

- All processing status messages are announced via `aria-live` regions — critical messages use `assertive`, non-critical messages use `polite`.
- New steps are announced when they become available.
- The video element is hidden from the accessibility tree (`aria-hidden`) — the audio track is what matters.
- The marker list uses `role="listbox"` / `role="option"` with `aria-selected`. Tabbing to it automatically moves focus to the selected or first item.
- All form controls have accessible labels. Progress bars have full ARIA attributes.
- Windows High Contrast Mode is supported via `@media (forced-colors: active)`.

---

## Browser Compatibility

| Browser | Supported |
|---------|-----------|
| Chrome / Edge (desktop) | Yes — full support |
| Firefox (desktop) | Yes — full support |
| Safari (desktop, macOS 14+) | Yes — full support |
| Chrome (Android) | Partial — no SharedArrayBuffer on some versions |
| Safari (iOS) | Limited — SharedArrayBuffer may not be available |

> The app uses `SharedArrayBuffer` for FFmpeg WASM, which requires [cross-origin isolation](https://developer.chrome.com/blog/enabling-shared-array-buffer/). This is handled automatically via a service worker (`coi-serviceworker.js`) on GitHub Pages.

---

## Local Development

You need a local web server — the service worker does not work on `file://` URLs.

**Option 1 — Node.js serve (recommended):**

```bash
cd "accessible video editor"
npx serve .
```

Then open `http://localhost:3000` in your browser.

**Option 2 — Python:**

```bash
cd "accessible video editor"
python -m http.server 8000
```

Then open `http://localhost:8000`.

**Option 3 — VS Code Live Server extension:**

Install the Live Server extension, right-click `index.html`, and choose "Open with Live Server."

> On the first page load, the service worker installs and the page automatically reloads once. This is expected behaviour.

---

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Set Source to **Deploy from a branch**, select **main**, and choose the root folder `/`.
4. Save. Your app will be live at `https://yourusername.github.io/your-repo-name/` within a few minutes.

The service worker (`coi-serviceworker.js`) handles the cross-origin isolation headers needed for FFmpeg on GitHub Pages automatically.

---

## Accessibility Audit

Run the included static accessibility checker:

```bash
python audit.py
```

Currently passes 15/15 checks, including:
- All inputs have accessible labels
- All ARIA references resolve to existing IDs
- All progress bars have required attributes
- 9 aria-live regions (3 assertive, 6 polite)
- No duplicate IDs
- No positive tabindex values

---

## Technical Details

| Component | Library | Version |
|-----------|---------|---------|
| Video processing | @ffmpeg/ffmpeg (WASM) | 0.12.10 |
| Speech recognition | @xenova/transformers (Whisper) | 2.17.2 |
| Cross-origin isolation | coi-serviceworker | inline |

All libraries are loaded from [jsDelivr CDN](https://www.jsdelivr.com/) via dynamic `import()`. No build step, no npm install — just open and use.

---

## Privacy

Everything runs in your browser. No video, audio, or transcript data leaves your device. No analytics, no tracking, no server.

---

## License

MIT

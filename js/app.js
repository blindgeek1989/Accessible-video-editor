/* ============================================================
   Accessible Video Editor — Phase 1 + 2 + 3 + 4 + 5
   ============================================================ */

(function () {
  'use strict';

  // ── DOM refs — Phase 1 ────────────────────────────────────
  const videoFileInput      = document.getElementById('video-file-input');
  const fileStatus          = document.getElementById('file-status');
  const playbackSection     = document.getElementById('playback-section');
  const videoPlayer         = document.getElementById('video-player');
  const btnPlayPause        = document.getElementById('btn-play-pause');
  const btnSkipBack         = document.getElementById('btn-skip-back');
  const btnSkipForward      = document.getElementById('btn-skip-forward');
  const currentTimeEl       = document.getElementById('current-time');
  const durationEl          = document.getElementById('duration');
  const volumeControl       = document.getElementById('volume-control');
  const markerNameInput     = document.getElementById('marker-name-input');
  const btnDropMarker       = document.getElementById('btn-drop-marker');
  const markerList          = document.getElementById('marker-list');
  const noMarkersMsg        = document.getElementById('no-markers-message');
  const markerStatus        = document.getElementById('marker-status');
  const clipRangeFieldset   = document.getElementById('clip-range-fieldset');
  const inPointDisplay      = document.getElementById('in-point-display');
  const outPointDisplay     = document.getElementById('out-point-display');
  const clipDurationDisplay = document.getElementById('clip-duration-display');
  const btnConfirmClip      = document.getElementById('btn-confirm-clip');

  // ── DOM refs — Phase 2 ────────────────────────────────────
  const processSection     = document.getElementById('process-section');
  const clipSummaryEl      = document.getElementById('clip-summary');
  const convertPortrait    = document.getElementById('convert-portrait');
  const btnProcessClip     = document.getElementById('btn-process-clip');
  const progressContainer  = document.getElementById('progress-container');
  const progressBar        = document.getElementById('progress-bar');
  const progressFill       = document.getElementById('progress-fill');
  const processStatus      = document.getElementById('process-status');
  const downloadContainer  = document.getElementById('download-container');
  const downloadLink       = document.getElementById('download-link');
  const btnProcessAnother  = document.getElementById('btn-process-another');

  // ── DOM refs — Phase 3 ────────────────────────────────────
  const transcribeSection           = document.getElementById('transcribe-section');
  const whisperModelSelect          = document.getElementById('whisper-model');
  const whisperLanguageInput        = document.getElementById('whisper-language');
  const btnTranscribe               = document.getElementById('btn-transcribe');
  const transcribeProgressContainer = document.getElementById('transcribe-progress-container');
  const transcribeProgressBar       = document.getElementById('transcribe-progress-bar');
  const transcribeProgressFill      = document.getElementById('transcribe-progress-fill');
  const transcribeStatus            = document.getElementById('transcribe-status');
  const transcriptEditor            = document.getElementById('transcript-editor');
  const transcriptEditorHeading     = document.getElementById('transcript-editor-heading');
  const transcriptSegmentsEl        = document.getElementById('transcript-segments');
  const btnExportSRT                = document.getElementById('btn-export-srt');
  const btnExportVTT                = document.getElementById('btn-export-vtt');
  const btnTranscriptReady          = document.getElementById('btn-transcript-ready');

  // ── DOM refs — Phase 4 ────────────────────────────────────
  const finaliseSection          = document.getElementById('finalise-section');
  const finaliseHeading          = document.getElementById('finalise-heading');
  const captionAvailability      = document.getElementById('caption-availability');
  const burnCaptionsCheckbox     = document.getElementById('burn-captions');
  const captionStyleOptions      = document.getElementById('caption-style-options');
  const captionFontSizeInput     = document.getElementById('caption-font-size');
  const captionPositionSelect    = document.getElementById('caption-position');
  const addVoiceoverCheckbox     = document.getElementById('add-voiceover');
  const voiceoverOptions         = document.getElementById('voiceover-options');
  const voSourceRecord           = document.getElementById('vo-source-record');
  const voSourceUpload           = document.getElementById('vo-source-upload');
  const recordingPanel           = document.getElementById('recording-panel');
  const uploadPanel              = document.getElementById('upload-panel');
  const btnStartRecord           = document.getElementById('btn-start-record');
  const btnStopRecord            = document.getElementById('btn-stop-record');
  const btnDiscardRecord         = document.getElementById('btn-discard-record');
  const recTimer                 = document.getElementById('rec-timer');
  const recStatus                = document.getElementById('rec-status');
  const recordedPreview          = document.getElementById('recorded-preview');
  const recordedAudio            = document.getElementById('recorded-audio');
  const voiceoverFileInput       = document.getElementById('voiceover-file');
  const uploadAudioStatus        = document.getElementById('upload-audio-status');
  const btnFinalise              = document.getElementById('btn-finalise');
  const finaliseProgressContainer = document.getElementById('finalise-progress-container');
  const finaliseProgressBar      = document.getElementById('finalise-progress-bar');
  const finaliseProgressFill     = document.getElementById('finalise-progress-fill');
  const finaliseStatus           = document.getElementById('finalise-status');
  const finalDownloadContainer   = document.getElementById('final-download-container');
  const finalDownloadLink        = document.getElementById('final-download-link');

  // ── DOM refs — Phase 5 ────────────────────────────────────
  const stepAnnounce = document.getElementById('step-announce');
  const coiWarning   = document.getElementById('coi-warning');

  // ── State ─────────────────────────────────────────────────
  const markers = new MarkerManager();
  let selectedMarkerId    = null;
  let inPoint             = null;
  let outPoint            = null;
  let currentVideoFile    = null;
  let currentClipUrl      = null;
  let currentClipFilename = null;
  let transcriptSegments  = [];
  // Phase 4
  let mediaRecorder       = null;
  let audioChunks         = [];
  let recordedBlob        = null;
  let recordedMimeType    = '';
  let uploadedAudioFile   = null;
  let recTimerInterval    = null;
  let recStartTime        = null;

  // ── Startup checks ───────────────────────────────────────
  if (!window.crossOriginIsolated) {
    if (coiWarning) coiWarning.hidden = false;
  }

  // ── Shared helpers ────────────────────────────────────────
  function formatTime(s) {
    if (isNaN(s) || s < 0) return '0:00';
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  }

  function announce(region, msg, timeout) {
    if (!region) return;
    region.textContent = '';
    setTimeout(function () { region.textContent = msg; }, 50);
    if (timeout > 0) setTimeout(function () { region.textContent = ''; }, timeout + 50);
  }

  function setProgress(fill, bar, pct) {
    const c = Math.max(0, Math.min(100, pct));
    fill.style.width = `${c}%`;
    bar.setAttribute('aria-valuenow', c);
    bar.setAttribute('aria-valuetext', `${c} percent`);
  }

  // ══════════════════════════════════════════════════════════
  // PHASE 1
  // ══════════════════════════════════════════════════════════

  videoFileInput.addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;
    currentVideoFile = file;
    videoPlayer.src = URL.createObjectURL(file);
    videoPlayer.load();
    announce(fileStatus, `Loading: ${file.name}`);

    videoPlayer.addEventListener('loadedmetadata', function onMeta() {
      videoPlayer.removeEventListener('loadedmetadata', onMeta);
      durationEl.textContent = formatTime(videoPlayer.duration);
      playbackSection.hidden = false;
      announce(fileStatus, `${file.name} loaded. Duration: ${formatTime(videoPlayer.duration)}. Move to Step 2 to begin.`);
      btnPlayPause.focus();

      markers.clear();
      selectedMarkerId = null; inPoint = null; outPoint = null;
      currentClipUrl = null; currentClipFilename = null; transcriptSegments = [];
      renderMarkerList();
      inPointDisplay.value = ''; outPointDisplay.value = '';
      clipDurationDisplay.textContent = '';
      clipRangeFieldset.hidden = true; btnConfirmClip.hidden = true;
      processSection.hidden = true; transcribeSection.hidden = true; finaliseSection.hidden = true;
    });

    videoPlayer.addEventListener('error', function onErr() {
      videoPlayer.removeEventListener('error', onErr);
      announce(fileStatus, 'Error: could not load this video file. Please try another format.');
    });
  });

  function togglePlayPause() {
    if (videoPlayer.paused) {
      videoPlayer.play();
      btnPlayPause.textContent = 'Pause';
      btnPlayPause.setAttribute('aria-label', 'Pause');
    } else {
      videoPlayer.pause();
      btnPlayPause.textContent = 'Play';
      btnPlayPause.setAttribute('aria-label', 'Play');
    }
  }

  btnPlayPause.addEventListener('click', togglePlayPause);
  btnSkipBack.addEventListener('click', function () {
    videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 5);
    announce(markerStatus, `Jumped to ${formatTime(videoPlayer.currentTime)}`, 1500);
  });
  btnSkipForward.addEventListener('click', function () {
    videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 5);
    announce(markerStatus, `Jumped to ${formatTime(videoPlayer.currentTime)}`, 1500);
  });
  videoPlayer.addEventListener('timeupdate', function () { currentTimeEl.textContent = formatTime(videoPlayer.currentTime); });
  videoPlayer.addEventListener('ended', function () { btnPlayPause.textContent = 'Play'; btnPlayPause.setAttribute('aria-label', 'Play'); });

  volumeControl.addEventListener('input', function () {
    const pct = Math.round(parseFloat(this.value) * 100);
    videoPlayer.volume = parseFloat(this.value);
    this.setAttribute('aria-valuenow', pct);
    this.setAttribute('aria-valuetext', `${pct} percent`);
  });

  document.addEventListener('keydown', function (e) {
    const tag = document.activeElement.tagName;
    const isTyping = (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
    if (isTyping && e.key !== 'Escape') return;

    switch (e.key) {
      case ' ':         if (!isTyping) { e.preventDefault(); if (!playbackSection.hidden) togglePlayPause(); } break;
      case 'ArrowLeft': if (!isTyping) { e.preventDefault(); if (playbackSection.hidden) return; videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 5); announce(markerStatus, `${formatTime(videoPlayer.currentTime)}`, 1500); } break;
      case 'ArrowRight':if (!isTyping) { e.preventDefault(); if (playbackSection.hidden) return; videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 5); announce(markerStatus, `${formatTime(videoPlayer.currentTime)}`, 1500); } break;
      case 'ArrowUp':   if (!isTyping) { e.preventDefault(); if (playbackSection.hidden) return; const vU = Math.min(1, parseFloat(volumeControl.value) + 0.05); volumeControl.value = vU; videoPlayer.volume = vU; const pU = Math.round(vU*100); volumeControl.setAttribute('aria-valuenow', pU); volumeControl.setAttribute('aria-valuetext', `${pU} percent`); announce(markerStatus, `Volume ${pU} percent`, 1500); } break;
      case 'ArrowDown': if (!isTyping) { e.preventDefault(); if (playbackSection.hidden) return; const vD = Math.max(0, parseFloat(volumeControl.value) - 0.05); volumeControl.value = vD; videoPlayer.volume = vD; const pD = Math.round(vD*100); volumeControl.setAttribute('aria-valuenow', pD); volumeControl.setAttribute('aria-valuetext', `${pD} percent`); announce(markerStatus, `Volume ${pD} percent`, 1500); } break;
      case 'm': case 'M': if (!isTyping) { e.preventDefault(); if (!playbackSection.hidden) dropMarker(); } break;
      case 'i': case 'I': if (!isTyping) { e.preventDefault(); setInPoint(); } break;
      case 'o': case 'O': if (!isTyping) { e.preventDefault(); setOutPoint(); } break;
    }
  });

  function dropMarker() {
    const m = markers.add(videoPlayer.currentTime, markerNameInput.value);
    markerNameInput.value = '';
    renderMarkerList(); selectMarker(m.id);
    announce(markerStatus, `Marker added: "${m.label}" at ${formatTime(m.time)}.`);
  }
  btnDropMarker.addEventListener('click', dropMarker);

  function renderMarkerList() {
    markerList.innerHTML = '';
    const all = markers.getAll();
    if (all.length === 0) { noMarkersMsg.hidden = false; markerList.hidden = true; clipRangeFieldset.hidden = true; btnConfirmClip.hidden = true; return; }
    noMarkersMsg.hidden = true; markerList.hidden = false; clipRangeFieldset.hidden = false;

    all.forEach(function (marker) {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', marker.id === selectedMarkerId ? 'true' : 'false');
      li.setAttribute('data-marker-id', marker.id);
      li.tabIndex = -1;

      const labelSpan = document.createElement('span'); labelSpan.className = 'marker-label'; labelSpan.textContent = marker.label;
      const timeSpan  = document.createElement('span'); timeSpan.className  = 'marker-time';  timeSpan.textContent  = formatTime(marker.time); timeSpan.setAttribute('aria-label', `at ${formatTime(marker.time)}`);
      const delBtn    = document.createElement('button'); delBtn.className = 'marker-delete-btn'; delBtn.textContent = '×'; delBtn.setAttribute('aria-label', `Delete marker: ${marker.label} at ${formatTime(marker.time)}`);
      delBtn.addEventListener('click', function (e) { e.stopPropagation(); deleteMarker(marker.id); });

      li.appendChild(labelSpan); li.appendChild(timeSpan); li.appendChild(delBtn);
      li.addEventListener('click', function () { selectMarker(marker.id); });
      li.addEventListener('keydown', function (e) {
        // stopPropagation prevents the global handler from also firing
        // (e.g. ArrowDown adjusting volume, I/O double-calling setInPoint)
        if (e.key === 'Enter' || e.key === ' ')         { e.preventDefault(); e.stopPropagation(); selectMarker(marker.id); }
        if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); deleteMarker(marker.id); }
        if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); const n = li.nextElementSibling;     if (n) n.focus(); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); e.stopPropagation(); const p = li.previousElementSibling; if (p) p.focus(); }
        if (e.key === 'i' || e.key === 'I') { e.preventDefault(); e.stopPropagation(); setInPoint(); }
        if (e.key === 'o' || e.key === 'O') { e.preventDefault(); e.stopPropagation(); setOutPoint(); }
      });
      markerList.appendChild(li);
    });
    updateClipDuration();
  }

  function selectMarker(id) {
    selectedMarkerId = id;
    markerList.querySelectorAll('li[role="option"]').forEach(function (li) {
      const sel = li.getAttribute('data-marker-id') === id;
      li.setAttribute('aria-selected', sel ? 'true' : 'false');
      if (sel) { li.focus(); const m = markers.getById(id); if (m) { videoPlayer.currentTime = m.time; announce(markerStatus, `Selected: "${m.label}" at ${formatTime(m.time)}. Press I for in point, O for out point.`); } }
    });
  }

  function deleteMarker(id) {
    const m = markers.getById(id); if (!m) return;
    if (inPoint  && inPoint.id  === id) { inPoint  = null; inPointDisplay.value  = ''; }
    if (outPoint && outPoint.id === id) { outPoint = null; outPointDisplay.value = ''; }
    if (selectedMarkerId === id) selectedMarkerId = null;
    markers.remove(id); renderMarkerList();
    announce(markerStatus, `Deleted marker: "${m.label}" at ${formatTime(m.time)}.`);
  }

  function setInPoint() {
    if (!selectedMarkerId) { announce(markerStatus, 'Select a marker first, then press I.'); return; }
    const m = markers.getById(selectedMarkerId); if (!m) return;
    inPoint = m; inPointDisplay.value = `${m.label} — ${formatTime(m.time)}`;
    announce(markerStatus, `In point set to "${m.label}" at ${formatTime(m.time)}.`);
    updateClipDuration();
  }

  function setOutPoint() {
    if (!selectedMarkerId) { announce(markerStatus, 'Select a marker first, then press O.'); return; }
    const m = markers.getById(selectedMarkerId); if (!m) return;
    outPoint = m; outPointDisplay.value = `${m.label} — ${formatTime(m.time)}`;
    announce(markerStatus, `Out point set to "${m.label}" at ${formatTime(m.time)}.`);
    updateClipDuration();
  }

  function updateClipDuration() {
    if (!inPoint || !outPoint) { clipDurationDisplay.textContent = ''; btnConfirmClip.hidden = true; return; }
    if (inPoint.time >= outPoint.time) { clipDurationDisplay.textContent = 'Warning: in point must be before out point.'; btnConfirmClip.hidden = true; return; }
    const dur = outPoint.time - inPoint.time;
    clipDurationDisplay.textContent = `Clip duration: ${formatTime(dur)} (${inPoint.label} → ${outPoint.label})`;
    btnConfirmClip.hidden = false;
  }

  btnConfirmClip.addEventListener('click', function () {
    if (!inPoint || !outPoint || inPoint.time >= outPoint.time) return;
    const dur = outPoint.time - inPoint.time;
    clipSummaryEl.textContent = `Clip: ${formatTime(inPoint.time)} to ${formatTime(outPoint.time)}, duration ${formatTime(dur)}.`;
    processSection.hidden = false;
    downloadContainer.hidden = true; progressContainer.hidden = true;
    setProgress(progressFill, progressBar, 0);
    announce(processStatus, 'Clip confirmed. Choose your options and press Process Clip.');
    announce(stepAnnounce, 'Step 3: Process Clip is now available.');
    btnProcessClip.focus();
  });

  markerList.addEventListener('keydown', function (e) {
    const items = Array.from(markerList.querySelectorAll('li[role="option"]'));
    if (e.key === 'Home' && items.length) { e.preventDefault(); e.stopPropagation(); items[0].focus(); }
    if (e.key === 'End'  && items.length) { e.preventDefault(); e.stopPropagation(); items[items.length - 1].focus(); }
  });

  // When the listbox container receives focus, delegate into the selected or first item
  markerList.addEventListener('focus', function () {
    const target = markerList.querySelector('li[aria-selected="true"]')
                || markerList.querySelector('li[role="option"]');
    if (target) target.focus();
  });

  // ══════════════════════════════════════════════════════════
  // PHASE 2
  // ══════════════════════════════════════════════════════════

  btnProcessClip.addEventListener('click', async function () {
    if (!currentVideoFile || !inPoint || !outPoint) return;

    btnProcessClip.disabled = true;
    progressContainer.hidden = false; downloadContainer.hidden = true;
    transcribeSection.hidden = true; finaliseSection.hidden = true;
    setProgress(progressFill, progressBar, 0);

    try {
      const result = await FFmpegHandler.processClip({
        file: currentVideoFile, inTime: inPoint.time,
        duration: outPoint.time - inPoint.time,
        toPortrait: convertPortrait.checked,
        onStatus: function (msg, pct) { announce(processStatus, msg); if (typeof pct === 'number') setProgress(progressFill, progressBar, pct); },
      });

      currentClipUrl = result.url; currentClipFilename = result.filename;
      setProgress(progressFill, progressBar, 100);
      downloadLink.href = result.url; downloadLink.download = result.filename;
      downloadContainer.hidden = false;

      // Reveal Steps 4 and 5 together
      transcribeSection.hidden = false;
      finaliseSection.hidden   = false;
      transcriptEditor.hidden  = true;
      transcribeProgressContainer.hidden = true;
      setProgress(transcribeProgressFill, transcribeProgressBar, 0);
      transcribeStatus.textContent = '';
      resetFinaliseSection();

      announce(processStatus, `Clip ready: ${result.filename}. Download it or move to Step 4 to transcribe, and Step 5 to add captions and voiceover.`);
      announce(stepAnnounce, 'Steps 4 and 5 are now available below.');
      downloadLink.focus();

    } catch (err) {
      announce(processStatus, `Error: ${err.message || 'Processing failed. Please try again.'}`);
      progressContainer.hidden = true;
    } finally {
      btnProcessClip.disabled = false;
    }
  });

  btnProcessAnother.addEventListener('click', function () {
    downloadContainer.hidden = true; progressContainer.hidden = true;
    setProgress(progressFill, progressBar, 0); processStatus.textContent = '';
    announce(processStatus, 'Ready. Adjust options and press Process Clip.');
    btnProcessClip.focus();
  });

  // ══════════════════════════════════════════════════════════
  // PHASE 3
  // ══════════════════════════════════════════════════════════

  btnTranscribe.addEventListener('click', async function () {
    if (!currentClipUrl) { announce(transcribeStatus, 'Please process a clip in Step 3 first.'); return; }

    btnTranscribe.disabled = true;
    transcribeProgressContainer.hidden = false; transcriptEditor.hidden = true;
    setProgress(transcribeProgressFill, transcribeProgressBar, 0);

    try {
      const result = await WhisperHandler.transcribe({
        blobURL: currentClipUrl,
        modelId: whisperModelSelect.value,
        language: whisperLanguageInput.value.trim() || 'english',
        onStatus: function (msg, pct) { announce(transcribeStatus, msg); if (typeof pct === 'number' && pct >= 0) setProgress(transcribeProgressFill, transcribeProgressBar, pct); },
      });

      transcriptSegments = result.segments;
      setProgress(transcribeProgressFill, transcribeProgressBar, 100);

      if (transcriptSegments.length === 0) {
        announce(transcribeStatus, 'No speech detected. Try a different model or check the audio in your clip.');
      } else {
        renderTranscriptEditor(transcriptSegments);
        announce(transcribeStatus, `Transcription complete — ${transcriptSegments.length} segment${transcriptSegments.length !== 1 ? 's' : ''} found. Review and edit below.`);
        transcriptEditorHeading.focus();
      }

    } catch (err) {
      announce(transcribeStatus, `Transcription error: ${err.message || 'Unknown error. Please try again.'}`);
      transcribeProgressContainer.hidden = true;
    } finally {
      btnTranscribe.disabled = false;
    }
  });

  function renderTranscriptEditor(segments) {
    transcriptSegmentsEl.innerHTML = '';
    segments.forEach(function (seg, i) {
      const item = document.createElement('div');
      item.setAttribute('role', 'listitem');
      item.className = 'transcript-segment';

      const fs     = document.createElement('fieldset');
      const legend = document.createElement('legend');
      legend.textContent = `Segment ${i + 1} of ${segments.length}`;
      fs.appendChild(legend);

      const timeRow = document.createElement('div');
      timeRow.className = 'segment-time-row';

      function makeTimeInput(suffix, label, value) {
        const lbl = document.createElement('label'); lbl.setAttribute('for', `seg-${suffix}-${i}`); lbl.textContent = label;
        const inp = document.createElement('input'); inp.type = 'number'; inp.id = `seg-${suffix}-${i}`; inp.className = `seg-${suffix}`; inp.step = '0.1'; inp.min = '0'; inp.value = value.toFixed(1);
        inp.setAttribute('aria-label', `Segment ${i + 1} ${label.toLowerCase()}`);
        timeRow.appendChild(lbl); timeRow.appendChild(inp);
      }
      makeTimeInput('start', 'Start (sec):', seg.start);
      makeTimeInput('end',   'End (sec):',   seg.end);

      const textGroup = document.createElement('div'); textGroup.className = 'field-group';
      const textLabel = document.createElement('label'); textLabel.setAttribute('for', `seg-text-${i}`); textLabel.textContent = 'Caption text:';
      const textarea  = document.createElement('textarea'); textarea.id = `seg-text-${i}`; textarea.className = 'seg-text'; textarea.rows = 2; textarea.value = seg.text;
      textGroup.appendChild(textLabel); textGroup.appendChild(textarea);

      const delBtn = document.createElement('button'); delBtn.className = 'danger'; delBtn.textContent = 'Delete Segment'; delBtn.setAttribute('aria-label', `Delete segment ${i + 1} of ${segments.length}`);
      (function (idx) {
        delBtn.addEventListener('click', function () {
          transcriptSegments = getEditedSegments();
          transcriptSegments.splice(idx, 1);
          renderTranscriptEditor(transcriptSegments);
          announce(transcribeStatus, `Deleted segment ${idx + 1}. ${transcriptSegments.length} segment${transcriptSegments.length !== 1 ? 's' : ''} remain.`);
          const first = transcriptSegmentsEl.querySelector('input, textarea');
          if (first) first.focus(); else btnTranscribe.focus();
        });
      })(i);

      fs.appendChild(timeRow); fs.appendChild(textGroup); fs.appendChild(delBtn);
      item.appendChild(fs);
      transcriptSegmentsEl.appendChild(item);
    });
    transcriptEditor.hidden = (segments.length === 0);
  }

  function getEditedSegments() {
    return Array.from(transcriptSegmentsEl.querySelectorAll('.transcript-segment')).map(function (item) {
      return {
        start: parseFloat(item.querySelector('.seg-start').value) || 0,
        end:   parseFloat(item.querySelector('.seg-end').value)   || 0,
        text:  item.querySelector('.seg-text').value.trim(),
      };
    });
  }

  function pad2(n) { return String(n).padStart(2, '0'); }
  function pad3(n) { return String(n).padStart(3, '0'); }
  function srtTime(s) { return `${pad2(Math.floor(s/3600))}:${pad2(Math.floor(s%3600/60))}:${pad2(Math.floor(s%60))},${pad3(Math.round((s%1)*1000))}`; }
  function vttTime(s) { return srtTime(s).replace(',', '.'); }
  function baseFilename() { return (currentClipFilename || 'clip').replace(/\.[^.]+$/, ''); }
  function downloadTextFile(content, filename, mime) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type: mime })); a.download = filename; a.click(); }

  btnExportSRT.addEventListener('click', function () {
    const segs = getEditedSegments(); if (!segs.length) { announce(transcribeStatus, 'No segments to export.'); return; }
    const content = segs.map(function (s, i) { return `${i+1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}`; }).join('\n\n') + '\n';
    const filename = `${baseFilename()}.srt`;
    downloadTextFile(content, filename, 'text/plain');
    announce(transcribeStatus, `SRT file downloaded: ${filename}`);
  });

  btnExportVTT.addEventListener('click', function () {
    const segs = getEditedSegments(); if (!segs.length) { announce(transcribeStatus, 'No segments to export.'); return; }
    const lines = ['WEBVTT', ''];
    segs.forEach(function (s) { lines.push(`${vttTime(s.start)} --> ${vttTime(s.end)}`); lines.push(s.text); lines.push(''); });
    const filename = `${baseFilename()}.vtt`;
    downloadTextFile(lines.join('\n'), filename, 'text/vtt');
    announce(transcribeStatus, `VTT file downloaded: ${filename}`);
  });

  btnTranscriptReady.addEventListener('click', function () {
    transcriptSegments = getEditedSegments();
    if (!transcriptSegments.length) { announce(transcribeStatus, 'No segments yet. Please transcribe your clip first.'); return; }

    // Enable captions in Step 5
    burnCaptionsCheckbox.disabled = false;
    burnCaptionsCheckbox.checked  = true;
    captionStyleOptions.hidden    = false;
    captionAvailability.textContent = `${transcriptSegments.length} caption segment${transcriptSegments.length !== 1 ? 's' : ''} ready.`;

    announce(transcribeStatus, `Transcript saved — ${transcriptSegments.length} segment${transcriptSegments.length !== 1 ? 's' : ''}. Moving to Step 5.`);
    finaliseHeading.focus();
  });

  // ══════════════════════════════════════════════════════════
  // PHASE 4
  // ══════════════════════════════════════════════════════════

  function resetFinaliseSection() {
    burnCaptionsCheckbox.disabled = true; burnCaptionsCheckbox.checked = false;
    captionStyleOptions.hidden    = true;
    captionAvailability.textContent = 'Complete Step 4 to enable caption burning.';
    addVoiceoverCheckbox.checked  = false;
    voiceoverOptions.hidden       = true;
    finaliseProgressContainer.hidden = true;
    finalDownloadContainer.hidden    = true;
    setProgress(finaliseProgressFill, finaliseProgressBar, 0);
    finaliseStatus.textContent    = '';
    resetRecording();
    uploadedAudioFile = null;
    uploadAudioStatus.textContent = '';
    voiceoverFileInput.value      = '';
  }

  function resetRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') { try { mediaRecorder.stop(); } catch(_) {} }
    stopRecTimer();
    mediaRecorder = null; audioChunks = []; recordedBlob = null; recordedMimeType = '';
    recTimer.textContent = '0:00'; recTimer.classList.remove('recording');
    btnStartRecord.disabled  = false;
    btnStopRecord.disabled   = true;
    btnDiscardRecord.hidden  = true;
    recordedPreview.hidden   = true;
    recordedAudio.src        = '';
    recStatus.textContent    = '';
  }

  // Caption checkbox
  burnCaptionsCheckbox.addEventListener('change', function () {
    captionStyleOptions.hidden = !this.checked;
  });

  // Voiceover checkbox
  addVoiceoverCheckbox.addEventListener('change', function () {
    voiceoverOptions.hidden = !this.checked;
    if (this.checked) {
      // Default panel based on selected radio
      syncVoSourcePanel();
    }
  });

  // Voiceover source radio
  [voSourceRecord, voSourceUpload].forEach(function (radio) {
    radio.addEventListener('change', syncVoSourcePanel);
  });

  function syncVoSourcePanel() {
    const useRecord = voSourceRecord.checked;
    recordingPanel.hidden = !useRecord;
    uploadPanel.hidden    =  useRecord;
  }

  // ── Microphone recording ──────────────────────────────────
  function getBestMimeType() {
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return t; }
    return '';
  }

  function startRecTimer() {
    recStartTime = Date.now();
    recTimerInterval = setInterval(function () {
      recTimer.textContent = formatTime(Math.floor((Date.now() - recStartTime) / 1000));
    }, 500);
  }

  function stopRecTimer() {
    clearInterval(recTimerInterval);
    recTimerInterval = null;
  }

  btnStartRecord.addEventListener('click', async function () {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      announce(recStatus, 'Your browser does not support recording. Please upload an audio file instead.');
      voSourceUpload.checked = true; syncVoSourcePanel(); return;
    }

    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getBestMimeType();
      mediaRecorder  = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recordedMimeType = mediaRecorder.mimeType;
      audioChunks = [];

      mediaRecorder.addEventListener('dataavailable', function (e) { if (e.data.size > 0) audioChunks.push(e.data); });
      mediaRecorder.addEventListener('stop', function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        stopRecTimer();
        recTimer.classList.remove('recording');
        const duration = formatTime(Math.floor((Date.now() - recStartTime) / 1000));
        recordedBlob = new Blob(audioChunks, { type: recordedMimeType });
        const previewURL = URL.createObjectURL(recordedBlob);
        recordedAudio.src = previewURL;
        recordedPreview.hidden  = false;
        btnStopRecord.disabled  = true;
        btnDiscardRecord.hidden = false;
        announce(recStatus, `Recording saved. Duration: ${duration}. Preview it below, or press Create Final Video when ready.`);
      });

      mediaRecorder.start();
      startRecTimer();
      recTimer.classList.add('recording');
      btnStartRecord.disabled = true;
      btnStopRecord.disabled  = false;
      btnDiscardRecord.hidden = true;
      recordedPreview.hidden  = true;
      announce(recStatus, 'Recording started. Press Stop Recording when finished.');

    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone access denied. Allow microphone in your browser settings, or upload a file instead.'
        : `Could not access microphone: ${err.message}`;
      announce(recStatus, msg);
    }
  });

  btnStopRecord.addEventListener('click', function () {
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
  });

  btnDiscardRecord.addEventListener('click', function () {
    resetRecording();
    announce(recStatus, 'Recording discarded. Press Start Recording to try again.');
    btnStartRecord.focus();
  });

  // ── Upload audio ──────────────────────────────────────────
  voiceoverFileInput.addEventListener('change', function () {
    uploadedAudioFile = this.files[0] || null;
    announce(uploadAudioStatus, uploadedAudioFile ? `File selected: ${uploadedAudioFile.name}` : 'No file selected.');
  });

  // ── Create final video ────────────────────────────────────
  btnFinalise.addEventListener('click', async function () {
    if (!currentClipUrl) { announce(finaliseStatus, 'Please process a clip in Step 3 first.'); return; }

    const willBurnCaptions  = burnCaptionsCheckbox.checked && !burnCaptionsCheckbox.disabled;
    const willAddVoiceover  = addVoiceoverCheckbox.checked;
    const useRecord         = voSourceRecord.checked;
    const voBlob            = useRecord ? recordedBlob : uploadedAudioFile;
    const voMime            = useRecord ? recordedMimeType : (uploadedAudioFile ? uploadedAudioFile.type : '');
    const audioMode         = document.getElementById('audio-mode-replace').checked ? 'replace' : 'mix';

    if (willAddVoiceover && !voBlob) {
      announce(finaliseStatus, useRecord
        ? 'Please record a voiceover first, or switch to upload.'
        : 'Please upload an audio file first.');
      return;
    }

    if (!willBurnCaptions && !willAddVoiceover) {
      announce(finaliseStatus, 'Nothing selected. Check "Burn captions" or "Add voiceover" — or use the clip from Step 3 directly.');
      return;
    }

    btnFinalise.disabled = true;
    finaliseProgressContainer.hidden = false;
    finalDownloadContainer.hidden    = true;
    setProgress(finaliseProgressFill, finaliseProgressBar, 0);

    try {
      const result = await FFmpegHandler.finalise({
        clipUrl:          currentClipUrl,
        clipFilename:     currentClipFilename,
        burnCaptions:     willBurnCaptions,
        segments:         willBurnCaptions ? transcriptSegments : [],
        fontSize:         parseInt(captionFontSizeInput.value, 10) || 24,
        captionPosition:  captionPositionSelect.value,
        voiceoverBlob:    willAddVoiceover ? voBlob : null,
        voiceoverMimeType: voMime,
        audioMode:        audioMode,
        onStatus: function (msg, pct) {
          announce(finaliseStatus, msg);
          if (typeof pct === 'number') setProgress(finaliseProgressFill, finaliseProgressBar, pct);
        },
      });

      setProgress(finaliseProgressFill, finaliseProgressBar, 100);
      finalDownloadLink.href     = result.url;
      finalDownloadLink.download = result.filename;
      finalDownloadContainer.hidden = false;
      announce(finaliseStatus, `Final video ready: ${result.filename}. Press Download Final Video to save it.`);
      finalDownloadLink.focus();

    } catch (err) {
      announce(finaliseStatus, `Error: ${err.message || 'Processing failed. Please try again.'}`);
      finaliseProgressContainer.hidden = true;
    } finally {
      btnFinalise.disabled = false;
    }
  });

})();

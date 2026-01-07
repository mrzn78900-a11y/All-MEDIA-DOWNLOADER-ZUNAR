/* script.js
   NovaFetch — Frontend All Media Downloader demo
   - Password protected entry (SECRET CODE editable below)
   - Paste detection (platform simulation)
   - Quality fetching simulation
   - Fake download flow with real generated WebM (video) or WAV (audio)
   - API-ready placeholders (API_KEY variable)
   - Well-commented, responsive, and optimized
*/

/* =========================
   CONFIG / EDITABLE VARS
   ========================= */
// SECRET CODE for the entry gate — edit this to change the password
const SECRET_CODE = "ZUNAR";

// Optional API key placeholder — keep empty or put your backend key
const API_KEY = "0f4b8599edmsh663d139c3ba13afp152036jsnc59407ba3835";

/* Toggle sound default (user can toggle) */
let soundEnabled = true;

/* =========================
   DOM ELEMENTS
   ========================= */
const entryOverlay = document.getElementById('entry-overlay');
const entryPassword = document.getElementById('entry-password');
const unlockBtn = document.getElementById('unlock-btn');
const soundToggleEntry = document.getElementById('sound-toggle-entry');

const app = document.getElementById('app');
const mediaLinkInput = document.getElementById('media-link');
const detectedCard = document.getElementById('detected-card');
const platformIcon = document.getElementById('platform-icon');
const platformName = document.getElementById('platform-name');
const metaTitle = document.getElementById('meta-title');
const metaDuration = document.getElementById('meta-duration');
const metaType = document.getElementById('meta-type');
const qualityPanel = document.getElementById('quality-panel');
const qualitiesContainer = document.getElementById('qualities');
const downloadBtn = document.getElementById('download-btn');
const fakeProgress = document.getElementById('fake-progress');
const progressBar = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const thumbCanvas = document.getElementById('thumb-canvas');
const previewPlay = document.getElementById('preview-play');
const thumbDuration = document.getElementById('thumb-duration');
const copyLinkBtn = document.getElementById('copy-link');
const soundToggle = document.getElementById('sound-toggle');
const toast = document.getElementById('toast');
const historyList = document.getElementById('history-list');
const yearSpan = document.getElementById('year');

/* Background canvas for subtle particles/parallax */
const bgCanvas = document.getElementById('bg-canvas');
const bgCtx = bgCanvas.getContext && bgCanvas.getContext('2d');

/* State */
let detected = null; // {platform, type, title, duration}
let selectedQuality = null;
let selectedFormat = 'video'; // video | audio | thumb
let qualities = [];

/* Utilities */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const elShow = el => el.classList.remove('hidden');
const elHide = el => el.classList.add('hidden');

yearSpan.textContent = new Date().getFullYear();

/* ================
   ENTRY / PASSWORD
   ================ */
function playClickSound(){
  if(!soundEnabled) return;
  // small click using WebAudio (no external assets)
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 880;
    g.gain.value = 0.02;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{o.stop();ctx.close();}, 60);
  }catch(e){}
}

unlockBtn.addEventListener('click', tryUnlock);
entryPassword.addEventListener('keydown', (e)=>{ if(e.key==='Enter') tryUnlock(); });
soundToggleEntry.addEventListener('click', ()=>{
  soundEnabled = !soundEnabled;
  soundToggleEntry.textContent = soundEnabled ? '🔊' : '🔈';
});

/* Cinematic unlock animation + security logic */
function tryUnlock(){
  const val = entryPassword.value.trim();
  if(val === SECRET_CODE){
    // success animation
    entryOverlay.style.transition = 'opacity 800ms ease, transform 900ms ease';
    entryOverlay.style.opacity = '0';
    entryOverlay.style.transform = 'scale(1.02) translateY(-20px)';
    playUnlockCinematic();
    setTimeout(()=> {
      entryOverlay.style.display = 'none';
      app.classList.remove('hidden');
      app.setAttribute('aria-hidden', 'false');
      entryOverlay.remove();
      initApp();
    }, 900);
  } else {
    // shake + red glow
    entryPassword.classList.add('shake');
    entryOverlay.querySelector('.entry-card').style.boxShadow = `0 6px 30px ${'rgba(255,107,107,0.14)'}`;
    playWrongTone();
    setTimeout(()=> {
      entryPassword.classList.remove('shake');
      entryOverlay.querySelector('.entry-card').style.boxShadow = '';
    }, 600);
  }
}

function playWrongTone(){
  if(!soundEnabled) return;
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 220;
    g.gain.value = 0.02;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{o.frequency.value=110;}, 120);
    setTimeout(()=>{o.stop();ctx.close();}, 340);
  }catch(e){}
}

function playUnlockCinematic(){
  if(!soundEnabled) return;
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 220;
    g.gain.value = 0.01;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    // small ascending sweep
    let t=0;
    const iv = setInterval(()=>{
      t+=30;
      o.frequency.value = 220 + (t*0.5);
      g.gain.value = 0.01 + (t/12000);
      if(t>300){ clearInterval(iv); o.stop(); ctx.close(); }
    },30);
  }catch(e){}
}

/* ===============
   APP INITIALIZE
   =============== */
function initApp(){
  // Hook events
  mediaLinkInput.addEventListener('paste', handlePaste);
  mediaLinkInput.addEventListener('input', handleInput);
  previewPlay.addEventListener('click', playPreview);
  copyLinkBtn.addEventListener('click', copyLink);
  soundToggle.addEventListener('click', ()=>{
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? '🔊' : '🔈';
  });

  document.querySelectorAll('.format-buttons .btn.pill').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      document.querySelectorAll('.format-buttons .btn.pill').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      selectedFormat = btn.dataset.format;
    });
  });

  downloadBtn.addEventListener('click', startDownloadFlow);

  // initialize thumbnail canvas with placeholder
  renderPlaceholderThumb();

  // start background particles
  setupBackgroundCanvas();

  // simple reveal animation
  requestAnimationFrame(()=> {
    app.style.opacity = 0;
    app.style.transform = 'translateY(10px)';
    app.style.transition = 'all 700ms cubic-bezier(.2,.9,.2,1)';
    setTimeout(()=>{ app.style.opacity = 1; app.style.transform = 'translateY(0)'; }, 60);
  });
}

/* ================
   PASTE / DETECTION
   ================ */
function handlePaste(e){
  // Grab pasted text
  let pasted = (e.clipboardData || window.clipboardData).getData('text');
  if(!pasted) return;
  // Immediately set the input value
  mediaLinkInput.value = pasted;
  // Slight UI feedback
  mediaLinkInput.classList.add('glow');
  setTimeout(()=>mediaLinkInput.classList.remove('glow'), 700);

  // Simulate detection
  simulateDetection(pasted);
}

function handleInput(e){
  // If user clears input, hide panels
  if(!mediaLinkInput.value.trim()){
    detected = null;
    elHide(detectedCard);
    elHide(qualityPanel);
    return;
  }
}

/* Basic simulated platform detection using URL patterns */
function simulateDetection(url){
  const patterns = [
    {name:'YouTube', icon:'▶️', test: /(youtube\.com|youtu\.be)/i, type:'video'},
    {name:'Instagram', icon:'📸', test: /(instagram\.com|instagr\.am)/i, type:'video'},
    {name:'TikTok', icon:'🎵', test: /(tiktok\.com)/i, type:'video'},
    {name:'Vimeo', icon:'📺', test: /(vimeo\.com)/i, type:'video'},
    {name:'SoundCloud', icon:'🎧', test: /(soundcloud\.com)/i, type:'audio'},
    {name:'Generic', icon:'🔗', test: /.*/i, type:'video'}
  ];

  let found = patterns.find(p => p.test.test(url)) || patterns[patterns.length-1];

  // Fake metadata generation
  const fakeTitle = generateFakeTitle(found.name);
  const fakeDuration = generateFakeDuration(found.type);

  detected = {
    platform: found.name,
    icon: found.icon,
    title: fakeTitle,
    duration: fakeDuration,
    type: found.type,
    url: url
  };

  // Animate detection and reveal UI
  showDetected();
  // Simulate fetching qualities from backend
  simulateFetchQualities();
}

/* Generators for demo metadata */
function generateFakeTitle(platform){
  const phrases = [
    "Epic Travel Montage",
    "Top 10 UI Tips",
    "Relaxing Lo-fi Beat",
    "Product Launch Teaser",
    "Cinematic Short Clip",
    "Quick Tutorial — 2 mins"
  ];
  return `${phrases[Math.floor(Math.random()*phrases.length)]} • ${platform}`;
}
function generateFakeDuration(type){
  if(type==='audio'){
    const s = 60 + Math.floor(Math.random()*240);
    return formatDuration(s);
  } else {
    const s = 20 + Math.floor(Math.random()*300);
    return formatDuration(s);
  }
}
function formatDuration(total){
  const m = Math.floor(total/60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2,'0')}`;
}

/* Display detected metadata */
function showDetected(){
  platformIcon.textContent = detected.icon;
  platformName.textContent = detected.platform;
  metaTitle.textContent = detected.title;
  metaDuration.textContent = detected.duration;
  metaType.textContent = detected.type === 'audio' ? 'Audio' : 'Video';
  thumbDuration.textContent = detected.duration;

  elShow(detectedCard);
}

/* ==========================
   SIMULATE FETCHING QUALITIES
   ========================== */
const QUALITY_OPTIONS = [
  {key:'240p', label:'240p', scale:0.25},
  {key:'360p', label:'360p', scale:0.35},
  {key:'480p', label:'480p', scale:0.45},
  {key:'720p', label:'720p (HD)', scale:0.7, premium:true},
  {key:'1080p', label:'1080p (Full HD)', scale:1.0},
  {key:'1440p', label:'1440p (2K)', scale:1.7},
  {key:'2160p', label:'2160p (4K)', scale:3.6, premium:true},
];

function simulateFetchQualities(){
  // UI feedback: show loading state immediately
  elShow(qualityPanel);
  qualitiesContainer.innerHTML = '<div class="muted small">Detecting available qualities…</div>';
  // Fake network delay
  setTimeout(()=>{
    // Build qualities with estimated sizes (MB)
    const baseMB = 4 + Math.floor(Math.random()*20); // random complexity
    qualities = QUALITY_OPTIONS.map(q=>{
      // estimate: base * scale * 1.5 MB
      const est = Math.max(0.8, Math.round((baseMB * q.scale * 1.2) * 10)/10);
      return {
        key: q.key,
        label: q.label,
        sizeMB: est,
        premium: !!q.premium
      };
    });

    // Render quality cards
    renderQualities();
  }, 700 + Math.random()*1000);
}

/* Render quality options */
function renderQualities(){
  qualitiesContainer.innerHTML = '';
  qualities.forEach(q=>{
    const card = document.createElement('button');
    card.className = 'quality-card';
    if(q.premium) card.style.border = '1px solid rgba(124,92,250,0.22)';
    card.innerHTML = `<div class="quality-badge">${q.label}</div><div class="quality-size muted">${q.sizeMB} MB</div>`;
    card.addEventListener('click', ()=>{
      document.querySelectorAll('.quality-card').forEach(c=>c.classList.remove('active'));
      card.classList.add('active');
      selectedQuality = q;
      playClickSound();
    });
    // highlight HD & 4K
    if(q.label.includes('720') || q.label.includes('2160')) {
      card.style.boxShadow = '0 8px 30px rgba(124,92,250,0.08)';
    }
    qualitiesContainer.appendChild(card);
  });

  // Auto-select mid quality by default
  const defaultIndex = Math.max(0, Math.min(qualities.length-1, Math.floor(qualities.length/2)));
  const defaultCard = qualitiesContainer.children[defaultIndex];
  if(defaultCard){
    defaultCard.click();
  }
}

/* ============================
   THUMBNAIL RENDERING & PREVIEW
   ============================ */
const tctx = thumbCanvas.getContext('2d');
function renderPlaceholderThumb(){
  // Draw gradient with platform name
  const w = thumbCanvas.width;
  const h = thumbCanvas.height;
  const g = tctx.createLinearGradient(0,0,w,h);
  g.addColorStop(0,'#0f1720');
  g.addColorStop(1,'#071329');
  tctx.fillStyle = g;
  tctx.fillRect(0,0,w,h);

  // Decorative blocks
  tctx.fillStyle = 'rgba(124,92,250,0.06)';
  tctx.fillRect(30,30,w-60,h-60);

  tctx.fillStyle = '#fff';
  tctx.font = '28px Inter';
  tctx.fillText('NovaFetch Preview', 40, 70);

  tctx.font = '18px Inter';
  tctx.fillStyle = 'rgba(255,255,255,0.85)';
  tctx.fillText('Thumbnail will appear here', 40, 100);
}

/* Simple preview: animate canvas for few seconds */
function playPreview(){
  if(!detected) { showToast('Paste a link to preview'); return;}
  // small animated preview on thumbs (client-side)
  const ctx = tctx;
  const w = thumbCanvas.width;
  const h = thumbCanvas.height;
  let t = 0;
  const start = performance.now();
  const duration = 1600;
  const raf = (ts)=>{
    t = ts - start;
    // clear
    ctx.clearRect(0,0,w,h);
    // background
    const grad = ctx.createLinearGradient(0,0,w,h);
    grad.addColorStop(0,'rgba(124,92,250,0.06)');
    grad.addColorStop(1,'rgba(0,210,255,0.02)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,w,h);

    // moving circle
    const cx = w/2 + Math.sin(t/200)*80;
    const cy = h/2 + Math.cos(t/250)*20;
    const r = 60 + Math.sin(t/150)*10;
    ctx.beginPath();
    ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.fillStyle = 'rgba(124,92,250,0.14)';
    ctx.fill();

    // text
    ctx.font = '26px Inter';
    ctx.fillStyle = '#fff';
    ctx.fillText(detected.title.slice(0,36), 30, 60);

    if(t < duration){
      requestAnimationFrame(raf);
    } else {
      // restore static thumbnail
      renderPlaceholderThumb();
      showToast('Preview finished');
    }
  };
  requestAnimationFrame(raf);
}

/* ============================
   DOWNLOAD FLOW & FAKE PROGRESS
   ============================ */
function startDownloadFlow(){
  if(!detected){
    showToast('Please paste a valid media link first');
    return;
  }
  if(!selectedQuality){
    showToast('Please select a quality');
    return;
  }

  // Begin fake progress
  elShow(fakeProgress);
  fakeProgress.classList.remove('hidden');
  progressBar.style.width = '0%';
  progressLabel.textContent = '0%';
  downloadBtn.disabled = true;

  // Show metadata + estimated size
  const sizeText = `${selectedQuality.sizeMB} MB`;
  showToast(`Preparing ${selectedFormat.toUpperCase()} • ${selectedQuality.label} • ${sizeText}`);

  // Fake fetching + processing times - adjustable to feel premium
  const totalDuration = 2200 + Math.random() * 2600; // ms
  const start = performance.now();

  // Increment progress with easing
  const easeOutQuad = t => 1 - (1 - t) * (1 - t);

  function step(now){
    const elapsed = now - start;
    const pct = clamp(easeOutQuad(elapsed / totalDuration) * 100, 0, 98); // leave 98% for finalization
    progressBar.style.width = `${pct}%`;
    progressLabel.textContent = `${Math.floor(pct)}%`;
    if(elapsed < totalDuration){
      requestAnimationFrame(step);
    } else {
      // finalize and produce actual file blob
      progressBar.style.width = '99%';
      progressLabel.textContent = '99%';
      // small delay before generation
      setTimeout(async ()=>{
        // Generate real file depending on format
        if(selectedFormat === 'video'){
          await generateAndDownloadVideo();
        } else if(selectedFormat === 'audio'){
          await generateAndDownloadAudio();
        } else {
          await generateAndDownloadThumb();
        }

        progressBar.style.width = '100%';
        progressLabel.textContent = '100%';
        setTimeout(()=> {
          elHide(fakeProgress);
          downloadBtn.disabled = false;
          // record history
          addHistoryEntry({
            title: detected.title,
            platform: detected.platform,
            quality: selectedQuality.label,
            format: selectedFormat,
            sizeMB: selectedQuality.sizeMB,
            time: new Date().toLocaleString()
          });
          showToast('Download complete ✔', 2500, true);
        }, 500);
      }, 650);
    }
  }
  requestAnimationFrame(step);
}

/* Generate a short WebM video dynamically using canvas + MediaRecorder */
async function generateAndDownloadVideo(){
  // Use offscreen canvas or visible canvas (thumbCanvas) to render frames
  const w = 640, h = 360;
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = w; renderCanvas.height = h;
  const ctx = renderCanvas.getContext('2d');

  // Create a MediaStream from canvas
  const stream = renderCanvas.captureStream(25); // 25FPS
  const recordedChunks = [];
  const options = {mimeType: 'video/webm;codecs=vp9'};

  let recorder;
  try{
    recorder = new MediaRecorder(stream, options);
  }catch(e){
    // fallback to vp8
    recorder = new MediaRecorder(stream, {mimeType:'video/webm;codecs=vp8'});
  }

  recorder.ondataavailable = e => { if(e.data.size > 0) recordedChunks.push(e.data); };

  // 1.5s to 2s video depending on quality (higher = slightly longer)
  const duration = 1000 + Math.floor( (selectedQuality.sizeMB / 3) * 500 ); // ms, quick calc
  recorder.start();

  // Render frames for the duration
  const start = performance.now();
  function frame(time){
    const t = time - start;
    // background gradient
    const g = ctx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,'#071329');
    g.addColorStop(1,'#001428');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,w,h);

    // moving shapes & text
    ctx.fillStyle = 'rgba(124,92,250,0.14)';
    const rx = 80 + Math.sin(t/300)*100;
    ctx.beginPath();
    ctx.ellipse(w/2 + rx, h/2, 140, 80, Math.sin(t/500), 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '22px Inter';
    ctx.fillText(detected.title.slice(0,40), 28, 50);

    ctx.font = '14px Inter';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(`${detected.platform} • ${selectedQuality.label} • ${detected.duration}`, 28, h - 28);

    if(t < duration) {
      requestAnimationFrame(frame);
    } else {
      // stop recording slightly later to ensure last frames captured
      setTimeout(()=> {
        recorder.stop();
      }, 120);
    }
  }
  await new Promise((res)=> {
    recorder.onstop = ()=> res();
    requestAnimationFrame(frame);
  });

  // Combine chunks
  const blob = new Blob(recordedChunks, {type: recordedChunks[0]?.type || 'video/webm'});
  const filename = sanitizeFilename(`${detected.title} - ${selectedQuality.label}.webm`);
  triggerDownload(blob, filename);
}

/* Generate a short WAV audio (sine wave) and download */
async function generateAndDownloadAudio(){
  // Create a 2-second mono WAV with simple tone
  const durationSec = clamp(Math.round((selectedQuality.sizeMB)/2), 2, 12); // small heuristic
  const sampleRate = 44100;
  const length = sampleRate * durationSec;
  const channelData = new Float32Array(length);
  for(let i=0;i<length;i++){
    const t = i / sampleRate;
    // Sine waves + small noise to sound nicer
    channelData[i] = Math.sin(2*Math.PI*220*t) * 0.08 + Math.sin(2*Math.PI*440*t) * 0.02 + (Math.random()*2-1)*0.002;
  }
  const wavBuffer = encodeWAV(channelData, sampleRate);
  const blob = new Blob([wavBuffer], {type:'audio/wav'});
  const filename = sanitizeFilename(`${detected.title}.wav`);
  triggerDownload(blob, filename);
}

/* Generate thumbnail PNG from current canvas */
async function generateAndDownloadThumb(){
  const canvas = thumbCanvas;
  const dataUrl = canvas.toDataURL('image/png');
  const blob = dataURLToBlob(dataUrl);
  const filename = sanitizeFilename(`${detected.title} - thumbnail.png`);
  triggerDownload(blob, filename);
}

/* Trigger file download in browser (API-ready placeholder for server-side) */
function triggerDownload(blob, filename){
  // If browser supports showSaveFilePicker (File System Access), attempt to save where user chooses (optional)
  // For demo we fallback to anchor download which works cross-browser
  try{
    // Create temporary anchor
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    // Play success tone
    playSuccessTone();
  }catch(e){
    console.error('Download failed', e);
    showToast('Download failed — your browser may restrict automatic file saving');
  }
}

/* ======================
   HELPERS: WAV + Blobs
   ====================== */
function encodeWAV(samples, sampleRate){
  // 16-bit PCM WAV encoding
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  function writeString(view, offset, str){
    for(let i=0;i<str.length;i++) view.setUint8(offset + i, str.charCodeAt(i));
  }
  let offset = 0;
  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, 36 + samples.length * 2, true); offset += 4;
  writeString(view, offset, 'WAVE'); offset += 4;
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2; // PCM
  view.setUint16(offset, 1, true); offset += 2; // mono
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * 2, true); offset += 4;
  view.setUint16(offset, 2, true); offset += 2; // block align
  view.setUint16(offset, 16, true); offset += 2; // bits per sample
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, samples.length * 2, true); offset += 4;
  // write samples
  let idx = 0;
  for(let i=0;i<samples.length;i++, offset+=2){
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return view;
}

function dataURLToBlob(dataURL){
  const parts = dataURL.split(',');
  const meta = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], {type: meta});
}

/* Sanitize filename for browser */
function sanitizeFilename(name){
  return name.replace(/[\/\\?%*:|"<>]/g, '-').trim();
}

/* success tone */
function playSuccessTone(){
  if(!soundEnabled) return;
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = 660;
    g.gain.value = 0.02;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    setTimeout(()=>{o.frequency.value=880;}, 140);
    setTimeout(()=>{o.stop();ctx.close();}, 480);
  }catch(e){}
}

/* ======================
   COPY LINK & HISTORY
   ====================== */
async function copyLink(){
  const val = mediaLinkInput.value.trim();
  if(!val){
    showToast('No link to copy');
    return;
  }
  try{
    await navigator.clipboard.writeText(val);
    showToast('Link copied to clipboard');
  }catch(e){
    showToast('Clipboard not available');
  }
}

/* Keep a simple history in-memory (extend to localStorage if desired) */
function addHistoryEntry(item){
  const div = document.createElement('div');
  div.className = 'history-item glass';
  div.style.padding = '10px';
  div.style.display = 'flex';
  div.style.justifyContent = 'space-between';
  div.style.alignItems = 'center';
  div.innerHTML = `<div style="max-width:70%">
    <div style="font-weight:700">${item.title}</div>
    <div class="muted small">${item.platform} • ${item.quality} • ${item.format.toUpperCase()} • ${item.sizeMB} MB</div>
  </div><div class="muted small">${item.time}</div>`;
  if(historyList.textContent.trim() === 'No downloads yet.') historyList.textContent = '';
  historyList.prepend(div);
}

/* ======================
   BACKGROUND PARTICLES
   ====================== */
function setupBackgroundCanvas(){
  if(!bgCtx) return;
  const canvas = bgCanvas;
  let w = canvas.width = innerWidth;
  let h = canvas.height = innerHeight;
  const particles = [];
  const num = Math.round((w*h) / 60000);

  for(let i=0;i<num;i++){
    particles.push({
      x: Math.random()*w,
      y: Math.random()*h,
      r: 0.6 + Math.random()*2.6,
      vx: (Math.random()*2-1)*0.2,
      vy: (Math.random()*2-1)*0.2,
      alpha: 0.08 + Math.random()*0.12
    });
  }

  function resize(){
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
  }
  addEventListener('resize', resize);

  function draw(){
    bgCtx.clearRect(0,0,w,h);
    // subtle gradient overlay for parallax feel
    const g = bgCtx.createLinearGradient(0,0,w,h);
    g.addColorStop(0,'rgba(7,19,41,0.06)');
    g.addColorStop(1,'rgba(2,6,23,0.06)');
    bgCtx.fillStyle = g;
    bgCtx.fillRect(0,0,w,h);

    particles.forEach(p=>{
      p.x += p.vx;
      p.y += p.vy;
      if(p.x < -50) p.x = w + 50;
      if(p.x > w + 50) p.x = -50;
      if(p.y < -50) p.y = h + 50;
      if(p.y > h + 50) p.y = -50;
      bgCtx.beginPath();
      bgCtx.fillStyle = `rgba(124,92,250,${p.alpha})`;
      bgCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      bgCtx.fill();
    });

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);

  // Parallax mouse effect
  document.addEventListener('mousemove', (e)=>{
    const centerX = w/2, centerY = h/2;
    const dx = (e.clientX - centerX) * 0.0004;
    const dy = (e.clientY - centerY) * 0.0004;
    particles.forEach((p,i)=>{ p.x += dx*(i%3?1:-1); p.y += dy*(i%2?1:-1); });
  });
}

/* ======================
   UTIL: Toaster
   ====================== */
let toastTimer = null;
function showToast(message, timeout = 1600, success=false){
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.classList.remove('hidden');
  toast.style.background = success ? 'linear-gradient(90deg,#28c76f,#00d68f)' : 'rgba(0,0,0,0.7)';
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> {
    toast.style.opacity = '0';
    setTimeout(()=>toast.classList.add('hidden'), 350);
  }, timeout);
}

/* ======================
   SMALL UTIL: WAV conversion done earlier
   ====================== */

/* EOF */

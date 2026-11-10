/**
 * LumenFrame — Lightroom-Style Still Photo & Footage Editor
 * Native JavaScript + HTML5 Canvas 2D Non-Destructive Pipeline
 */

(() => {
  'use strict';

  // ==================== DEFAULT STATE ====================
  const DEFAULT_HSL = {
    red:    { h: 0, s: 0, l: 0 },
    orange: { h: 0, s: 0, l: 0 },
    yellow: { h: 0, s: 0, l: 0 },
    green:  { h: 0, s: 0, l: 0 },
    blue:   { h: 0, s: 0, l: 0 },
    purple: { h: 0, s: 0, l: 0 }
  };

  // 5-Point Tone Curve (normalized 0..1 x and y): Black, Shadow, Midtone, Highlight, White
  const CURVE_PRESETS = {
    'linear':  [0.0,  0.25, 0.50, 0.75, 1.0],
    's-curve': [0.0,  0.19, 0.50, 0.81, 1.0],
    'punchy':  [0.0,  0.14, 0.52, 0.86, 1.0],
    'matte':   [0.10, 0.26, 0.50, 0.77, 0.94],
    'bright':  [0.0,  0.32, 0.58, 0.82, 1.0]
  };

  const DEFAULT_PARAMS = {
    preset: 'none',
    // Light (Lightroom 6-slider stack)
    exposure: 0,        // -100 to 100
    contrast: 0,        // -100 to 100
    highlights: 0,      // -100 to 100
    shadows: 0,         // -100 to 100
    whites: 0,          // -100 to 100
    blacks: 0,          // -100 to 100
    // Color & WB
    temperature: 0,     // -100 to 100
    tint: 0,            // -100 to 100
    vibrance: 0,        // -100 to 100
    saturation: 0,      // -100 to 100
    // Presence & Detail
    clarity: 0,         // -100 to 100
    dehaze: 0,          // -100 to 100
    sharpen: 0,         // 0 to 100
    // Tone Curve (5 Y-values at X = [0, 0.25, 0.5, 0.75, 1.0])
    curvePreset: 'linear',
    curvePoints: [...CURVE_PRESETS['linear']],
    // 6-Color HSL Mixer
    hsl: structuredClone(DEFAULT_HSL),
    // Split Toning & Vintage
    shadowColor: '#1b4d6e',
    shadowTintStrength: 0,    // 0 to 100
    highlightColor: '#f4a261',
    highlightTintStrength: 0, // 0 to 100
    fade: 0,                  // 0 to 100
    sepia: 0,                 // 0 to 100
    hue: 0,                   // -180 to 180
    // Blur & Optics
    blurMode: 'gaussian',     // 'gaussian' | 'radial' | 'tiltshift'
    blur: 0,                  // 0 to 50 px
    focusX: 0.5,              // 0..1
    focusY: 0.5,              // 0..1
    focusSize: 35,            // 5 to 85 %
    focusFeather: 35,         // 5 to 80 %
    focusAngle: 0,            // -90 to 90 deg
    vignette: 0,              // -100 to 100
    vignetteFeather: 55,      // 10 to 95 %
    grain: 0,                 // 0 to 100 %
    // Geometry & Crop
    straighten: 0,            // -45 to 45 deg
    rotation: 0,              // 0, 90, 180, 270
    flipH: false,
    flipV: false,
    crop: { x: 0, y: 0, w: 1, h: 1 }
  };

  // Beginner-Friendly 1-Click Presets
  const PRESETS = {
    'none': {
      exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
      temperature: 0, tint: 0, vibrance: 0, saturation: 0,
      clarity: 0, dehaze: 0, fade: 0, sepia: 0, hue: 0,
      curvePreset: 'linear', curvePoints: [...CURVE_PRESETS['linear']],
      shadowColor: '#1b4d6e', shadowTintStrength: 0,
      highlightColor: '#f4a261', highlightTintStrength: 0
    },
    'vivid-pop': {
      exposure: 6, contrast: 14, highlights: -22, shadows: 26, whites: 14, blacks: -12,
      temperature: 6, tint: 0, vibrance: 36, saturation: 8,
      clarity: 24, dehaze: 18, fade: 0, sepia: 0, hue: 0,
      curvePreset: 's-curve', curvePoints: [...CURVE_PRESETS['s-curve']],
      shadowColor: '#1b4d6e', shadowTintStrength: 0,
      highlightColor: '#f4a261', highlightTintStrength: 0
    },
    'soft-portrait': {
      exposure: 8, contrast: -8, highlights: -18, shadows: 22, whites: 8, blacks: 6,
      temperature: 14, tint: 6, vibrance: 16, saturation: -4,
      clarity: -18, dehaze: 0, fade: 6, sepia: 4, hue: 0,
      curvePreset: 'bright', curvePoints: [...CURVE_PRESETS['bright']],
      shadowColor: '#3b2820', shadowTintStrength: 14,
      highlightColor: '#fde68a', highlightTintStrength: 18
    },
    'teal-orange': {
      exposure: 4, contrast: 18, highlights: -16, shadows: 14, whites: 10, blacks: -10,
      temperature: -6, tint: -4, vibrance: 25, saturation: 6,
      clarity: 16, dehaze: 10, fade: 6, sepia: 0, hue: 0,
      curvePreset: 's-curve', curvePoints: [...CURVE_PRESETS['s-curve']],
      shadowColor: '#0d5c75', shadowTintStrength: 45,
      highlightColor: '#f59e0b', highlightTintStrength: 42
    },
    'kodak-warm': {
      exposure: 6, contrast: 12, highlights: -14, shadows: 18, whites: 6, blacks: -6,
      temperature: 26, tint: 8, vibrance: 18, saturation: 8,
      clarity: 8, dehaze: 6, fade: 12, sepia: 12, hue: -2,
      curvePreset: 's-curve', curvePoints: [...CURVE_PRESETS['s-curve']],
      shadowColor: '#3b2314', shadowTintStrength: 24,
      highlightColor: '#fde047', highlightTintStrength: 30
    },
    'faded-matte': {
      exposure: 5, contrast: -12, highlights: -24, shadows: 28, whites: -8, blacks: 22,
      temperature: 12, tint: 4, vibrance: 12, saturation: -16,
      clarity: -6, dehaze: -8, fade: 32, sepia: 10, hue: 0,
      curvePreset: 'matte', curvePoints: [...CURVE_PRESETS['matte']],
      shadowColor: '#2d2a32', shadowTintStrength: 26,
      highlightColor: '#e6ccb2', highlightTintStrength: 22
    },
    'noir': {
      exposure: 4, contrast: 32, highlights: 10, shadows: -18, whites: 18, blacks: -22,
      temperature: 0, tint: 0, vibrance: 0, saturation: -100,
      clarity: 28, dehaze: 16, fade: 8, sepia: 4, hue: 0,
      curvePreset: 'punchy', curvePoints: [...CURVE_PRESETS['punchy']],
      shadowColor: '#09090b', shadowTintStrength: 18,
      highlightColor: '#e4e4e7', highlightTintStrength: 15
    },
    'cyberpunk': {
      exposure: 2, contrast: 22, highlights: 8, shadows: 12, whites: 14, blacks: -14,
      temperature: -22, tint: 36, vibrance: 38, saturation: 22,
      clarity: 20, dehaze: 15, fade: 4, sepia: 0, hue: -8,
      curvePreset: 's-curve', curvePoints: [...CURVE_PRESETS['s-curve']],
      shadowColor: '#1e1b4b', shadowTintStrength: 52,
      highlightColor: '#ec4899', highlightTintStrength: 48
    }
  };

  const HSL_LABELS = {
    red: 'Reds',
    orange: 'Oranges & Skin Tones',
    yellow: 'Yellows',
    green: 'Greens & Foliage',
    blue: 'Blues, Sky & Water',
    purple: 'Purples & Magentas'
  };

  // Center hue angles (0..360) for the 6 HSL color bands
  const HSL_CENTERS = {
    red: 0,
    orange: 30,
    yellow: 60,
    green: 120,
    blue: 215,
    purple: 295
  };

  // ==================== APPLICATION STATE ====================
  let sourceImage = null;
  let state = structuredClone(DEFAULT_PARAMS);
  let history = [];
  let historyIndex = -1;
  const MAX_HISTORY = 35;

  let activeTab = 'adjust';
  let activeHslColor = 'red';
  let isComparing = false;
  let splitCompareEnabled = false;
  let splitPosition = 0.5; // 0..1 across canvas
  let zoomMode = 'fit';
  let renderPending = false;

  // Interactive Crop Draft Box
  let cropDraft = { x: 0, y: 0, w: 1, h: 1 };
  let cropAspect = 'free';
  let cropDragState = null;

  // Offscreen Buffers
  const orientedCanvas = document.createElement('canvas');
  const ungradedCropCanvas = document.createElement('canvas');
  const sharpCanvas = document.createElement('canvas');
  const blurCanvas = document.createElement('canvas');
  const maskCanvas = document.createElement('canvas');
  const grainTileCanvas = document.createElement('canvas');

  // Last computed histogram bins (shared with Tone Curve background)
  let lastLumaBins = new Uint32Array(256);

  // ==================== DOM ELEMENTS ====================
  const editorCanvas = document.getElementById('editor-canvas');
  const ctx = editorCanvas.getContext('2d', { willReadFrequently: true });
  const histCanvas = document.getElementById('histogram-canvas');
  const histCtx = histCanvas.getContext('2d');
  const curveCanvas = document.getElementById('curve-canvas');
  const curveCtx = curveCanvas.getContext('2d');
  const canvasStage = document.getElementById('canvas-stage');

  const splitOverlay = document.getElementById('split-overlay');
  const splitLine = document.getElementById('split-line');
  const straightenGrid = document.getElementById('straighten-grid');
  const cropOverlay = document.getElementById('crop-overlay');
  const cropBoxEl = document.getElementById('crop-box');
  const cropReadoutEl = document.getElementById('crop-readout');
  const focusIndicator = document.getElementById('focus-indicator');
  const compareBadge = document.getElementById('compare-badge');
  const dimLabel = document.getElementById('image-dimensions');
  const lumaLabel = document.getElementById('luma-avg');
  const zoomReadout = document.getElementById('zoom-readout');

  // Pre-generate seamless 35mm film grain tile
  function initGrainTile() {
    grainTileCanvas.width = 256;
    grainTileCanvas.height = 256;
    const gCtx = grainTileCanvas.getContext('2d');
    const imgData = gCtx.createImageData(256, 256);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = ((Math.random() + Math.random() + Math.random()) / 3) * 255;
      data[i] = n;
      data[i + 1] = n;
      data[i + 2] = n;
      data[i + 3] = 255;
    }
    gCtx.putImageData(imgData, 0, 0);
  }

  // ==================== PROCEDURAL SAMPLE LANDSCAPE PHOTO ====================
  function createSampleFrame() {
    const w = 1280;
    const h = 800;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');

    // Dusk sky gradient with rich blues, oranges, and yellows for HSL & Highlight testing
    const sky = g.createLinearGradient(0, 0, 0, h * 0.68);
    sky.addColorStop(0, '#0f172a');
    sky.addColorStop(0.28, '#1d4ed8');
    sky.addColorStop(0.58, '#ea580c');
    sky.addColorStop(0.84, '#f59e0b');
    sky.addColorStop(1, '#fef08a');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);

    // Sun glow
    const sunX = w * 0.64;
    const sunY = h * 0.46;
    const sunGlow = g.createRadialGradient(sunX, sunY, 15, sunX, sunY, 340);
    sunGlow.addColorStop(0, 'rgba(255, 252, 230, 1)');
    sunGlow.addColorStop(0.28, 'rgba(251, 146, 60, 0.75)');
    sunGlow.addColorStop(0.65, 'rgba(234, 88, 12, 0.2)');
    sunGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
    g.fillStyle = sunGlow;
    g.fillRect(0, 0, w, h);

    // Sun disc
    g.fillStyle = '#fffbeb';
    g.beginPath();
    g.arc(sunX, sunY, 50, 0, Math.PI * 2);
    g.fill();

    // Layered mountain ridges
    const ridges = [
      { yBase: 0.55, amp: 85, seed: 1.2, color: '#334155' },
      { yBase: 0.62, amp: 62, seed: 2.7, color: '#1e293b' },
      { yBase: 0.69, amp: 44, seed: 4.4, color: '#14532d' } // Lush green ridge for green HSL test
    ];

    ridges.forEach((r) => {
      g.fillStyle = r.color;
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 14) {
        const y =
          h * r.yBase -
          Math.sin(x * 0.0038 + r.seed) * r.amp -
          Math.cos(x * 0.012 - r.seed) * (r.amp * 0.38) -
          Math.sin(x * 0.028 + r.seed * 2) * 12;
        g.lineTo(x, y);
      }
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    });

    // Lake reflection in foreground
    const lakeTop = h * 0.72;
    const waterGrad = g.createLinearGradient(0, lakeTop, 0, h);
    waterGrad.addColorStop(0, '#431407');
    waterGrad.addColorStop(0.28, '#1e3a8a');
    waterGrad.addColorStop(1, '#090d16');
    g.fillStyle = waterGrad;
    g.fillRect(0, lakeTop, w, h - lakeTop);

    // Shimmering sun reflection ripples on water
    for (let i = 0; i < 80; i++) {
      const t = i / 80;
      const ry = lakeTop + t * (h - lakeTop);
      const spread = 40 + t * 220;
      const rw = 24 + Math.sin(i * 3.1) * 18 + t * 80;
      const rx = sunX + Math.sin(i * 7.3) * spread * 0.35 - rw / 2;
      g.fillStyle = `rgba(253, 186, 116, ${0.48 * (1 - t * 0.65)})`;
      g.fillRect(rx, ry, rw, 2 + t * 2.2);
    }

    // Evergreen pine trees on left shore
    for (let tx = 36; tx < 390; tx += 26) {
      const treeH = 82 + ((tx * 37) % 100);
      const baseY = h * 0.75 + ((tx * 13) % 26);
      g.fillStyle = tx % 52 === 0 ? '#166534' : '#064e3b';
      g.beginPath();
      g.moveTo(tx, baseY - treeH);
      g.lineTo(tx - 20, baseY);
      g.lineTo(tx + 20, baseY);
      g.closePath();
      g.fill();
    }

    // Lighthouse peninsula & tower on right
    g.fillStyle = '#0f172a';
    g.beginPath();
    g.moveTo(w * 0.72, lakeTop + 16);
    g.lineTo(w, lakeTop - 8);
    g.lineTo(w, lakeTop + 42);
    g.closePath();
    g.fill();

    const lx = w * 0.85;
    const ly = lakeTop + 4;
    g.fillStyle = '#f8fafc';
    g.beginPath();
    g.moveTo(lx - 13, ly);
    g.lineTo(lx - 8, ly - 120);
    g.lineTo(lx + 8, ly - 120);
    g.lineTo(lx + 13, ly);
    g.closePath();
    g.fill();

    // Vivid red lighthouse band
    g.fillStyle = '#dc2626';
    g.fillRect(lx - 10, ly - 76, 20, 32);

    // Lantern room
    g.fillStyle = '#fef08a';
    g.fillRect(lx - 7, ly - 133, 14, 13);

    const img = new Image();
    img.onload = () => loadNewSourceImage(img);
    img.src = c.toDataURL('image/png');
  }

  // ==================== HISTORY MANAGEMENT ====================
  function pushHistory() {
    if (historyIndex < history.length - 1) {
      history = history.slice(0, historyIndex + 1);
    }
    history.push(structuredClone(state));
    if (history.length > MAX_HISTORY) {
      history.shift();
    } else {
      historyIndex++;
    }
    updateHistoryButtons();
  }

  function undo() {
    if (historyIndex > 0) {
      historyIndex--;
      state = structuredClone(history[historyIndex]);
      syncUIFromState();
      requestRender();
      updateHistoryButtons();
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      historyIndex++;
      state = structuredClone(history[historyIndex]);
      syncUIFromState();
      requestRender();
      updateHistoryButtons();
    }
  }

  function updateHistoryButtons() {
    document.getElementById('btn-undo').disabled = historyIndex <= 0;
    document.getElementById('btn-redo').disabled = historyIndex >= history.length - 1;
  }

  // ==================== IMAGE LOADING ====================
  function loadNewSourceImage(img) {
    sourceImage = img;
    state = structuredClone(DEFAULT_PARAMS);
    history = [];
    historyIndex = -1;
    pushHistory();
    cropDraft = { ...state.crop };
    syncUIFromState();
    zoomMode = 'fit';
    requestRender();
    requestAnimationFrame(() => updateViewportZoom());
  }

  function handleFileSelect(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => loadNewSourceImage(img);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ==================== SMART 1-CLICK AUTO ENHANCE ====================
  function runAutoEnhance() {
    if (!sourceImage) return;

    // Sample the raw source image luminance & saturation distribution
    const tempC = document.createElement('canvas');
    const sw = 160;
    const sh = 120;
    tempC.width = sw;
    tempC.height = sh;
    const tCtx = tempC.getContext('2d');
    tCtx.drawImage(sourceImage, 0, 0, sw, sh);
    const data = tCtx.getImageData(0, 0, sw, sh).data;

    const lumaHist = new Uint32Array(256);
    let sumLuma = 0;
    let sumSat = 0;
    const totalPixels = sw * sh;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      lumaHist[luma]++;
      sumLuma += luma;

      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const sat = maxC === 0 ? 0 : (maxC - minC) / maxC;
      sumSat += sat;
    }

    const avgLuma = sumLuma / totalPixels; // 0..255
    const avgSat = sumSat / totalPixels;   // 0..1

    // Find 2% black percentile and 98% white percentile
    let cum = 0;
    let p2 = 0;
    let p98 = 255;
    for (let i = 0; i < 256; i++) {
      cum += lumaHist[i];
      if (cum <= totalPixels * 0.02) p2 = i;
      if (cum <= totalPixels * 0.98) p98 = i;
    }

    // Calculate balanced Lightroom parameters
    const targetLuma = 126;
    const expSuggest = Math.round(clamp((targetLuma - avgLuma) * 0.45, -35, 38));
    const dynRange = Math.max(10, p98 - p2);
    const contrastSuggest = Math.round(clamp((215 - dynRange) * 0.25, 8, 28));
    const whitesSuggest = Math.round(clamp((242 - p98) * 0.45, 0, 26));
    const blacksSuggest = Math.round(clamp((12 - p2) * 0.45, -24, 0));
    const highlightsSuggest = p98 > 235 ? -24 : -12;
    const shadowsSuggest = avgLuma < 135 ? 28 : 18;
    const vibranceSuggest = Math.round(clamp((0.48 - avgSat) * 75, 14, 34));

    state.preset = 'custom';
    state.exposure = expSuggest;
    state.contrast = contrastSuggest;
    state.highlights = highlightsSuggest;
    state.shadows = shadowsSuggest;
    state.whites = whitesSuggest;
    state.blacks = blacksSuggest;
    state.vibrance = vibranceSuggest;
    state.clarity = 16;
    state.dehaze = 10;
    state.sharpen = 18;
    state.curvePreset = 's-curve';
    state.curvePoints = [...CURVE_PRESETS['s-curve']];

    syncUIFromState();
    pushHistory();
    requestRender();
  }

  // ==================== TONE CURVE SPLINE LUT BUILDER ====================
  function buildToneCurveLUT(p) {
    const lut = new Uint8ClampedArray(256);
    const pts = p.curvePoints || CURVE_PRESETS['linear'];
    const xs = [0, 64, 128, 192, 255];
    const ys = pts.map((v) => v * 255);

    // Monotone piecewise cubic Hermite interpolation across the 5 control points
    const n = 5;
    const dx = [];
    const dy = [];
    const m = [];
    for (let i = 0; i < n - 1; i++) {
      dx[i] = xs[i + 1] - xs[i];
      dy[i] = ys[i + 1] - ys[i];
      m[i] = dy[i] / dx[i];
    }

    const tangents = new Array(n);
    tangents[0] = m[0];
    tangents[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (m[i - 1] * m[i] <= 0) {
        tangents[i] = 0;
      } else {
        tangents[i] = (m[i - 1] + m[i]) * 0.5;
      }
    }

    // Factor in Lightroom Whites, Blacks, Shadows, Highlights, Dehaze into the 256-entry LUT
    const blacksShift = p.blacks * 0.45;
    const whitesShift = p.whites * 0.45;
    const shadowsLift = p.shadows * 0.55;
    const highlightsComp = p.highlights * 0.55;
    const dehazeFactor = p.dehaze * 0.35;

    for (let x = 0; x < 256; x++) {
      // Find segment
      let seg = 0;
      while (seg < n - 2 && x > xs[seg + 1]) seg++;
      const h = dx[seg];
      const t = (x - xs[seg]) / h;
      const t2 = t * t;
      const t3 = t2 * t;

      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      let y = h00 * ys[seg] + h10 * h * tangents[seg] + h01 * ys[seg + 1] + h11 * h * tangents[seg + 1];

      // Normalize 0..1 for tonal region weights
      const norm = y / 255;

      // Shadows weight (peaks in dark-mid tones)
      const shadowW = Math.pow(1 - norm, 1.8) * norm * 2.6;
      y += shadowsLift * shadowW;

      // Highlights weight (peaks in upper tones)
      const highW = Math.pow(norm, 1.8) * (1 - norm) * 2.6;
      y += highlightsComp * highW;

      // Blacks & Whites endpoints
      const blackW = Math.pow(1 - norm, 2.6);
      const whiteW = Math.pow(norm, 2.6);
      y += blacksShift * blackW + whitesShift * whiteW;

      // Dehaze darkens hazy shadows/midtones and expands dynamic range
      if (dehazeFactor !== 0) {
        y -= dehazeFactor * Math.pow(1 - norm, 1.3) * 0.65;
      }

      lut[x] = clamp(Math.round(y), 0, 255);
    }

    return lut;
  }

  // ==================== PIXEL-LEVEL LIGHTROOM ENGINE (CURVE, VIBRANCE, HSL, CLARITY, SHARPEN) ====================
  function needsPixelPass(p) {
    if (p.whites !== 0 || p.blacks !== 0 || p.shadows !== 0 || p.highlights !== 0) return true;
    if (p.vibrance !== 0 || p.dehaze !== 0 || p.clarity !== 0 || p.sharpen > 0) return true;
    for (let i = 0; i < 5; i++) {
      if (Math.abs(p.curvePoints[i] - CURVE_PRESETS['linear'][i]) > 0.005) return true;
    }
    for (const key of Object.keys(p.hsl)) {
      const band = p.hsl[key];
      if (band.h !== 0 || band.s !== 0 || band.l !== 0) return true;
    }
    return false;
  }

  function hasActiveHSL(hsl) {
    for (const key of Object.keys(hsl)) {
      const b = hsl[key];
      if (b.h !== 0 || b.s !== 0 || b.l !== 0) return true;
    }
    return false;
  }

  function applyLightroomPixelPass(sCtx, w, h, p) {
    if (!needsPixelPass(p)) return;

    const imgData = sCtx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const lut = buildToneCurveLUT(p);
    const useHsl = hasActiveHSL(p.hsl);
    const vibAmt = (p.vibrance + p.dehaze * 0.35) / 100;
    const clarityMidContrast = p.clarity / 100;

    for (let i = 0; i < data.length; i += 4) {
      // 1. Apply Tone Curve + Shadows/Highlights/Whites/Blacks LUT
      let r = lut[data[i]];
      let g = lut[data[i + 1]];
      let b = lut[data[i + 2]];

      // 2. Midtone Clarity S-contrast boost
      if (clarityMidContrast !== 0) {
        const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        const midDelta = (luma - 0.5) * Math.exp(-Math.pow((luma - 0.5) * 3.2, 2));
        const boost = 1 + clarityMidContrast * midDelta * 1.15;
        r = clamp(r * boost, 0, 255);
        g = clamp(g * boost, 0, 255);
        b = clamp(b * boost, 0, 255);
      }

      // 3. Smart Vibrance (boosts muted colors more than already saturated ones)
      if (vibAmt !== 0) {
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const sat = (maxC - minC) / 255;
        const avg = (r + g + b) * 0.333333;
        const scale = 1 + vibAmt * (1 - sat * sat) * 1.15;
        r = clamp(avg + (r - avg) * scale, 0, 255);
        g = clamp(avg + (g - avg) * scale, 0, 255);
        b = clamp(avg + (b - avg) * scale, 0, 255);
      }

      // 4. 6-Band Targeted HSL Color Mixer
      if (useHsl) {
        const max = Math.max(r, g, b) / 255;
        const min = Math.min(r, g, b) / 255;
        const d = max - min;

        if (d > 0.03) {
          let l = (max + min) * 0.5;
          let s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          let hue = 0;
          const rn = r / 255, gn = g / 255, bn = b / 255;
          if (max === rn) hue = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
          else if (max === gn) hue = ((bn - rn) / d + 2) * 60;
          else hue = ((rn - gn) / d + 4) * 60;

          let dHue = 0, dSat = 0, dLum = 0;
          for (const [colorName, centerDeg] of Object.entries(HSL_CENTERS)) {
            const band = p.hsl[colorName];
            if (band.h === 0 && band.s === 0 && band.l === 0) continue;
            let dist = Math.abs(hue - centerDeg);
            if (dist > 180) dist = 360 - dist;
            const radius = colorName === 'green' || colorName === 'blue' ? 68 : 44;
            if (dist < radius) {
              const weight = 0.5 * (1 + Math.cos((dist / radius) * Math.PI));
              dHue += band.h * 0.38 * weight;
              dSat += (band.s / 100) * weight;
              dLum += (band.l / 100) * 0.35 * weight;
            }
          }

          if (dHue !== 0 || dSat !== 0 || dLum !== 0) {
            hue = (hue + dHue + 360) % 360;
            s = clamp(s * (1 + dSat), 0, 1);
            l = clamp(l + dLum * s, 0, 1);
            const rgbOut = hslToRgb(hue, s, l);
            r = rgbOut.r;
            g = rgbOut.g;
            b = rgbOut.b;
          }
        }
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }

    // 5. Unsharp / Convolution Sharpening + Clarity Local Contrast
    if (p.sharpen > 0 || Math.abs(p.clarity) > 8) {
      applyFastUnsharp(data, w, h, p.sharpen / 100, p.clarity / 100);
    }

    sCtx.putImageData(imgData, 0, 0);
  }

  /**
   * Fast 5-tap cross unsharp mask for crisp edge detail and local clarity
   */
  function applyFastUnsharp(data, w, h, sharpenStrength, clarityStrength) {
    const copy = new Uint8ClampedArray(data);
    const amount = sharpenStrength * 1.35 + Math.max(0, clarityStrength * 0.45);
    if (amount <= 0.02) return;

    const stride = w * 4;
    for (let y = 1; y < h - 1; y++) {
      let idx = (y * w + 1) * 4;
      for (let x = 1; x < w - 1; x++, idx += 4) {
        for (let c = 0; c < 3; c++) {
          const center = copy[idx + c];
          const neighbors =
            (copy[idx - 4 + c] +
              copy[idx + 4 + c] +
              copy[idx - stride + c] +
              copy[idx + stride + c]) *
            0.25;
          const diff = center - neighbors;
          // Threshold tiny noise differences < 2 levels
          if (Math.abs(diff) > 2) {
            data[idx + c] = clamp(center + diff * amount, 0, 255);
          }
        }
      }
    }
  }

  // ==================== CORE RENDERING PIPELINE ====================
  function requestRender() {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      renderFrame();
    });
  }

  function renderFrame() {
    if (!sourceImage) return;

    const p = isComparing ? DEFAULT_PARAMS : state;

    // 1. Prepare oriented source (90° rotation + flip + fine straighten angle with auto-zoom)
    const rot90 = ((state.rotation % 360) + 360) % 360;
    const swapDims = rot90 === 90 || rot90 === 270;
    const srcW = sourceImage.naturalWidth || sourceImage.width;
    const srcH = sourceImage.naturalHeight || sourceImage.height;
    const orientW = swapDims ? srcH : srcW;
    const orientH = swapDims ? srcW : srcH;

    orientedCanvas.width = orientW;
    orientedCanvas.height = orientH;
    const oCtx = orientedCanvas.getContext('2d');
    oCtx.save();
    oCtx.translate(orientW / 2, orientH / 2);

    // Fine horizon straighten zoom factor so corners never show blank triangles
    const fineRad = (Math.abs(state.straighten) * Math.PI) / 180;
    let straightenZoom = 1;
    if (fineRad > 0.001) {
      const aspect = orientW / orientH;
      const scaleW = Math.cos(fineRad) + Math.sin(fineRad) / aspect;
      const scaleH = Math.cos(fineRad) + Math.sin(fineRad) * aspect;
      straightenZoom = Math.max(scaleW, scaleH);
    }

    oCtx.rotate(((rot90 + state.straighten) * Math.PI) / 180);
    oCtx.scale(
      (state.flipH ? -1 : 1) * straightenZoom,
      (state.flipV ? -1 : 1) * straightenZoom
    );
    oCtx.drawImage(sourceImage, -srcW / 2, -srcH / 2, srcW, srcH);
    oCtx.restore();

    // 2. Determine active crop region
    const activeCrop = activeTab === 'crop' ? { x: 0, y: 0, w: 1, h: 1 } : state.crop;
    const cropX = Math.round(activeCrop.x * orientW);
    const cropY = Math.round(activeCrop.y * orientH);
    const outW = Math.max(1, Math.round(activeCrop.w * orientW));
    const outH = Math.max(1, Math.round(activeCrop.h * orientH));

    if (editorCanvas.width !== outW || editorCanvas.height !== outH) {
      editorCanvas.width = outW;
      editorCanvas.height = outH;
      updateViewportZoom();
    }

    dimLabel.textContent = `${outW} × ${outH} px`;

    // Cache ungraded cropped base for Split Before/After mode
    if (splitCompareEnabled) {
      ungradedCropCanvas.width = outW;
      ungradedCropCanvas.height = outH;
      ungradedCropCanvas.getContext('2d').drawImage(orientedCanvas, cropX, cropY, outW, outH, 0, 0, outW, outH);
    }

    // 3. Hardware-accelerated primary filter pass onto sharpCanvas
    sharpCanvas.width = outW;
    sharpCanvas.height = outH;
    const sCtx = sharpCanvas.getContext('2d', { willReadFrequently: true });

    const brightness = Math.max(5, 100 + p.exposure * 0.65);
    const contrast = Math.max(10, 100 + p.contrast * 0.72 + p.dehaze * 0.25 - p.fade * 0.22);
    const saturate = Math.max(0, 100 + p.saturation);
    const sepia = Math.max(0, p.sepia);
    const hue = p.hue;

    sCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;
    sCtx.drawImage(orientedCanvas, cropX, cropY, outW, outH, 0, 0, outW, outH);
    sCtx.filter = 'none';

    // 4. Pixel-level Lightroom Pass (Tone Curve, Whites/Blacks/Highlights/Shadows, Vibrance, HSL, Clarity, Sharpen)
    applyLightroomPixelPass(sCtx, outW, outH, p);

    // 5. Composite Overlays (Temperature, Tint, Split Toning, Matte Fade, Clarity Soft Glow)
    applyColorGradingOverlays(sCtx, outW, outH, p);

    // 6. Blur Engine (Uniform Gaussian, Portrait Radial Focus, or Linear Tilt-Shift)
    ctx.clearRect(0, 0, outW, outH);

    if (p.blur <= 0.1) {
      ctx.drawImage(sharpCanvas, 0, 0);
    } else if (p.blurMode === 'gaussian') {
      ctx.save();
      ctx.filter = `blur(${p.blur}px)`;
      ctx.drawImage(sharpCanvas, 0, 0);
      ctx.restore();
    } else {
      blurCanvas.width = outW;
      blurCanvas.height = outH;
      const bCtx = blurCanvas.getContext('2d');
      bCtx.drawImage(sharpCanvas, 0, 0);
      bCtx.filter = `blur(${p.blur}px)`;
      bCtx.drawImage(sharpCanvas, 0, 0);
      bCtx.filter = 'none';

      ctx.drawImage(blurCanvas, 0, 0);

      maskCanvas.width = outW;
      maskCanvas.height = outH;
      const mCtx = maskCanvas.getContext('2d');
      mCtx.drawImage(sharpCanvas, 0, 0);
      mCtx.globalCompositeOperation = 'destination-in';

      const fx = p.focusX * outW;
      const fy = p.focusY * outH;
      const maxDim = Math.hypot(outW, outH);
      const innerR = (p.focusSize / 100) * (maxDim * 0.45);
      const outerR = innerR + (p.focusFeather / 100) * (maxDim * 0.45);

      if (p.blurMode === 'radial') {
        const radGrad = mCtx.createRadialGradient(fx, fy, innerR * 0.25, fx, fy, outerR);
        radGrad.addColorStop(0, 'rgba(0,0,0,1)');
        radGrad.addColorStop(Math.min(0.95, innerR / Math.max(1, outerR)), 'rgba(0,0,0,1)');
        radGrad.addColorStop(1, 'rgba(0,0,0,0)');
        mCtx.fillStyle = radGrad;
        mCtx.fillRect(0, 0, outW, outH);
      } else if (p.blurMode === 'tiltshift') {
        const angleRad = ((p.focusAngle + 90) * Math.PI) / 180;
        const dx = Math.cos(angleRad) * outerR;
        const dy = Math.sin(angleRad) * outerR;
        const linGrad = mCtx.createLinearGradient(fx - dx, fy - dy, fx + dx, fy + dy);
        const bandFrac = Math.min(0.48, (innerR / Math.max(1, outerR)) * 0.5);
        linGrad.addColorStop(0, 'rgba(0,0,0,0)');
        linGrad.addColorStop(0.5 - bandFrac, 'rgba(0,0,0,1)');
        linGrad.addColorStop(0.5 + bandFrac, 'rgba(0,0,0,1)');
        linGrad.addColorStop(1, 'rgba(0,0,0,0)');
        mCtx.fillStyle = linGrad;
        mCtx.fillRect(0, 0, outW, outH);
      }

      mCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(maskCanvas, 0, 0);
    }

    // 7. Optical Vignette & 35mm Film Grain
    applyVignetteAndGrain(ctx, outW, outH, p);

    // 8. If Split Before/After Wipe is enabled, draw Original on the left side of the split bar
    if (splitCompareEnabled && !isComparing) {
      const splitPx = Math.round(splitPosition * outW);
      if (splitPx > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitPx, outH);
        ctx.clip();
        ctx.drawImage(ungradedCropCanvas, 0, 0);
        ctx.restore();
      }
    }

    // 9. Update Histogram, Tone Curve Canvas, and Overlays
    updateHistogram();
    drawToneCurveWidget();
    updateCropOverlayGeometry();
    updateFocusIndicatorGeometry();
    updateSplitOverlayGeometry();
  }

  function applyColorGradingOverlays(sCtx, w, h, p) {
    sCtx.save();

    // White Balance: Temperature (Blue <-> Amber)
    if (p.temperature !== 0) {
      const tVal = Math.abs(p.temperature) / 100;
      sCtx.globalCompositeOperation = 'soft-light';
      sCtx.fillStyle = p.temperature > 0
        ? `rgba(255, 160, 40, ${tVal * 0.55})`
        : `rgba(45, 135, 255, ${tVal * 0.55})`;
      sCtx.fillRect(0, 0, w, h);
    }

    // White Balance: Tint (Green <-> Magenta)
    if (p.tint !== 0) {
      const tintVal = Math.abs(p.tint) / 100;
      sCtx.globalCompositeOperation = 'soft-light';
      sCtx.fillStyle = p.tint > 0
        ? `rgba(236, 72, 153, ${tintVal * 0.48})`
        : `rgba(16, 185, 129, ${tintVal * 0.48})`;
      sCtx.fillRect(0, 0, w, h);
    }

    // Split Toning
    if (p.shadowTintStrength > 0) {
      const rgb = hexToRgb(p.shadowColor);
      const alpha = (p.shadowTintStrength / 100) * 0.55;
      sCtx.globalCompositeOperation = 'lighten';
      sCtx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.5})`;
      sCtx.fillRect(0, 0, w, h);

      sCtx.globalCompositeOperation = 'soft-light';
      sCtx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      sCtx.fillRect(0, 0, w, h);
    }

    if (p.highlightTintStrength > 0) {
      const rgb = hexToRgb(p.highlightColor);
      const alpha = (p.highlightTintStrength / 100) * 0.5;
      sCtx.globalCompositeOperation = 'overlay';
      sCtx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
      sCtx.fillRect(0, 0, w, h);
    }

    // Matte Black Fade
    if (p.fade > 0) {
      const fadeAlpha = (p.fade / 100) * 0.26;
      sCtx.globalCompositeOperation = 'lighten';
      const liftVal = Math.round(28 + (p.fade / 100) * 36);
      sCtx.fillStyle = `rgb(${liftVal}, ${liftVal}, ${liftVal + 3})`;
      sCtx.globalAlpha = fadeAlpha * 2.5;
      sCtx.fillRect(0, 0, w, h);
      sCtx.globalAlpha = 1;
    }

    sCtx.restore();
  }

  function applyVignetteAndGrain(targetCtx, w, h, p) {
    targetCtx.save();

    if (p.vignette !== 0) {
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.hypot(cx, cy);
      const innerR = maxR * (1 - p.vignetteFeather / 100) * 0.85;
      const grad = targetCtx.createRadialGradient(cx, cy, innerR, cx, cy, maxR);
      const strength = (Math.abs(p.vignette) / 100) * 0.88;
      const col = p.vignette > 0 ? '255, 255, 255' : '0, 0, 0';

      grad.addColorStop(0, `rgba(${col}, 0)`);
      grad.addColorStop(1, `rgba(${col}, ${strength})`);

      targetCtx.globalCompositeOperation = p.vignette > 0 ? 'screen' : 'multiply';
      targetCtx.fillStyle = grad;
      targetCtx.fillRect(0, 0, w, h);
    }

    if (p.grain > 0) {
      const pattern = targetCtx.createPattern(grainTileCanvas, 'repeat');
      targetCtx.globalCompositeOperation = 'overlay';
      targetCtx.globalAlpha = (p.grain / 100) * 0.36;
      targetCtx.fillStyle = pattern;
      targetCtx.fillRect(0, 0, w, h);
    }

    targetCtx.restore();
  }

  // ==================== REAL-TIME RGB HISTOGRAM ====================
  function updateHistogram() {
    const w = editorCanvas.width;
    const h = editorCanvas.height;
    if (!w || !h) return;

    const stepX = Math.max(1, Math.floor(w / 120));
    const stepY = Math.max(1, Math.floor(h / 90));
    const imgData = ctx.getImageData(0, 0, w, h).data;

    const rBins = new Uint32Array(256);
    const gBins = new Uint32Array(256);
    const bBins = new Uint32Array(256);
    lastLumaBins.fill(0);
    let totalLuma = 0;
    let count = 0;

    for (let y = 0; y < h; y += stepY) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x += stepX) {
        const idx = rowOffset + x * 4;
        const r = imgData[idx];
        const g = imgData[idx + 1];
        const b = imgData[idx + 2];
        rBins[r]++;
        gBins[g]++;
        bBins[b]++;
        const l = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
        lastLumaBins[l]++;
        totalLuma += l;
        count++;
      }
    }

    const avgLuma = count > 0 ? Math.round((totalLuma / count / 255) * 100) : 0;
    lumaLabel.textContent = `Brightness: ${avgLuma}%`;

    let maxCount = 1;
    for (let i = 2; i < 254; i++) {
      if (rBins[i] > maxCount) maxCount = rBins[i];
      if (gBins[i] > maxCount) maxCount = gBins[i];
      if (bBins[i] > maxCount) maxCount = bBins[i];
    }

    const hw = histCanvas.width;
    const hh = histCanvas.height;
    histCtx.clearRect(0, 0, hw, hh);

    histCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    histCtx.lineWidth = 1;
    [0.25, 0.5, 0.75].forEach((frac) => {
      histCtx.beginPath();
      histCtx.moveTo(hw * frac, 0);
      histCtx.lineTo(hw * frac, hh);
      histCtx.stroke();
    });

    histCtx.globalCompositeOperation = 'screen';

    const channels = [
      { bins: rBins, fill: 'rgba(239, 68, 68, 0.55)', stroke: '#ef4444' },
      { bins: gBins, fill: 'rgba(34, 197, 94, 0.55)', stroke: '#22c55e' },
      { bins: bBins, fill: 'rgba(59, 130, 246, 0.55)', stroke: '#3b82f6' }
    ];

    channels.forEach((ch) => {
      histCtx.beginPath();
      histCtx.moveTo(0, hh);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * hw;
        const norm = Math.min(1, ch.bins[i] / maxCount);
        const y = hh - Math.pow(norm, 0.75) * (hh - 6);
        histCtx.lineTo(x, y);
      }
      histCtx.lineTo(hw, hh);
      histCtx.closePath();
      histCtx.fillStyle = ch.fill;
      histCtx.fill();
      histCtx.strokeStyle = ch.stroke;
      histCtx.lineWidth = 1;
      histCtx.stroke();
    });

    histCtx.globalCompositeOperation = 'source-over';
  }

  // ==================== INTERACTIVE TONE CURVE WIDGET ====================
  function drawToneCurveWidget() {
    const cw = curveCanvas.width;
    const ch = curveCanvas.height;
    const pad = 12;
    const gw = cw - pad * 2;
    const gh = ch - pad * 2;

    curveCtx.clearRect(0, 0, cw, ch);

    // 1. Draw subtle luminance histogram behind the curve
    let maxLuma = 1;
    for (let i = 2; i < 254; i++) {
      if (lastLumaBins[i] > maxLuma) maxLuma = lastLumaBins[i];
    }
    curveCtx.beginPath();
    curveCtx.moveTo(pad, pad + gh);
    for (let i = 0; i < 256; i++) {
      const x = pad + (i / 255) * gw;
      const norm = Math.min(1, lastLumaBins[i] / maxLuma);
      const y = pad + gh - Math.pow(norm, 0.75) * (gh * 0.85);
      curveCtx.lineTo(x, y);
    }
    curveCtx.lineTo(pad + gw, pad + gh);
    curveCtx.closePath();
    curveCtx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    curveCtx.fill();

    // 2. Draw 4x4 grid & diagonal reference line
    curveCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    curveCtx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gx = pad + (i / 4) * gw;
      const gy = pad + (i / 4) * gh;
      curveCtx.beginPath();
      curveCtx.moveTo(gx, pad);
      curveCtx.lineTo(gx, pad + gh);
      curveCtx.moveTo(pad, gy);
      curveCtx.lineTo(pad + gw, gy);
      curveCtx.stroke();
    }

    // Diagonal baseline
    curveCtx.setLineDash([4, 4]);
    curveCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    curveCtx.beginPath();
    curveCtx.moveTo(pad, pad + gh);
    curveCtx.lineTo(pad + gw, pad);
    curveCtx.stroke();
    curveCtx.setLineDash([]);

    // 3. Draw interpolated spline curve
    const curveOnlyParams = {
      ...DEFAULT_PARAMS,
      curvePoints: state.curvePoints
    };
    const lut = buildToneCurveLUT(curveOnlyParams);

    curveCtx.strokeStyle = '#3b82f6';
    curveCtx.lineWidth = 2.2;
    curveCtx.beginPath();
    for (let i = 0; i < 256; i++) {
      const x = pad + (i / 255) * gw;
      const y = pad + gh - (lut[i] / 255) * gh;
      if (i === 0) curveCtx.moveTo(x, y);
      else curveCtx.lineTo(x, y);
    }
    curveCtx.stroke();

    // 4. Draw 5 draggable handles
    const xs = [0, 0.25, 0.5, 0.75, 1.0];
    xs.forEach((nx, idx) => {
      const ny = state.curvePoints[idx];
      const px = pad + nx * gw;
      const py = pad + (1 - ny) * gh;

      curveCtx.fillStyle = '#ffffff';
      curveCtx.strokeStyle = '#111827';
      curveCtx.lineWidth = 2;
      curveCtx.beginPath();
      curveCtx.arc(px, py, 5.5, 0, Math.PI * 2);
      curveCtx.fill();
      curveCtx.stroke();
    });
  }

  function initToneCurveInteractions() {
    let activePointIdx = -1;

    const getCoords = (e) => {
      const rect = curveCanvas.getBoundingClientRect();
      const scaleX = curveCanvas.width / rect.width;
      const scaleY = curveCanvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    curveCanvas.addEventListener('pointerdown', (e) => {
      const pad = 12;
      const gw = curveCanvas.width - pad * 2;
      const gh = curveCanvas.height - pad * 2;
      const { x } = getCoords(e);
      const normX = clamp((x - pad) / gw, 0, 1);

      // Pick nearest of the 5 control columns [0, 0.25, 0.5, 0.75, 1.0]
      activePointIdx = Math.round(normX * 4);
      updatePointFromEvent(e, pad, gh);
    });

    const updatePointFromEvent = (e, pad, gh) => {
      if (activePointIdx < 0) return;
      const { y } = getCoords(e);
      const normY = clamp(1 - (y - pad) / gh, 0, 1);
      state.curvePoints[activePointIdx] = +normY.toFixed(3);
      state.curvePreset = 'custom';
      document.querySelectorAll('[data-curve-preset]').forEach((b) => b.classList.remove('active'));
      requestRender();
    };

    window.addEventListener('pointermove', (e) => {
      if (activePointIdx >= 0) {
        const pad = 12;
        const gh = curveCanvas.height - pad * 2;
        updatePointFromEvent(e, pad, gh);
      }
    });

    window.addEventListener('pointerup', () => {
      if (activePointIdx >= 0) {
        activePointIdx = -1;
        pushHistory();
      }
    });
  }

  // ==================== SPLIT BEFORE / AFTER WIPE ====================
  function updateSplitOverlayGeometry() {
    if (!splitCompareEnabled) {
      splitOverlay.classList.add('hidden');
      return;
    }
    splitOverlay.classList.remove('hidden');
    splitLine.style.left = `${splitPosition * 100}%`;
  }

  function initSplitInteractions() {
    let draggingSplit = false;

    const updateSplitFromEvent = (e) => {
      const rect = editorCanvas.getBoundingClientRect();
      if (!rect.width) return;
      splitPosition = clamp((e.clientX - rect.left) / rect.width, 0.02, 0.98);
      requestRender();
    };

    splitLine.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      draggingSplit = true;
    });

    window.addEventListener('pointermove', (e) => {
      if (draggingSplit) updateSplitFromEvent(e);
    });

    window.addEventListener('pointerup', () => {
      draggingSplit = false;
    });
  }

  // ==================== VIEWPORT ZOOM & FIT ====================
  function updateViewportZoom() {
    if (!editorCanvas.width || !editorCanvas.height) return;
    const stageRect = canvasStage.getBoundingClientRect();
    const availW = Math.max(100, stageRect.width - 56);
    const availH = Math.max(100, stageRect.height - 56);

    const fitScale = Math.min(availW / editorCanvas.width, availH / editorCanvas.height, 1);
    const scale = zoomMode === 'fit' ? fitScale : zoomMode;

    editorCanvas.style.width = `${Math.round(editorCanvas.width * scale)}px`;
    editorCanvas.style.height = `${Math.round(editorCanvas.height * scale)}px`;

    zoomReadout.textContent = zoomMode === 'fit' ? `Fit (${Math.round(scale * 100)}%)` : `${Math.round(scale * 100)}%`;

    updateCropOverlayGeometry();
    updateFocusIndicatorGeometry();
    updateSplitOverlayGeometry();
  }

  // ==================== INTERACTIVE CROP ENGINE ====================
  function updateCropOverlayGeometry() {
    if (activeTab !== 'crop') {
      cropOverlay.classList.add('hidden');
      return;
    }
    cropOverlay.classList.remove('hidden');

    const dispW = editorCanvas.clientWidth;
    const dispH = editorCanvas.clientHeight;
    if (!dispW || !dispH) return;

    cropBoxEl.style.left = `${cropDraft.x * dispW}px`;
    cropBoxEl.style.top = `${cropDraft.y * dispH}px`;
    cropBoxEl.style.width = `${cropDraft.w * dispW}px`;
    cropBoxEl.style.height = `${cropDraft.h * dispH}px`;

    const pixelW = Math.round(cropDraft.w * editorCanvas.width);
    const pixelH = Math.round(cropDraft.h * editorCanvas.height);
    cropReadoutEl.textContent = `${pixelW} × ${pixelH}`;
  }

  function applyAspectToCropDraft(aspectSetting) {
    cropAspect = aspectSetting;
    if (aspectSetting === 'free') {
      updateCropOverlayGeometry();
      return;
    }

    const imgW = editorCanvas.width || 1;
    const imgH = editorCanvas.height || 1;
    const targetRatio = aspectSetting === 'original' ? imgW / imgH : parseFloat(aspectSetting);

    let wPx = imgW * 0.86;
    let hPx = wPx / targetRatio;
    if (hPx > imgH * 0.86) {
      hPx = imgH * 0.86;
      wPx = hPx * targetRatio;
    }

    cropDraft.w = wPx / imgW;
    cropDraft.h = hPx / imgH;
    cropDraft.x = (1 - cropDraft.w) / 2;
    cropDraft.y = (1 - cropDraft.h) / 2;
    updateCropOverlayGeometry();
  }

  function initCropInteractions() {
    cropBoxEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const handle = e.target.dataset.handle || 'move';
      cropDragState = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startCrop: { ...cropDraft }
      };
      window.addEventListener('pointermove', onCropPointerMove);
      window.addEventListener('pointerup', onCropPointerUp);
    });
  }

  function onCropPointerMove(e) {
    if (!cropDragState) return;
    const dispW = editorCanvas.clientWidth || 1;
    const dispH = editorCanvas.clientHeight || 1;
    const dx = (e.clientX - cropDragState.startX) / dispW;
    const dy = (e.clientY - cropDragState.startY) / dispH;
    const s = cropDragState.startCrop;
    const minSize = 0.05;

    let { x, y, w, h } = s;
    const hnd = cropDragState.handle;

    if (hnd === 'move') {
      x = clamp(s.x + dx, 0, 1 - s.w);
      y = clamp(s.y + dy, 0, 1 - s.h);
    } else {
      if (hnd.includes('e')) w = Math.min(1 - x, Math.max(minSize, s.w + dx));
      if (hnd.includes('s')) h = Math.min(1 - y, Math.max(minSize, s.h + dy));
      if (hnd.includes('w')) {
        const newX = Math.max(0, Math.min(s.x + s.w - minSize, s.x + dx));
        w = s.w + (s.x - newX);
        x = newX;
      }
      if (hnd.includes('n')) {
        const newY = Math.max(0, Math.min(s.y + s.h - minSize, s.y + dy));
        h = s.h + (s.y - newY);
        y = newY;
      }

      if (cropAspect !== 'free') {
        const imgW = editorCanvas.width || 1;
        const imgH = editorCanvas.height || 1;
        const targetRatio = cropAspect === 'original' ? imgW / imgH : parseFloat(cropAspect);
        const normRatio = targetRatio * (imgH / imgW);
        h = w / normRatio;
        if (y + h > 1) {
          h = 1 - y;
          w = h * normRatio;
        }
      }
    }

    cropDraft = { x, y, w, h };
    updateCropOverlayGeometry();
  }

  function onCropPointerUp() {
    cropDragState = null;
    window.removeEventListener('pointermove', onCropPointerMove);
    window.removeEventListener('pointerup', onCropPointerUp);
  }

  // ==================== FOCUS POINT DRAGGING ====================
  function updateFocusIndicatorGeometry() {
    const showFocus =
      activeTab === 'blur' &&
      state.blurMode !== 'gaussian' &&
      state.blur > 0;

    if (!showFocus) {
      focusIndicator.classList.add('hidden');
      return;
    }

    focusIndicator.classList.remove('hidden');
    focusIndicator.style.left = `${state.focusX * editorCanvas.clientWidth}px`;
    focusIndicator.style.top = `${state.focusY * editorCanvas.clientHeight}px`;
  }

  function initCanvasFocusDrag() {
    let draggingFocus = false;

    const updateFocusFromEvent = (e) => {
      const rect = editorCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      state.focusX = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      state.focusY = clamp((e.clientY - rect.top) / rect.height, 0, 1);
      requestRender();
    };

    editorCanvas.addEventListener('pointerdown', (e) => {
      if (activeTab === 'blur' && state.blurMode !== 'gaussian') {
        draggingFocus = true;
        updateFocusFromEvent(e);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (draggingFocus) updateFocusFromEvent(e);
    });

    window.addEventListener('pointerup', () => {
      if (draggingFocus) {
        draggingFocus = false;
        pushHistory();
      }
    });
  }

  // ==================== UI SYNCHRONIZATION ====================
  function formatParamValue(param, val) {
    if (param === 'hue' || param === 'focusAngle' || param === 'straighten') return `${val}°`;
    if (param === 'blur') return `${val} px`;
    if (['sepia', 'focusSize', 'focusFeather', 'vignetteFeather', 'grain'].includes(param)) {
      return `${val}%`;
    }
    if (param === 'shadowTintStrength' || param === 'highlightTintStrength') {
      return `Strength: ${val}%`;
    }
    const signedParams = [
      'exposure', 'contrast', 'highlights', 'shadows', 'whites', 'blacks',
      'temperature', 'tint', 'saturation', 'vibrance', 'clarity', 'dehaze', 'vignette'
    ];
    return val > 0 && signedParams.includes(param) ? `+${val}` : `${val}`;
  }

  function syncHslSlidersFromState() {
    const band = state.hsl[activeHslColor];
    document.getElementById('hsl-active-label').innerHTML = `Adjusting: <strong>${HSL_LABELS[activeHslColor]}</strong>`;

    const hSlider = document.getElementById('ctrl-hsl-hue');
    const sSlider = document.getElementById('ctrl-hsl-sat');
    const lSlider = document.getElementById('ctrl-hsl-lum');

    hSlider.value = band.h;
    sSlider.value = band.s;
    lSlider.value = band.l;

    document.getElementById('val-hsl-hue').textContent = band.h > 0 ? `+${band.h}` : `${band.h}`;
    document.getElementById('val-hsl-sat').textContent = band.s > 0 ? `+${band.s}` : `${band.s}`;
    document.getElementById('val-hsl-lum').textContent = band.l > 0 ? `+${band.l}` : `${band.l}`;
  }

  function syncUIFromState() {
    document.querySelectorAll('input[type="range"][data-param]').forEach((slider) => {
      const param = slider.dataset.param;
      if (state[param] !== undefined) {
        slider.value = state[param];
        const valEl = document.getElementById(`val-${param}`);
        if (valEl) valEl.textContent = formatParamValue(param, state[param]);
      }
    });

    document.getElementById('ctrl-shadow-color').value = state.shadowColor;
    document.getElementById('ctrl-highlight-color').value = state.highlightColor;

    document.querySelectorAll('.preset-card').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.preset === state.preset);
    });

    document.querySelectorAll('[data-curve-preset]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.curvePreset === state.curvePreset);
    });

    document.querySelectorAll('#blur-mode-select .seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.blurMode === state.blurMode);
    });

    const focusControls = document.getElementById('focus-controls');
    const angleRow = document.getElementById('row-focus-angle');
    focusControls.classList.toggle('hidden', state.blurMode === 'gaussian');
    angleRow.classList.toggle('hidden', state.blurMode !== 'tiltshift');

    syncHslSlidersFromState();
  }

  // ==================== SECTION RESET HELPER ====================
  function resetSectionGroup(group) {
    if (group === 'light') {
      Object.assign(state, {
        exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0
      });
    } else if (group === 'color') {
      Object.assign(state, {
        temperature: 0, tint: 0, vibrance: 0, saturation: 0
      });
    } else if (group === 'presence') {
      Object.assign(state, {
        clarity: 0, dehaze: 0, sharpen: 0
      });
    } else if (group === 'curve') {
      state.curvePreset = 'linear';
      state.curvePoints = [...CURVE_PRESETS['linear']];
    } else if (group === 'hsl') {
      state.hsl = structuredClone(DEFAULT_HSL);
    } else if (group === 'grading') {
      Object.assign(state, {
        shadowColor: '#1b4d6e', shadowTintStrength: 0,
        highlightColor: '#f4a261', highlightTintStrength: 0,
        fade: 0, sepia: 0, hue: 0
      });
    } else if (group === 'blur') {
      Object.assign(state, {
        blurMode: 'gaussian', blur: 0, focusSize: 35, focusFeather: 35, focusAngle: 0
      });
    } else if (group === 'effects') {
      Object.assign(state, {
        vignette: 0, vignetteFeather: 55, grain: 0
      });
    } else if (group === 'geometry') {
      Object.assign(state, {
        straighten: 0, rotation: 0, flipH: false, flipV: false
      });
    }

    syncUIFromState();
    pushHistory();
    requestRender();
  }

  // ==================== EVENT LISTENERS ====================
  function bindEvents() {
    // 1. File Upload, Sample Image & Auto Enhance
    document.getElementById('file-input').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
        e.target.value = '';
      }
    });

    document.getElementById('btn-sample').addEventListener('click', createSampleFrame);
    document.getElementById('btn-auto-enhance').addEventListener('click', runAutoEnhance);

    // Drag & Drop anywhere
    const dropHint = document.getElementById('dropzone-hint');
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropHint.classList.remove('hidden');
    });
    window.addEventListener('dragleave', (e) => {
      if (e.relatedTarget === null) dropHint.classList.add('hidden');
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dropHint.classList.add('hidden');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    // 2. Inspector Mode Tabs
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        activeTab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${activeTab}`));
        if (activeTab === 'crop') {
          cropDraft = { ...state.crop };
        }
        requestRender();
      });
    });

    // 3. Per-Section Reset Buttons (prevent toggling parent <details>)
    document.querySelectorAll('.btn-reset-section').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        resetSectionGroup(btn.dataset.resetGroup);
      });
    });

    // 4. Range Sliders
    document.querySelectorAll('input[type="range"][data-param]').forEach((slider) => {
      const param = slider.dataset.param;

      slider.addEventListener('input', () => {
        state[param] = parseFloat(slider.value);
        if (param === 'straighten') {
          straightenGrid.classList.remove('hidden');
        }
        const valEl = document.getElementById(`val-${param}`);
        if (valEl) valEl.textContent = formatParamValue(param, state[param]);
        requestRender();
      });

      slider.addEventListener('change', () => {
        straightenGrid.classList.add('hidden');
        pushHistory();
      });

      slider.addEventListener('dblclick', () => {
        const defVal = parseFloat(slider.dataset.default || 0);
        slider.value = defVal;
        state[param] = defVal;
        const valEl = document.getElementById(`val-${param}`);
        if (valEl) valEl.textContent = formatParamValue(param, defVal);
        pushHistory();
        requestRender();
      });
    });

    // 5. Tone Curve Quick Presets
    document.querySelectorAll('[data-curve-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.curvePreset;
        if (!CURVE_PRESETS[key]) return;
        state.curvePreset = key;
        state.curvePoints = [...CURVE_PRESETS[key]];
        syncUIFromState();
        pushHistory();
        requestRender();
      });
    });

    // 6. 6-Color HSL Mixer Swatches & Sliders
    document.querySelectorAll('.hsl-dot').forEach((dot) => {
      dot.addEventListener('click', () => {
        activeHslColor = dot.dataset.hslColor;
        document.querySelectorAll('.hsl-dot').forEach((d) => d.classList.toggle('active', d === dot));
        syncHslSlidersFromState();
      });
    });

    const bindHslSlider = (id, prop) => {
      const el = document.getElementById(id);
      el.addEventListener('input', () => {
        state.hsl[activeHslColor][prop] = parseInt(el.value, 10);
        syncHslSlidersFromState();
        requestRender();
      });
      el.addEventListener('change', () => pushHistory());
      el.addEventListener('dblclick', () => {
        state.hsl[activeHslColor][prop] = 0;
        syncHslSlidersFromState();
        pushHistory();
        requestRender();
      });
    };

    bindHslSlider('ctrl-hsl-hue', 'h');
    bindHslSlider('ctrl-hsl-sat', 's');
    bindHslSlider('ctrl-hsl-lum', 'l');

    // 7. Split Toning Color Pickers
    const shadowPicker = document.getElementById('ctrl-shadow-color');
    const highlightPicker = document.getElementById('ctrl-highlight-color');

    shadowPicker.addEventListener('input', () => {
      state.shadowColor = shadowPicker.value;
      if (state.shadowTintStrength === 0) {
        state.shadowTintStrength = 35;
        syncUIFromState();
      }
      requestRender();
    });
    shadowPicker.addEventListener('change', () => pushHistory());

    highlightPicker.addEventListener('input', () => {
      state.highlightColor = highlightPicker.value;
      if (state.highlightTintStrength === 0) {
        state.highlightTintStrength = 35;
        syncUIFromState();
      }
      requestRender();
    });
    highlightPicker.addEventListener('change', () => pushHistory());

    // 8. 1-Click Presets
    document.querySelectorAll('.preset-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetKey = btn.dataset.preset;
        const presetValues = PRESETS[presetKey];
        if (!presetValues) return;
        Object.assign(state, structuredClone(presetValues));
        state.preset = presetKey;
        syncUIFromState();
        pushHistory();
        requestRender();
      });
    });

    // 9. Blur Mode Selector
    document.querySelectorAll('#blur-mode-select .seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.blurMode = btn.dataset.blurMode;
        if (state.blurMode !== 'gaussian' && state.blur === 0) {
          state.blur = 12;
        }
        syncUIFromState();
        pushHistory();
        requestRender();
      });
    });

    // 10. Crop & Aspect Ratio
    document.querySelectorAll('#aspect-grid .aspect-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#aspect-grid .aspect-btn').forEach((b) => b.classList.toggle('active', b === btn));
        applyAspectToCropDraft(btn.dataset.aspect);
      });
    });

    document.getElementById('btn-apply-crop').addEventListener('click', () => {
      state.crop = { ...cropDraft };
      pushHistory();
      document.querySelector('.tab-btn[data-tab="adjust"]').click();
    });

    document.getElementById('btn-reset-crop').addEventListener('click', () => {
      state.crop = { x: 0, y: 0, w: 1, h: 1 };
      cropDraft = { x: 0, y: 0, w: 1, h: 1 };
      pushHistory();
      requestRender();
    });

    // 11. Orientation (Rotate / Flip)
    document.getElementById('btn-rot-ccw').addEventListener('click', () => {
      state.rotation = (state.rotation - 90 + 360) % 360;
      pushHistory();
      requestRender();
    });
    document.getElementById('btn-rot-cw').addEventListener('click', () => {
      state.rotation = (state.rotation + 90) % 360;
      pushHistory();
      requestRender();
    });
    document.getElementById('btn-flip-h').addEventListener('click', () => {
      state.flipH = !state.flipH;
      pushHistory();
      requestRender();
    });
    document.getElementById('btn-flip-v').addEventListener('click', () => {
      state.flipV = !state.flipV;
      pushHistory();
      requestRender();
    });

    // 12. Undo / Redo / Reset All / Split Before-After / Hold Compare
    document.getElementById('btn-undo').addEventListener('click', undo);
    document.getElementById('btn-redo').addEventListener('click', redo);

    document.getElementById('btn-reset-all').addEventListener('click', () => {
      state = structuredClone(DEFAULT_PARAMS);
      cropDraft = { x: 0, y: 0, w: 1, h: 1 };
      syncUIFromState();
      pushHistory();
      requestRender();
    });

    const splitToggleBtn = document.getElementById('btn-split-toggle');
    splitToggleBtn.addEventListener('click', () => {
      splitCompareEnabled = !splitCompareEnabled;
      splitToggleBtn.classList.toggle('active', splitCompareEnabled);
      requestRender();
    });

    const compareBtn = document.getElementById('btn-compare');
    const startCompare = () => {
      isComparing = true;
      compareBadge.classList.remove('hidden');
      requestRender();
    };
    const endCompare = () => {
      if (!isComparing) return;
      isComparing = false;
      compareBadge.classList.add('hidden');
      requestRender();
    };

    compareBtn.addEventListener('pointerdown', startCompare);
    window.addEventListener('pointerup', endCompare);

    // 13. Zoom Controls
    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      const curr = zoomMode === 'fit' ? editorCanvas.clientWidth / editorCanvas.width : zoomMode;
      zoomMode = Math.min(3, +(curr * 1.25).toFixed(2));
      updateViewportZoom();
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      const curr = zoomMode === 'fit' ? editorCanvas.clientWidth / editorCanvas.width : zoomMode;
      zoomMode = Math.max(0.15, +(curr / 1.25).toFixed(2));
      updateViewportZoom();
    });
    document.getElementById('btn-zoom-fit').addEventListener('click', () => {
      zoomMode = 'fit';
      updateViewportZoom();
    });
    document.getElementById('btn-zoom-100').addEventListener('click', () => {
      zoomMode = 1;
      updateViewportZoom();
    });

    window.addEventListener('resize', () => updateViewportZoom());

    // 14. Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === '\\') {
        startCompare();
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === '\\') endCompare();
    });

    // 15. Export Modal
    const exportModal = document.getElementById('export-modal');
    const formatSelect = document.getElementById('export-format');
    const qualityRow = document.getElementById('export-quality-row');
    const qualitySlider = document.getElementById('export-quality');
    const qualityVal = document.getElementById('export-quality-val');

    document.getElementById('btn-export-open').addEventListener('click', () => {
      const rot = ((state.rotation % 360) + 360) % 360;
      const swap = rot === 90 || rot === 270;
      const srcW = sourceImage.naturalWidth || sourceImage.width;
      const srcH = sourceImage.naturalHeight || sourceImage.height;
      const ow = swap ? srcH : srcW;
      const oh = swap ? srcW : srcH;
      const finalW = Math.max(1, Math.round(state.crop.w * ow));
      const finalH = Math.max(1, Math.round(state.crop.h * oh));

      document.getElementById('export-res-label').textContent = `${finalW} × ${finalH} px`;
      exportModal.classList.remove('hidden');
    });

    const closeExport = () => exportModal.classList.add('hidden');
    document.getElementById('btn-export-close').addEventListener('click', closeExport);
    document.getElementById('btn-export-cancel').addEventListener('click', closeExport);

    formatSelect.addEventListener('change', () => {
      qualityRow.classList.toggle('hidden', formatSelect.value === 'image/png');
    });

    qualitySlider.addEventListener('input', () => {
      qualityVal.textContent = `${qualitySlider.value}%`;
    });

    document.getElementById('btn-export-download').addEventListener('click', () => {
      exportRenderedImage();
      closeExport();
    });
  }

  // ==================== EXPORT FULL-RESOLUTION IMAGE ====================
  function exportRenderedImage() {
    if (!sourceImage) return;

    const prevTab = activeTab;
    const prevCompare = isComparing;
    const prevSplit = splitCompareEnabled;

    activeTab = 'adjust';
    isComparing = false;
    splitCompareEnabled = false;
    renderFrame();

    const mime = document.getElementById('export-format').value;
    const quality = parseInt(document.getElementById('export-quality').value, 10) / 100;
    const rawName = document.getElementById('export-filename').value.trim() || 'lumenframe-edited';
    const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
    const ext = extMap[mime] || 'jpg';

    editorCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${rawName}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      },
      mime,
      quality
    );

    activeTab = prevTab;
    isComparing = prevCompare;
    splitCompareEnabled = prevSplit;
    renderFrame();
  }

  // ==================== UTILITIES ====================
  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  // ==================== INITIALIZATION ====================
  initGrainTile();
  initToneCurveInteractions();
  initSplitInteractions();
  initCropInteractions();
  initCanvasFocusDrag();
  bindEvents();
  createSampleFrame();
})();

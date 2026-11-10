/**
 * CineFrameGrade — Local Still Footage & Photo Color Grading Studio
 * Pure Vanilla JavaScript + HTML5 Canvas 2D Engine
 */

(() => {
  'use strict';

  // ==================== DEFAULT STATE ====================
  const DEFAULT_PARAMS = {
    preset: 'none',
    // Primary Light
    exposure: 0,        // -100 to 100
    contrast: 0,        // -100 to 100
    highlights: 0,      // -100 to 100
    shadows: 0,         // -100 to 100
    fade: 0,            // 0 to 100
    // Color & WB
    temperature: 0,     // -100 to 100
    tint: 0,            // -100 to 100
    saturation: 0,      // -100 to 100
    vibrance: 0,        // -100 to 100
    hue: 0,             // -180 to 180
    sepia: 0,           // 0 to 100
    // Split Toning
    shadowColor: '#1b4d6e',
    shadowTintStrength: 0,    // 0 to 100
    highlightColor: '#f4a261',
    highlightTintStrength: 0, // 0 to 100
    // Blur & Optics
    blurMode: 'gaussian',     // 'gaussian' | 'radial' | 'tiltshift'
    blur: 0,                  // 0 to 50 px
    focusX: 0.5,              // normalized 0..1
    focusY: 0.5,              // normalized 0..1
    focusSize: 35,            // 5 to 85 %
    focusFeather: 35,         // 5 to 80 %
    focusAngle: 0,            // -90 to 90 deg
    vignette: 0,              // -100 to 100
    vignetteFeather: 55,      // 10 to 95 %
    grain: 0,                 // 0 to 100 %
    // Geometry & Crop (normalized 0..1 relative to oriented source)
    rotation: 0,              // 0, 90, 180, 270
    flipH: false,
    flipV: false,
    crop: { x: 0, y: 0, w: 1, h: 1 }
  };

  // Cinematic Look Presets
  const PRESETS = {
    'none': {
      exposure: 0, contrast: 0, highlights: 0, shadows: 0, fade: 0,
      temperature: 0, tint: 0, saturation: 0, vibrance: 0, hue: 0, sepia: 0,
      shadowColor: '#1b4d6e', shadowTintStrength: 0,
      highlightColor: '#f4a261', highlightTintStrength: 0
    },
    'teal-orange': {
      exposure: 4, contrast: 18, highlights: -10, shadows: 8, fade: 6,
      temperature: -6, tint: -4, saturation: 12, vibrance: 22, hue: 0, sepia: 0,
      shadowColor: '#0d5c75', shadowTintStrength: 45,
      highlightColor: '#f59e0b', highlightTintStrength: 42
    },
    'kodak-warm': {
      exposure: 6, contrast: 14, highlights: -8, shadows: 12, fade: 14,
      temperature: 28, tint: 8, saturation: 10, vibrance: 15, hue: -3, sepia: 14,
      shadowColor: '#3b2314', shadowTintStrength: 24,
      highlightColor: '#fde047', highlightTintStrength: 30
    },
    'bleach-bypass': {
      exposure: -4, contrast: 42, highlights: 15, shadows: -18, fade: 8,
      temperature: -12, tint: 0, saturation: -52, vibrance: -15, hue: 0, sepia: 10,
      shadowColor: '#1e293b', shadowTintStrength: 30,
      highlightColor: '#e2e8f0', highlightTintStrength: 20
    },
    'noir': {
      exposure: 2, contrast: 38, highlights: 12, shadows: -22, fade: 10,
      temperature: 0, tint: 0, saturation: -100, vibrance: 0, hue: 0, sepia: 6,
      shadowColor: '#09090b', shadowTintStrength: 20,
      highlightColor: '#e4e4e7', highlightTintStrength: 15
    },
    'faded-matte': {
      exposure: 5, contrast: -14, highlights: -24, shadows: 28, fade: 38,
      temperature: 12, tint: 4, saturation: -18, vibrance: 10, hue: 0, sepia: 12,
      shadowColor: '#2d2a32', shadowTintStrength: 28,
      highlightColor: '#e6ccb2', highlightTintStrength: 25
    },
    'cyberpunk': {
      exposure: 2, contrast: 24, highlights: 10, shadows: 6, fade: 4,
      temperature: -22, tint: 36, saturation: 28, vibrance: 35, hue: -8, sepia: 0,
      shadowColor: '#1e1b4b', shadowTintStrength: 52,
      highlightColor: '#ec4899', highlightTintStrength: 48
    },
    'emerald-cinema': {
      exposure: -4, contrast: 22, highlights: -12, shadows: 6, fade: 12,
      temperature: -18, tint: -34, saturation: -14, vibrance: 12, hue: 6, sepia: 8,
      shadowColor: '#052e16', shadowTintStrength: 46,
      highlightColor: '#a7f3d0', highlightTintStrength: 26
    }
  };

  // ==================== APPLICATION STATE ====================
  let sourceImage = null; // Original HTMLImageElement or Canvas
  let state = structuredClone(DEFAULT_PARAMS);
  let history = [];
  let historyIndex = -1;
  const MAX_HISTORY = 35;

  let activeTab = 'color';
  let isComparing = false;
  let zoomMode = 'fit'; // 'fit' | number (scale multiplier)
  let renderPending = false;

  // Interactive Crop Draft Box (normalized 0..1 within current displayed image)
  let cropDraft = { x: 0.08, y: 0.08, w: 0.84, h: 0.84 };
  let cropAspect = 'free'; // 'free' | 'original' | number
  let cropDragState = null;

  // Offscreen Buffers for non-destructive pipeline
  const orientedCanvas = document.createElement('canvas');
  const sharpCanvas = document.createElement('canvas');
  const blurCanvas = document.createElement('canvas');
  const maskCanvas = document.createElement('canvas');
  const grainTileCanvas = document.createElement('canvas');

  // ==================== DOM ELEMENTS ====================
  const editorCanvas = document.getElementById('editor-canvas');
  const ctx = editorCanvas.getContext('2d', { willReadFrequently: true });
  const histCanvas = document.getElementById('histogram-canvas');
  const histCtx = histCanvas.getContext('2d');
  const canvasWrapper = document.getElementById('canvas-wrapper');
  const canvasStage = document.getElementById('canvas-stage');
  const viewport = document.getElementById('viewport');

  const cropOverlay = document.getElementById('crop-overlay');
  const cropBoxEl = document.getElementById('crop-box');
  const cropReadoutEl = document.getElementById('crop-readout');
  const focusIndicator = document.getElementById('focus-indicator');
  const compareBadge = document.getElementById('compare-badge');
  const dimLabel = document.getElementById('image-dimensions');
  const lumaLabel = document.getElementById('luma-avg');
  const zoomReadout = document.getElementById('zoom-readout');

  // Pre-generate reusable seamless film grain tile (256x256)
  function initGrainTile() {
    grainTileCanvas.width = 256;
    grainTileCanvas.height = 256;
    const gCtx = grainTileCanvas.getContext('2d');
    const imgData = gCtx.createImageData(256, 256);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      // Gaussian-like noise centered around 128 (neutral gray for overlay)
      const n = ((Math.random() + Math.random() + Math.random()) / 3) * 255;
      data[i] = n;
      data[i + 1] = n;
      data[i + 2] = n;
      data[i + 3] = 255;
    }
    gCtx.putImageData(imgData, 0, 0);
  }

  // ==================== PROCEDURAL CINEMATIC SAMPLE IMAGE ====================
  function createSampleFrame() {
    const w = 1440;
    const h = 900;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');

    // Dusk sky gradient
    const sky = g.createLinearGradient(0, 0, 0, h * 0.68);
    sky.addColorStop(0, '#0f172a');
    sky.addColorStop(0.32, '#1e3a5f');
    sky.addColorStop(0.65, '#c2410c');
    sky.addColorStop(0.88, '#f59e0b');
    sky.addColorStop(1, '#fde047');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);

    // Sun glow
    const sunX = w * 0.64;
    const sunY = h * 0.48;
    const sunGlow = g.createRadialGradient(sunX, sunY, 15, sunX, sunY, 360);
    sunGlow.addColorStop(0, 'rgba(255, 250, 220, 1)');
    sunGlow.addColorStop(0.25, 'rgba(251, 146, 60, 0.75)');
    sunGlow.addColorStop(0.6, 'rgba(234, 88, 12, 0.2)');
    sunGlow.addColorStop(1, 'rgba(234, 88, 12, 0)');
    g.fillStyle = sunGlow;
    g.fillRect(0, 0, w, h);

    // Sun disc
    g.fillStyle = '#fffbeb';
    g.beginPath();
    g.arc(sunX, sunY, 56, 0, Math.PI * 2);
    g.fill();

    // Layered mountain ridges for depth-of-field & shadow grading test
    const ridges = [
      { yBase: 0.56, amp: 95, seed: 1.2, color: '#334155' },
      { yBase: 0.63, amp: 70, seed: 2.7, color: '#1e293b' },
      { yBase: 0.70, amp: 48, seed: 4.4, color: '#0f172a' }
    ];

    ridges.forEach((r) => {
      g.fillStyle = r.color;
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += 16) {
        const y =
          h * r.yBase -
          Math.sin(x * 0.0035 + r.seed) * r.amp -
          Math.cos(x * 0.011 - r.seed) * (r.amp * 0.38) -
          Math.sin(x * 0.025 + r.seed * 2) * 14;
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
    waterGrad.addColorStop(0.25, '#1e293b');
    waterGrad.addColorStop(1, '#090d16');
    g.fillStyle = waterGrad;
    g.fillRect(0, lakeTop, w, h - lakeTop);

    // Shimmering sun reflection ripples on water
    for (let i = 0; i < 85; i++) {
      const t = i / 85;
      const ry = lakeTop + t * (h - lakeTop);
      const spread = 45 + t * 240;
      const rw = 28 + Math.sin(i * 3.1) * 20 + t * 90;
      const rx = sunX + Math.sin(i * 7.3) * spread * 0.35 - rw / 2;
      g.fillStyle = `rgba(253, 186, 116, ${0.48 * (1 - t * 0.65)})`;
      g.fillRect(rx, ry, rw, 2 + t * 2.5);
    }

    // Foreground silhouette pine trees & subject tower for sharpness/blur evaluation
    g.fillStyle = '#05070b';
    for (let tx = 40; tx < 420; tx += 28) {
      const treeH = 90 + ((tx * 37) % 110);
      const baseY = h * 0.75 + ((tx * 13) % 30);
      g.beginPath();
      g.moveTo(tx, baseY - treeH);
      g.lineTo(tx - 22, baseY);
      g.lineTo(tx + 22, baseY);
      g.closePath();
      g.fill();
    }

    // Lighthouse / observation beacon on right peninsula
    g.fillStyle = '#070a10';
    g.beginPath();
    g.moveTo(w * 0.72, lakeTop + 18);
    g.lineTo(w, lakeTop - 10);
    g.lineTo(w, lakeTop + 45);
    g.closePath();
    g.fill();

    // Lighthouse tower
    const lx = w * 0.86;
    const ly = lakeTop + 4;
    g.fillStyle = '#f8fafc';
    g.beginPath();
    g.moveTo(lx - 14, ly);
    g.lineTo(lx - 9, ly - 130);
    g.lineTo(lx + 9, ly - 130);
    g.lineTo(lx + 14, ly);
    g.closePath();
    g.fill();

    // Red stripe on lighthouse for vivid red channel testing
    g.fillStyle = '#dc2626';
    g.fillRect(lx - 11, ly - 82, 22, 34);

    // Lantern room & warm light beam
    g.fillStyle = '#fef08a';
    g.fillRect(lx - 8, ly - 144, 16, 14);

    const beam = g.createLinearGradient(lx, ly - 137, lx - 380, ly - 220);
    beam.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    beam.addColorStop(1, 'rgba(254, 240, 138, 0)');
    g.fillStyle = beam;
    g.beginPath();
    g.moveTo(lx - 8, ly - 137);
    g.lineTo(lx - 420, ly - 240);
    g.lineTo(lx - 420, ly - 95);
    g.closePath();
    g.fill();

    // Color checker mini reference strip in top-left corner (subtle)
    const swatches = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#f8fafc'];
    swatches.forEach((col, idx) => {
      g.fillStyle = col;
      g.fillRect(24 + idx * 18, 24, 14, 14);
    });

    const img = new Image();
    img.onload = () => {
      loadNewSourceImage(img);
    };
    img.src = c.toDataURL('image/png');
  }

  // ==================== HISTORY MANAGEMENT ====================
  function pushHistory() {
    // Remove redo states ahead of current index
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
    resetCropDraftToFull();
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

  // ==================== CORE RENDERING PIPELINE ====================
  function requestRender() {
    if (renderPending) return;
    renderPending = true;
    requestAnimationFrame(() => {
      renderPending = false;
      renderFrame();
    });
  }

  /**
   * Renders the current state onto targetCanvas (either editorCanvas or export canvas)
   */
  function renderFrame() {
    if (!sourceImage) return;

    const p = isComparing ? DEFAULT_PARAMS : state;

    // 1. Prepare oriented source (rotation + flip)
    const rot = ((state.rotation % 360) + 360) % 360;
    const swapDims = rot === 90 || rot === 270;
    const srcW = sourceImage.naturalWidth || sourceImage.width;
    const srcH = sourceImage.naturalHeight || sourceImage.height;
    const orientW = swapDims ? srcH : srcW;
    const orientH = swapDims ? srcW : srcH;

    orientedCanvas.width = orientW;
    orientedCanvas.height = orientH;
    const oCtx = orientedCanvas.getContext('2d');
    oCtx.save();
    oCtx.translate(orientW / 2, orientH / 2);
    oCtx.rotate((rot * Math.PI) / 180);
    oCtx.scale(state.flipH ? -1 : 1, state.flipV ? -1 : 1);
    oCtx.drawImage(sourceImage, -srcW / 2, -srcH / 2, srcW, srcH);
    oCtx.restore();

    // 2. Determine active crop region
    // When on the Crop tab, show full uncropped oriented frame so user can adjust crop handles freely
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

    // 3. Render Primary CSS/Canvas filter chain onto sharpCanvas
    sharpCanvas.width = outW;
    sharpCanvas.height = outH;
    const sCtx = sharpCanvas.getContext('2d', { willReadFrequently: true });

    // Map slider values (-100..100) to filter percentages
    const brightness = Math.max(0, 100 + p.exposure * 0.65 + p.shadows * 0.18);
    const contrast = Math.max(10, 100 + p.contrast * 0.75 + p.highlights * 0.15 - p.fade * 0.25);
    const saturate = Math.max(0, 100 + p.saturation + p.vibrance * 0.6);
    const sepia = Math.max(0, p.sepia);
    const hue = p.hue;

    sCtx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;
    sCtx.drawImage(orientedCanvas, cropX, cropY, outW, outH, 0, 0, outW, outH);
    sCtx.filter = 'none';

    // 4. Pixel-level & Composite Color Grading Passes on sharpCanvas
    applyColorGradingOverlays(sCtx, outW, outH, p);

    // 5. Blur Engine (Uniform Gaussian, Radial Focus, or Linear Tilt-Shift)
    ctx.clearRect(0, 0, outW, outH);

    if (p.blur <= 0.1) {
      ctx.drawImage(sharpCanvas, 0, 0);
    } else if (p.blurMode === 'gaussian') {
      // Pad edge pixels by drawing slightly clamped or direct filter
      ctx.save();
      ctx.filter = `blur(${p.blur}px)`;
      ctx.drawImage(sharpCanvas, 0, 0);
      ctx.restore();
    } else {
      // Composite blurred canvas with sharp canvas using a gradient focus mask
      blurCanvas.width = outW;
      blurCanvas.height = outH;
      const bCtx = blurCanvas.getContext('2d');
      bCtx.drawImage(sharpCanvas, 0, 0);
      bCtx.filter = `blur(${p.blur}px)`;
      bCtx.drawImage(sharpCanvas, 0, 0);
      bCtx.filter = 'none';

      // Draw blurred base onto main canvas
      ctx.drawImage(blurCanvas, 0, 0);

      // Build alpha mask for sharp region on maskCanvas
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
        // Linear band along focusAngle centered at (fx, fy)
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

    // 6. Optical Vignette & Film Grain (applied after blur so grain stays crisp like real film)
    applyVignetteAndGrain(ctx, outW, outH, p);

    // 7. Update Real-time RGB Histogram & UI Overlays
    updateHistogram();
    updateCropOverlayGeometry();
    updateFocusIndicatorGeometry();
  }

  /**
   * Applies white balance (Temperature/Tint), Highlights/Shadows recovery, Matte Fade, and Split Toning
   */
  function applyColorGradingOverlays(sCtx, w, h, p) {
    sCtx.save();

    // A. Highlights & Shadows recovery via blend modes
    if (p.shadows !== 0) {
      const sVal = Math.abs(p.shadows) / 100;
      sCtx.globalCompositeOperation = p.shadows > 0 ? 'screen' : 'multiply';
      sCtx.fillStyle = p.shadows > 0
        ? `rgba(180, 180, 180, ${sVal * 0.28})`
        : `rgba(40, 40, 40, ${sVal * 0.35})`;
      sCtx.fillRect(0, 0, w, h);
    }

    if (p.highlights !== 0) {
      const hVal = Math.abs(p.highlights) / 100;
      sCtx.globalCompositeOperation = p.highlights > 0 ? 'color-dodge' : 'soft-light';
      sCtx.fillStyle = p.highlights > 0
        ? `rgba(255, 255, 255, ${hVal * 0.22})`
        : `rgba(30, 30, 30, ${hVal * 0.35})`;
      sCtx.fillRect(0, 0, w, h);
    }

    // B. White Balance: Temperature (Blue <-> Amber)
    if (p.temperature !== 0) {
      const tVal = Math.abs(p.temperature) / 100;
      sCtx.globalCompositeOperation = 'soft-light';
      sCtx.fillStyle = p.temperature > 0
        ? `rgba(255, 160, 40, ${tVal * 0.55})`
        : `rgba(45, 135, 255, ${tVal * 0.55})`;
      sCtx.fillRect(0, 0, w, h);
    }

    // C. White Balance: Tint (Green <-> Magenta)
    if (p.tint !== 0) {
      const tintVal = Math.abs(p.tint) / 100;
      sCtx.globalCompositeOperation = 'soft-light';
      sCtx.fillStyle = p.tint > 0
        ? `rgba(236, 72, 153, ${tintVal * 0.48})`
        : `rgba(16, 185, 129, ${tintVal * 0.48})`;
      sCtx.fillRect(0, 0, w, h);
    }

    // D. Split Toning (Shadow Tint & Highlight Tint)
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

    // E. Matte Black Fade (lifts deepest blacks for cinema film print look)
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

  /**
   * Renders radial lens vignette and 35mm procedural film grain
   */
  function applyVignetteAndGrain(targetCtx, w, h, p) {
    targetCtx.save();

    // 1. Vignette (negative = dark edges, positive = white glow edges)
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

    // 2. 35mm Film Grain
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

    // Downsample read via small sample grid for fast 60fps performance
    const stepX = Math.max(1, Math.floor(w / 120));
    const stepY = Math.max(1, Math.floor(h / 90));
    const imgData = ctx.getImageData(0, 0, w, h).data;

    const rBins = new Uint32Array(256);
    const gBins = new Uint32Array(256);
    const bBins = new Uint32Array(256);
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
        totalLuma += 0.2126 * r + 0.7152 * g + 0.0722 * b;
        count++;
      }
    }

    const avgLuma = count > 0 ? Math.round((totalLuma / count / 255) * 100) : 0;
    lumaLabel.textContent = `Avg Luma: ${avgLuma}%`;

    // Find peak for normalization (ignoring extreme clipping bins 0 and 255)
    let maxCount = 1;
    for (let i = 2; i < 254; i++) {
      if (rBins[i] > maxCount) maxCount = rBins[i];
      if (gBins[i] > maxCount) maxCount = gBins[i];
      if (bBins[i] > maxCount) maxCount = bBins[i];
    }

    const hw = histCanvas.width;
    const hh = histCanvas.height;
    histCtx.clearRect(0, 0, hw, hh);

    // Subtle vertical IRE guide lines
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
  }

  // ==================== INTERACTIVE CROP ENGINE ====================
  function resetCropDraftToFull() {
    cropDraft = { ...state.crop };
  }

  function updateCropOverlayGeometry() {
    if (activeTab !== 'crop') {
      cropOverlay.classList.add('hidden');
      return;
    }
    cropOverlay.classList.remove('hidden');

    const dispW = editorCanvas.clientWidth;
    const dispH = editorCanvas.clientHeight;
    if (!dispW || !dispH) return;

    const left = cropDraft.x * dispW;
    const top = cropDraft.y * dispH;
    const width = cropDraft.w * dispW;
    const height = cropDraft.h * dispH;

    cropBoxEl.style.left = `${left}px`;
    cropBoxEl.style.top = `${top}px`;
    cropBoxEl.style.width = `${width}px`;
    cropBoxEl.style.height = `${height}px`;

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

    // Fit largest possible centered box with targetRatio inside current image
    let wPx = imgW * 0.85;
    let hPx = wPx / targetRatio;
    if (hPx > imgH * 0.85) {
      hPx = imgH * 0.85;
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
      x = Math.min(Math.max(0, s.x + dx), 1 - s.w);
      y = Math.min(Math.max(0, s.y + dy), 1 - s.h);
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

      // Enforce aspect ratio if locked
      if (cropAspect !== 'free') {
        const imgW = editorCanvas.width || 1;
        const imgH = editorCanvas.height || 1;
        const targetRatio = cropAspect === 'original' ? imgW / imgH : parseFloat(cropAspect);
        // Normalized aspect ratio in 0..1 coordinates
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

  // ==================== FOCUS POINT DRAGGING (RADIAL / TILT-SHIFT) ====================
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
    const dispW = editorCanvas.clientWidth;
    const dispH = editorCanvas.clientHeight;
    focusIndicator.style.left = `${state.focusX * dispW}px`;
    focusIndicator.style.top = `${state.focusY * dispH}px`;
  }

  function initCanvasFocusDrag() {
    let draggingFocus = false;

    const updateFocusFromEvent = (e) => {
      const rect = editorCanvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      state.focusX = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      state.focusY = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      requestRender();
    };

    editorCanvas.addEventListener('pointerdown', (e) => {
      if (activeTab === 'blur' && state.blurMode !== 'gaussian') {
        draggingFocus = true;
        updateFocusFromEvent(e);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (draggingFocus) {
        updateFocusFromEvent(e);
      }
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
    if (param === 'hue' || param === 'focusAngle') return `${val}°`;
    if (param === 'blur') return `${val} px`;
    if (['sepia', 'focusSize', 'focusFeather', 'vignetteFeather', 'grain'].includes(param)) {
      return `${val}%`;
    }
    if (param === 'shadowTintStrength' || param === 'highlightTintStrength') {
      return `Strength: ${val}%`;
    }
    return val > 0 && ['exposure', 'contrast', 'highlights', 'shadows', 'temperature', 'tint', 'saturation', 'vibrance', 'vignette'].includes(param)
      ? `+${val}`
      : `${val}`;
  }

  function syncUIFromState() {
    // Sync all range inputs
    document.querySelectorAll('input[type="range"][data-param]').forEach((slider) => {
      const param = slider.dataset.param;
      if (state[param] !== undefined) {
        slider.value = state[param];
        const valEl = document.getElementById(`val-${param}`);
        if (valEl) valEl.textContent = formatParamValue(param, state[param]);
      }
    });

    // Sync split tone color pickers
    document.getElementById('ctrl-shadow-color').value = state.shadowColor;
    document.getElementById('ctrl-highlight-color').value = state.highlightColor;

    // Sync active preset card
    document.querySelectorAll('.preset-card').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.preset === state.preset);
    });

    // Sync blur mode buttons & sub-controls
    document.querySelectorAll('#blur-mode-select .seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.blurMode === state.blurMode);
    });

    const focusControls = document.getElementById('focus-controls');
    const angleRow = document.getElementById('row-focus-angle');
    focusControls.classList.toggle('hidden', state.blurMode === 'gaussian');
    angleRow.classList.toggle('hidden', state.blurMode !== 'tiltshift');
  }

  // ==================== EVENT LISTENERS ====================
  function bindEvents() {
    // 1. File Upload & Sample Image
    document.getElementById('file-input').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
        e.target.value = '';
      }
    });

    document.getElementById('btn-sample').addEventListener('click', () => {
      createSampleFrame();
    });

    // Drag & Drop image anywhere onto window
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

    // 3. Range Sliders (live update + double-click to reset + pushHistory on change)
    document.querySelectorAll('input[type="range"][data-param]').forEach((slider) => {
      const param = slider.dataset.param;

      slider.addEventListener('input', () => {
        state[param] = parseFloat(slider.value);
        if (param !== 'blur' && param !== 'focusSize' && param !== 'focusFeather' && param !== 'focusAngle') {
          state.preset = 'custom';
          document.querySelectorAll('.preset-card').forEach((b) => b.classList.remove('active'));
        }
        const valEl = document.getElementById(`val-${param}`);
        if (valEl) valEl.textContent = formatParamValue(param, state[param]);
        requestRender();
      });

      slider.addEventListener('change', () => {
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

    // 4. Split Toning Color Pickers
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

    // 5. Cinematic Presets
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

    // 6. Blur Mode Selector
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

    // 7. Crop Aspect Ratio & Apply/Reset Buttons
    document.querySelectorAll('#aspect-grid .aspect-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#aspect-grid .aspect-btn').forEach((b) => b.classList.toggle('active', b === btn));
        applyAspectToCropDraft(btn.dataset.aspect);
      });
    });

    document.getElementById('btn-apply-crop').addEventListener('click', () => {
      state.crop = { ...cropDraft };
      pushHistory();
      // Switch back to Color tab to view the cropped result cleanly
      document.querySelector('.tab-btn[data-tab="color"]').click();
    });

    document.getElementById('btn-reset-crop').addEventListener('click', () => {
      state.crop = { x: 0, y: 0, w: 1, h: 1 };
      cropDraft = { x: 0, y: 0, w: 1, h: 1 };
      pushHistory();
      requestRender();
    });

    // 8. Geometry Orientation (Rotate / Flip)
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

    // 9. Undo / Redo / Reset All / Hold Compare
    document.getElementById('btn-undo').addEventListener('click', undo);
    document.getElementById('btn-redo').addEventListener('click', redo);

    document.getElementById('btn-reset-all').addEventListener('click', () => {
      state = structuredClone(DEFAULT_PARAMS);
      cropDraft = { x: 0, y: 0, w: 1, h: 1 };
      syncUIFromState();
      pushHistory();
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

    // 10. Zoom Controls
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

    // 11. Keyboard Shortcuts
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

    // 12. Export Modal
    const exportModal = document.getElementById('export-modal');
    const formatSelect = document.getElementById('export-format');
    const qualityRow = document.getElementById('export-quality-row');
    const qualitySlider = document.getElementById('export-quality');
    const qualityVal = document.getElementById('export-quality-val');

    document.getElementById('btn-export-open').addEventListener('click', () => {
      // Ensure crop tab preview isn't active during export resolution calculation
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

    // Temporarily ensure we render with committed crop and not compare mode
    const prevTab = activeTab;
    const prevCompare = isComparing;
    activeTab = 'color';
    isComparing = false;
    renderFrame();

    const mime = document.getElementById('export-format').value;
    const quality = parseInt(document.getElementById('export-quality').value, 10) / 100;
    const rawName = document.getElementById('export-filename').value.trim() || 'cineframegrade-graded';
    const extMap = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
    const ext = extMap[mime] || 'png';

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
    renderFrame();
  }

  // ==================== UTILITIES ====================
  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  // ==================== INITIALIZATION ====================
  initGrainTile();
  initCropInteractions();
  initCanvasFocusDrag();
  bindEvents();
  createSampleFrame();
})();

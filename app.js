/* =====================================================================
   app.js — Cropmark banner export bench
   ---------------------------------------------------------------------
   All resizing happens in the browser on a <canvas>. For every target
   size we create a canvas of the EXACT pixel dimensions, fit (or fill)
   the image inside it preserving aspect ratio, and pad the gaps with a
   blurred copy / solid color / transparency.
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- State ---------- */
  const state = {
    source: null,        // { canvas, width, height, fileName }
    settings: {
      fitMode:    APP_DEFAULTS.fitMode,
      bgMode:     APP_DEFAULTS.backgroundMode,
      format:     APP_DEFAULTS.format,
      jpgQuality: APP_DEFAULTS.jpgQuality,
    },
    results: [],         // [{ size, blob, url }]
  };

  /* ---------- Element refs ---------- */
  const $ = (id) => document.getElementById(id);
  const els = {
    dropzone:    $("dropzone"),
    fileInput:   $("fileInput"),
    preview:     $("preview"),
    previewImg:  $("previewImg"),
    previewName: $("previewName"),
    previewDims: $("previewDims"),
    sizeList:    $("sizeList"),
    selectAll:   $("selectAll"),
    fitMode:     $("fitMode"),
    bgMode:      $("bgMode"),
    format:      $("format"),
    qualityField:$("qualityField"),
    quality:     $("quality"),
    qualityVal:  $("qualityVal"),
    alert:       $("alert"),
    generateBtn: $("generateBtn"),
    zipBtn:      $("zipBtn"),
    grid:        $("grid"),
    emptyState:  $("emptyState"),
    outputCount: $("outputCount"),
  };

  /* =====================================================================
     INITIALISATION
     ===================================================================== */
  function init() {
    renderSizeList();
    setSegment(els.fitMode, state.settings.fitMode);
    setSegment(els.bgMode, state.settings.bgMode);
    setSegment(els.format, state.settings.format);
    els.quality.value = Math.round(state.settings.jpgQuality * 100);
    syncQualityUI();
    wireEvents();
  }

  function renderSizeList() {
    els.sizeList.innerHTML = "";
    PREDEFINED_SIZES.forEach((size, i) => {
      const id = "size-" + i;
      const row = document.createElement("label");
      row.className = "size-row";
      row.htmlFor = id;
      row.innerHTML =
        '<input type="checkbox" id="' + id + '" value="' + i + '">' +
        '<span class="size-row__label">' + escapeHtml(size.label) + '</span>' +
        '<span class="size-row__ar">' + aspectLabel(size.width, size.height) + '</span>';
      const cb = row.querySelector("input");
      cb.addEventListener("change", () => {
        row.classList.toggle("is-checked", cb.checked);
        updateSelectAllLabel();
      });
      els.sizeList.appendChild(row);
    });
  }

  function wireEvents() {
    // --- Dropzone ---
    els.dropzone.addEventListener("click", () => els.fileInput.click());
    els.dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); els.fileInput.click(); }
    });
    els.fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    });
    ["dragenter", "dragover"].forEach((ev) =>
      els.dropzone.addEventListener(ev, (e) => {
        e.preventDefault(); els.dropzone.classList.add("is-drag");
      })
    );
    ["dragleave", "dragend", "drop"].forEach((ev) =>
      els.dropzone.addEventListener(ev, () => els.dropzone.classList.remove("is-drag"))
    );
    els.dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleFile(file);
    });

    // --- Select all ---
    els.selectAll.addEventListener("click", () => {
      const boxes = sizeCheckboxes();
      const makeChecked = !boxes.every((b) => b.checked);
      boxes.forEach((b) => {
        b.checked = makeChecked;
        b.closest(".size-row").classList.toggle("is-checked", makeChecked);
      });
      updateSelectAllLabel();
    });

    // --- Segmented controls ---
    bindSegment(els.fitMode, (v) => { state.settings.fitMode = v; });
    bindSegment(els.bgMode,  (v) => { state.settings.bgMode = v; });
    bindSegment(els.format,  (v) => { state.settings.format = v; syncQualityUI(); });

    // --- Quality slider ---
    els.quality.addEventListener("input", () => {
      state.settings.jpgQuality = clamp(Number(els.quality.value) / 100, 0.1, 1);
      syncQualityUI();
    });

    // --- Actions ---
    els.generateBtn.addEventListener("click", generate);
    els.zipBtn.addEventListener("click", downloadZip);
  }

  /* =====================================================================
     UPLOAD / SOURCE
     ===================================================================== */
  function handleFile(file) {
    clearAlert();

    if (!file.type || !file.type.startsWith("image/")) {
      return showAlert("That file isn’t an image. Upload a PNG, JPG, or WEBP.");
    }

    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = function () {
      try {
        // Downscale very large uploads into a working canvas so the
        // browser doesn't choke on huge files.
        const max = APP_DEFAULTS.maxSourceDim;
        let w = img.naturalWidth, h = img.naturalHeight;
        let scale = 1;
        if (Math.max(w, h) > max) scale = max / Math.max(w, h);

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        state.source = {
          canvas: canvas,
          width: img.naturalWidth,     // report the ORIGINAL dimensions
          height: img.naturalHeight,
          fileName: file.name,
        };

        els.previewImg.src = url;       // preview the original file directly
        els.previewName.textContent = truncate(file.name, 28);
        els.previewDims.textContent = img.naturalWidth + " × " + img.naturalHeight + " px";
        els.preview.classList.add("is-on");
        els.generateBtn.disabled = false;
      } catch (err) {
        console.error(err);
        showAlert("Couldn’t process that image. Try a different file.");
      }
    };

    img.onerror = function () {
      URL.revokeObjectURL(url);
      showAlert("Couldn’t read that image. The file may be corrupt or unsupported.");
    };

    img.src = url;
  }

  /* =====================================================================
     GENERATE
     ===================================================================== */
  async function generate() {
    clearAlert();

    if (!state.source) return showAlert("Upload an image first.");

    const selected = sizeCheckboxes()
      .filter((b) => b.checked)
      .map((b) => PREDEFINED_SIZES[Number(b.value)]);

    if (selected.length === 0) return showAlert("Select at least one output size.");

    setBusy(true);
    revokeResults();
    state.results = [];

    try {
      // Yield to the browser so the spinner paints before heavy work.
      await nextFrame();

      for (const size of selected) {
        const canvas = renderToCanvas(size);
        const blob = await canvasToBlob(canvas);
        if (!blob) throw new Error("Export failed for " + size.label);
        state.results.push({ size, blob, url: URL.createObjectURL(blob) });
        await nextFrame(); // keep UI responsive between sizes
      }
      renderResults();
    } catch (err) {
      console.error(err);
      showAlert("Something went wrong while generating: " + (err.message || "unknown error") + ".");
    } finally {
      setBusy(false);
    }
  }

  /* ---------------------------------------------------------------------
     The actual resize. Returns a canvas of EXACTLY size.width × size.height.
     --------------------------------------------------------------------- */
  function renderToCanvas(size) {
    const src = state.source.canvas;
    const sw = src.width, sh = src.height;
    const tw = size.width, th = size.height;

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const fitMode = state.settings.fitMode;
    let bgMode = state.settings.bgMode;
    const isJpg = state.settings.format === "jpeg";

    // JPG has no alpha — transparent isn't possible, fall back to white.
    if (isJpg && bgMode === "transparent") bgMode = "white";

    if (fitMode === "fill") {
      // COVER: scale to fill, crop the overflow. No padding, so no bg needed.
      const scale = Math.max(tw / sw, th / sh);
      const dw = sw * scale, dh = sh * scale;
      const dx = (tw - dw) / 2, dy = (th - dh) / 2;
      const scaled = highQualityScale(src, dw, dh);
      ctx.drawImage(scaled, dx, dy);
      return canvas;
    }

    // FIT (contain): scale to fit inside, then pad the gaps.
    const scale = Math.min(tw / sw, th / sh);
    const dw = sw * scale, dh = sh * scale;
    const dx = (tw - dw) / 2, dy = (th - dh) / 2;
    const padded = dw < tw - 0.5 || dh < th - 0.5;

    if (padded) {
      if (bgMode === "blur") {
        paintBlurBackground(ctx, src, tw, th);
      } else if (bgMode === "color") {
        ctx.fillStyle = getAverageColor(src);
        ctx.fillRect(0, 0, tw, th);
      } else if (bgMode === "white") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, tw, th);
      }
      // "transparent" => leave canvas untouched (PNG keeps alpha)
    }

    const scaled = highQualityScale(src, dw, dh);
    ctx.drawImage(scaled, dx, dy);
    return canvas;
  }

  /* Blurred cover behind the fitted image. */
  function paintBlurBackground(ctx, src, tw, th) {
    const scale = Math.max(tw / src.width, th / src.height) * 1.15; // overscan
    const dw = src.width * scale, dh = src.height * scale;
    const dx = (tw - dw) / 2, dy = (th - dh) / 2;
    const blur = clamp(Math.round(Math.min(tw, th) * 0.06), 8, 48);

    ctx.save();
    ctx.filter = "blur(" + blur + "px)";
    ctx.drawImage(src, dx, dy, dw, dh);
    ctx.restore();

    // Slight darkening veil so the foreground stays readable.
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(0, 0, tw, th);
    ctx.restore();
  }

  /* Average color of the image (cheap, robust "auto" background). */
  function getAverageColor(src) {
    const c = document.createElement("canvas");
    c.width = 1; c.height = 1;
    const x = c.getContext("2d");
    x.drawImage(src, 0, 0, 1, 1);
    const d = x.getImageData(0, 0, 1, 1).data;
    return "rgb(" + d[0] + "," + d[1] + "," + d[2] + ")";
  }

  /* Progressive (stepped) downscale for crisp results on big reductions. */
  function highQualityScale(src, targetW, targetH) {
    targetW = Math.max(1, Math.round(targetW));
    targetH = Math.max(1, Math.round(targetH));
    let cur = src;
    let cw = src.width, ch = src.height;

    // Halve repeatedly until one more halving would undershoot the target.
    while (cw * 0.5 > targetW && ch * 0.5 > targetH) {
      const next = document.createElement("canvas");
      cw = Math.round(cw * 0.5);
      ch = Math.round(ch * 0.5);
      next.width = cw; next.height = ch;
      const nctx = next.getContext("2d");
      nctx.imageSmoothingEnabled = true;
      nctx.imageSmoothingQuality = "high";
      nctx.drawImage(cur, 0, 0, cw, ch);
      cur = next;
    }

    const out = document.createElement("canvas");
    out.width = targetW; out.height = targetH;
    const octx = out.getContext("2d");
    octx.imageSmoothingEnabled = true;
    octx.imageSmoothingQuality = "high";
    octx.drawImage(cur, 0, 0, targetW, targetH);
    return out;
  }

  function canvasToBlob(canvas) {
    const type = state.settings.format === "jpeg" ? "image/jpeg" : "image/png";
    const q = state.settings.format === "jpeg" ? state.settings.jpgQuality : undefined;
    return new Promise((resolve) => canvas.toBlob(resolve, type, q));
  }

  /* =====================================================================
     RESULTS UI
     ===================================================================== */
  function renderResults() {
    els.grid.innerHTML = "";
    const ext = state.settings.format === "jpeg" ? "jpg" : "png";

    state.results.forEach((res) => {
      const fileName = APP_DEFAULTS.filePrefix + res.size.label + "." + ext;
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML =
        '<div class="card__stage crop">' +
          '<span class="crop-bl"></span><span class="crop-br"></span>' +
          '<img alt="' + escapeHtml(res.size.label) + ' banner" />' +
        '</div>' +
        '<div class="card__foot">' +
          '<span class="card__spec"><b>' + escapeHtml(res.size.label) + '</b> ' +
            '<span class="card__dim">' + fmtBytes(res.blob.size) + '</span></span>' +
          '<button class="btn btn--ghost btn--sm" type="button">Download</button>' +
        '</div>';
      card.querySelector("img").src = res.url;
      card.querySelector("button").addEventListener("click", () =>
        downloadBlob(res.blob, fileName)
      );
      els.grid.appendChild(card);
    });

    els.grid.hidden = false;
    els.emptyState.style.display = "none";
    els.outputCount.textContent = state.results.length + " export" + (state.results.length === 1 ? "" : "s");
    els.zipBtn.disabled = state.results.length === 0;
  }

  /* =====================================================================
     DOWNLOADS
     ===================================================================== */
  function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadZip() {
    if (state.results.length === 0) return;
    if (typeof JSZip === "undefined") {
      return showAlert("ZIP library didn’t load (needs internet on first open). Use the individual Download buttons instead.");
    }
    clearAlert();
    const original = els.zipBtn.textContent;
    els.zipBtn.disabled = true;
    els.zipBtn.textContent = "Zipping…";
    try {
      const zip = new JSZip();
      const ext = state.settings.format === "jpeg" ? "jpg" : "png";
      state.results.forEach((res) => {
        zip.file(APP_DEFAULTS.filePrefix + res.size.label + "." + ext, res.blob);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, APP_DEFAULTS.zipName);
    } catch (err) {
      console.error(err);
      showAlert("Couldn’t build the ZIP. Try downloading banners individually.");
    } finally {
      els.zipBtn.disabled = false;
      els.zipBtn.textContent = original;
    }
  }

  /* =====================================================================
     SMALL HELPERS
     ===================================================================== */
  function sizeCheckboxes() {
    return Array.prototype.slice.call(els.sizeList.querySelectorAll('input[type="checkbox"]'));
  }
  function updateSelectAllLabel() {
    const boxes = sizeCheckboxes();
    const all = boxes.length > 0 && boxes.every((b) => b.checked);
    els.selectAll.textContent = all ? "Clear all" : "Select all";
  }

  function setSegment(group, value) {
    group.querySelectorAll("button").forEach((b) =>
      b.classList.toggle("is-on", b.dataset.val === value)
    );
  }
  function bindSegment(group, onChange) {
    group.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        setSegment(group, btn.dataset.val);
        onChange(btn.dataset.val);
      });
    });
  }

  function syncQualityUI() {
    const isJpg = state.settings.format === "jpeg";
    els.qualityField.style.display = isJpg ? "" : "none";
    els.qualityVal.textContent = Math.round(state.settings.jpgQuality * 100) + "%";
  }

  function setBusy(busy) {
    els.generateBtn.disabled = busy || !state.source;
    els.generateBtn.innerHTML = busy
      ? '<span class="spinner"></span> Generating…'
      : "Generate banners";
  }

  function showAlert(msg) {
    els.alert.textContent = msg;
    els.alert.classList.add("is-on");
  }
  function clearAlert() {
    els.alert.textContent = "";
    els.alert.classList.remove("is-on");
  }

  function revokeResults() {
    state.results.forEach((r) => URL.revokeObjectURL(r.url));
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }

  function aspectLabel(w, h) {
    const g = gcd(w, h);
    return (w / g) + ":" + (h / g);
  }
  function gcd(a, b) { return b ? gcd(b, a % b) : a; }

  function fmtBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(0) + " KB";
    return (n / 1024 / 1024).toFixed(1) + " MB";
  }
  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  /* ---------- Go ---------- */
  document.addEventListener("DOMContentLoaded", init);
})();

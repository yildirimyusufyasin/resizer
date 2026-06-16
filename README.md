# Cropmark — Banner Export Bench

Upload one banner image at any size and export it into a set of predefined
banner dimensions. The image is never stretched: it's scaled to preserve its
aspect ratio, centered on a canvas of the exact target size, and the empty
area is padded with a blurred copy, an auto-picked solid color, or
transparency. All resizing happens in your browser via `<canvas>` — nothing is
uploaded to a server.

## File structure

```
banner-resizer/
├── index.html          # markup: dropzone, controls, output grid
├── css/
│   └── styles.css      # all styling
├── js/
│   ├── config.js       # PREDEFINED_SIZES + default settings  ← edit this
│   └── app.js          # upload, canvas resizing, downloads, ZIP
└── README.md
```

## How to run locally

**Option A — just open it (simplest)**
Double-click `index.html`, or drag it into any modern browser
(Chrome, Edge, Firefox, Safari). It works straight from `file://`.

**Option B — local server (recommended)**
A tiny static server avoids any browser quirks with local files:

```bash
cd banner-resizer

# Python 3
python3 -m http.server 8000
# then open http://localhost:8000

# …or Node
npx serve .
```

> **Note on the ZIP feature:** "Download all (ZIP)" uses JSZip, loaded from a
> CDN, so it needs an internet connection the first time you open the page.
> Individual **Download** buttons work fully offline. To make ZIP work offline
> too, download `jszip.min.js` and point the `<script>` in `index.html` at a
> local copy.

## How to use

1. Drag a banner onto the upload area (or click to browse).
2. Tick the output sizes you want — or hit **Select all**.
3. (Optional) adjust fit mode, background, and export format.
4. Click **Generate banners**.
5. Download each banner individually, or **Download all (ZIP)**.

## Resizing behavior

- **Fit · no crop** (default) — the whole image is kept and scaled to fit
  inside the target. Leftover space is padded with the chosen background.
- **Fill · crop** — the image is scaled to cover the whole frame and the
  overflow is cropped. No padding.

Every export is exactly the target pixel size (e.g. `1200×628` is 1200×628 px),
and the image is never squeezed or stretched.

### Backgrounds (for the padded gaps in Fit mode)
- **Blurred** — a blurred, zoomed copy of the image.
- **Solid color** — the average color of the image.
- **Transparent** — PNG only; JPG falls back to white.

### Export
- **PNG** (default, lossless) or **JPG** (with a quality slider).
- Files are named `banner_<size>.<ext>`, e.g. `banner_1200x628.png`.
- The ZIP is named `resized_banners.zip`.

## Adding or removing sizes

Open `js/config.js` and edit the `PREDEFINED_SIZES` array. Each entry is just:

```js
{ width: 728, height: 90, label: "728x90" }
```

The UI, downloads, and ZIP all read from this one array, so adding a size is a
one-line change. Default settings (background mode, format, JPG quality, file
name prefix, ZIP name, large-image cap) live in the `APP_DEFAULTS` object in the
same file.

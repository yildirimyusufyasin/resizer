# Cropmark — Banner Export Bench

Upload one banner image at any size and export it into a set of predefined
banner dimensions. The image is never stretched: it's scaled to preserve its
aspect ratio, centered on a canvas of the exact target size, and the empty area
is padded with a blurred copy, an auto-picked solid color, or transparency.
All resizing happens in the browser via `<canvas>` — nothing is uploaded.

## File structure

```
banner-resizer/
├── index.html      # the entire app — HTML + CSS + JS in one file
└── README.md
```

Everything is in `index.html` on purpose: no build step and no external
`css/`/`js/` paths that can 404 when deployed. The only external dependency is
JSZip, loaded from a CDN, and it's only used by "Download all (ZIP)".

## Run locally

Just open `index.html` in any modern browser (double-click, or drag it into a
tab). Works straight from `file://`. For a server instead:

```bash
python3 -m http.server 8000   # then open http://localhost:8000
# or:  npx serve .
```

## Deploy to Vercel

Because it's a single static file, deployment is trivial:

- **Drag & drop:** drag the `banner-resizer` folder onto the Vercel dashboard's
  new-project area. Done.
- **CLI:** `cd banner-resizer && vercel` (accept the defaults), then
  `vercel --prod`.
- **Git import:** push to GitHub and import in Vercel. Set Framework Preset to
  **Other**; leave build command and output directory blank. If your repo nests
  the file under `banner-resizer/`, set **Root Directory** to `banner-resizer`.

No `vercel.json` needed. On Vercel the page is served over HTTPS, so the JSZip
CDN loads and "Download all (ZIP)" works for everyone.

## Output sizes

Grouped by category in the sidebar:

- **Social & display:** 1200×628, 1200×627, 350×350, 320×250
- **Static / GIF:** 320×50, 300×50, 480×320, 320×480
- **Video:** 1920×1080, 1080×1920

## Resizing behavior

- **Fit · no crop** (default) — keeps the whole image, scaled to fit inside the
  target; leftover space is padded with the chosen background.
- **Fill · crop** — scales to cover the whole frame and crops the overflow.

Every export is exactly the target pixel size, and the image is never squeezed.

### Backgrounds (padded gaps in Fit mode)
- **Blurred** — a blurred, zoomed copy of the image.
- **Solid** — the average color of the image.
- **Clear** — transparent (PNG only); JPG falls back to white.

### Export
- **PNG** (default, lossless) or **JPG** (with a quality slider).
- Files are named `banner_<size>.<ext>`, e.g. `banner_1200x628.png`.
- The ZIP is named `resized_banners.zip`.

## Adding or removing sizes

Open `index.html` and edit the `PREDEFINED_SIZES` array near the bottom (inside
the `<script>`). Each entry is:

```js
{ width: 728, height: 90, label: "728x90", category: "Static / GIF" }
```

`category` controls which group it appears under (a new category name just
creates a new group). The UI, downloads, and ZIP all read from this one array.
Defaults (background, format, JPG quality, file prefix, ZIP name, large-image
cap) live in the `APP_DEFAULTS` object right below it.

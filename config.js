/* =====================================================================
   config.js
   ---------------------------------------------------------------------
   Everything you'll want to tweak lives here.
   To add or remove an output size, just edit PREDEFINED_SIZES below.
   Each entry needs: width, height, label.
   ===================================================================== */

const PREDEFINED_SIZES = [
  { width: 1200, height: 628,  label: "1200x628"  },
  { width: 1200, height: 627,  label: "1200x627"  },
  { width: 320,  height: 50,   label: "320x50"    },
  { width: 320,  height: 250,  label: "320x250"   },
  { width: 350,  height: 350,  label: "350x350"   },
  { width: 1920, height: 1080, label: "1920x1080" },
  { width: 1080, height: 1920, label: "1080x1920" },
];

/* App defaults — change these if you want different starting states. */
const APP_DEFAULTS = {
  backgroundMode: "blur",   // "blur" | "color" | "transparent"
  fitMode:        "fit",    // "fit" (no crop) | "fill" (crop to fill)
  format:         "png",    // "png" | "jpeg"
  jpgQuality:     0.92,     // 0.1 – 1.0, only used for JPG
  zipName:        "resized_banners.zip",
  filePrefix:    "banner_", // banner_1200x628.png
  maxSourceDim:   6000,     // very large uploads are downscaled to this first
};

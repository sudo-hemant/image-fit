# Phase II Technical Plan: Image Tools Suite

## Overview

Phase II introduces three independent image processing tools as separate routes:
- `/crop-image` - Image cropping with presets and freeform
- `/resize-image` - Dimension-based image resizing
- `/compress-image` - Quality/size-based compression

Each tool is standalone, not part of a unified editor flow.

---

## Tool 1: Crop Image (`/crop-image`)

### Functional Specification

| Feature | Description |
|---------|-------------|
| Freeform crop | User draws any rectangle |
| Preset ratios | 1:1, 4:3, 16:9, A4 Portrait (1:√2), A4 Landscape (√2:1), Custom |
| Crop area manipulation | Drag to move, handles to resize, maintain ratio when locked |
| Rotation | 90° increments + fine rotation slider (-45° to +45°) |
| Real-time preview | Show cropped result live, apply only at export |

### Technical Architecture

#### Client-Side Processing ✅ (Primary)

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
├─────────────────────────────────────────────────────────┤
│  1. Image Load → Canvas (with EXIF correction)          │
│  2. Overlay canvas for crop UI (selection rectangle)    │
│  3. Transform matrix for rotation                       │
│  4. Export: Apply crop coords → new canvas → download   │
└─────────────────────────────────────────────────────────┘
```

**Why Client-Side Works:**
- Canvas `drawImage()` with source coordinates handles cropping natively
- Rotation via `ctx.rotate()` with translation offsets
- EXIF orientation readable via `exif-js` or manual JPEG parsing
- Memory: 4K image (4000×3000×4 bytes) ≈ 48MB — manageable

**Libraries:**
| Library | Purpose | Size |
|---------|---------|------|
| `react-image-crop` or `react-easy-crop` | Crop UI component | ~15KB |
| `exifr` | EXIF parsing (orientation, rotation) | ~20KB |
| None (native Canvas) | Actual crop/rotate operations | 0KB |

**Recommendation:** `react-easy-crop` — better maintained, cleaner API, supports rotation

#### Server-Side: Not Required for v1

**Exception triggers (future Phase II-C):**
- Image > 50MP (memory pressure on mobile)
- HEIC requiring server-side conversion (already handled in Phase I)

### EXIF Orientation Handling

```typescript
// Pseudocode for EXIF-aware loading
async function loadImageWithOrientation(file: File): Promise<HTMLCanvasElement> {
  const exif = await exifr.parse(file, ['Orientation']);
  const img = await createImageBitmap(file);

  // Apply orientation transform before displaying
  const canvas = applyExifOrientation(img, exif?.Orientation || 1);
  return canvas;
}
```

**Orientation values to handle:** 1 (normal), 3 (180°), 6 (90° CW), 8 (90° CCW)

### Quality Preservation Strategy

1. **Never re-encode during editing** — work on raw pixel data
2. **Single encode at export** — user chooses format (PNG lossless, JPEG 0.92)
3. **Integer pixel coordinates** — avoid subpixel interpolation artifacts
4. **Export at original resolution** — crop area scaled to source dimensions

---

## Tool 2: Resize Image (`/resize-image`)

### Functional Specification

| Feature | Description |
|---------|-------------|
| Resize by width | Enter width, auto-calculate height |
| Resize by height | Enter height, auto-calculate width |
| Resize by percentage | 25%, 50%, 75%, 100%, 150%, 200%, custom |
| Aspect ratio lock | Toggle linked/unlinked dimensions |
| Presets - Social | Instagram (1080×1080), Twitter (1200×675), Facebook Cover (851×315), YouTube Thumb (1280×720) |
| Presets - Print | 4×6" @300DPI (1200×1800), 5×7" (1500×2100), 8×10" (2400×3000), A4 (2480×3508) |
| DPI awareness | Show effective DPI, warn if <150 DPI for print presets |

### Technical Architecture

#### Client-Side Processing ✅ (Primary)

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
├─────────────────────────────────────────────────────────┤
│  1. Load image → get natural dimensions                 │
│  2. User inputs target size                             │
│  3. Preview: CSS transform (no actual resize yet)       │
│  4. Export: Canvas resize with high-quality algorithm   │
└─────────────────────────────────────────────────────────┘
```

**Why Client-Side Works:**
- Downscaling is CPU-light and Canvas handles it well
- `imageSmoothingQuality: 'high'` provides good results
- For better quality: step-down algorithm (halve dimensions iteratively)

**High-Quality Downscaling Algorithm:**

```typescript
function highQualityResize(
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  // Step-down approach: halve dimensions until close to target
  let current = source;

  while (current.width > targetWidth * 2) {
    const half = document.createElement('canvas');
    half.width = current.width / 2;
    half.height = current.height / 2;
    const ctx = half.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(current, 0, 0, half.width, half.height);
    current = half;
  }

  // Final resize to exact target
  const final = document.createElement('canvas');
  final.width = targetWidth;
  final.height = targetHeight;
  const ctx = final.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(current, 0, 0, targetWidth, targetHeight);

  return final;
}
```

#### Upscaling Guardrails

| Upscale Factor | Action |
|----------------|--------|
| ≤ 150% | Allow with no warning |
| 151% - 200% | Show warning: "Quality may degrade" |
| > 200% | Show strong warning, suggest AI upscaler (future feature) |

**Client-side limitations for upscaling:**
- Canvas upscaling is basic interpolation — results in blur
- True upscaling requires AI models (server-side, Phase II-C)

#### Server-Side: Optional Enhancement (Phase II-C)

**When to use server:**
- AI-powered upscaling (Real-ESRGAN, waifu2x)
- Images > 100MP (mobile memory limits)

**Libraries (Client):**
| Library | Purpose |
|---------|---------|
| `pica` | High-quality resize with Web Workers |
| Native Canvas | Fallback, simpler implementation |

**Recommendation:** Start with native Canvas + step-down algorithm. Add `pica` if quality complaints arise.

---

## Tool 3: Compress Image (`/compress-image`)

### Functional Specification

| Feature | Description |
|---------|-------------|
| Quality slider | 1-100 scale, format-specific behavior |
| Target file size | "Compress to under X KB/MB" |
| Format selection | Keep original, Convert to JPEG, Convert to WebP, Convert to PNG |
| Before/after comparison | Side-by-side or slider view with file sizes |
| Metadata options | Keep/strip EXIF, Keep/strip color profile |

### Technical Architecture

#### Client-Side Processing ✅ (Primary for JPEG/WebP)

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
├─────────────────────────────────────────────────────────┤
│  JPEG/WebP: canvas.toBlob(cb, 'image/jpeg', quality)    │
│  PNG: Cannot quality-compress (lossless format)         │
│  Target size: Binary search on quality parameter        │
└─────────────────────────────────────────────────────────┘
```

**Format-Specific Compression:**

| Format | Client Capability | Notes |
|--------|-------------------|-------|
| JPEG | ✅ Full control via quality param | 0.0 - 1.0 maps to compression level |
| WebP | ✅ Full control via quality param | Better compression than JPEG at same quality |
| PNG | ⚠️ Limited | Lossless only; can reduce colors (quantization) |

**Target File Size Algorithm:**

```typescript
async function compressToTargetSize(
  canvas: HTMLCanvasElement,
  targetBytes: number,
  format: 'image/jpeg' | 'image/webp',
  minQuality = 0.1,
  maxQuality = 0.95
): Promise<Blob> {
  let low = minQuality;
  let high = maxQuality;
  let bestBlob: Blob | null = null;

  // Binary search for optimal quality
  for (let i = 0; i < 8; i++) { // 8 iterations = 1/256 precision
    const mid = (low + high) / 2;
    const blob = await canvasToBlob(canvas, format, mid);

    if (blob.size <= targetBytes) {
      bestBlob = blob;
      low = mid; // Try higher quality
    } else {
      high = mid; // Need lower quality
    }
  }

  return bestBlob || await canvasToBlob(canvas, format, minQuality);
}
```

#### PNG Compression: Requires Special Handling

**Client-side options:**
1. **Color quantization** — Reduce to 256 colors (PNG-8) via `pngquant` WASM
2. **Metadata stripping** — Remove chunks (tEXt, iTXt, etc.)

**Library:** `pngquant-wasm` or `upng-js` for PNG optimization

#### Server-Side: Recommended for Advanced Compression

**When server is beneficial:**
| Scenario | Reason |
|----------|--------|
| PNG optimization | `pngquant` CLI is 5x faster than WASM |
| Very large images | Memory pressure on mobile |
| MozJPEG encoding | 10-15% better compression than Canvas JPEG |
| AVIF output | No browser encoding API yet |

**Server stack recommendation:**
```
Node.js + Sharp (libvips bindings)
├── JPEG: MozJPEG encoder
├── PNG: pngquant + oxipng
├── WebP: libwebp
└── AVIF: libavif (future)
```

### Before/After Comparison UI

```
┌─────────────────────────────────────────────────────────┐
│  Original: 2.4 MB          Compressed: 340 KB (86%↓)   │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┬──────────────┐                       │
│  │              │              │  ← Drag slider        │
│  │   Original   │  Compressed  │                       │
│  │              │              │                       │
│  └──────────────┴──────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

---

## Client vs Server Decision Matrix

| Factor | Client-Side | Server-Side |
|--------|-------------|-------------|
| **Image size** | < 50MP | > 50MP |
| **Device** | Desktop/modern mobile | Low-memory mobile |
| **Operation** | Crop, resize (down), JPEG/WebP compress | PNG optimize, AI upscale, AVIF |
| **Latency requirement** | < 2s acceptable | Async processing OK |
| **Privacy concern** | High (no upload) | Lower |

### Decision Flowchart

```
START
  │
  ├─ Image > 50MP? ───────────────────────────→ SERVER
  │
  ├─ Operation = PNG optimization? ───────────→ SERVER (or WASM fallback)
  │
  ├─ Operation = AI upscaling? ───────────────→ SERVER
  │
  ├─ Device RAM < 2GB? ───────────────────────→ SERVER
  │
  └─ Otherwise ───────────────────────────────→ CLIENT
```

---

## Rollout Plan

### Phase II-A: Client-Only MVP (Week 1-2)

**What Ships:**
| Tool | Features | Deferred |
|------|----------|----------|
| `/crop-image` | Freeform, presets (1:1, 4:3, 16:9, A4), drag/resize | Rotation, EXIF orientation |
| `/resize-image` | Width/height input, aspect lock, social presets | Print presets, DPI warnings, pica |
| `/compress-image` | JPEG quality slider, before/after size display | Target size, PNG, WebP, metadata |

**Technical Scope:**
- React Router for routing
- Shared components: FileUpload (from Phase I), DownloadButton
- New components per tool
- All processing via native Canvas API

**Deferred (Why):**
- Rotation adds complexity to crop math
- EXIF handling requires library integration
- PNG/WebP compression needs format detection logic
- Target size needs binary search implementation

### Phase II-B: Feature Complete (Week 3-4)

**What Ships:**
| Tool | New Features |
|------|--------------|
| `/crop-image` | 90° rotation, EXIF auto-orientation, custom ratio input |
| `/resize-image` | Print presets with DPI, percentage resize, upscale warnings |
| `/compress-image` | WebP support, target file size, metadata strip option |

**Technical Additions:**
- `exifr` for EXIF parsing
- Binary search for target size compression
- DPI calculation and warning UI

### Phase II-C: Optimization & Edge Cases (Week 5-6)

**What Ships:**
| Enhancement | Scope |
|-------------|-------|
| Web Worker offloading | Move resize/compress to worker thread |
| Memory management | Canvas cleanup, blob URL revocation |
| Mobile Safari fixes | Specific handling for iOS memory limits |
| Error boundaries | Graceful failure UI |
| Optional server mode | For images > 50MP or PNG optimization |

**Server API Design (if needed):**
```
POST /api/process
Content-Type: multipart/form-data

{
  file: <binary>,
  operation: "resize" | "compress" | "crop",
  params: { ... operation-specific ... }
}

Response:
  - 200: { url: "signed-url-to-result", expiresIn: 3600 }
  - 202: { jobId: "...", statusUrl: "/api/status/{jobId}" }  // async
```

---

## Edge Cases & Mitigations

### Very Large Images (4K, 8K, DSLR — 20-100MP)

| Scenario | Mitigation |
|----------|------------|
| Canvas memory limit (iOS Safari ~256MB) | Detect before load; offer to resize first |
| Slow processing | Show progress indicator; use Web Worker |
| Browser tab crash | Auto-save to IndexedDB; recovery prompt |

**Detection:**
```typescript
function estimateMemoryUsage(width: number, height: number): number {
  // 4 bytes per pixel (RGBA) × 2 canvases (source + destination)
  return width * height * 4 * 2;
}

const MAX_SAFE_MEMORY = 256 * 1024 * 1024; // 256MB for iOS
if (estimateMemoryUsage(img.width, img.height) > MAX_SAFE_MEMORY) {
  // Offer to downsample or use server processing
}
```

### Very Small Images (< 100px)

| Scenario | Mitigation |
|----------|------------|
| Crop area too small to manipulate | Minimum crop size: 20×20px |
| Resize upscaling | Strong warning; block > 10x upscale |
| Compression pointless | Show message: "Image already optimized" |

### Transparent PNGs

| Scenario | Mitigation |
|----------|------------|
| JPEG export loses transparency | Warn user; offer PNG/WebP as alternatives |
| White background on crop preview | Show checkered transparency pattern |
| Compression to JPEG | Force background color or block conversion |

**Transparency detection:**
```typescript
function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')!;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}
```

### Mobile Safari & Low-Memory Devices

| Issue | Mitigation |
|-------|------------|
| Canvas size limits | Max 4096×4096 on older iOS; detect and warn |
| Memory pressure | Process in chunks; aggressive cleanup |
| No Web Worker SharedArrayBuffer | Use transferable objects instead |

### Repeated Edits in One Session

| Issue | Mitigation |
|-------|------------|
| Memory leaks from Blob URLs | `URL.revokeObjectURL()` on every new operation |
| Canvas accumulation | Nullify and let GC collect between operations |
| Undo/redo expectations | v1: No undo. v2: Consider state history |

---

## Key Tradeoffs Summary

| Decision | Chosen Approach | Alternative | Rationale |
|----------|-----------------|-------------|-----------|
| Crop library | `react-easy-crop` | Custom Canvas | Faster dev; battle-tested touch support |
| Resize algorithm | Step-down + Canvas | `pica` | Simpler; add pica only if quality issues |
| JPEG compression | Native `toBlob()` | MozJPEG WASM | 90% as good; zero bundle cost |
| PNG compression | Defer to Phase II-C | `upng-js` | Complex; limited user value |
| Server processing | Opt-in for edge cases | Required for all | Privacy; simplicity |
| State management | React `useState` | Redux/Zustand | Overkill for isolated tools |

---

## Implementation Order

```
1. Routing setup (React Router)
2. /resize-image (simplest — no UI overlay complexity)
3. /compress-image (builds on resize canvas patterns)
4. /crop-image (most complex — interactive overlay)
```

**Rationale:**
- Resize is a gateway feature; lowest complexity
- Compress shares canvas export logic with resize
- Crop requires custom UI overlay, touch handling, transforms

---

## File Structure Addition (Phase II)

```
src/
├── pages/
│   ├── Home.tsx              # Landing with links to tools (existing becomes this)
│   ├── FitImage.tsx          # Phase I (moved from App.tsx)
│   ├── CropImage.tsx         # New
│   ├── ResizeImage.tsx       # New
│   └── CompressImage.tsx     # New
├── components/
│   ├── ... existing ...
│   ├── CropOverlay.tsx       # Crop selection UI
│   ├── DimensionInput.tsx    # Width/height with lock
│   ├── QualitySlider.tsx     # Compression control
│   └── ComparisonView.tsx    # Before/after slider
├── utils/
│   ├── canvas.ts             # Shared canvas utilities
│   ├── exif.ts               # EXIF parsing helpers
│   └── compression.ts        # Format-specific compression
└── hooks/
    ├── useImageLoad.ts       # Load + EXIF orientation
    └── useMemoryGuard.ts     # Memory limit detection
```

---

## Decisions Made

| Question | Decision |
|----------|----------|
| Server processing | Deferred to future phase (Phase III+) |
| PNG compression | Deferred — v1 offers PNG→JPEG/WebP conversion only |
| AI upscaling | No — out of scope |
| Undo/redo | Ignored for now |
| Analytics | No for now |

---

## Finalized Scope for Phase II

### In Scope (Client-Side Only)
- All three tools: crop, resize, compress
- JPEG and WebP compression with quality control
- PNG supported as input/output (no optimization slider)
- EXIF orientation handling
- Memory guards for large images
- Mobile Safari compatibility

### Out of Scope (Deferred)
- Server-side processing
- PNG-specific optimization/quantization
- AI upscaling
- Edit history / undo-redo
- Analytics

---

*Document version: 1.1*
*Last updated: Phase II Planning — Decisions Finalized*

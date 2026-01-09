import { useState, useCallback, useRef, useEffect } from 'react';
import { FileUpload } from '../components/FileUpload';
import { Header } from '../components/Header';
import { loadImage, isHeicFile } from '../processor';

type ResizeMode = 'dimensions' | 'percentage' | 'preset';

interface Preset {
  name: string;
  width: number;
  height: number;
  category: 'social' | 'print';
}

const PRESETS: Preset[] = [
  // Social media
  { name: 'Instagram Post', width: 1080, height: 1080, category: 'social' },
  { name: 'Instagram Story', width: 1080, height: 1920, category: 'social' },
  { name: 'Twitter Post', width: 1200, height: 675, category: 'social' },
  { name: 'Facebook Cover', width: 851, height: 315, category: 'social' },
  { name: 'YouTube Thumbnail', width: 1280, height: 720, category: 'social' },
  { name: 'LinkedIn Banner', width: 1584, height: 396, category: 'social' },
  // Print (at 300 DPI)
  { name: '4x6" Photo', width: 1200, height: 1800, category: 'print' },
  { name: '5x7" Photo', width: 1500, height: 2100, category: 'print' },
  { name: '8x10" Photo', width: 2400, height: 3000, category: 'print' },
  { name: 'A4 (300 DPI)', width: 2480, height: 3508, category: 'print' },
];

const PERCENTAGE_OPTIONS = [25, 50, 75, 100, 125, 150, 200];

export function ResizeImage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConvertingHeic, setIsConvertingHeic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resize controls
  const [resizeMode, setResizeMode] = useState<ResizeMode>('dimensions');
  const [targetWidth, setTargetWidth] = useState<number>(0);
  const [targetHeight, setTargetHeight] = useState<number>(0);
  const [percentage, setPercentage] = useState<number>(100);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);

  // Output
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('jpeg');
  const [isResizing, setIsResizing] = useState(false);

  // Refs for debouncing and cleanup
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    };
  }, []);

  // Calculate effective dimensions based on mode
  const getEffectiveDimensions = useCallback((): { width: number; height: number } => {
    if (!originalImage) return { width: 0, height: 0 };

    const origW = originalImage.naturalWidth;
    const origH = originalImage.naturalHeight;
    const aspectRatio = origW / origH;

    switch (resizeMode) {
      case 'dimensions':
        if (lockAspectRatio) {
          // Use width as primary, calculate height
          return {
            width: targetWidth,
            height: Math.round(targetWidth / aspectRatio),
          };
        }
        return { width: targetWidth, height: targetHeight };
      case 'percentage':
        return {
          width: Math.round(origW * (percentage / 100)),
          height: Math.round(origH * (percentage / 100)),
        };
      case 'preset':
        if (selectedPreset) {
          return { width: selectedPreset.width, height: selectedPreset.height };
        }
        return { width: origW, height: origH };
      default:
        return { width: origW, height: origH };
    }
  }, [originalImage, resizeMode, targetWidth, targetHeight, percentage, lockAspectRatio, selectedPreset]);

  // High-quality resize using step-down algorithm
  const resizeImage = useCallback((
    source: HTMLImageElement,
    targetW: number,
    targetH: number
  ): HTMLCanvasElement => {
    const origW = source.naturalWidth;
    const origH = source.naturalHeight;

    // Create source canvas
    let currentCanvas = document.createElement('canvas');
    currentCanvas.width = origW;
    currentCanvas.height = origH;
    const currentCtx = currentCanvas.getContext('2d')!;
    currentCtx.drawImage(source, 0, 0);

    // Step-down algorithm for high-quality downscaling
    while (currentCanvas.width > targetW * 2 || currentCanvas.height > targetH * 2) {
      const halfW = Math.max(Math.floor(currentCanvas.width / 2), targetW);
      const halfH = Math.max(Math.floor(currentCanvas.height / 2), targetH);

      const halfCanvas = document.createElement('canvas');
      halfCanvas.width = halfW;
      halfCanvas.height = halfH;
      const halfCtx = halfCanvas.getContext('2d')!;
      halfCtx.imageSmoothingEnabled = true;
      halfCtx.imageSmoothingQuality = 'high';
      halfCtx.drawImage(currentCanvas, 0, 0, halfW, halfH);

      currentCanvas = halfCanvas;
    }

    // Final resize to exact target
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = targetW;
    finalCanvas.height = targetH;
    const finalCtx = finalCanvas.getContext('2d')!;
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(currentCanvas, 0, 0, targetW, targetH);

    return finalCanvas;
  }, []);

  // Debounced resize processing - takes dimensions as parameters to avoid stale closures
  const processResize = useCallback((width: number, height: number) => {
    if (!originalImage || width <= 0 || height <= 0) return;

    setIsResizing(true);

    // Clear existing timeout
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    // Debounce the actual resize operation
    resizeTimeoutRef.current = setTimeout(() => {
      const canvas = resizeImage(originalImage, width, height);
      resizedCanvasRef.current = canvas;

      // Revoke old URL using ref (avoids stale closure)
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      // Create preview URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          previewUrlRef.current = url;
          setPreviewUrl(url);
        }
        setIsResizing(false);
      }, 'image/jpeg', 0.85);
    }, 300); // 300ms debounce
  }, [originalImage, resizeImage]);

  // Trigger resize when dimensions change
  useEffect(() => {
    if (!originalImage) return;

    const { width, height } = getEffectiveDimensions();
    if (width > 0 && height > 0) {
      processResize(width, height);
    }
  }, [originalImage, getEffectiveDimensions, processResize]);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setOriginalFile(file);
    setPreviewUrl(null);
    resizedCanvasRef.current = null;

    const needsHeicConversion = isHeicFile(file);
    if (needsHeicConversion) {
      setIsConvertingHeic(true);
    }

    try {
      const image = await loadImage(file);
      setIsConvertingHeic(false);
      setOriginalImage(image);

      // Initialize dimensions
      setTargetWidth(image.naturalWidth);
      setTargetHeight(image.naturalHeight);
      setPercentage(100);
      setSelectedPreset(null);
      setResizeMode('dimensions');
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load image');
      setOriginalFile(null);
    } finally {
      setIsProcessing(false);
      setIsConvertingHeic(false);
    }
  }, []);

  const handleWidthChange = useCallback((value: number) => {
    const newWidth = Math.max(1, Math.min(10000, value || 1));
    setTargetWidth(newWidth);
    if (lockAspectRatio && originalImage) {
      const aspectRatio = originalImage.naturalWidth / originalImage.naturalHeight;
      setTargetHeight(Math.round(newWidth / aspectRatio));
    }
  }, [lockAspectRatio, originalImage]);

  const handleHeightChange = useCallback((value: number) => {
    const newHeight = Math.max(1, Math.min(10000, value || 1));
    setTargetHeight(newHeight);
    if (lockAspectRatio && originalImage) {
      const aspectRatio = originalImage.naturalWidth / originalImage.naturalHeight;
      setTargetWidth(Math.round(newHeight * aspectRatio));
    }
  }, [lockAspectRatio, originalImage]);

  const handlePresetSelect = useCallback((preset: Preset) => {
    setSelectedPreset(preset);
    setResizeMode('preset');
    setTargetWidth(preset.width);
    setTargetHeight(preset.height);
    setLockAspectRatio(false);
  }, []);

  const handlePercentageChange = useCallback((pct: number) => {
    setPercentage(pct);
    setResizeMode('percentage');
  }, []);

  const handleDownload = useCallback(async () => {
    if (!resizedCanvasRef.current || !originalFile) return;

    const mimeType = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = exportFormat === 'jpeg' ? 0.92 : undefined;
    const { width, height } = getEffectiveDimensions();

    resizedCanvasRef.current.toBlob(
      (blob) => {
        if (!blob) return;

        const baseName = originalFile.name.replace(/\.[^/.]+$/, '');
        const ext = exportFormat === 'jpeg' ? 'jpg' : 'png';
        const filename = `${baseName}-${width}x${height}.${ext}`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },
      mimeType,
      quality
    );
  }, [originalFile, exportFormat, getEffectiveDimensions]);

  const handleReset = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
    setOriginalFile(null);
    setOriginalImage(null);
    setPreviewUrl(null);
    previewUrlRef.current = null;
    resizedCanvasRef.current = null;
    setError(null);
    setTargetWidth(0);
    setTargetHeight(0);
    setPercentage(100);
    setSelectedPreset(null);
  }, []);

  const effectiveDims = getEffectiveDimensions();
  const scaleFactor = originalImage ? effectiveDims.width / originalImage.naturalWidth : 1;
  const isUpscaling = scaleFactor > 1;

  return (
    <div className="app">
      <Header />

      <main className="main">
        <div className="container">
          {!originalImage && !isProcessing && !error ? (
            <section className="upload-section">
              <div className="intro">
                <h2>Resize Image</h2>
                <p className="intro-desc">Change image dimensions by width, height, percentage, or use presets for social media and print.</p>
              </div>

              <div className="intro">
                <h2>How it works</h2>
                <div className="steps">
                  <div className="step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <h3>Upload</h3>
                      <p>Drop or select any image (JPG, PNG, WebP)</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <h3>Set Size</h3>
                      <p>Enter dimensions or choose a percentage</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>Download</h3>
                      <p>Get your perfectly resized image</p>
                    </div>
                  </div>
                </div>
              </div>

              <FileUpload onFileSelect={handleFileSelect} disabled={isProcessing} />

              <div className="features">
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>High-quality downscaling</span>
                </div>
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Social media & print presets</span>
                </div>
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Aspect ratio lock</span>
                </div>
              </div>
            </section>
          ) : (
            <section className="result-section resize-simple-layout">
              {error && (
                <div className="error-message" role="alert">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {(isProcessing || isConvertingHeic) && (
                <div className="preview-loading">
                  <div className="spinner"></div>
                  <p>{isConvertingHeic ? 'Converting HEIC image...' : 'Processing...'}</p>
                </div>
              )}

              {originalImage && !isProcessing && (
                <div className="resize-simple-grid">
                  {/* LEFT: Large Preview Area */}
                  <div className="simple-preview-area">
                    {/* Size info above image */}
                    <div className="size-info-bar">
                      <div className="size-original">
                        <span className="size-label">Original</span>
                        <span className="size-value">{originalImage.naturalWidth} × {originalImage.naturalHeight}</span>
                      </div>
                      <div className="size-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </div>
                      <div className="size-new">
                        <span className="size-label">New size</span>
                        <span className="size-value">{effectiveDims.width} × {effectiveDims.height}</span>
                      </div>
                    </div>

                    <div className="preview-image-wrapper">
                      {previewUrl ? (
                        <div className="image-with-info">
                          <img
                            src={previewUrl}
                            alt="Your image preview"
                            style={{ opacity: isResizing ? 0.5 : 1 }}
                          />
                          {isResizing && (
                            <div className="updating-overlay">
                              <div className="spinner"></div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="preview-loader">
                          <div className="spinner"></div>
                          <p>Loading preview...</p>
                        </div>
                      )}
                    </div>
                    {/* Reset link at bottom */}
                    <button className="reset-link" onClick={handleReset}>
                      ← Choose a different image
                    </button>
                  </div>

                  {/* RIGHT: Resize Options Panel */}
                  <div className="simple-options-panel">
                    <h2 className="options-title">Resize options</h2>

                    {/* Resize Mode */}
                    <div className="resize-controls-simple">
                      <p className="helper-text">Resize by:</p>
                      <div className="aspect-grid">
                        <button
                          className={`aspect-btn-new ${resizeMode === 'dimensions' ? 'active' : ''}`}
                          onClick={() => setResizeMode('dimensions')}
                        >
                          Pixels
                        </button>
                        <button
                          className={`aspect-btn-new ${resizeMode === 'percentage' ? 'active' : ''}`}
                          onClick={() => setResizeMode('percentage')}
                        >
                          Percentage
                        </button>
                      </div>
                    </div>

                    {/* Pixel Mode Controls */}
                    {resizeMode === 'dimensions' && (
                      <div className="resize-controls-simple">
                        <p className="helper-text">Resize your image to an exact size:</p>

                        <div className="dimension-field">
                          <label>Width (px):</label>
                          <input
                            type="number"
                            value={targetWidth}
                            onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                          />
                        </div>

                        <div className="dimension-field">
                          <label>Height (px):</label>
                          <input
                            type="number"
                            value={lockAspectRatio ? Math.round(targetWidth / (originalImage.naturalWidth / originalImage.naturalHeight)) : targetHeight}
                            onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                            disabled={lockAspectRatio}
                          />
                        </div>

                        <label className="checkbox-option" onClick={() => setLockAspectRatio(!lockAspectRatio)}>
                          <span className={`checkbox ${lockAspectRatio ? 'checked' : ''}`}>
                            {lockAspectRatio && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                          </span>
                          <span>Maintain aspect ratio</span>
                        </label>
                      </div>
                    )}

                    {/* Percentage Mode Controls */}
                    {resizeMode === 'percentage' && (
                      <div className="resize-controls-simple">
                        <p className="helper-text">Choose percentage:</p>
                        <div className="aspect-grid">
                          {PERCENTAGE_OPTIONS.map((pct) => (
                            <button
                              key={pct}
                              className={`aspect-btn-new ${percentage === pct ? 'active' : ''}`}
                              onClick={() => handlePercentageChange(pct)}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Percentage */}
                    {resizeMode === 'percentage' && (
                      <div className="resize-controls-simple">
                        <p className="helper-text">Or enter custom:</p>
                        <div className="custom-pct-input">
                          <input
                            type="number"
                            value={percentage}
                            onChange={(e) => handlePercentageChange(parseInt(e.target.value) || 100)}
                            min="1"
                            max="500"
                          />
                          <span className="unit">%</span>
                        </div>
                      </div>
                    )}

                    {/* Preset Mode Controls */}
                    {resizeMode === 'preset' && (
                      <div className="resize-controls-simple presets-scroll">
                        <p className="helper-text">Choose a preset size:</p>

                        <div className="preset-category">
                          <span className="category-name">Social Media</span>
                          {PRESETS.filter((p) => p.category === 'social').map((preset) => (
                            <button
                              key={preset.name}
                              className={`preset-option ${selectedPreset?.name === preset.name ? 'active' : ''}`}
                              onClick={() => handlePresetSelect(preset)}
                            >
                              <span className="preset-title">{preset.name}</span>
                              <span className="preset-size">{preset.width} × {preset.height}</span>
                            </button>
                          ))}
                        </div>

                        <div className="preset-category">
                          <span className="category-name">Print</span>
                          {PRESETS.filter((p) => p.category === 'print').map((preset) => (
                            <button
                              key={preset.name}
                              className={`preset-option ${selectedPreset?.name === preset.name ? 'active' : ''}`}
                              onClick={() => handlePresetSelect(preset)}
                            >
                              <span className="preset-title">{preset.name}</span>
                              <span className="preset-size">{preset.width} × {preset.height}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Warning */}
                    {isUpscaling && scaleFactor > 1.5 && (
                      <div className="quality-warning">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>Making the image bigger may reduce quality</span>
                      </div>
                    )}

                    {/* Output Format */}
                    <div className="format-section">
                      <p className="helper-text">Output format:</p>
                      <div className="format-toggle-btns">
                        <button
                          className={`format-toggle-btn ${exportFormat === 'jpeg' ? 'active' : ''}`}
                          onClick={() => setExportFormat('jpeg')}
                        >
                          JPEG
                        </button>
                        <button
                          className={`format-toggle-btn ${exportFormat === 'png' ? 'active' : ''}`}
                          onClick={() => setExportFormat('png')}
                        >
                          PNG
                        </button>
                      </div>
                      <p className="format-hint">
                        {exportFormat === 'png'
                          ? 'Lossless quality, larger file size'
                          : 'Smaller file, works everywhere'}
                      </p>
                    </div>

                    {/* Download Section */}
                    <div className="download-section-simple">
                      <button
                        className="big-download-btn"
                        onClick={handleDownload}
                        disabled={!previewUrl || isResizing}
                      >
                        Resize IMAGE
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 8v8M8 12l4 4 4-4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>Your images are processed locally in your browser. Nothing is uploaded to any server.</p>
      </footer>
    </div>
  );
}

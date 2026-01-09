import { useState, useCallback, useRef, useEffect } from 'react';
import { FileUpload } from '../components/FileUpload';
import { Header } from '../components/Header';
import { loadImage, isHeicFile } from '../processor';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AspectRatioPreset {
  name: string;
  ratio: number | null; // null = freeform
  label: string;
}

const ASPECT_PRESETS: AspectRatioPreset[] = [
  { name: 'free', ratio: null, label: 'Free' },
  { name: '1:1', ratio: 1, label: '1:1' },
  { name: '4:3', ratio: 4 / 3, label: '4:3' },
  { name: '3:4', ratio: 3 / 4, label: '3:4' },
  { name: '16:9', ratio: 16 / 9, label: '16:9' },
  { name: '9:16', ratio: 9 / 16, label: '9:16' },
  { name: 'a4-portrait', ratio: 1 / Math.sqrt(2), label: 'A4 Portrait' },
  { name: 'a4-landscape', ratio: Math.sqrt(2), label: 'A4 Landscape' },
];

export function CropImage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConvertingHeic, setIsConvertingHeic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crop controls
  const [selectedPreset, setSelectedPreset] = useState<AspectRatioPreset>(ASPECT_PRESETS[0]);
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [rotation, setRotation] = useState<number>(0);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg'>('jpeg');

  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate display scale - start with a small scale to prevent initial overflow
  const [displayScale, setDisplayScale] = useState(0.1);

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [imageUrl]);

  // Calculate display scale when image loads or container resizes
  useEffect(() => {
    if (!originalImage) return;

    const updateScale = () => {
      // Use fixed max dimensions for the preview area
      const maxWidth = 550;
      const maxHeight = 380;
      const scaleX = maxWidth / originalImage.naturalWidth;
      const scaleY = maxHeight / originalImage.naturalHeight;
      setDisplayScale(Math.min(scaleX, scaleY, 1));
    };

    // Calculate immediately
    updateScale();

    // Update on window resize
    window.addEventListener('resize', updateScale);

    return () => {
      window.removeEventListener('resize', updateScale);
    };
  }, [originalImage]);

  // Initialize crop area when image loads
  useEffect(() => {
    if (originalImage) {
      const w = originalImage.naturalWidth;
      const h = originalImage.naturalHeight;

      let cropW = w * 0.8;
      let cropH = h * 0.8;

      if (selectedPreset.ratio) {
        if (cropW / cropH > selectedPreset.ratio) {
          cropW = cropH * selectedPreset.ratio;
        } else {
          cropH = cropW / selectedPreset.ratio;
        }
      }

      setCropArea({
        x: (w - cropW) / 2,
        y: (h - cropH) / 2,
        width: cropW,
        height: cropH,
      });
    }
  }, [originalImage, selectedPreset.ratio]);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setOriginalFile(file);
    setRotation(0);

    // Cleanup old URL
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }

    const needsHeicConversion = isHeicFile(file);
    if (needsHeicConversion) {
      setIsConvertingHeic(true);
    }

    try {
      const image = await loadImage(file);
      setIsConvertingHeic(false);
      setOriginalImage(image);

      // Create a display URL by drawing to canvas and converting to blob
      // This is needed because loadImage revokes its internal URL
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setImageUrl(url);
        }
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load image');
      setOriginalFile(null);
    } finally {
      setIsProcessing(false);
      setIsConvertingHeic(false);
    }
  }, [imageUrl]);

  const handlePresetChange = useCallback((preset: AspectRatioPreset) => {
    setSelectedPreset(preset);

    if (originalImage && preset.ratio) {
      const w = originalImage.naturalWidth;
      const h = originalImage.naturalHeight;

      let newW = cropArea.width;
      let newH = cropArea.height;

      if (newW / newH > preset.ratio) {
        newW = newH * preset.ratio;
      } else {
        newH = newW / preset.ratio;
      }

      const centerX = cropArea.x + cropArea.width / 2;
      const centerY = cropArea.y + cropArea.height / 2;

      const newX = Math.max(0, Math.min(w - newW, centerX - newW / 2));
      const newY = Math.max(0, Math.min(h - newH, centerY - newH / 2));

      setCropArea({
        x: newX,
        y: newY,
        width: newW,
        height: newH,
      });
    }
  }, [originalImage, cropArea]);

  const handleRotate = useCallback((degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (handle) {
      setIsResizing(handle);
    } else {
      setIsDragging(true);
    }
    setDragStart({ x: e.clientX, y: e.clientY });
    setCropStart({ ...cropArea });
  }, [cropArea]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;
    if (!originalImage) return;

    const deltaX = (e.clientX - dragStart.x) / displayScale;
    const deltaY = (e.clientY - dragStart.y) / displayScale;

    const imgW = originalImage.naturalWidth;
    const imgH = originalImage.naturalHeight;

    if (isDragging) {
      const newX = Math.max(0, Math.min(imgW - cropStart.width, cropStart.x + deltaX));
      const newY = Math.max(0, Math.min(imgH - cropStart.height, cropStart.y + deltaY));

      setCropArea({
        ...cropStart,
        x: newX,
        y: newY,
      });
    } else if (isResizing) {
      let newArea = { ...cropStart };

      switch (isResizing) {
        case 'se':
          newArea.width = Math.max(50, Math.min(imgW - cropStart.x, cropStart.width + deltaX));
          newArea.height = Math.max(50, Math.min(imgH - cropStart.y, cropStart.height + deltaY));
          break;
        case 'sw': {
          const newWidth = Math.max(50, cropStart.width - deltaX);
          newArea.x = cropStart.x + cropStart.width - newWidth;
          newArea.width = newWidth;
          newArea.height = Math.max(50, Math.min(imgH - cropStart.y, cropStart.height + deltaY));
          if (newArea.x < 0) {
            newArea.width += newArea.x;
            newArea.x = 0;
          }
          break;
        }
        case 'ne': {
          newArea.width = Math.max(50, Math.min(imgW - cropStart.x, cropStart.width + deltaX));
          const newHeight = Math.max(50, cropStart.height - deltaY);
          newArea.y = cropStart.y + cropStart.height - newHeight;
          newArea.height = newHeight;
          if (newArea.y < 0) {
            newArea.height += newArea.y;
            newArea.y = 0;
          }
          break;
        }
        case 'nw': {
          const newWidth = Math.max(50, cropStart.width - deltaX);
          const newHeight = Math.max(50, cropStart.height - deltaY);
          newArea.x = cropStart.x + cropStart.width - newWidth;
          newArea.y = cropStart.y + cropStart.height - newHeight;
          newArea.width = newWidth;
          newArea.height = newHeight;
          if (newArea.x < 0) {
            newArea.width += newArea.x;
            newArea.x = 0;
          }
          if (newArea.y < 0) {
            newArea.height += newArea.y;
            newArea.y = 0;
          }
          break;
        }
      }

      // Apply aspect ratio constraint
      if (selectedPreset.ratio) {
        const targetRatio = selectedPreset.ratio;
        if (isResizing.includes('e') || isResizing.includes('w')) {
          newArea.height = newArea.width / targetRatio;
        } else {
          newArea.width = newArea.height * targetRatio;
        }
        // Clamp to bounds
        if (newArea.x + newArea.width > imgW) {
          newArea.width = imgW - newArea.x;
          newArea.height = newArea.width / targetRatio;
        }
        if (newArea.y + newArea.height > imgH) {
          newArea.height = imgH - newArea.y;
          newArea.width = newArea.height * targetRatio;
        }
      }

      setCropArea(newArea);
    }
  }, [isDragging, isResizing, dragStart, displayScale, originalImage, selectedPreset.ratio, cropStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
  }, []);

  const handleCropAndDownload = useCallback(() => {
    if (!originalImage) return;

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(cropArea.width);
    canvas.height = Math.round(cropArea.height);
    const ctx = canvas.getContext('2d')!;

    if (rotation !== 0) {
      const rotatedCanvas = document.createElement('canvas');
      const rad = (rotation * Math.PI) / 180;

      if (rotation === 90 || rotation === 270 || rotation === -90 || rotation === -270) {
        rotatedCanvas.width = originalImage.naturalHeight;
        rotatedCanvas.height = originalImage.naturalWidth;
      } else {
        rotatedCanvas.width = originalImage.naturalWidth;
        rotatedCanvas.height = originalImage.naturalHeight;
      }

      const rctx = rotatedCanvas.getContext('2d')!;
      rctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
      rctx.rotate(rad);
      rctx.drawImage(
        originalImage,
        -originalImage.naturalWidth / 2,
        -originalImage.naturalHeight / 2
      );

      ctx.drawImage(
        rotatedCanvas,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );
    } else {
      ctx.drawImage(
        originalImage,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );
    }

    const mimeType = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = exportFormat === 'jpeg' ? 0.92 : undefined;

    canvas.toBlob(
      (blob) => {
        if (!blob || !originalFile) return;

        const baseName = originalFile.name.replace(/\.[^/.]+$/, '');
        const ext = exportFormat === 'jpeg' ? 'jpg' : 'png';
        const filename = `${baseName}-cropped.${ext}`;

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
  }, [originalImage, cropArea, rotation, exportFormat, originalFile]);

  const handleReset = useCallback(() => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
    setOriginalFile(null);
    setOriginalImage(null);
    setImageUrl(null);
    setError(null);
    setCropArea({ x: 0, y: 0, width: 100, height: 100 });
    setRotation(0);
    setSelectedPreset(ASPECT_PRESETS[0]);
  }, [imageUrl]);

  const displayWidth = originalImage ? originalImage.naturalWidth * displayScale : 0;
  const displayHeight = originalImage ? originalImage.naturalHeight * displayScale : 0;

  return (
    <div className="app">
      <Header />

      <main className="main">
        <div className="container">
          {!originalImage && !isProcessing && !error ? (
            <section className="upload-section">
              <div className="intro">
                <h2>Crop Image</h2>
                <p className="intro-desc">Crop your images with freeform selection or preset aspect ratios for social media and print.</p>
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
                      <h3>Select Area</h3>
                      <p>Drag to position, resize handles to adjust</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>Download</h3>
                      <p>Get your perfectly cropped image</p>
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
                  <span>Freeform & preset aspect ratios</span>
                </div>
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Drag to move, handles to resize</span>
                </div>
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Rotation support</span>
                </div>
              </div>
            </section>
          ) : (
            <section className="result-section resize-simple-layout">

              {error && (
                <div className="error-message" role="alert">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

              {originalImage && imageUrl && !isProcessing && (
                <div className="resize-simple-grid crop-grid-layout">
                  {/* LEFT: Crop Preview Area */}
                  <div className="simple-preview-area crop-preview-area">
                    {/* Size info bar */}
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
                        <span className="size-label">Crop area</span>
                        <span className="size-value">{Math.round(cropArea.width)} × {Math.round(cropArea.height)}</span>
                      </div>
                    </div>

                    {/* Crop Canvas */}
                    <div className="preview-image-wrapper">
                      <div
                        ref={containerRef}
                        className="crop-canvas-wrapper"
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                      <div
                        className="crop-image-container"
                        style={{
                          width: displayWidth,
                          height: displayHeight,
                          position: 'relative',
                        }}
                      >
                        {/* Base image */}
                        <img
                          src={imageUrl}
                          alt="Original"
                          style={{
                            width: displayWidth,
                            height: displayHeight,
                            display: 'block',
                            transform: `rotate(${rotation}deg)`,
                          }}
                          draggable={false}
                        />

                          {/* Dark overlay with transparent crop window */}
                          <svg
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: displayWidth,
                              height: displayHeight,
                              pointerEvents: 'none',
                            }}
                          >
                            <defs>
                              <mask id="cropMask">
                                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                                <rect
                                  x={cropArea.x * displayScale}
                                  y={cropArea.y * displayScale}
                                  width={cropArea.width * displayScale}
                                  height={cropArea.height * displayScale}
                                  fill="black"
                                />
                              </mask>
                            </defs>
                            <rect
                              x="0"
                              y="0"
                              width="100%"
                              height="100%"
                              fill="rgba(0,0,0,0.6)"
                              mask="url(#cropMask)"
                            />
                          </svg>

                          {/* Crop selection box */}
                          <div
                            className="crop-selection"
                            style={{
                              position: 'absolute',
                              left: cropArea.x * displayScale,
                              top: cropArea.y * displayScale,
                              width: cropArea.width * displayScale,
                              height: cropArea.height * displayScale,
                              border: '2px solid white',
                              boxSizing: 'border-box',
                              cursor: 'move',
                            }}
                            onMouseDown={(e) => handleMouseDown(e)}
                          >
                            {/* Grid lines */}
                            <div className="crop-grid">
                              <div className="grid-line horizontal" style={{ top: '33.33%' }} />
                              <div className="grid-line horizontal" style={{ top: '66.66%' }} />
                              <div className="grid-line vertical" style={{ left: '33.33%' }} />
                              <div className="grid-line vertical" style={{ left: '66.66%' }} />
                            </div>

                            {/* Resize handles */}
                            <div className="crop-handle nw" onMouseDown={(e) => handleMouseDown(e, 'nw')} />
                            <div className="crop-handle ne" onMouseDown={(e) => handleMouseDown(e, 'ne')} />
                            <div className="crop-handle sw" onMouseDown={(e) => handleMouseDown(e, 'sw')} />
                            <div className="crop-handle se" onMouseDown={(e) => handleMouseDown(e, 'se')} />
                          </div>
                        </div>
                      </div>
                    </div>
                    <button className="reset-link" onClick={handleReset}>
                      ← Choose a different image
                    </button>
                  </div>

                  {/* RIGHT: Crop Options Panel */}
                  <div className="simple-options-panel">
                    <h2 className="options-title">Crop options</h2>

                    {/* Aspect Ratio */}
                    <div className="resize-controls-simple">
                      <p className="helper-text">Choose aspect ratio:</p>
                      <div className="aspect-grid">
                        {ASPECT_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            className={`aspect-btn-new ${selectedPreset.name === preset.name ? 'active' : ''}`}
                            onClick={() => handlePresetChange(preset)}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rotation */}
                    <div className="resize-controls-simple">
                      <p className="helper-text">Rotate image:</p>
                      <div className="rotation-btns">
                        <button className="rotate-btn-new" onClick={() => handleRotate(-90)}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2.5 2v6h6M2.66 15.57a10 10 0 1 0 .57-8.38" />
                          </svg>
                          <span>90° Left</span>
                        </button>
                        <button className="rotate-btn-new" onClick={() => handleRotate(90)}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
                          </svg>
                          <span>90° Right</span>
                        </button>
                      </div>
                      {rotation !== 0 && (
                        <p className="rotation-note">Rotated: {rotation}°</p>
                      )}
                    </div>

                    {/* Export Format */}
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
                        onClick={handleCropAndDownload}
                      >
                        Crop IMAGE
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

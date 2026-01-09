import { useState, useCallback, useEffect } from 'react';
import { FileUpload } from '../components/FileUpload';
import { Header } from '../components/Header';
import { loadImage, isHeicFile } from '../processor';

type CompressionMode = 'quality' | 'target-size';
type OutputFormat = 'jpeg' | 'webp' | 'original';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CompressImage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConvertingHeic, setIsConvertingHeic] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compression controls
  const [compressionMode, setCompressionMode] = useState<CompressionMode>('quality');
  const [quality, setQuality] = useState<number>(80);
  const [targetSizeKB, setTargetSizeKB] = useState<number>(500);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('jpeg');

  // Output
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (compressedUrl) {
        URL.revokeObjectURL(compressedUrl);
      }
      if (originalImageUrl) {
        URL.revokeObjectURL(originalImageUrl);
      }
    };
  }, [compressedUrl, originalImageUrl]);

  // Compress to target file size using binary search
  const compressToTargetSize = useCallback(async (
    canvas: HTMLCanvasElement,
    targetBytes: number,
    format: 'image/jpeg' | 'image/webp',
    minQuality = 0.1,
    maxQuality = 0.95
  ): Promise<Blob> => {
    let low = minQuality;
    let high = maxQuality;
    let bestBlob: Blob | null = null;

    const canvasToBlob = (q: number): Promise<Blob> => {
      return new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          format,
          q
        );
      });
    };

    // Binary search for optimal quality (8 iterations = good precision)
    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2;
      const blob = await canvasToBlob(mid);

      if (blob.size <= targetBytes) {
        bestBlob = blob;
        low = mid; // Try higher quality
      } else {
        high = mid; // Need lower quality
      }
    }

    return bestBlob || await canvasToBlob(minQuality);
  }, []);

  // Compress image
  const compressImage = useCallback(async () => {
    if (!originalImage) return;

    setIsCompressing(true);

    try {
      // Create canvas from image
      const canvas = document.createElement('canvas');
      canvas.width = originalImage.naturalWidth;
      canvas.height = originalImage.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(originalImage, 0, 0);

      // Determine output format
      let mimeType: 'image/jpeg' | 'image/webp' | 'image/png';
      if (outputFormat === 'original') {
        // Try to detect from original file
        if (originalFile?.type === 'image/png') {
          mimeType = 'image/png';
        } else if (originalFile?.type === 'image/webp') {
          mimeType = 'image/webp';
        } else {
          mimeType = 'image/jpeg';
        }
      } else {
        mimeType = outputFormat === 'webp' ? 'image/webp' : 'image/jpeg';
      }

      let blob: Blob;

      if (mimeType === 'image/png') {
        // PNG is lossless - can only convert to other format for compression
        blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error('Failed')),
            'image/png'
          );
        });
      } else if (compressionMode === 'target-size') {
        blob = await compressToTargetSize(canvas, targetSizeKB * 1024, mimeType);
      } else {
        blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error('Failed')),
            mimeType,
            quality / 100
          );
        });
      }

      // Revoke old URL
      if (compressedUrl) {
        URL.revokeObjectURL(compressedUrl);
      }

      const url = URL.createObjectURL(blob);
      setCompressedBlob(blob);
      setCompressedUrl(url);
    } catch (err) {
      console.error('Compression error:', err);
      setError('Failed to compress image');
    } finally {
      setIsCompressing(false);
    }
  }, [originalImage, originalFile, outputFormat, compressionMode, quality, targetSizeKB, compressToTargetSize, compressedUrl]);

  // Auto-compress when settings change
  useEffect(() => {
    if (originalImage) {
      compressImage();
    }
  }, [originalImage, quality, targetSizeKB, outputFormat, compressionMode]);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setOriginalFile(file);
    setCompressedBlob(null);
    if (compressedUrl) {
      URL.revokeObjectURL(compressedUrl);
      setCompressedUrl(null);
    }
    if (originalImageUrl) {
      URL.revokeObjectURL(originalImageUrl);
      setOriginalImageUrl(null);
    }

    const needsHeicConversion = isHeicFile(file);
    if (needsHeicConversion) {
      setIsConvertingHeic(true);
    }

    try {
      const image = await loadImage(file);
      setIsConvertingHeic(false);
      setOriginalImage(image);

      // Create a display URL for the original image (needed for HEIC files)
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(image, 0, 0);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setOriginalImageUrl(url);
        }
      }, 'image/jpeg', 0.95);

      // Set reasonable default target size based on original
      setTargetSizeKB(Math.round(file.size / 1024 / 2)); // Default to 50% of original
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load image');
      setOriginalFile(null);
    } finally {
      setIsProcessing(false);
      setIsConvertingHeic(false);
    }
  }, [compressedUrl, originalImageUrl]);

  const handleDownload = useCallback(() => {
    if (!compressedBlob || !originalFile) return;

    const baseName = originalFile.name.replace(/\.[^/.]+$/, '');
    let ext = 'jpg';
    if (outputFormat === 'webp') ext = 'webp';
    else if (outputFormat === 'original' && originalFile.type === 'image/png') ext = 'png';
    else if (outputFormat === 'original' && originalFile.type === 'image/webp') ext = 'webp';

    const filename = `${baseName}-compressed.${ext}`;

    const url = URL.createObjectURL(compressedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [compressedBlob, originalFile, outputFormat]);

  const handleReset = useCallback(() => {
    if (compressedUrl) {
      URL.revokeObjectURL(compressedUrl);
    }
    if (originalImageUrl) {
      URL.revokeObjectURL(originalImageUrl);
    }
    setOriginalFile(null);
    setOriginalImage(null);
    setCompressedBlob(null);
    setCompressedUrl(null);
    setOriginalImageUrl(null);
    setError(null);
    setQuality(80);
    setTargetSizeKB(500);
  }, [compressedUrl, originalImageUrl]);

  const originalSize = originalFile?.size || 0;
  const compressedSize = compressedBlob?.size || 0;
  const savingsPercent = originalSize > 0 ? Math.round((1 - compressedSize / originalSize) * 100) : 0;

  return (
    <div className="app">
      <Header />

      <main className="main">
        <div className="container">
          {!originalImage && !isProcessing && !error ? (
            <section className="upload-section">
              <div className="intro">
                <h2>Compress Image</h2>
                <p className="intro-desc">Reduce file size while preserving visual quality. Perfect for web, email, or storage.</p>
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
                      <h3>Adjust</h3>
                      <p>Set quality level or target file size</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>Download</h3>
                      <p>Get your optimized smaller image</p>
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
                  <span>Quality slider control</span>
                </div>
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Target file size option</span>
                </div>
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>JPEG & WebP output</span>
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

              {originalImage && !isProcessing && (
                <div className="resize-simple-grid">
                  {/* LEFT: Preview Area */}
                  <div className="simple-preview-area">
                    {/* Size info bar */}
                    <div className="size-info-bar">
                      <div className="size-original">
                        <span className="size-label">Original</span>
                        <span className="size-value">{formatFileSize(originalSize)}</span>
                      </div>
                      <div className="size-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </div>
                      <div className="size-new">
                        <span className="size-label">Compressed</span>
                        <span className="size-value">
                          {isCompressing ? '...' : formatFileSize(compressedSize)}
                          {savingsPercent > 0 && !isCompressing && (
                            <span className="savings-inline"> (-{savingsPercent}%)</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="preview-image-wrapper">
                      {compressedUrl && !isCompressing ? (
                        <div className="image-with-info">
                          <img
                            src={compressedUrl}
                            alt="Compressed preview"
                          />
                        </div>
                      ) : (
                        <div className="preview-loader">
                          <div className="spinner"></div>
                          <p>Compressing...</p>
                        </div>
                      )}
                    </div>

                    <button className="reset-link" onClick={handleReset}>
                      ← Choose a different image
                    </button>
                  </div>

                  {/* RIGHT: Options Panel */}
                  <div className="simple-options-panel">
                    <h2 className="options-title">Compress options</h2>

                    {/* Mode Toggle */}
                    <div className="mode-toggle-group">
                      <button
                        className={`mode-toggle-btn ${compressionMode === 'quality' ? 'active' : ''}`}
                        onClick={() => setCompressionMode('quality')}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        <span>By quality</span>
                      </button>
                      <button
                        className={`mode-toggle-btn ${compressionMode === 'target-size' ? 'active' : ''}`}
                        onClick={() => setCompressionMode('target-size')}
                      >
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                        <span>By file size</span>
                      </button>
                    </div>

                    {/* Quality Mode Controls */}
                    {compressionMode === 'quality' && (
                      <div className="resize-controls-simple">
                        <p className="helper-text">Adjust the quality level:</p>

                        <div className="quality-slider-container">
                          <div className="quality-value-display">{quality}%</div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            value={quality}
                            onChange={(e) => setQuality(parseInt(e.target.value))}
                            className="quality-slider-large"
                          />
                          <div className="slider-labels">
                            <span>Smaller file</span>
                            <span>Higher quality</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Target Size Mode Controls */}
                    {compressionMode === 'target-size' && (
                      <div className="resize-controls-simple">
                        <p className="helper-text">Set your target file size:</p>

                        <div className="target-size-field">
                          <input
                            type="number"
                            value={targetSizeKB}
                            onChange={(e) => setTargetSizeKB(parseInt(e.target.value) || 100)}
                            min="10"
                            max="10000"
                          />
                          <span className="unit">KB</span>
                        </div>

                        <div className="quick-size-btns">
                          <button
                            className={targetSizeKB === 100 ? 'active' : ''}
                            onClick={() => setTargetSizeKB(100)}
                          >100 KB</button>
                          <button
                            className={targetSizeKB === 250 ? 'active' : ''}
                            onClick={() => setTargetSizeKB(250)}
                          >250 KB</button>
                          <button
                            className={targetSizeKB === 500 ? 'active' : ''}
                            onClick={() => setTargetSizeKB(500)}
                          >500 KB</button>
                          <button
                            className={targetSizeKB === 1000 ? 'active' : ''}
                            onClick={() => setTargetSizeKB(1000)}
                          >1 MB</button>
                        </div>
                      </div>
                    )}

                    {/* Output Format */}
                    <div className="format-section">
                      <p className="helper-text">Output format:</p>
                      <div className="format-toggle-btns">
                        <button
                          className={`format-toggle-btn ${outputFormat === 'jpeg' ? 'active' : ''}`}
                          onClick={() => setOutputFormat('jpeg')}
                        >
                          JPEG
                        </button>
                        <button
                          className={`format-toggle-btn ${outputFormat === 'webp' ? 'active' : ''}`}
                          onClick={() => setOutputFormat('webp')}
                        >
                          WebP
                        </button>
                      </div>
                      <p className="format-hint">
                        {outputFormat === 'webp'
                          ? 'WebP offers better compression'
                          : 'JPEG works everywhere'}
                      </p>
                    </div>

                    {/* Warning for already optimized */}
                    {savingsPercent < 0 && !isCompressing && (
                      <div className="quality-warning">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span>Image is already well optimized</span>
                      </div>
                    )}

                    {/* Download Section */}
                    <div className="download-section-simple">
                      <button
                        className="big-download-btn"
                        onClick={handleDownload}
                        disabled={!compressedBlob || isCompressing}
                      >
                        Compress IMAGE
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

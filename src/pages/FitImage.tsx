import { useState, useCallback } from 'react';
import { FileUpload } from '../components/FileUpload';
import { Header } from '../components/Header';
import { loadImage, processImage, ProcessingResult, Orientation, isHeicFile, ExportFormat, exportCanvas, downloadBlob, generateFilename } from '../processor';
import { OutputFormat, OUTPUT_FORMATS, A4 } from '../constants';

export function FitImage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConvertingHeic, setIsConvertingHeic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('whatsapp-dp');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('jpeg');
  const [isExporting, setIsExporting] = useState(false);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setOriginalFile(file);

    // Check if HEIC conversion will be needed
    const needsHeicConversion = isHeicFile(file);
    if (needsHeicConversion) {
      setIsConvertingHeic(true);
    }

    try {
      const image = await loadImage(file);
      setIsConvertingHeic(false);
      setOriginalImage(image);
      const processed = processImage(image, { outputFormat });
      setResult(processed);
    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image');
      setResult(null);
      setOriginalFile(null);
    } finally {
      setIsProcessing(false);
      setIsConvertingHeic(false);
    }
  }, [outputFormat]);

  const handleOrientationChange = useCallback((orientation: Orientation) => {
    if (!originalImage) return;

    setIsProcessing(true);
    try {
      const processed = processImage(originalImage, { outputFormat, orientation });
      setResult(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage, outputFormat]);

  const handleOutputFormatChange = useCallback((format: OutputFormat) => {
    setOutputFormat(format);
    if (!originalImage) return;

    setIsProcessing(true);
    try {
      const processed = processImage(originalImage, { outputFormat: format });
      setResult(processed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  }, [originalImage]);

  const handleReset = useCallback(() => {
    setOriginalFile(null);
    setOriginalImage(null);
    setResult(null);
    setError(null);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!result || !originalFile) return;

    setIsExporting(true);
    try {
      const blob = await exportCanvas(result.canvas, exportFormat);
      const filename = generateFilename(originalFile.name, exportFormat, result.outputFormat);
      downloadBlob(blob, filename);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  }, [result, exportFormat, originalFile]);

  // Calculate DPI warning for A4
  const effectiveDPI = result ? Math.round(A4.DPI * result.scale) : 0;
  const dpiWarning = result && result.outputFormat === 'a4' && effectiveDPI < 150;
  const supportsOrientation = result ? OUTPUT_FORMATS[result.outputFormat].supportsOrientation : false;

  return (
    <div className="app">
      <Header />

      <main className="main">
        <div className="container">
          {!result && !isProcessing && !error ? (
            <section className="upload-section">
              <div className="intro">
                <h2>Choose your format</h2>
                <div className="output-format-selector">
                  <button
                    className={`output-format-btn ${outputFormat === 'whatsapp-dp' ? 'active' : ''}`}
                    onClick={() => setOutputFormat('whatsapp-dp')}
                  >
                    <div className="format-icon">
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <rect x="2" y="2" width="32" height="32" rx="16" stroke="currentColor" strokeWidth="2" fill="none" />
                        <circle cx="18" cy="14" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        <path d="M8 30C8 24.4772 12.4772 20 18 20C23.5228 20 28 24.4772 28 30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                      </svg>
                    </div>
                    <div className="format-info">
                      <span className="format-name">{OUTPUT_FORMATS['whatsapp-dp'].name}</span>
                      <span className="format-desc">{OUTPUT_FORMATS['whatsapp-dp'].description}</span>
                    </div>
                  </button>
                  <button
                    className={`output-format-btn ${outputFormat === 'a4' ? 'active' : ''}`}
                    onClick={() => setOutputFormat('a4')}
                  >
                    <div className="format-icon">
                      <svg width="32" height="40" viewBox="0 0 32 40" fill="none">
                        <rect x="2" y="2" width="28" height="36" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
                        <line x1="8" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="8" y1="18" x2="24" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="8" y1="24" x2="18" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="format-info">
                      <span className="format-name">{OUTPUT_FORMATS['a4'].name}</span>
                      <span className="format-desc">{OUTPUT_FORMATS['a4'].description}</span>
                    </div>
                  </button>
                </div>
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
                      <h3>Preview</h3>
                      <p>See how your image fits on the canvas</p>
                    </div>
                  </div>
                  <div className="step">
                    <div className="step-number">3</div>
                    <div className="step-content">
                      <h3>Download</h3>
                      <p>Get your perfectly sized image</p>
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
                  <span>No stretching or distortion</span>
                </div>
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>No cropping - your whole image preserved</span>
                </div>
                <div className="feature">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>High quality output</span>
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

              {result && !isProcessing && (
                <div className="resize-simple-grid">
                  {/* LEFT: Preview Area */}
                  <div className="simple-preview-area">
                    {/* Size info bar */}
                    <div className="size-info-bar">
                      <div className="size-original">
                        <span className="size-label">Original</span>
                        <span className="size-value">{result.originalWidth} × {result.originalHeight}</span>
                      </div>
                      <div className="size-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </div>
                      <div className="size-new">
                        <span className="size-label">Output</span>
                        <span className="size-value">{result.canvasWidth} × {result.canvasHeight}</span>
                      </div>
                    </div>

                    <div className="preview-image-wrapper">
                      <div className="image-with-info">
                        <img
                          src={result.canvas.toDataURL()}
                          alt="Preview"
                        />
                      </div>
                    </div>

                    <button className="reset-link" onClick={handleReset}>
                      ← Choose a different image
                    </button>
                  </div>

                  {/* RIGHT: Options Panel */}
                  <div className="simple-options-panel">
                    <h2 className="options-title">Fit options</h2>

                    {/* Output Format */}
                    <div className="resize-controls-simple">
                      <p className="helper-text">Choose output format:</p>
                      <div className="aspect-grid">
                        <button
                          className={`aspect-btn-new ${outputFormat === 'whatsapp-dp' ? 'active' : ''}`}
                          onClick={() => handleOutputFormatChange('whatsapp-dp')}
                        >
                          WhatsApp DP
                        </button>
                        <button
                          className={`aspect-btn-new ${outputFormat === 'a4' ? 'active' : ''}`}
                          onClick={() => handleOutputFormatChange('a4')}
                        >
                          A4 Paper
                        </button>
                      </div>
                    </div>

                    {/* Orientation (only for A4) */}
                    {supportsOrientation && (
                      <div className="resize-controls-simple">
                        <p className="helper-text">Orientation:</p>
                        <div className="aspect-grid">
                          <button
                            className={`aspect-btn-new ${result.orientation === 'portrait' ? 'active' : ''}`}
                            onClick={() => handleOrientationChange('portrait')}
                          >
                            Portrait
                          </button>
                          <button
                            className={`aspect-btn-new ${result.orientation === 'landscape' ? 'active' : ''}`}
                            onClick={() => handleOrientationChange('landscape')}
                          >
                            Landscape
                          </button>
                        </div>
                      </div>
                    )}

                    {/* DPI Warning */}
                    {dpiWarning && (
                      <div className="quality-warning">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <span>Low resolution (~{effectiveDPI} DPI)</span>
                      </div>
                    )}

                    {/* Export Format */}
                    <div className="format-section">
                      <p className="helper-text">Export format:</p>
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
                        disabled={isExporting}
                      >
                        {isExporting ? 'Exporting...' : 'Fit IMAGE'}
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

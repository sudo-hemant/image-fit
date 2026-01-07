import { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ImagePreview } from './components/ImagePreview';
import { DownloadButton } from './components/DownloadButton';
import { loadImage, processImage, ProcessingResult, Orientation, isHeicFile } from './processor';
import { OutputFormat, OUTPUT_FORMATS } from './constants';

function App() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConvertingHeic, setIsConvertingHeic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('whatsapp-dp');

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

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#667eea" />
                    <stop offset="100%" stopColor="#764ba2" />
                  </linearGradient>
                </defs>
                <rect x="4" y="2" width="32" height="36" rx="4" fill="url(#logoGradient)" />
                <rect x="8" y="6" width="24" height="28" rx="2" fill="white" fillOpacity="0.9" />
                <path d="M14 18L20 24L26 18" stroke="url(#logoGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="20" y1="12" x2="20" y2="24" stroke="url(#logoGradient)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="logo-text">
              <h1>ImageFit</h1>
              <span className="logo-badge">Free</span>
            </div>
          </div>
          <p className="tagline">Perfectly resize images for WhatsApp DP & A4 printing</p>
        </div>
      </header>

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
            <section className="result-section">
              <div className="result-header">
                <button className="back-btn" onClick={handleReset}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                  Start Over
                </button>
                {originalFile && (
                  <span className="filename">{originalFile.name}</span>
                )}
              </div>

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

              <div className="result-content">
                <ImagePreview
                  result={result}
                  originalFile={originalFile}
                  isProcessing={isProcessing}
                  isConvertingHeic={isConvertingHeic}
                  onOrientationChange={handleOrientationChange}
                  onOutputFormatChange={handleOutputFormatChange}
                />

                <DownloadButton
                  result={result}
                  originalFilename={originalFile?.name ?? 'image'}
                />
              </div>
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

export default App;

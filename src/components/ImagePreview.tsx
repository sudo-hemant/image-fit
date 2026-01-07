import { ProcessingResult, Orientation } from '../processor';
import { A4, OutputFormat, OUTPUT_FORMATS } from '../constants';

interface ImagePreviewProps {
  result: ProcessingResult | null;
  originalFile: File | null;
  isProcessing: boolean;
  isConvertingHeic?: boolean;
  onOrientationChange: (orientation: Orientation) => void;
  onOutputFormatChange: (format: OutputFormat) => void;
}

export function ImagePreview({
  result,
  originalFile,
  isProcessing,
  isConvertingHeic,
  onOrientationChange,
  onOutputFormatChange
}: ImagePreviewProps) {
  if (isProcessing) {
    return (
      <div className="preview-container">
        <div className="preview-loading">
          <div className="spinner" />
          <p>
            {isConvertingHeic
              ? 'Converting HEIC image... This may take a few seconds.'
              : 'Processing your image...'}
          </p>
        </div>
      </div>
    );
  }

  if (!result || !originalFile) {
    return (
      <div className="preview-container">
        <div className="preview-placeholder">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p>Your preview will appear here</p>
        </div>
      </div>
    );
  }

  const { canvas, originalWidth, originalHeight, scaledWidth, scaledHeight, scale, orientation, outputFormat, canvasWidth, canvasHeight } = result;
  const supportsOrientation = OUTPUT_FORMATS[outputFormat].supportsOrientation;

  // Calculate effective DPI based on scaling (only relevant for A4)
  const effectiveDPI = Math.round(A4.DPI * scale);
  const dpiWarning = outputFormat === 'a4' && effectiveDPI < 150;

  return (
    <div className="preview-container">
      <div className="preview-header">
        <h3>Preview</h3>
        <div className="preview-controls">
          <div className="output-format-toggle">
            <button
              className={`toggle-btn ${outputFormat === 'whatsapp-dp' ? 'active' : ''}`}
              onClick={() => onOutputFormatChange('whatsapp-dp')}
              title="WhatsApp DP"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="14" height="14" rx="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
              WhatsApp
            </button>
            <button
              className={`toggle-btn ${outputFormat === 'a4' ? 'active' : ''}`}
              onClick={() => onOutputFormatChange('a4')}
              title="A4 Paper"
            >
              <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor">
                <rect x="1" y="1" width="12" height="16" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
              A4
            </button>
          </div>

          {supportsOrientation && (
            <div className="orientation-toggle">
              <button
                className={`toggle-btn ${orientation === 'portrait' ? 'active' : ''}`}
                onClick={() => onOrientationChange('portrait')}
                title="Portrait orientation"
              >
                <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                  <rect x="1" y="1" width="10" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
                Portrait
              </button>
              <button
                className={`toggle-btn ${orientation === 'landscape' ? 'active' : ''}`}
                onClick={() => onOrientationChange('landscape')}
                title="Landscape orientation"
              >
                <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
                  <rect x="1" y="1" width="14" height="10" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                </svg>
                Landscape
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="preview-canvas-wrapper">
        <div
          className={`preview-canvas ${outputFormat === 'whatsapp-dp' ? 'square' : orientation}`}
          style={{
            aspectRatio: `${canvasWidth} / ${canvasHeight}`,
          }}
        >
          <img
            src={canvas.toDataURL()}
            alt="Preview"
            className="preview-image"
          />
        </div>
      </div>

      <div className="preview-info">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Original Size</span>
            <span className="info-value">{originalWidth} × {originalHeight} px</span>
          </div>
          <div className="info-item">
            <span className="info-label">Scaled Size</span>
            <span className="info-value">{scaledWidth} × {scaledHeight} px</span>
          </div>
          <div className="info-item">
            <span className="info-label">Output Size</span>
            <span className="info-value">{canvasWidth} × {canvasHeight} px</span>
          </div>
          <div className="info-item">
            <span className="info-label">Scale Factor</span>
            <span className="info-value">{(scale * 100).toFixed(1)}%</span>
          </div>
        </div>

        {dpiWarning && (
          <div className="dpi-warning" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              Low resolution image. Print quality may be reduced (effective DPI: ~{effectiveDPI}).
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

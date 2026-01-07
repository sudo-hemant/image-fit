import { useState, useCallback } from 'react';
import { ProcessingResult, ExportFormat, exportCanvas, downloadBlob, generateFilename } from '../processor';
import { OUTPUT_FORMATS } from '../constants';

interface DownloadButtonProps {
  result: ProcessingResult | null;
  originalFilename: string;
}

export function DownloadButton({ result, originalFilename }: DownloadButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('png');

  const handleDownload = useCallback(async () => {
    if (!result) return;

    setIsExporting(true);
    try {
      const blob = await exportCanvas(result.canvas, format);
      const filename = generateFilename(originalFilename, format, result.outputFormat);
      downloadBlob(blob, filename);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [result, format, originalFilename]);

  if (!result) {
    return null;
  }

  const formatName = OUTPUT_FORMATS[result.outputFormat].name;

  return (
    <div className="download-section">
      <div className="format-selector">
        <label className="format-label">Export Format:</label>
        <div className="format-options">
          <button
            className={`format-btn ${format === 'png' ? 'active' : ''}`}
            onClick={() => setFormat('png')}
          >
            PNG
            <span className="format-hint">Best quality, larger file</span>
          </button>
          <button
            className={`format-btn ${format === 'jpeg' ? 'active' : ''}`}
            onClick={() => setFormat('jpeg')}
          >
            JPEG
            <span className="format-hint">Smaller file, slight quality loss</span>
          </button>
        </div>
      </div>

      <button
        className="download-btn"
        onClick={handleDownload}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <div className="spinner small" />
            Exporting...
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download {formatName} Image
          </>
        )}
      </button>
    </div>
  );
}

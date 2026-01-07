import { heicTo } from 'heic-to';
import { A4, WHATSAPP_DP, JPEG_QUALITY, OutputFormat, HEIC_FORMATS } from './constants';

export type Orientation = 'portrait' | 'landscape';
export type ExportFormat = 'png' | 'jpeg';

export interface ProcessingResult {
  canvas: HTMLCanvasElement;
  originalWidth: number;
  originalHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  scale: number;
  orientation: Orientation;
  outputFormat: OutputFormat;
  canvasWidth: number;
  canvasHeight: number;
}

export interface ProcessingOptions {
  outputFormat: OutputFormat;
  orientation?: Orientation;
}

/**
 * Checks if a file is HEIC/HEIF format
 */
export function isHeicFile(file: File): boolean {
  // Check MIME type
  if (HEIC_FORMATS.includes(file.type as typeof HEIC_FORMATS[number])) {
    return true;
  }
  // Also check file extension (some systems don't set MIME type correctly)
  const extension = file.name.toLowerCase().split('.').pop();
  return extension === 'heic' || extension === 'heif';
}

/**
 * Converts HEIC/HEIF file to JPEG blob
 */
export async function convertHeicToJpeg(file: File): Promise<Blob> {
  try {
    console.log('Starting HEIC conversion for:', file.name, 'Size:', file.size, 'Type:', file.type);

    // Convert HEIC to JPEG using heic-to
    const jpegBlob = await heicTo({
      blob: file,
      type: 'image/jpeg',
      quality: 0.95,
    });

    console.log('HEIC conversion successful');

    return jpegBlob;
  } catch (err: unknown) {
    console.error('HEIC conversion error:', err);

    // Extract meaningful error message
    let errorMessage = 'Failed to convert HEIC image.';
    if (err instanceof Error) {
      if (err.message.includes('unsupported') || err.message.includes('format not supported')) {
        errorMessage = 'This HEIC format is not supported.';
      } else if (err.message.includes('Invalid') || err.message.includes('not a HEIC')) {
        errorMessage = 'This file is not a valid HEIC image.';
      } else {
        errorMessage = `HEIC conversion failed: ${err.message}`;
      }
    }

    throw new Error(errorMessage);
  }
}

/**
 * Detects the best orientation based on image dimensions
 */
export function detectOrientation(width: number, height: number): Orientation {
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Gets canvas dimensions for the given output format and orientation
 */
export function getCanvasDimensions(outputFormat: OutputFormat, orientation: Orientation) {
  if (outputFormat === 'whatsapp-dp') {
    return { width: WHATSAPP_DP.width, height: WHATSAPP_DP.height };
  }
  return orientation === 'landscape' ? A4.LANDSCAPE : A4.PORTRAIT;
}

/**
 * Loads an image from a File object (handles HEIC conversion automatically)
 */
export async function loadImage(file: File): Promise<HTMLImageElement> {
  let imageBlob: Blob = file;

  // Convert HEIC to JPEG if needed
  if (isHeicFile(file)) {
    imageBlob = await convertHeicToJpeg(file);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Core image processing function
 * Takes an image and fits it onto a canvas with white padding
 */
export function processImage(
  image: HTMLImageElement,
  options: ProcessingOptions = { outputFormat: 'a4' }
): ProcessingResult {
  const originalWidth = image.naturalWidth;
  const originalHeight = image.naturalHeight;

  const { outputFormat, orientation: requestedOrientation } = options;

  // Auto-detect orientation if not specified (only relevant for A4)
  const finalOrientation = requestedOrientation ?? detectOrientation(originalWidth, originalHeight);

  // Get canvas dimensions based on format
  const canvasDims = getCanvasDimensions(outputFormat, finalOrientation);

  // Calculate scale factor to fit image inside canvas (never exceed, never crop)
  const scaleX = canvasDims.width / originalWidth;
  const scaleY = canvasDims.height / originalHeight;
  const scale = Math.min(scaleX, scaleY);

  // Calculate final dimensions after scaling
  const scaledWidth = Math.round(originalWidth * scale);
  const scaledHeight = Math.round(originalHeight * scale);

  // Calculate offsets to center the image
  const offsetX = Math.round((canvasDims.width - scaledWidth) / 2);
  const offsetY = Math.round((canvasDims.height - scaledHeight) / 2);

  // Create canvas at target dimensions
  const canvas = document.createElement('canvas');
  canvas.width = canvasDims.width;
  canvas.height = canvasDims.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw blurred, stretched background
  ctx.save();
  ctx.filter = 'blur(50px)';
  ctx.drawImage(
    image,
    0, 0, originalWidth, originalHeight,  // Source rectangle
    0, 0, canvasDims.width, canvasDims.height  // Stretch to fill entire canvas
  );
  ctx.restore();

  // Draw the image centered (no blur)
  ctx.drawImage(
    image,
    0, 0, originalWidth, originalHeight,  // Source rectangle
    offsetX, offsetY, scaledWidth, scaledHeight  // Destination rectangle
  );

  return {
    canvas,
    originalWidth,
    originalHeight,
    scaledWidth,
    scaledHeight,
    scale,
    orientation: finalOrientation,
    outputFormat,
    canvasWidth: canvasDims.width,
    canvasHeight: canvasDims.height,
  };
}

/**
 * Exports canvas as a downloadable blob
 */
export function exportCanvas(
  canvas: HTMLCanvasElement,
  format: ExportFormat = 'png'
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? JPEG_QUALITY : undefined;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to export canvas'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a filename for the processed image
 */
export function generateFilename(
  originalName: string,
  format: ExportFormat,
  outputFormat: OutputFormat
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const extension = format === 'jpeg' ? 'jpg' : 'png';
  const suffix = outputFormat === 'whatsapp-dp' ? 'whatsapp-dp' : 'a4';
  return `${baseName}-${suffix}.${extension}`;
}

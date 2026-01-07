/**
 * Output format types
 */
export type OutputFormat = 'a4' | 'whatsapp-dp';

/**
 * A4 paper dimensions at 300 DPI for print-quality output
 */
export const A4 = {
  DPI: 300,
  PORTRAIT: {
    width: 2480,   // 210mm at 300 DPI
    height: 3508,  // 297mm at 300 DPI
  },
  LANDSCAPE: {
    width: 3508,   // 297mm at 300 DPI
    height: 2480,  // 210mm at 300 DPI
  },
} as const;

/**
 * WhatsApp DP dimensions (1:1 square)
 * WhatsApp recommends 500x500 minimum, we use 1080x1080 for high quality
 */
export const WHATSAPP_DP = {
  width: 1080,
  height: 1080,
} as const;

/**
 * Output format configurations
 */
export const OUTPUT_FORMATS = {
  'a4': {
    name: 'A4 Paper',
    description: 'Print-ready A4 size (210×297mm)',
    icon: 'document',
    supportsOrientation: true,
  },
  'whatsapp-dp': {
    name: 'WhatsApp DP',
    description: 'Square profile picture (1:1)',
    icon: 'square',
    supportsOrientation: false,
  },
} as const;

/**
 * Supported image formats for upload
 */
export const SUPPORTED_FORMATS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

/**
 * HEIC formats that need conversion
 */
export const HEIC_FORMATS = ['image/heic', 'image/heif'] as const;

/**
 * Human-readable format names for display
 */
export const FORMAT_NAMES: Record<string, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/heic': 'HEIC',
  'image/heif': 'HEIF',
};

/**
 * Maximum file size in bytes (20MB)
 */
export const MAX_FILE_SIZE = 20 * 1024 * 1024;

/**
 * Maximum file size in human-readable format
 */
export const MAX_FILE_SIZE_DISPLAY = '20MB';

/**
 * Default padding/background color (white)
 */
export const DEFAULT_PADDING_COLOR = '#FFFFFF';

/**
 * Export quality for JPEG (0-1)
 */
export const JPEG_QUALITY = 0.95;

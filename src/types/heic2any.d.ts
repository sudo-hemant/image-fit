declare module 'heic-to' {
  /**
   * Checks if a file is in HEIC format.
   */
  export function isHeic(file: File): Promise<boolean>;

  /**
   * Converts a HEIC image to ImageBitmap.
   */
  export function heicTo(args: {
    blob: Blob;
    type: 'bitmap';
    options?: ImageBitmapOptions;
  }): Promise<ImageBitmap>;

  /**
   * Converts a HEIC image to another format (JPEG, PNG, etc).
   */
  export function heicTo(args: {
    blob: Blob;
    type: 'image/jpeg' | 'image/png' | 'image/webp';
    quality?: number;
  }): Promise<Blob>;
}

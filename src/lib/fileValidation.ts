/**
 * File validation utilities to prevent upload of malicious files
 * Includes MIME type checking, magic number validation, and content sanitization
 */

// Allowed image MIME types
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

// Maximum file size (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Maximum image dimensions
export const MAX_IMAGE_WIDTH = 4096;
export const MAX_IMAGE_HEIGHT = 4096;

// Magic number signatures for common image formats
const MAGIC_NUMBERS = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif: [0x47, 0x49, 0x46, 0x38],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF... followed by WEBP at offset 8
} as const;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFile?: File;
  dimensions?: { width: number; height: number };
}

/**
 * Checks if a file's magic number matches its declared MIME type
 */
async function checkMagicNumber(file: File): Promise<boolean> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check JPEG
  if (file.type === 'image/jpeg') {
    return bytes[0] === MAGIC_NUMBERS.jpeg[0] &&
           bytes[1] === MAGIC_NUMBERS.jpeg[1] &&
           bytes[2] === MAGIC_NUMBERS.jpeg[2];
  }

  // Check PNG
  if (file.type === 'image/png') {
    return MAGIC_NUMBERS.png.every((byte, index) => bytes[index] === byte);
  }

  // Check GIF
  if (file.type === 'image/gif') {
    return MAGIC_NUMBERS.gif.every((byte, index) => bytes[index] === byte);
  }

  // Check WebP
  if (file.type === 'image/webp') {
    // Check RIFF signature
    if (!MAGIC_NUMBERS.webp.every((byte, index) => bytes[index] === byte)) {
      return false;
    }
    // Check WEBP signature at offset 8
    return bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }

  return false;
}

/**
 * Validates image dimensions
 */
function validateImageDimensions(img: HTMLImageElement): { valid: boolean; error?: string } {
  if (img.width > MAX_IMAGE_WIDTH || img.height > MAX_IMAGE_HEIGHT) {
    return {
      valid: false,
      error: `Dimensões muito grandes. Máximo: ${MAX_IMAGE_WIDTH}x${MAX_IMAGE_HEIGHT}px`
    };
  }

  if (img.width < 10 || img.height < 10) {
    return {
      valid: false,
      error: 'Imagem muito pequena. Mínimo: 10x10px'
    };
  }

  return { valid: true };
}

/**
 * Loads an image and returns its element
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar imagem'));
    };

    img.src = url;
  });
}

/**
 * Sanitizes SVG content by removing potentially dangerous elements
 */
function sanitizeSVG(svgContent: string): string {
  // Remove script tags
  let sanitized = svgContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: URIs in href/src (except for safe image data URIs)
  sanitized = sanitized.replace(/\s(href|src)\s*=\s*["']data:(?!image\/(png|jpeg|gif|webp);base64,)[^"']*["']/gi, '');

  // Remove xlink:href with javascript
  sanitized = sanitized.replace(/\sxlink:href\s*=\s*["']javascript:[^"']*["']/gi, '');

  return sanitized;
}

/**
 * Main validation function for image files
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  // 1. Check if file exists
  if (!file) {
    return { valid: false, error: 'Nenhum arquivo fornecido' };
  }

  // 2. Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB`
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'Arquivo vazio' };
  }

  // 3. Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Apenas: ${ALLOWED_IMAGE_TYPES.join(', ')}`
    };
  }

  // 4. Check magic number (file signature)
  try {
    const magicNumberValid = await checkMagicNumber(file);
    if (!magicNumberValid) {
      return {
        valid: false,
        error: 'Arquivo corrompido ou tipo incorreto (falha na verificação de assinatura)'
      };
    }
  } catch (error) {
    return {
      valid: false,
      error: 'Erro ao verificar arquivo'
    };
  }

  // 5. Load and validate image dimensions
  try {
    const img = await loadImage(file);
    const dimensionCheck = validateImageDimensions(img);

    if (!dimensionCheck.valid) {
      return dimensionCheck;
    }

    return {
      valid: true,
      sanitizedFile: file,
      dimensions: {
        width: img.width,
        height: img.height
      }
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Erro ao processar imagem'
    };
  }
}

/**
 * Validates file name for path traversal attacks
 */
export function validateFileName(fileName: string): { valid: boolean; error?: string; sanitized?: string } {
  if (!fileName || fileName.length === 0) {
    return { valid: false, error: 'Nome de arquivo vazio' };
  }

  // Check for path traversal attempts
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { valid: false, error: 'Nome de arquivo contém caracteres não permitidos' };
  }

  // Check for null bytes
  if (fileName.includes('\0')) {
    return { valid: false, error: 'Nome de arquivo inválido' };
  }

  // Sanitize filename - keep only alphanumeric, dash, underscore, dot
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure it has an extension
  if (!sanitized.includes('.')) {
    return { valid: false, error: 'Arquivo deve ter uma extensão' };
  }

  return { valid: true, sanitized };
}

/**
 * Creates a safe filename with timestamp
 */
export function createSafeFileName(originalName: string, prefix: string = 'upload'): string {
  const validation = validateFileName(originalName);
  const baseName = validation.valid ? validation.sanitized! : 'file';

  // Extract extension
  const lastDot = baseName.lastIndexOf('.');
  const ext = lastDot > 0 ? baseName.substring(lastDot) : '.jpg';

  // Create timestamp-based filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);

  return `${prefix}_${timestamp}_${random}${ext}`;
}

/**
 * Checks if a file is actually an image by trying to load it
 */
export async function isRealImage(file: File): Promise<boolean> {
  try {
    await loadImage(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Estimates the compressed size of an image
 */
export function estimateCompressedSize(width: number, height: number, quality: number = 0.8): number {
  // Rough estimation: bytes per pixel depends on quality
  const bytesPerPixel = quality * 3; // RGB channels
  return Math.floor(width * height * bytesPerPixel * 0.1); // JPEG compression ~10:1
}

/**
 * Content Security Policy headers for file uploads
 */
export const UPLOAD_CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'none'",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

/**
 * Color sanitization utilities to prevent XSS attacks via style injection
 * Only allows safe color formats: hex, rgb, rgba, hsl, hsla
 */

// Regex patterns for valid color formats
const HEX_PATTERN = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
const RGB_PATTERN = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*(0|1|0?\.\d+)\s*)?\)$/;
const HSL_PATTERN = /^hsla?\(\s*(\d{1,3})\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%\s*(?:,\s*(0|1|0?\.\d+)\s*)?\)$/;

// Fallback colors for invalid inputs
const DEFAULT_COLOR = '#000000';
const DEFAULT_BG_COLOR = '#ffffff';

/**
 * Validates and sanitizes a color value
 * @param color - The color string to validate
 * @param fallback - The fallback color if invalid (default: #000000)
 * @returns A safe color string or the fallback
 */
export function sanitizeColor(color: string, fallback: string = DEFAULT_COLOR): string {
  if (!color || typeof color !== 'string') {
    console.warn(`Invalid color input: ${color}. Using fallback: ${fallback}`);
    return fallback;
  }

  const trimmedColor = color.trim();

  // Check for hex format
  if (HEX_PATTERN.test(trimmedColor)) {
    return trimmedColor.toLowerCase();
  }

  // Check for RGB/RGBA format
  const rgbMatch = trimmedColor.match(RGB_PATTERN);
  if (rgbMatch) {
    const [, r, g, b, a] = rgbMatch;
    const red = Math.min(255, Math.max(0, parseInt(r, 10)));
    const green = Math.min(255, Math.max(0, parseInt(g, 10)));
    const blue = Math.min(255, Math.max(0, parseInt(b, 10)));

    if (a !== undefined) {
      const alpha = Math.min(1, Math.max(0, parseFloat(a)));
      return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
    }
    return `rgb(${red}, ${green}, ${blue})`;
  }

  // Check for HSL/HSLA format
  const hslMatch = trimmedColor.match(HSL_PATTERN);
  if (hslMatch) {
    const [, h, s, l, a] = hslMatch;
    const hue = Math.min(360, Math.max(0, parseInt(h, 10)));
    const saturation = Math.min(100, Math.max(0, parseInt(s, 10)));
    const lightness = Math.min(100, Math.max(0, parseInt(l, 10)));

    if (a !== undefined) {
      const alpha = Math.min(1, Math.max(0, parseFloat(a)));
      return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
    }
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }

  // Invalid format - log warning and return fallback
  console.warn(`Invalid color format: "${color}". Using fallback: ${fallback}`);
  return fallback;
}

/**
 * Sanitizes a theme object with multiple color properties
 * @param theme - The theme object containing color properties
 * @returns A sanitized theme object with safe colors
 */
export function sanitizeTheme<T extends Record<string, any>>(
  theme: T,
  colorKeys: (keyof T)[]
): T {
  const sanitized = { ...theme };

  colorKeys.forEach((key) => {
    if (key in sanitized && typeof sanitized[key] === 'string') {
      const originalColor = sanitized[key] as string;
      const fallback = key.toString().toLowerCase().includes('background')
        ? DEFAULT_BG_COLOR
        : DEFAULT_COLOR;

      sanitized[key] = sanitizeColor(originalColor, fallback) as T[keyof T];
    }
  });

  return sanitized;
}

/**
 * Validates if a color string is in a safe format
 * @param color - The color string to validate
 * @returns true if the color is valid and safe
 */
export function isValidColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }

  const trimmed = color.trim();
  return (
    HEX_PATTERN.test(trimmed) ||
    RGB_PATTERN.test(trimmed) ||
    HSL_PATTERN.test(trimmed)
  );
}

/**
 * Converts a hex color to RGB format
 * @param hex - The hex color string (e.g., "#ff0000" or "#f00")
 * @returns RGB string or null if invalid
 */
export function hexToRgb(hex: string): string | null {
  const sanitized = sanitizeColor(hex);
  if (!HEX_PATTERN.test(sanitized)) {
    return null;
  }

  let cleanHex = sanitized.replace('#', '');

  // Expand shorthand notation
  if (cleanHex.length === 3) {
    cleanHex = cleanHex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Converts RGB to hex format
 * @param rgb - The RGB string (e.g., "rgb(255, 0, 0)")
 * @returns Hex string or null if invalid
 */
export function rgbToHex(rgb: string): string | null {
  const match = rgb.match(RGB_PATTERN);
  if (!match) {
    return null;
  }

  const [, r, g, b] = match;
  const red = parseInt(r, 10);
  const green = parseInt(g, 10);
  const blue = parseInt(b, 10);

  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

/**
 * Generates CSS-safe color variable declarations
 * @param colors - Object with color names and values
 * @returns CSS variable declarations as a string
 */
export function generateSafeCSSVariables(colors: Record<string, string>): string {
  const sanitizedColors = Object.entries(colors).map(([key, value]) => {
    const safeColor = sanitizeColor(value);
    return `--color-${key}: ${safeColor};`;
  });

  return sanitizedColors.join('\n');
}

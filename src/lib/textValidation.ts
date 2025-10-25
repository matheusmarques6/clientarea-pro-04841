/**
 * Text Validation and Sanitization Library
 *
 * Provides comprehensive text input validation and sanitization to prevent:
 * - XSS attacks via HTML/script injection
 * - Data quality issues (excessive whitespace, invalid lengths)
 * - Special character issues
 *
 * @module textValidation
 */

/**
 * Configuration options for text sanitization
 */
export interface SanitizeTextOptions {
  /**
   * Minimum allowed length (after trimming)
   * @default 0
   */
  minLength?: number;

  /**
   * Maximum allowed length (after trimming)
   * @default Infinity
   */
  maxLength?: number;

  /**
   * Whether to allow newlines
   * @default true
   */
  allowNewlines?: boolean;

  /**
   * Whether to trim whitespace
   * @default true
   */
  trim?: boolean;

  /**
   * Fallback value if validation fails
   * @default ''
   */
  fallback?: string;

  /**
   * Whether to allow basic markdown (**, __, *, _, `, [](url))
   * @default false
   */
  allowMarkdown?: boolean;
}

/**
 * Result of text validation
 */
export interface TextValidationResult {
  /**
   * Whether the text is valid
   */
  valid: boolean;

  /**
   * Sanitized text (safe to use)
   */
  sanitized: string;

  /**
   * Error message if validation failed
   */
  error?: string;

  /**
   * Original length before sanitization
   */
  originalLength?: number;

  /**
   * Length after sanitization
   */
  sanitizedLength?: number;
}

/**
 * Dangerous HTML/script patterns to remove
 */
const DANGEROUS_PATTERNS = [
  // Script tags
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  // Event handlers
  /\s*on\w+\s*=\s*["'][^"']*["']/gi,
  /\s*on\w+\s*=\s*[^\s>]*/gi,
  // JavaScript protocol
  /javascript:/gi,
  // Data URIs with scripts
  /data:text\/html[^,]*,/gi,
  // Style tags
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  // Iframe tags
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  // Object/embed tags
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*>/gi,
  // Import statements
  /@import/gi,
  // Expression (IE specific)
  /expression\s*\(/gi,
];

/**
 * All HTML tags pattern
 */
const HTML_TAG_PATTERN = /<\/?[^>]+(>|$)/g;

/**
 * Basic markdown patterns (safe)
 */
const MARKDOWN_PATTERNS = {
  bold: /\*\*(.+?)\*\*/g,
  italic: /\*(.+?)\*/g,
  underline: /__(.+?)__/g,
  code: /`(.+?)`/g,
  link: /\[([^\]]+)\]\(([^)]+)\)/g,
};

/**
 * Removes all HTML tags and dangerous patterns from text
 *
 * @param text - Text to sanitize
 * @param allowMarkdown - Whether to preserve markdown formatting
 * @returns Sanitized text without HTML
 *
 * @example
 * ```ts
 * const safe = stripHTML('<script>alert("xss")</script>Hello');
 * // Returns: 'Hello'
 * ```
 */
export function stripHTML(text: string, allowMarkdown: boolean = false): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let sanitized = text;

  // First, remove all dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // If markdown is allowed, preserve it temporarily
  const markdownPlaceholders: Map<string, string> = new Map();
  if (allowMarkdown) {
    let counter = 0;
    for (const [type, pattern] of Object.entries(MARKDOWN_PATTERNS)) {
      sanitized = sanitized.replace(pattern, (match) => {
        const placeholder = `__MD_${type.toUpperCase()}_${counter++}__`;
        markdownPlaceholders.set(placeholder, match);
        return placeholder;
      });
    }
  }

  // Remove all remaining HTML tags
  sanitized = sanitized.replace(HTML_TAG_PATTERN, '');

  // Restore markdown if it was allowed
  if (allowMarkdown) {
    for (const [placeholder, original] of markdownPlaceholders.entries()) {
      sanitized = sanitized.replace(placeholder, original);
    }
  }

  // Decode HTML entities
  sanitized = decodeHTMLEntities(sanitized);

  return sanitized;
}

/**
 * Decodes common HTML entities to their character equivalents
 *
 * @param text - Text with HTML entities
 * @returns Text with decoded entities
 */
function decodeHTMLEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
  };

  return text.replace(/&(?:amp|lt|gt|quot|#39|apos);/g, (match) => entities[match] || match);
}

/**
 * Validates and sanitizes text input with configurable options
 *
 * @param text - Text to validate and sanitize
 * @param options - Validation options
 * @returns Validation result with sanitized text
 *
 * @example
 * ```ts
 * const result = sanitizeText('<b>Hello</b> World!', {
 *   minLength: 3,
 *   maxLength: 50,
 *   allowNewlines: false,
 * });
 *
 * if (result.valid) {
 *   console.log(result.sanitized); // 'Hello World!'
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export function sanitizeText(
  text: string,
  options: SanitizeTextOptions = {}
): TextValidationResult {
  const {
    minLength = 0,
    maxLength = Infinity,
    allowNewlines = true,
    trim = true,
    fallback = '',
    allowMarkdown = false,
  } = options;

  // Handle null/undefined
  if (text == null) {
    return {
      valid: minLength === 0,
      sanitized: fallback,
      error: minLength > 0 ? 'Text is required' : undefined,
    };
  }

  // Type check
  if (typeof text !== 'string') {
    console.warn(`Expected string, got ${typeof text}`);
    return {
      valid: false,
      sanitized: fallback,
      error: 'Invalid input type',
    };
  }

  const originalLength = text.length;

  // Strip HTML and dangerous content
  let sanitized = stripHTML(text, allowMarkdown);

  // Trim if requested
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Remove newlines if not allowed
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ');
  }

  // Collapse multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');

  const sanitizedLength = sanitized.length;

  // Validate length
  if (sanitizedLength < minLength) {
    return {
      valid: false,
      sanitized: fallback,
      error: `Text must be at least ${minLength} characters long`,
      originalLength,
      sanitizedLength,
    };
  }

  if (sanitizedLength > maxLength) {
    // Truncate to max length
    sanitized = sanitized.substring(0, maxLength);

    return {
      valid: true,
      sanitized,
      error: `Text was truncated to ${maxLength} characters`,
      originalLength,
      sanitizedLength: maxLength,
    };
  }

  return {
    valid: true,
    sanitized,
    originalLength,
    sanitizedLength,
  };
}

/**
 * Sanitizes a form field label
 *
 * @param label - Field label
 * @returns Sanitized label
 */
export function sanitizeFieldLabel(label: string): string {
  const result = sanitizeText(label, {
    minLength: 1,
    maxLength: 100,
    allowNewlines: false,
    trim: true,
    fallback: 'Campo sem nome',
  });

  return result.sanitized;
}

/**
 * Sanitizes a form field placeholder
 *
 * @param placeholder - Field placeholder
 * @returns Sanitized placeholder
 */
export function sanitizeFieldPlaceholder(placeholder: string): string {
  const result = sanitizeText(placeholder, {
    minLength: 0,
    maxLength: 150,
    allowNewlines: false,
    trim: true,
    fallback: '',
  });

  return result.sanitized;
}

/**
 * Sanitizes a description or long-form text
 *
 * @param description - Description text
 * @param allowMarkdown - Whether to allow markdown
 * @returns Sanitized description
 */
export function sanitizeDescription(description: string, allowMarkdown: boolean = false): string {
  const result = sanitizeText(description, {
    minLength: 0,
    maxLength: 1000,
    allowNewlines: true,
    trim: true,
    fallback: '',
    allowMarkdown,
  });

  return result.sanitized;
}

/**
 * Sanitizes a title or heading
 *
 * @param title - Title text
 * @returns Sanitized title
 */
export function sanitizeTitle(title: string): string {
  const result = sanitizeText(title, {
    minLength: 1,
    maxLength: 200,
    allowNewlines: false,
    trim: true,
    fallback: 'Título sem nome',
  });

  return result.sanitized;
}

/**
 * Sanitizes a URL-safe slug
 *
 * @param slug - Slug text
 * @returns Sanitized slug (lowercase, alphanumeric + hyphens only)
 */
export function sanitizeSlug(slug: string): string {
  if (!slug || typeof slug !== 'string') {
    return '';
  }

  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

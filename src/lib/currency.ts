/**
 * Currency utilities for formatting values based on store currency
 */

export type Currency = 'BRL' | 'USD' | 'EUR' | 'GBP';

export const currencySymbols: Record<Currency, string> = {
  BRL: 'R$',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const currencyNames: Record<Currency, string> = {
  BRL: 'Real Brasileiro (R$)',
  USD: 'Dólar Americano ($)',
  EUR: 'Euro (€)',
  GBP: 'Libra Esterlina (£)',
};

export const currencyLocales: Record<Currency, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
};

/**
 * Format a number as currency based on the currency code
 */
export function formatCurrency(
  value: number | null | undefined,
  currency: Currency = 'BRL',
  options?: {
    showSymbol?: boolean;
    decimals?: number;
    locale?: string;
  }
): string {
  const {
    showSymbol = true,
    decimals = 2,
    locale = currencyLocales[currency],
  } = options || {};

  if (value === null || value === undefined || isNaN(value)) {
    return showSymbol ? `${currencySymbols[currency]} 0,00` : '0,00';
  }

  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return showSymbol ? `${currencySymbols[currency]} ${formatted}` : formatted;
}

/**
 * Get currency symbol for a currency code
 */
export function getCurrencySymbol(currency: Currency = 'BRL'): string {
  return currencySymbols[currency] || 'R$';
}

/**
 * Get currency name for a currency code
 */
export function getCurrencyName(currency: Currency = 'BRL'): string {
  return currencyNames[currency] || 'Real Brasileiro (R$)';
}

/**
 * Parse a currency string to a number
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;

  // Remove currency symbols and spaces
  const cleaned = value
    .replace(/[R$€£\s]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  return parseFloat(cleaned) || 0;
}

/**
 * Validate if string is a valid currency code
 */
export function isValidCurrency(code: string): code is Currency {
  return ['BRL', 'USD', 'EUR', 'GBP'].includes(code);
}

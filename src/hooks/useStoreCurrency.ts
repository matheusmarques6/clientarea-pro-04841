import { useMemo } from 'react';
import { useStore } from './useStores';
import { formatCurrency, getCurrencySymbol, getCurrencyName, type Currency } from '@/lib/currency';

/**
 * Hook to get currency information for a specific store
 */
export function useStoreCurrency(storeId: string | undefined) {
  const { store, isLoading } = useStore(storeId || '');

  const currency = useMemo<Currency>(() => {
    if (!store?.currency) return 'BRL';
    const curr = store.currency.toUpperCase();
    return ['BRL', 'USD', 'EUR', 'GBP'].includes(curr) ? (curr as Currency) : 'BRL';
  }, [store?.currency]);

  const symbol = useMemo(() => getCurrencySymbol(currency), [currency]);
  const name = useMemo(() => getCurrencyName(currency), [currency]);

  /**
   * Format a value using the store's currency
   */
  const format = useMemo(
    () => (value: number | null | undefined, options?: { showSymbol?: boolean; decimals?: number }) => {
      return formatCurrency(value, currency, options);
    },
    [currency]
  );

  return {
    currency,
    symbol,
    name,
    format,
    isLoading,
  };
}

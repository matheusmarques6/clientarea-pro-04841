export interface CreateStoreFormData {
  name: string;
  country?: string;
  currency?: string;
  status?: string;
  klaviyo_private_key?: string;
  klaviyo_site_id?: string;
  shopify_access_token?: string;
  shopify_domain?: string;
}

export interface Store {
  id: string;
  name: string;
  country?: string | null;
  currency?: string | null;
  status?: string | null;
  klaviyo_private_key?: string | null;
  klaviyo_site_id?: string | null;
  shopify_access_token?: string | null;
  shopify_domain?: string | null;
  client_id?: string | null;
  customer_id?: string | null;
  created_at?: string | null;
}

export const COUNTRIES = [
  { value: 'BR', label: 'Brasil' },
  { value: 'US', label: 'Estados Unidos' },
  { value: 'PT', label: 'Portugal' },
  { value: 'ES', label: 'Espanha' },
  { value: 'UK', label: 'Reino Unido' },
  { value: 'FR', label: 'França' },
  { value: 'DE', label: 'Alemanha' },
  { value: 'IT', label: 'Itália' },
] as const;

export const CURRENCIES = [
  { value: 'BRL', label: 'Real (BRL)', symbol: 'R$' },
  { value: 'USD', label: 'Dólar (USD)', symbol: '$' },
  { value: 'EUR', label: 'Euro (EUR)', symbol: '€' },
  { value: 'GBP', label: 'Libra (GBP)', symbol: '£' },
] as const;

export const STORE_STATUS = [
  { value: 'active', label: 'Ativa' },
  { value: 'inactive', label: 'Inativa' },
  { value: 'pending', label: 'Pendente' },
] as const;

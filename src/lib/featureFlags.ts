// Feature flags para o projeto
export interface FeatureFlags {
  USE_SHOPIFY_MOCK: boolean;
  INCLUDE_PRODUCT_COST: boolean;
  ENABLE_2FA: boolean;
}

export const featureFlags: FeatureFlags = {
  USE_SHOPIFY_MOCK: true,  // Mock por padrão até termos as integrações
  INCLUDE_PRODUCT_COST: true,  // Incluir custos de produto no cálculo
  ENABLE_2FA: false,  // 2FA desabilitado por padrão
};

export function getFeatureFlag(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag];
}

export function setFeatureFlag(flag: keyof FeatureFlags, value: boolean): void {
  featureFlags[flag] = value;
}
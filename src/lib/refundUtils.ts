/**
 * Gera um protocolo único para o reembolso
 * Formato: RB-YYYY-XXX (ex: RB-2025-001)
 */
export const generateRefundProtocol = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `RB-${year}-${random}`;
};

/**
 * Calcula o risk score baseado em diversos fatores
 * Retorna um valor entre 0-100
 */
interface RiskScoreParams {
  amount: number;
  hasAttachments: boolean;
  hasItems: boolean;
  customerHistory?: {
    totalOrders?: number;
    totalRefunds?: number;
    accountAgeDays?: number;
  };
}

export const calculateRiskScore = (params: RiskScoreParams): number => {
  const { amount, hasAttachments, hasItems, customerHistory } = params;
  let score = 0;

  // 1. Valor alto = maior risco (0-35 pontos)
  if (amount > 1000) {
    score += 35;
  } else if (amount > 500) {
    score += 25;
  } else if (amount > 200) {
    score += 15;
  } else if (amount > 100) {
    score += 5;
  }

  // 2. Sem anexos = maior risco (0-25 pontos)
  if (!hasAttachments) {
    score += 25;
  }

  // 3. Sem items detalhados = maior risco (0-15 pontos)
  if (!hasItems) {
    score += 15;
  }

  // 4. Histórico do cliente (0-25 pontos)
  if (customerHistory) {
    const { totalOrders = 0, totalRefunds = 0, accountAgeDays = 0 } = customerHistory;

    // Cliente novo = maior risco
    if (accountAgeDays < 30) {
      score += 15;
    } else if (accountAgeDays < 90) {
      score += 10;
    }

    // Muitos reembolsos = maior risco
    if (totalOrders > 0) {
      const refundRate = totalRefunds / totalOrders;
      if (refundRate > 0.5) {
        score += 10;
      } else if (refundRate > 0.3) {
        score += 5;
      }
    } else if (totalRefunds > 0) {
      // Tem reembolsos mas nenhum pedido registrado
      score += 20;
    }
  } else {
    // Sem histórico = risco moderado
    score += 15;
  }

  // Garantir que o score está entre 0-100
  return Math.min(Math.max(score, 0), 100);
};

/**
 * Retorna a categoria de risco baseada no score
 */
export const getRiskCategory = (
  score: number
): { label: string; color: string; description: string } => {
  if (score >= 70) {
    return {
      label: 'Alto',
      color: 'destructive',
      description: 'Requer revisão manual detalhada',
    };
  } else if (score >= 40) {
    return {
      label: 'Médio',
      color: 'warning',
      description: 'Requer verificação adicional',
    };
  } else {
    return {
      label: 'Baixo',
      color: 'success',
      description: 'Pode ser aprovado automaticamente',
    };
  }
};

/**
 * Determina o status inicial baseado no risk score e valor
 */
export const getInitialStatus = (
  riskScore: number,
  amount: number,
  autoApproveLimit: number = 100
): 'REQUESTED' | 'UNDER_REVIEW' => {
  // Se o valor está dentro do limite de aprovação automática e o risco é baixo
  if (amount <= autoApproveLimit && riskScore < 30) {
    return 'REQUESTED'; // Pode ir direto para fila de aprovação rápida
  }

  // Caso contrário, precisa de análise
  return 'UNDER_REVIEW';
};

/**
 * Formata o valor em moeda brasileira
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Valida se todos os campos obrigatórios do reembolso estão preenchidos
 */
interface RefundValidation {
  orderCode: string;
  customerName: string;
  amount: number;
  method: string;
  hasItems: boolean;
}

export const validateRefundFields = (data: RefundValidation): string | null => {
  if (!data.orderCode.trim()) {
    return 'Número do pedido é obrigatório';
  }

  if (!data.customerName.trim()) {
    return 'Nome do cliente é obrigatório';
  }

  if (!data.method) {
    return 'Método de reembolso é obrigatório';
  }

  if (data.amount <= 0) {
    return 'Valor deve ser maior que zero';
  }

  if (!data.hasItems) {
    return 'Adicione pelo menos um item ao pedido';
  }

  return null; // Sem erros
};

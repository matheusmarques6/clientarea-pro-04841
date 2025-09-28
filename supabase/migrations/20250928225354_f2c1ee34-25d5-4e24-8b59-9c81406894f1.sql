-- Criar dados de exemplo para Jean Lucas
-- Primeiro, vamos pegar ou criar o usuário Jean Lucas
DO $$
DECLARE
  v_user_id uuid;
  v_period_id uuid;
  v_store_id uuid;
  v_obj1_id uuid;
  v_obj2_id uuid;
  v_obj3_id uuid;
  v_obj4_id uuid;
BEGIN
  -- Buscar período ativo
  SELECT id INTO v_period_id FROM okr_periods WHERE is_active = true LIMIT 1;
  
  -- Buscar ou criar Jean Lucas
  SELECT id INTO v_user_id FROM users WHERE email = 'admin@convertfy.dev' LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Atualizar dados do Jean
    UPDATE users SET 
      name = 'Jean Lucas',
      level = 'pleno',
      base_salary = 4500,
      variable_pct = 0.30,
      department = 'Marketing'
    WHERE id = v_user_id;
    
    -- Buscar uma loja para associar métricas
    SELECT id INTO v_store_id FROM stores LIMIT 1;
    
    -- Criar objetivos para Jean Lucas se não existirem
    INSERT INTO okr_objectives (period_id, profile_id, title, description, weight_pct)
    VALUES 
      (v_period_id, v_user_id, 'Maximizar impacto nos clientes', 'Aumentar resultado e eficiência das campanhas', 40)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_obj1_id;
    
    INSERT INTO okr_objectives (period_id, profile_id, title, description, weight_pct)
    VALUES 
      (v_period_id, v_user_id, 'Escalar consistência e cadência', 'Padronizar processos e reduzir tempo de entrega', 25)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_obj2_id;
    
    INSERT INTO okr_objectives (period_id, profile_id, title, description, weight_pct)
    VALUES 
      (v_period_id, v_user_id, 'Onboarding e retenção', 'Acelerar onboarding e reduzir churn', 25)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_obj3_id;
    
    INSERT INTO okr_objectives (period_id, profile_id, title, description, weight_pct)
    VALUES 
      (v_period_id, v_user_id, 'Previsibilidade e gestão', 'Melhorar visibilidade e automação', 10)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_obj4_id;
    
    -- Criar Key Results para o Objetivo 1
    IF v_obj1_id IS NOT NULL THEN
      INSERT INTO okr_key_results (objective_id, title, weight_pct, unit, target, direction, current_value, allow_over, status)
      VALUES 
        (v_obj1_id, '% resultado Convertfy ≥ 20', 15, 'percent', 20, 'up', 18, true, 'at_risk'),
        (v_obj1_id, '≥ 8 campanhas/mês por cliente', 10, 'number', 8, 'up', 7, false, 'at_risk'),
        (v_obj1_id, '≥ 10 automações ativas por cliente', 10, 'number', 10, 'up', 12, false, 'on_track'),
        (v_obj1_id, '+10% QoQ no resultado médio', 5, 'percent', 10, 'up', 8, false, 'at_risk')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Criar Key Results para o Objetivo 2
    IF v_obj2_id IS NOT NULL THEN
      INSERT INTO okr_key_results (objective_id, title, weight_pct, unit, target, direction, current_value, allow_over, status)
      VALUES 
        (v_obj2_id, '100% templates padronizados', 10, 'percent', 100, 'up', 85, false, 'at_risk'),
        (v_obj2_id, 'Tempo médio ≤ 3 dias úteis', 10, 'days', 3, 'down', 2.5, false, 'on_track'),
        (v_obj2_id, '2 frameworks validados/trim', 5, 'number', 2, 'up', 1, false, 'at_risk')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Criar Key Results para o Objetivo 3
    IF v_obj3_id IS NOT NULL THEN
      INSERT INTO okr_key_results (objective_id, title, weight_pct, unit, target, direction, current_value, allow_over, status)
      VALUES 
        (v_obj3_id, 'Onboarding ≤ 15 dias', 10, 'days', 15, 'down', 12, false, 'on_track'),
        (v_obj3_id, '1 campanha + 2 automações em 30 dias', 5, 'ratio', 1, 'up', 0.8, false, 'at_risk'),
        (v_obj3_id, 'Churn ≤ 5% no trimestre', 10, 'percent', 5, 'down', 4, false, 'on_track')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Criar Key Results para o Objetivo 4
    IF v_obj4_id IS NOT NULL THEN
      INSERT INTO okr_key_results (objective_id, title, weight_pct, unit, target, direction, current_value, allow_over, status)
      VALUES 
        (v_obj4_id, 'Dashboard mensal ativo', 5, 'percent', 100, 'up', 100, false, 'on_track'),
        (v_obj4_id, '2 relatórios automatizados', 5, 'number', 2, 'up', 2, false, 'on_track')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Criar métricas mensais de exemplo
    IF v_store_id IS NOT NULL THEN
      INSERT INTO okr_monthly_metrics (
        period_id, month, store_id, profile_id, 
        resultado_convertfy_pct, campanhas_enviadas, automacoes_ativas,
        nps, churn_pct, onboarding_atrasos_pct,
        templates_padronizados, tempo_medio_entrega_dias, frameworks_validados,
        notes
      ) VALUES 
        (v_period_id, '2025-01-01', v_store_id, v_user_id, 18.5, 7, 12, 8.5, 4.2, 15, 85, 2.5, 1, 'Janeiro com bom desempenho geral'),
        (v_period_id, '2025-02-01', v_store_id, v_user_id, 19.2, 8, 13, 8.7, 3.8, 12, 90, 2.3, 1, 'Melhoria nas automações'),
        (v_period_id, '2025-03-01', v_store_id, v_user_id, 20.5, 9, 14, 9.0, 3.5, 10, 95, 2.0, 2, 'Meta de resultado atingida!')
      ON CONFLICT (month, store_id, profile_id) DO NOTHING;
    END IF;
    
    -- Calcular score
    PERFORM calculate_okr_score(v_user_id, v_period_id);
    
    -- Criar algumas flags de exemplo
    INSERT INTO okr_performance_flags (
      profile_id, period_id, store_id, level, reason, occurred_on
    ) VALUES 
      (v_user_id, v_period_id, v_store_id, 'yellow', 'Menos de 8 campanhas enviadas em Janeiro', '2025-01-15'),
      (v_user_id, v_period_id, v_store_id, 'yellow', 'Templates ainda não 100% padronizados', '2025-02-01')
    ON CONFLICT DO NOTHING;
    
  END IF;
END $$;
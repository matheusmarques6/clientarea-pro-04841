-- Tabelas para sistema de OKRs gamificados
-- Extender perfis existentes com dados de remuneração
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS level text check (level in ('junior','pleno','senior','lider')) default 'junior',
ADD COLUMN IF NOT EXISTS base_salary numeric default 0,
ADD COLUMN IF NOT EXISTS variable_pct numeric default 0.30,
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS admission_date date;

-- Períodos (trimestres)
create table if not exists public.okr_periods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- ex: 2025-Q1
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Objetivos
create table if not exists public.okr_objectives (
  id uuid primary key default gen_random_uuid(),
  period_id uuid references public.okr_periods(id) on delete cascade,
  profile_id uuid references public.users(id) on delete cascade,
  title text not null,
  description text,
  weight_pct numeric not null check (weight_pct >= 0 and weight_pct <= 100),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Key Results
create table if not exists public.okr_key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid references public.okr_objectives(id) on delete cascade,
  title text not null,
  description text,
  weight_pct numeric not null check (weight_pct >= 0 and weight_pct <= 100),
  unit text check (unit in ('percent','number','days','ratio','currency')) default 'percent',
  target numeric not null,
  direction text check (direction in ('up','down')) default 'up', -- up: maior melhor; down: menor melhor
  current_value numeric default 0,
  allow_over boolean default false, -- permitir score > 100%
  status text check (status in ('on_track','at_risk','off_track')) default 'on_track',
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- Métricas mensais integradas com dados existentes
create table if not exists public.okr_monthly_metrics (
  id uuid primary key default gen_random_uuid(),
  period_id uuid references public.okr_periods(id) on delete cascade,
  month date not null, -- primeiro dia do mês
  store_id uuid references public.stores(id) on delete cascade,
  profile_id uuid references public.users(id) on delete cascade,
  resultado_convertfy_pct numeric, -- % do faturamento atribuída à Convertfy
  campanhas_enviadas integer,
  automacoes_ativas integer,
  nps numeric,
  churn_pct numeric,
  onboarding_atrasos_pct numeric,
  templates_padronizados integer,
  tempo_medio_entrega_dias numeric,
  frameworks_validados integer,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (month, store_id, profile_id)
);

-- Flags de performance
create table if not exists public.okr_performance_flags (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.users(id) on delete cascade,
  period_id uuid references public.okr_periods(id) on delete cascade,
  store_id uuid references public.stores(id) on delete set null,
  level text check (level in ('yellow','red')) not null,
  reason text not null,
  is_auto boolean default true,
  occurred_on date not null default current_date,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Score consolidado por pessoa/período
create table if not exists public.okr_period_scores (
  id uuid primary key default gen_random_uuid(),
  period_id uuid references public.okr_periods(id) on delete cascade,
  profile_id uuid references public.users(id) on delete cascade,
  score_pct numeric not null, -- 0..200 (permitir over 100%)
  bonus_value numeric not null, -- R$ calculado
  calculated_at timestamptz default now(),
  details jsonb, -- breakdown de objetivos/KRs
  unique (period_id, profile_id)
);

-- Atualização automática de KRs baseada em métricas
create table if not exists public.okr_kr_datasources (
  id uuid primary key default gen_random_uuid(),
  kr_id uuid references public.okr_key_results(id) on delete cascade,
  source_type text check (source_type in ('manual','store_metric','calculation')) default 'manual',
  source_field text, -- nome do campo em okr_monthly_metrics ou channel_revenue
  aggregation text check (aggregation in ('sum','avg','max','min','last')) default 'avg',
  filter_store_id uuid references public.stores(id) on delete set null,
  created_at timestamptz default now()
);

-- Log de atividades OKR
create table if not exists public.okr_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid references public.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  before jsonb,
  after jsonb,
  created_at timestamptz default now()
);

-- Triggers para updated_at
create or replace function public.touch_okr_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create trigger trg_okr_periods_updated
before update on public.okr_periods
for each row execute function public.touch_okr_updated_at();

create trigger trg_okr_objectives_updated
before update on public.okr_objectives
for each row execute function public.touch_okr_updated_at();

create trigger trg_okr_key_results_updated
before update on public.okr_key_results
for each row execute function public.touch_okr_updated_at();

create trigger trg_okr_monthly_metrics_updated
before update on public.okr_monthly_metrics
for each row execute function public.touch_okr_updated_at();

-- Função para calcular score automaticamente
create or replace function public.calculate_okr_score(
  p_profile_id uuid,
  p_period_id uuid
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_objectives jsonb;
  v_total_score numeric := 0;
  v_base_salary numeric;
  v_variable_pct numeric;
  v_bonus_value numeric;
begin
  -- Buscar dados de remuneração
  select base_salary, variable_pct into v_base_salary, v_variable_pct
  from public.users
  where id = p_profile_id;

  -- Calcular scores dos objetivos
  select jsonb_agg(obj_data) into v_objectives
  from (
    select 
      o.id,
      o.title,
      o.weight_pct,
      (
        select coalesce(sum(
          case 
            when kr.direction = 'up' then 
              case when kr.allow_over then 
                least(kr.current_value::numeric / nullif(kr.target, 0), 1.2) 
              else 
                least(kr.current_value::numeric / nullif(kr.target, 0), 1.0)
              end
            else 
              case when kr.allow_over then
                least(kr.target / nullif(kr.current_value, 0), 1.2)
              else
                least(kr.target / nullif(kr.current_value, 0), 1.0)
              end
          end * kr.weight_pct
        ), 0) / 100
        from public.okr_key_results kr
        where kr.objective_id = o.id
      ) as score
    from public.okr_objectives o
    where o.profile_id = p_profile_id
      and o.period_id = p_period_id
  ) obj_data;

  -- Calcular score total ponderado
  select coalesce(sum((obj->>'score')::numeric * (obj->>'weight_pct')::numeric / 100), 0)
  into v_total_score
  from jsonb_array_elements(v_objectives) obj;

  -- Calcular bônus
  v_bonus_value := v_base_salary * v_variable_pct * (v_total_score / 100);

  -- Salvar resultado
  insert into public.okr_period_scores (
    period_id, profile_id, score_pct, bonus_value, details
  ) values (
    p_period_id, p_profile_id, v_total_score * 100, v_bonus_value, 
    jsonb_build_object('objectives', v_objectives, 'base_salary', v_base_salary, 'variable_pct', v_variable_pct)
  )
  on conflict (period_id, profile_id) 
  do update set 
    score_pct = excluded.score_pct,
    bonus_value = excluded.bonus_value,
    details = excluded.details,
    calculated_at = now();

  return jsonb_build_object(
    'score_pct', v_total_score * 100,
    'bonus_value', v_bonus_value,
    'objectives', v_objectives
  );
end;
$$;

-- Função para verificar e criar flags automáticas
create or replace function public.check_okr_flags(
  p_profile_id uuid,
  p_period_id uuid
) returns void
language plpgsql
security definer
as $$
declare
  v_metrics record;
  v_flag_reason text;
begin
  -- Verificar métricas do mês atual
  for v_metrics in 
    select * from public.okr_monthly_metrics
    where profile_id = p_profile_id
      and period_id = p_period_id
      and month >= date_trunc('month', current_date - interval '2 months')
    order by month desc
  loop
    -- Yellow flags
    if v_metrics.resultado_convertfy_pct < 20 then
      v_flag_reason := 'Resultado Convertfy < 20% no mês';
      insert into public.okr_performance_flags (
        profile_id, period_id, store_id, level, reason, occurred_on
      ) values (
        p_profile_id, p_period_id, v_metrics.store_id, 'yellow', v_flag_reason, v_metrics.month
      ) on conflict do nothing;
    end if;

    if v_metrics.campanhas_enviadas < 8 then
      v_flag_reason := 'Menos de 8 campanhas enviadas no mês';
      insert into public.okr_performance_flags (
        profile_id, period_id, store_id, level, reason, occurred_on
      ) values (
        p_profile_id, p_period_id, v_metrics.store_id, 'yellow', v_flag_reason, v_metrics.month
      ) on conflict do nothing;
    end if;

    -- Red flags
    if v_metrics.churn_pct > 8 then
      v_flag_reason := 'Churn trimestral > 8%';
      insert into public.okr_performance_flags (
        profile_id, period_id, store_id, level, reason, occurred_on
      ) values (
        p_profile_id, p_period_id, v_metrics.store_id, 'red', v_flag_reason, v_metrics.month
      ) on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- RLS Policies
alter table public.okr_periods enable row level security;
alter table public.okr_objectives enable row level security;
alter table public.okr_key_results enable row level security;
alter table public.okr_monthly_metrics enable row level security;
alter table public.okr_performance_flags enable row level security;
alter table public.okr_period_scores enable row level security;
alter table public.okr_kr_datasources enable row level security;
alter table public.okr_activity_log enable row level security;

-- Políticas para admins
create policy "Admins can manage OKR periods" on public.okr_periods
  for all using (is_admin(auth.uid()));

create policy "Admins can manage objectives" on public.okr_objectives
  for all using (is_admin(auth.uid()));

create policy "Admins can manage key results" on public.okr_key_results
  for all using (is_admin(auth.uid()));

create policy "Admins can manage metrics" on public.okr_monthly_metrics
  for all using (is_admin(auth.uid()));

create policy "Admins can manage flags" on public.okr_performance_flags
  for all using (is_admin(auth.uid()));

create policy "Admins can view scores" on public.okr_period_scores
  for select using (is_admin(auth.uid()));

create policy "Admins can manage datasources" on public.okr_kr_datasources
  for all using (is_admin(auth.uid()));

create policy "All can view activity log" on public.okr_activity_log
  for select using (true);

-- Políticas para usuários verem seus próprios dados
create policy "Users can view own objectives" on public.okr_objectives
  for select using (profile_id = auth.uid());

create policy "Users can view own key results" on public.okr_key_results
  for select using (
    exists (
      select 1 from public.okr_objectives o 
      where o.id = objective_id and o.profile_id = auth.uid()
    )
  );

create policy "Users can view own metrics" on public.okr_monthly_metrics
  for select using (profile_id = auth.uid());

create policy "Users can update own metrics" on public.okr_monthly_metrics
  for update using (profile_id = auth.uid());

create policy "Users can view own flags" on public.okr_performance_flags
  for select using (profile_id = auth.uid());

create policy "Users can view own scores" on public.okr_period_scores
  for select using (profile_id = auth.uid());

-- Seed inicial com período Q1 2025
insert into public.okr_periods (code, name, start_date, end_date, is_active) values
('2025-Q1', '1º Trimestre 2025', '2025-01-01', '2025-03-31', true)
on conflict (code) do nothing;
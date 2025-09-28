-- Remover triggers duplicados se existirem
DROP TRIGGER IF EXISTS trg_okr_periods_updated ON public.okr_periods;
DROP TRIGGER IF EXISTS trg_okr_objectives_updated ON public.okr_objectives;
DROP TRIGGER IF EXISTS trg_okr_key_results_updated ON public.okr_key_results;
DROP TRIGGER IF EXISTS trg_okr_monthly_metrics_updated ON public.okr_monthly_metrics;

-- Recriar triggers
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
export interface GoalTimeframe {
  temporal_type: 'weekly' | 'monthly' | 'yearly';
  year: number;
  month: number;
  week: number;
  is_all_months: boolean;
  weekly_scope: 'specific_week' | 'all_in_month' | 'all_in_year';
}

export function goalPeriodParams(form: GoalTimeframe) {
  const monthly = form.temporal_type === 'monthly' && !form.is_all_months;
  const weekly = form.temporal_type === 'weekly';
  return {
    temporal_type: form.temporal_type,
    year: form.year,
    month: monthly || (weekly && form.weekly_scope === 'all_in_month') ? form.month : null,
    week: weekly && form.weekly_scope === 'specific_week' ? form.week : null,
  };
}

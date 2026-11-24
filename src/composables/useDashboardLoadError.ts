import { useI18n } from 'vue-i18n';

type DashboardWidget = 'history' | 'recent' | 'goals' | 'records';

export function useDashboardLoadError() {
  const { t } = useI18n();

  return (
    widget: DashboardWidget,
    error: { reason: 'notAuthenticated' | 'loadFailed'; detail?: string }
  ): string => {
    if (error.detail) return t('dashboard.errorDetail', { message: error.detail });
    return error.reason === 'notAuthenticated'
      ? t('dashboard.signInAgain')
      : t(`dashboard.${widget}.loadFailed`);
  };
}

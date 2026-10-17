import { onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';
import { fetchActivitySummary, fetchActivityTrack, type TrackPoint } from '../services/api';
import type { Activity } from '../stores/activity';
import { useAccountSession } from './useAccountSession';
import { useLatestRequest } from './useLatestRequest';

export function useActivityDetail(activityId: MaybeRefOrGetter<string>) {
  const activity = ref<Activity | null>(null);
  const trackData = ref<TrackPoint[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  let active = true;
  function reset() {
    activity.value = null;
    trackData.value = [];
    isLoading.value = false;
    error.value = null;
  }
  const captureSession = useAccountSession(reset);
  function captureActivity() {
    const isCurrentSession = captureSession();
    const id = toValue(activityId);
    return () => active && isCurrentSession() && id === toValue(activityId);
  }
  const beginLoad = useLatestRequest(captureActivity);
  const beginSummary = useLatestRequest(captureActivity);

  async function load(showLoading: boolean): Promise<boolean> {
    if (!active) return false;
    const isCurrent = beginLoad();
    const ownsSummary = beginSummary();
    const id = toValue(activityId);
    if (showLoading) {
      reset();
      isLoading.value = true;
    }
    try {
      const [summary, track] = await Promise.all([
        fetchActivitySummary(id),
        fetchActivityTrack(id),
      ]);
      if (!isCurrent()) return false;
      if (ownsSummary()) activity.value = summary;
      trackData.value = track;
      return true;
    } catch (cause: unknown) {
      if (!isCurrent()) return false;
      if (!showLoading) throw cause;
      error.value = cause instanceof Error ? cause.message : 'Failed to load activity.';
      return false;
    } finally {
      if (isCurrent()) isLoading.value = false;
    }
  }

  async function refreshSummary(): Promise<boolean> {
    if (!active) return false;
    const isCurrent = beginSummary();
    const id = toValue(activityId);
    try {
      const summary = await fetchActivitySummary(id);
      if (!isCurrent()) return false;
      activity.value = summary;
      return true;
    } catch (cause: unknown) {
      if (!isCurrent()) return false;
      throw cause;
    }
  }

  const reload = () => load(true);
  const refresh = () => load(false);
  watch(
    () => toValue(activityId),
    () => {
      void reload();
    },
    { immediate: true }
  );
  onScopeDispose(() => {
    active = false;
    reset();
  });
  return {
    activity,
    trackData,
    isLoading,
    error,
    reload,
    refresh,
    refreshSummary,
    captureActivity,
  };
}

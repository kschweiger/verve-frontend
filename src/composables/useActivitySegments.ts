import {
  computed,
  onScopeDispose,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import {
  createSegmentSet,
  deleteSegmentSet,
  fetchActivitySegmentSetIds,
  fetchSegmentStatistics,
  updateSegmentSet,
  type SegmentMetric,
  type SegmentMetrics,
  type SegmentStatistics,
  type SegmentStats,
  type TrackPoint,
} from '../services/api';
import { elapsedSecondsBetweenInstants } from '../utils/datetime';
import { useAccountSession } from './useAccountSession';
import { useLatestRequest } from './useLatestRequest';
import { formatCadence, type CadenceUnit } from './useCadence';

export function useActivitySegments(
  activityId: MaybeRefOrGetter<string>,
  trackData: Readonly<Ref<TrackPoint[]>>,
  hoveredPointIndex: Readonly<Ref<number | null>>,
  cadenceUnit: MaybeRefOrGetter<CadenceUnit> = 'counts/min'
) {
  const segmentSetIds = ref<string[]>([]);
  const segmentStatisticsById = ref<Record<string, SegmentStatistics>>({});
  const selectedSegmentSetId = ref<string | null>(null);
  const isLoadingSegmentSets = ref(false);
  const segmentSetError = ref<string | null>(null);
  const showSegmentStats = ref(false);
  const isEditingSegmentCuts = ref(false);
  const editableSegmentCuts = ref<number[]>([]);
  const isCreatingSegmentSet = ref(false);
  const draftSegmentSetName = ref('');
  const isSavingSegmentSet = ref(false);
  const segmentMutationError = ref<string | null>(null);
  const expandedSegmentIndices = ref<number[]>([]);

  let active = true;
  function resetSegmentData() {
    segmentSetIds.value = [];
    segmentStatisticsById.value = {};
    selectedSegmentSetId.value = null;
    showSegmentStats.value = false;
    expandedSegmentIndices.value = [];
    cancelSegmentCutEdit();
  }
  function reset() {
    resetSegmentData();
    isLoadingSegmentSets.value = false;
    isSavingSegmentSet.value = false;
    segmentSetError.value = null;
  }
  const captureSession = useAccountSession(reset);
  function captureActivity() {
    const isCurrentSession = captureSession();
    const id = toValue(activityId);
    return () => active && isCurrentSession() && id === toValue(activityId);
  }
  const beginLoad = useLatestRequest(captureActivity);

  async function loadSegmentSets() {
    const isCurrent = beginLoad();
    if (!active) return;
    isLoadingSegmentSets.value = true;
    segmentSetError.value = null;
    resetSegmentData();

    try {
      const ids = await fetchActivitySegmentSetIds(toValue(activityId));
      if (!isCurrent()) return;
      segmentSetIds.value = ids;

      if (ids.length === 0) return;

      const segmentStatistics = await Promise.all(ids.map((id) => fetchSegmentStatistics(id)));
      if (!isCurrent()) return;
      segmentStatisticsById.value = Object.fromEntries(
        segmentStatistics.map((statistics) => [statistics.segmentSetId, statistics])
      );
      selectedSegmentSetId.value = segmentStatistics[0]?.segmentSetId ?? ids[0] ?? null;
    } catch (e: unknown) {
      if (!isCurrent()) return;
      segmentSetError.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (isCurrent()) {
        isLoadingSegmentSets.value = false;
      }
    }
  }

  const selectedSegmentStatistics = computed(() => {
    if (selectedSegmentSetId.value === null) return null;
    return segmentStatisticsById.value[selectedSegmentSetId.value] ?? null;
  });

  const trackIndexByPointId = computed(() => {
    const indexById = new Map<number, number>();
    trackData.value.forEach((point, index) => {
      indexById.set(point.id, index);
    });
    return indexById;
  });

  const sortedEditableSegmentCuts = computed(() => {
    return [...editableSegmentCuts.value].sort((a, b) => {
      const indexA = trackIndexByPointId.value.get(a) ?? Number.MAX_SAFE_INTEGER;
      const indexB = trackIndexByPointId.value.get(b) ?? Number.MAX_SAFE_INTEGER;
      return indexA - indexB;
    });
  });

  const visibleSegmentCutIndices = computed(() => {
    const cutIds = isEditingSegmentCuts.value
      ? sortedEditableSegmentCuts.value
      : (selectedSegmentStatistics.value?.cuts ?? []);

    return cutIds
      .map((cutId) => trackIndexByPointId.value.get(cutId))
      .filter((index): index is number => typeof index === 'number');
  });

  const hasInvalidSegmentCuts = computed(() => {
    return editableSegmentCuts.value.some((cutId) => !trackIndexByPointId.value.has(cutId));
  });

  const hasDuplicateSegmentCuts = computed(() => {
    return new Set(editableSegmentCuts.value).size !== editableSegmentCuts.value.length;
  });

  const canUseSegmentCutEdit = computed(() => {
    return (
      trackData.value.length > 1 &&
      (selectedSegmentStatistics.value !== null || isCreatingSegmentSet.value)
    );
  });

  const canStartNewSegmentSet = computed(() => {
    return (
      trackData.value.length >= 2 &&
      !isLoadingSegmentSets.value &&
      !isEditingSegmentCuts.value &&
      !isSavingSegmentSet.value
    );
  });

  const hasValidSegmentSetName = computed(() => {
    return !isCreatingSegmentSet.value || draftSegmentSetName.value.trim().length > 0;
  });

  const canApplySegmentCutChanges = computed(() => {
    return (
      isEditingSegmentCuts.value &&
      editableSegmentCuts.value.length > 0 &&
      !hasInvalidSegmentCuts.value &&
      !hasDuplicateSegmentCuts.value &&
      hasValidSegmentSetName.value &&
      !isSavingSegmentSet.value
    );
  });

  const displayMetrics = computed<SegmentMetric[]>(() => {
    const metadata = selectedSegmentStatistics.value?.displayMetadata;
    if (!metadata) return [];

    return [
      metadata.primaryMetric,
      ...metadata.displayMetrics.filter((metric) => metric !== metadata.primaryMetric),
    ];
  });

  const supportingDisplayMetrics = computed(() => displayMetrics.value.slice(1));

  const hasSegmentDistance = computed(() => {
    return (
      selectedSegmentStatistics.value?.segments.some((segment) => segment.distanceM !== null) ??
      false
    );
  });

  const hasSegmentElevation = computed(() => {
    return (
      selectedSegmentStatistics.value?.segments.some(
        (segment) => segment.elevationGain !== null || segment.elevationLoss !== null
      ) ?? false
    );
  });

  const segmentStatsColumnCount = computed(() => {
    return (
      4 +
      supportingDisplayMetrics.value.length +
      (hasSegmentDistance.value ? 1 : 0) +
      (hasSegmentElevation.value ? 1 : 0)
    );
  });

  function selectSegmentSet(segmentSetId: string) {
    selectedSegmentSetId.value = segmentSetId;
    isCreatingSegmentSet.value = false;
    draftSegmentSetName.value = '';
    segmentMutationError.value = null;
    expandedSegmentIndices.value = [];
    cancelSegmentCutEdit();
  }

  function startNewSegmentSet() {
    if (!canStartNewSegmentSet.value) return;
    segmentMutationError.value = null;
    selectedSegmentSetId.value = null;
    isCreatingSegmentSet.value = true;
    draftSegmentSetName.value = `Segments ${segmentSetIds.value.length + 1}`;
    editableSegmentCuts.value = [];
    insertEditableCutInGap(0);
    isEditingSegmentCuts.value = true;
  }

  function startSegmentCutEdit() {
    segmentMutationError.value = null;
    isCreatingSegmentSet.value = false;
    editableSegmentCuts.value = [...(selectedSegmentStatistics.value?.cuts ?? [])].sort((a, b) => {
      const indexA = trackIndexByPointId.value.get(a) ?? Number.MAX_SAFE_INTEGER;
      const indexB = trackIndexByPointId.value.get(b) ?? Number.MAX_SAFE_INTEGER;
      return indexA - indexB;
    });
    isEditingSegmentCuts.value = true;
  }

  function cancelSegmentCutEdit() {
    editableSegmentCuts.value = [];
    isEditingSegmentCuts.value = false;
    isCreatingSegmentSet.value = false;
    draftSegmentSetName.value = '';
    segmentMutationError.value = null;
  }

  function toggleSegmentDetails(segmentIndex: number) {
    expandedSegmentIndices.value = expandedSegmentIndices.value.includes(segmentIndex)
      ? expandedSegmentIndices.value.filter((index) => index !== segmentIndex)
      : [...expandedSegmentIndices.value, segmentIndex];
  }

  function isSegmentDetailsExpanded(segmentIndex: number) {
    return expandedSegmentIndices.value.includes(segmentIndex);
  }

  function handleSegmentSetChange(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    selectSegmentSet(target.value);
  }

  function trackIndexForCut(cutId: number) {
    return trackIndexByPointId.value.get(cutId) ?? 0;
  }

  function trackPointForCut(cutId: number) {
    return trackData.value[trackIndexForCut(cutId)] ?? null;
  }

  function trackPointForBoundaryIndex(boundaryIndex: number) {
    return trackData.value[boundaryIndex] ?? null;
  }

  function secondsBetweenTrackPoints(startPoint: TrackPoint | null, endPoint: TrackPoint | null) {
    if (!startPoint || !endPoint) return null;

    return elapsedSecondsBetweenInstants(startPoint.time, endPoint.time);
  }

  function durationBeforeCut(cutIndex: number) {
    const currentCutId = editableSegmentCuts.value[cutIndex];
    if (currentCutId === undefined) return null;

    const startPoint =
      cutIndex === 0
        ? (trackData.value[0] ?? null)
        : trackPointForCut(editableSegmentCuts.value[cutIndex - 1] ?? currentCutId);

    return secondsBetweenTrackPoints(startPoint, trackPointForCut(currentCutId));
  }

  const finalEditableSegmentDuration = computed(() => {
    if (editableSegmentCuts.value.length === 0) return null;

    const lastCutId = editableSegmentCuts.value[editableSegmentCuts.value.length - 1];
    if (lastCutId === undefined) return null;

    return secondsBetweenTrackPoints(
      trackPointForCut(lastCutId),
      trackData.value[trackData.value.length - 1] ?? null
    );
  });

  function gapStartTrackIndex(gapIndex: number) {
    const previousCutId = editableSegmentCuts.value[gapIndex - 1];
    return previousCutId === undefined ? 0 : trackIndexForCut(previousCutId);
  }

  function gapEndTrackIndex(gapIndex: number) {
    const nextCutId = editableSegmentCuts.value[gapIndex];
    return nextCutId === undefined
      ? Math.max(trackData.value.length - 1, 0)
      : trackIndexForCut(nextCutId);
  }

  function minInsertTrackIndexForGap(gapIndex: number) {
    return gapStartTrackIndex(gapIndex) + 1;
  }

  function maxInsertTrackIndexForGap(gapIndex: number) {
    return gapEndTrackIndex(gapIndex) - 1;
  }

  function canInsertCutInGap(gapIndex: number) {
    return minInsertTrackIndexForGap(gapIndex) <= maxInsertTrackIndexForGap(gapIndex);
  }

  function gapLabel(gapIndex: number) {
    const startLabel = gapIndex === 0 ? 'Start' : `Cut ${gapIndex}`;
    const endLabel =
      gapIndex === editableSegmentCuts.value.length ? 'Finish' : `Cut ${gapIndex + 1}`;
    return `${startLabel} -> ${endLabel}`;
  }

  function gapDuration(gapIndex: number) {
    return secondsBetweenTrackPoints(
      trackPointForBoundaryIndex(gapStartTrackIndex(gapIndex)),
      trackPointForBoundaryIndex(gapEndTrackIndex(gapIndex))
    );
  }

  function gapDistance(gapIndex: number) {
    const startPoint = trackPointForBoundaryIndex(gapStartTrackIndex(gapIndex));
    const endPoint = trackPointForBoundaryIndex(gapEndTrackIndex(gapIndex));
    if (!startPoint || !endPoint) return null;

    return Math.max(0, endPoint.dist - startPoint.dist);
  }

  const trackStartTimestamp = computed(() => {
    const firstPoint = trackData.value[0];
    if (!firstPoint) return null;

    const timestamp = Date.parse(firstPoint.time);
    return Number.isNaN(timestamp) ? null : timestamp;
  });

  function elapsedSecondsForTrackIndex(index: number) {
    const point = trackData.value[index];
    if (!point || trackStartTimestamp.value === null) return index;

    const timestamp = Date.parse(point.time);
    if (Number.isNaN(timestamp)) return index;

    return Math.max(0, (timestamp - trackStartTimestamp.value) / 1000);
  }

  function nearestTrackIndexForElapsedSeconds(targetSeconds: number) {
    if (trackData.value.length === 0) return 0;

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    trackData.value.forEach((_, index) => {
      const distance = Math.abs(elapsedSecondsForTrackIndex(index) - targetSeconds);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });

    return bestIndex;
  }

  function nearestTrackIndexForElapsedSecondsInRange(
    targetSeconds: number,
    minIndex: number,
    maxIndex: number
  ) {
    let bestIndex = minIndex;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = minIndex; index <= maxIndex; index += 1) {
      const distance = Math.abs(elapsedSecondsForTrackIndex(index) - targetSeconds);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    return bestIndex;
  }

  function defaultTrackIndexForGap(gapIndex: number) {
    const minIndex = minInsertTrackIndexForGap(gapIndex);
    const maxIndex = maxInsertTrackIndexForGap(gapIndex);

    if (
      hoveredPointIndex.value !== null &&
      hoveredPointIndex.value >= minIndex &&
      hoveredPointIndex.value <= maxIndex
    ) {
      return hoveredPointIndex.value;
    }

    const startSeconds = elapsedSecondsForTrackIndex(gapStartTrackIndex(gapIndex));
    const endSeconds = elapsedSecondsForTrackIndex(gapEndTrackIndex(gapIndex));
    if (Number.isFinite(startSeconds) && Number.isFinite(endSeconds) && endSeconds > startSeconds) {
      return nearestTrackIndexForElapsedSecondsInRange(
        (startSeconds + endSeconds) / 2,
        minIndex,
        maxIndex
      );
    }

    return Math.round((minIndex + maxIndex) / 2);
  }

  function clampTrackIndex(index: number) {
    return Math.min(Math.max(index, 0), Math.max(trackData.value.length - 1, 0));
  }

  function minTrackIndexForCutPosition(cutPosition: number) {
    const previousCutId = editableSegmentCuts.value[cutPosition - 1];
    if (previousCutId === undefined) return 0;

    return trackIndexForCut(previousCutId) + 1;
  }

  function maxTrackIndexForCutPosition(cutPosition: number) {
    const nextCutId = editableSegmentCuts.value[cutPosition + 1];
    if (nextCutId === undefined) return Math.max(trackData.value.length - 1, 0);

    return trackIndexForCut(nextCutId) - 1;
  }

  function clampTrackIndexForCutPosition(cutPosition: number, trackIndex: number) {
    const minIndex = minTrackIndexForCutPosition(cutPosition);
    const maxIndex = maxTrackIndexForCutPosition(cutPosition);

    return Math.min(Math.max(clampTrackIndex(trackIndex), minIndex), maxIndex);
  }

  function setEditableCutByTrackIndex(cutPosition: number, trackIndex: number) {
    const point = trackData.value[clampTrackIndexForCutPosition(cutPosition, trackIndex)];
    if (!point) return;

    const nextCuts = [...editableSegmentCuts.value];
    nextCuts[cutPosition] = point.id;
    editableSegmentCuts.value = nextCuts;
  }

  function nudgeEditableCutByPoints(cutPosition: number, deltaPoints: number) {
    const currentCutId = editableSegmentCuts.value[cutPosition];
    if (currentCutId === undefined) return;

    setEditableCutByTrackIndex(cutPosition, trackIndexForCut(currentCutId) + deltaPoints);
  }

  function nudgeEditableCutBySeconds(cutPosition: number, deltaSeconds: number) {
    const currentCutId = editableSegmentCuts.value[cutPosition];
    if (currentCutId === undefined) return;

    const currentIndex = trackIndexForCut(currentCutId);
    const targetSeconds = elapsedSecondsForTrackIndex(currentIndex) + deltaSeconds;
    setEditableCutByTrackIndex(cutPosition, nearestTrackIndexForElapsedSeconds(targetSeconds));
  }

  function formatElapsedTrackTime(index: number) {
    return formatSeconds(elapsedSecondsForTrackIndex(index));
  }

  function trackLabelForIndex(index: number) {
    const point = trackData.value[index];
    if (!point) return 'Unknown point';

    return `${formatElapsedTrackTime(index)} · ${formatDistanceMeters(point.dist)} · Point ${point.id}`;
  }

  function updateEditableCut(cutPosition: number, event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const trackIndex = Number.parseInt(target.value, 10);
    setEditableCutByTrackIndex(cutPosition, trackIndex);
  }

  function insertEditableCutInGap(gapIndex: number) {
    if (!canInsertCutInGap(gapIndex)) return;

    const point = trackData.value[defaultTrackIndexForGap(gapIndex)];
    if (!point) return;

    editableSegmentCuts.value = [
      ...editableSegmentCuts.value.slice(0, gapIndex),
      point.id,
      ...editableSegmentCuts.value.slice(gapIndex),
    ];
  }

  function removeEditableCut(cutPosition: number) {
    editableSegmentCuts.value = editableSegmentCuts.value.filter(
      (_, index) => index !== cutPosition
    );
  }

  async function saveSegmentCutChanges() {
    const isCurrent = captureActivity();
    if (!active) return;
    if (!canApplySegmentCutChanges.value) return;

    isSavingSegmentSet.value = true;
    segmentMutationError.value = null;

    try {
      if (isCreatingSegmentSet.value) {
        const created = await createSegmentSet({
          name: draftSegmentSetName.value.trim(),
          activityId: toValue(activityId),
          cuts: sortedEditableSegmentCuts.value,
        });
        if (!isCurrent()) return;
        await loadSegmentSets();
        if (!isCurrent()) return;
        selectedSegmentSetId.value = created.id;
      } else if (selectedSegmentSetId.value !== null) {
        await updateSegmentSet(selectedSegmentSetId.value, {
          cuts: sortedEditableSegmentCuts.value,
        });
        if (!isCurrent()) return;
        const updatedStatistics = await fetchSegmentStatistics(selectedSegmentSetId.value);
        if (!isCurrent()) return;
        segmentStatisticsById.value = {
          ...segmentStatisticsById.value,
          [updatedStatistics.segmentSetId]: updatedStatistics,
        };
      }

      cancelSegmentCutEdit();
      showSegmentStats.value = true;
    } catch (e: unknown) {
      if (!isCurrent()) return;
      segmentMutationError.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (isCurrent()) {
        isSavingSegmentSet.value = false;
      }
    }
  }

  async function deleteSelectedSegmentSet() {
    const isCurrent = captureActivity();
    if (!active) return;
    if (selectedSegmentSetId.value === null || isSavingSegmentSet.value) return;

    isSavingSegmentSet.value = true;
    segmentMutationError.value = null;

    try {
      await deleteSegmentSet(selectedSegmentSetId.value);
      if (!isCurrent()) return;
      await loadSegmentSets();
      if (!isCurrent()) return;
    } catch (e: unknown) {
      if (!isCurrent()) return;
      segmentMutationError.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (isCurrent()) {
        isSavingSegmentSet.value = false;
      }
    }
  }

  function formatDistanceMeters(meters: number | null) {
    if (meters === null) return '-';
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${meters.toFixed(0)} m`;
  }

  function formatSeconds(seconds: number) {
    const wholeSeconds = Math.round(seconds);
    const hours = Math.floor(wholeSeconds / 3600);
    const minutes = Math.floor((wholeSeconds % 3600) / 60);
    const remainingSeconds = wholeSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function formatSpeedMetersPerSecond(speed: number | null, unit = 'km/h') {
    if (speed === null) return '-';

    if (unit === 'm/s') return `${speed.toFixed(1)} m/s`;
    if (unit === 'miles/h') return `${(speed * 2.236936).toFixed(1)} mph`;
    return `${(speed * 3.6).toFixed(1)} km/h`;
  }

  function formatNullableMetric(value: number | null, unit: string) {
    if (value === null) return '-';
    return `${value.toFixed(0)} ${unit}`;
  }

  function formatSegmentElevation(gain: number | null, loss: number | null) {
    if (gain === null && loss === null) return '-';

    const gainLabel = gain === null ? '-' : `+${gain.toFixed(0)}`;
    const lossLabel = loss === null ? '-' : `-${loss.toFixed(0)}`;
    return `${gainLabel} / ${lossLabel} m`;
  }

  function formatPaceMetric(secondsPerKm: number | null) {
    if (secondsPerKm === null) return '-';

    const unit = selectedSegmentStatistics.value?.displayMetadata.paceUnit ?? 'min/km';
    if (unit === 's/km') return `${secondsPerKm.toFixed(0)} s/km`;
    if (unit === 's/mile') return `${(secondsPerKm * 1.609344).toFixed(0)} s/mi`;
    if (unit === 'min/mile') return `${formatSeconds(secondsPerKm * 1.609344)}/mi`;
    return `${formatSeconds(secondsPerKm)}/km`;
  }

  function segmentMetricValue(segment: SegmentStats, metric: SegmentMetric): SegmentMetrics | null {
    return segment[metric];
  }

  function metricLabel(metric: SegmentMetric) {
    const labels: Record<SegmentMetric, string> = {
      pace: 'Pace',
      speed: 'Speed',
      heartrate: 'HR',
      power: 'Power',
      cadence: 'Cadence',
    };

    return labels[metric];
  }

  function formatSegmentMetric(metric: SegmentMetric, value: number | null) {
    if (value === null) return '-';

    if (metric === 'pace') return formatPaceMetric(value);
    if (metric === 'speed') {
      return formatSpeedMetersPerSecond(
        value,
        selectedSegmentStatistics.value?.displayMetadata.speedUnit
      );
    }
    if (metric === 'heartrate') return formatNullableMetric(value, 'bpm');
    if (metric === 'power') return formatNullableMetric(value, 'W');
    return formatCadence(value, toValue(cadenceUnit));
  }

  function formatSegmentMetricAverage(segment: SegmentStats, metric: SegmentMetric) {
    return formatSegmentMetric(metric, segmentMetricValue(segment, metric)?.avg ?? null);
  }
  watch(
    () => toValue(activityId),
    () => {
      void loadSegmentSets();
    },
    { immediate: true }
  );
  onScopeDispose(() => {
    active = false;
    reset();
  });
  return {
    deleteSelectedSegmentSet,
    segmentSetIds,
    segmentStatisticsById,
    selectedSegmentSetId,
    isLoadingSegmentSets,
    segmentSetError,
    showSegmentStats,
    isEditingSegmentCuts,
    editableSegmentCuts,
    isCreatingSegmentSet,
    draftSegmentSetName,
    isSavingSegmentSet,
    segmentMutationError,
    selectedSegmentStatistics,
    sortedEditableSegmentCuts,
    hasInvalidSegmentCuts,
    hasDuplicateSegmentCuts,
    canUseSegmentCutEdit,
    canStartNewSegmentSet,
    hasValidSegmentSetName,
    canApplySegmentCutChanges,
    displayMetrics,
    supportingDisplayMetrics,
    hasSegmentDistance,
    hasSegmentElevation,
    segmentStatsColumnCount,
    startNewSegmentSet,
    startSegmentCutEdit,
    cancelSegmentCutEdit,
    toggleSegmentDetails,
    isSegmentDetailsExpanded,
    handleSegmentSetChange,
    trackIndexForCut,
    durationBeforeCut,
    finalEditableSegmentDuration,
    canInsertCutInGap,
    gapLabel,
    gapDuration,
    gapDistance,
    minTrackIndexForCutPosition,
    maxTrackIndexForCutPosition,
    nudgeEditableCutByPoints,
    nudgeEditableCutBySeconds,
    formatElapsedTrackTime,
    trackLabelForIndex,
    updateEditableCut,
    insertEditableCutInGap,
    removeEditableCut,
    saveSegmentCutChanges,
    formatDistanceMeters,
    formatSeconds,
    formatSegmentElevation,
    segmentMetricValue,
    metricLabel,
    formatSegmentMetric,
    formatSegmentMetricAverage,
    loadSegmentSets,
    visibleSegmentCutIndices,
  };
}

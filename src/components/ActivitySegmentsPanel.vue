<script setup lang="ts">
import { reactive, toRef, watch } from 'vue';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Trash2 } from '@lucide/vue';
import type { TrackPoint } from '@/services/api';
import { useActivitySegments } from '@/composables/useActivitySegments';
const props = defineProps<{
  activityId: string;
  trackData: TrackPoint[];
  hoveredIndex: number | null;
}>();
const emit = defineEmits<{ (event: 'cuts-change', cuts: number[]): void }>();
const segments = reactive(
  useActivitySegments(
    () => props.activityId,
    toRef(props, 'trackData'),
    toRef(props, 'hoveredIndex')
  )
);
watch(
  () => segments.visibleSegmentCutIndices,
  (cuts) => emit('cuts-change', cuts),
  { immediate: true }
);
function confirmDeleteSegmentSet() {
  if (window.confirm('Delete this segment set? This cannot be undone.'))
    void segments.deleteSelectedSegmentSet();
}
</script>
<template>
  <div
    v-if="trackData.length > 0"
    class="bg-white p-6 rounded-xl shadow-sm border border-verve-medium/30"
  >
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 class="text-xl font-bold text-verve-brown">Segments</h2>
        <p class="text-sm text-verve-brown/60 mt-1">Interval statistics for saved segment sets.</p>
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          aria-label="Segment set"
          v-if="segments.segmentSetIds.length > 0"
          :value="segments.selectedSegmentSetId ?? ''"
          :disabled="segments.isLoadingSegmentSets"
          class="px-3 py-2 border border-verve-medium rounded-xl text-sm text-verve-brown bg-white focus:outline-none focus:ring-2 focus:ring-verve-orange/30"
          @change="segments.handleSegmentSetChange"
        >
          <option
            v-for="segmentSetId in segments.segmentSetIds"
            :key="segmentSetId"
            :value="segmentSetId"
          >
            {{ segments.segmentStatisticsById[segmentSetId]?.name ?? 'Segment set' }}
          </option>
        </select>

        <button
          v-if="segments.selectedSegmentStatistics"
          type="button"
          @click="segments.showSegmentStats = !segments.showSegmentStats"
          class="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          :class="
            segments.showSegmentStats
              ? 'bg-verve-brown text-white hover:bg-verve-brown/90'
              : 'bg-verve-light text-verve-brown hover:bg-verve-medium/40'
          "
        >
          {{ segments.showSegmentStats ? 'Hide stats' : 'Show stats' }}
        </button>

        <button
          v-if="segments.selectedSegmentStatistics"
          type="button"
          :disabled="!segments.canUseSegmentCutEdit"
          @click="
            segments.isEditingSegmentCuts
              ? segments.cancelSegmentCutEdit()
              : segments.startSegmentCutEdit()
          "
          class="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="
            segments.isEditingSegmentCuts
              ? 'border-verve-brown text-verve-brown bg-white hover:bg-verve-light/50'
              : 'border-verve-medium text-verve-brown bg-white hover:bg-verve-light/50'
          "
        >
          {{ segments.isEditingSegmentCuts ? 'Cancel edit' : 'Edit cuts' }}
        </button>

        <button
          type="button"
          :disabled="!segments.canStartNewSegmentSet"
          @click="segments.startNewSegmentSet"
          class="px-4 py-2 rounded-xl text-sm font-semibold bg-verve-orange text-white hover:bg-verve-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          New set
        </button>

        <button
          v-if="segments.selectedSegmentStatistics"
          type="button"
          :disabled="segments.isSavingSegmentSet"
          @click="confirmDeleteSegmentSet"
          class="px-4 py-2 rounded-xl text-sm font-semibold border border-red-200 text-red-600 bg-white hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete
        </button>
      </div>
    </div>

    <div v-if="segments.isLoadingSegmentSets" class="mt-4 text-sm text-verve-brown/60">
      Loading segment sets...
    </div>
    <div
      v-else-if="segments.segmentSetError"
      class="mt-4 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm"
    >
      {{ segments.segmentSetError }}
      <button
        type="button"
        @click="segments.loadSegmentSets"
        class="mt-2 block rounded px-2 py-1 font-bold underline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Retry segment sets
      </button>
    </div>
    <div
      v-else-if="segments.segmentSetIds.length === 0"
      class="mt-4 text-sm text-verve-brown/60 italic"
    >
      No segment sets saved for this activity.
    </div>

    <div
      v-if="segments.segmentMutationError"
      class="mt-4 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-sm"
    >
      {{ segments.segmentMutationError }}
    </div>

    <div
      v-if="segments.isEditingSegmentCuts"
      class="mt-6 p-4 rounded-xl bg-verve-light/20 border border-verve-medium/30"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 class="font-bold text-verve-brown">
            {{ segments.isCreatingSegmentSet ? 'Create segment set' : 'Edit cut points' }}
          </h3>
          <p class="text-sm text-verve-brown/60 mt-1">
            Insert cuts between existing boundaries, then fine-tune each cut.
          </p>
        </div>
      </div>

      <label
        v-if="segments.isCreatingSegmentSet"
        class="block mt-4 text-sm font-semibold text-verve-brown"
      >
        Name
        <input
          v-model="segments.draftSegmentSetName"
          type="text"
          class="mt-2 w-full px-3 py-2 border border-verve-medium rounded-xl text-sm text-verve-brown bg-white focus:outline-none focus:ring-2 focus:ring-verve-orange/30"
          placeholder="Interval set"
        />
      </label>

      <div class="mt-4 space-y-3">
        <template
          v-for="gapIndex in segments.editableSegmentCuts.length + 1"
          :key="`gap-${gapIndex - 1}`"
        >
          <div
            class="flex flex-col gap-3 rounded-lg border border-dashed border-verve-medium/50 bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p class="text-sm font-bold text-verve-brown">
                {{ segments.gapLabel(gapIndex - 1) }}
              </p>
              <p class="mt-1 text-xs text-verve-brown/60">
                {{
                  segments.gapDuration(gapIndex - 1) === null
                    ? '-'
                    : segments.formatSeconds(segments.gapDuration(gapIndex - 1)!)
                }}
                <span v-if="segments.gapDistance(gapIndex - 1) !== null">
                  · {{ segments.formatDistanceMeters(segments.gapDistance(gapIndex - 1)) }}
                </span>
              </p>
            </div>
            <button
              type="button"
              :disabled="!segments.canInsertCutInGap(gapIndex - 1)"
              @click="segments.insertEditableCutInGap(gapIndex - 1)"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-verve-medium bg-white px-3 py-2 text-sm font-semibold text-verve-brown transition-colors hover:bg-verve-light/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus class="size-4" />
              <span>Insert cut</span>
            </button>
          </div>

          <div
            v-if="segments.editableSegmentCuts[gapIndex - 1] !== undefined"
            class="rounded-lg bg-white border border-verve-medium/40 p-4 shadow-sm"
          >
            <template v-if="segments.editableSegmentCuts[gapIndex - 1] !== undefined">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="text-sm font-bold text-verve-brown">Cut {{ gapIndex }}</p>
                  <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      class="rounded-md bg-verve-brown px-2 py-1 font-mono font-bold text-white"
                    >
                      {{
                        segments.formatElapsedTrackTime(
                          segments.trackIndexForCut(segments.editableSegmentCuts[gapIndex - 1]!)
                        )
                      }}
                    </span>
                    <span
                      class="rounded-md bg-verve-light px-2 py-1 font-semibold text-verve-brown/80"
                    >
                      {{
                        segments.formatDistanceMeters(
                          trackData[
                            segments.trackIndexForCut(segments.editableSegmentCuts[gapIndex - 1]!)
                          ]?.dist ?? 0
                        )
                      }}
                    </span>
                    <span
                      class="rounded-md bg-white px-2 py-1 font-semibold text-verve-brown/50 ring-1 ring-verve-medium/40"
                    >
                      ID {{ segments.editableSegmentCuts[gapIndex - 1] }}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  @click="segments.removeEditableCut(gapIndex - 1)"
                  class="inline-flex items-center justify-center rounded-md p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                  :aria-label="`Remove cut ${gapIndex}`"
                >
                  <Trash2 class="size-4" />
                </button>
              </div>

              <p class="mt-3 text-xs text-verve-brown/55">
                {{
                  segments.trackLabelForIndex(
                    segments.trackIndexForCut(segments.editableSegmentCuts[gapIndex - 1]!)
                  )
                }}
              </p>

              <p class="mt-2 text-xs font-semibold text-verve-brown/70">
                Segment duration:
                {{
                  segments.durationBeforeCut(gapIndex - 1) === null
                    ? '-'
                    : segments.formatSeconds(segments.durationBeforeCut(gapIndex - 1)!)
                }}
              </p>

              <input
                type="range"
                min="0"
                :max="Math.max(trackData.length - 1, 0)"
                step="1"
                :value="segments.trackIndexForCut(segments.editableSegmentCuts[gapIndex - 1]!)"
                class="cut-range mt-4 w-full"
                @input="segments.updateEditableCut(gapIndex - 1, $event)"
              />

              <div class="mt-3 grid grid-cols-4 gap-2">
                <button
                  type="button"
                  :disabled="
                    segments.trackIndexForCut(segments.editableSegmentCuts[gapIndex - 1]!) <=
                    segments.minTrackIndexForCutPosition(gapIndex - 1)
                  "
                  class="cut-nudge-button"
                  :aria-label="`Move cut ${gapIndex} back one minute`"
                  @click="segments.nudgeEditableCutBySeconds(gapIndex - 1, -60)"
                >
                  <ChevronsLeft class="size-4" />
                  <span>-1m</span>
                </button>
                <button
                  type="button"
                  :disabled="
                    segments.trackIndexForCut(segments.editableSegmentCuts[gapIndex - 1]!) <=
                    segments.minTrackIndexForCutPosition(gapIndex - 1)
                  "
                  class="cut-nudge-button"
                  :aria-label="`Move cut ${gapIndex} back one track point`"
                  @click="segments.nudgeEditableCutByPoints(gapIndex - 1, -1)"
                >
                  <ChevronLeft class="size-4" />
                  <span>-1</span>
                </button>
                <button
                  type="button"
                  :disabled="
                    segments.trackIndexForCut(segments.editableSegmentCuts[gapIndex - 1]!) >=
                    segments.maxTrackIndexForCutPosition(gapIndex - 1)
                  "
                  class="cut-nudge-button"
                  :aria-label="`Move cut ${gapIndex} forward one track point`"
                  @click="segments.nudgeEditableCutByPoints(gapIndex - 1, 1)"
                >
                  <span>+1</span>
                  <ChevronRight class="size-4" />
                </button>
                <button
                  type="button"
                  :disabled="
                    segments.trackIndexForCut(segments.editableSegmentCuts[gapIndex - 1]!) >=
                    segments.maxTrackIndexForCutPosition(gapIndex - 1)
                  "
                  class="cut-nudge-button"
                  :aria-label="`Move cut ${gapIndex} forward one minute`"
                  @click="segments.nudgeEditableCutBySeconds(gapIndex - 1, 60)"
                >
                  <span>+1m</span>
                  <ChevronsRight class="size-4" />
                </button>
              </div>
            </template>
          </div>
        </template>
      </div>

      <p
        v-if="segments.finalEditableSegmentDuration !== null"
        class="mt-4 text-sm font-semibold text-verve-brown/70"
      >
        Final segment duration: {{ segments.formatSeconds(segments.finalEditableSegmentDuration) }}
      </p>

      <div class="mt-4 flex flex-col gap-2 text-sm">
        <p v-if="segments.hasInvalidSegmentCuts" class="text-red-600">
          One or more cuts no longer match a track point.
        </p>
        <p v-if="segments.hasDuplicateSegmentCuts" class="text-red-600">
          Two cuts point to the same track point.
        </p>
        <p v-if="!segments.hasValidSegmentSetName" class="text-red-600">
          Segment set name is required.
        </p>
        <p v-if="segments.canApplySegmentCutChanges" class="text-verve-brown/70">
          {{ segments.sortedEditableSegmentCuts.length }} valid cuts ready, ordered by track
          position.
        </p>
      </div>

      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          @click="segments.cancelSegmentCutEdit"
          class="px-4 py-2 rounded-xl text-sm font-semibold border border-verve-medium text-verve-brown bg-white hover:bg-verve-light/50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          :disabled="!segments.canApplySegmentCutChanges"
          @click="segments.saveSegmentCutChanges"
          class="px-4 py-2 rounded-xl text-sm font-semibold bg-verve-brown text-white hover:bg-verve-brown/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ segments.isSavingSegmentSet ? 'Saving...' : 'Save cuts' }}
        </button>
      </div>
    </div>

    <div
      v-if="segments.showSegmentStats && segments.selectedSegmentStatistics"
      class="mt-6 overflow-x-auto"
    >
      <table class="min-w-full text-sm">
        <thead>
          <tr
            class="text-left text-xs font-bold uppercase tracking-wider text-verve-brown/50 border-b border-verve-medium/30"
          >
            <th class="py-3 pr-4">#</th>
            <th class="py-3 px-4">Duration</th>
            <th v-if="segments.hasSegmentDistance" class="py-3 px-4">Distance</th>
            <th class="py-3 px-4">
              {{
                segments.metricLabel(
                  segments.selectedSegmentStatistics.displayMetadata.primaryMetric
                )
              }}
            </th>
            <th v-for="metric in segments.supportingDisplayMetrics" :key="metric" class="py-3 px-4">
              {{ segments.metricLabel(metric) }} avg
            </th>
            <th v-if="segments.hasSegmentElevation" class="py-3 pl-4">Elevation</th>
            <th class="py-3 pl-4">Details</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-verve-medium/20">
          <template
            v-for="(segment, index) in segments.selectedSegmentStatistics.segments"
            :key="index"
          >
            <tr class="text-verve-brown">
              <td class="py-3 pr-4 font-semibold">{{ index + 1 }}</td>
              <td class="py-3 px-4">{{ segments.formatSeconds(segment.durationS) }}</td>
              <td v-if="segments.hasSegmentDistance" class="py-3 px-4">
                {{ segments.formatDistanceMeters(segment.distanceM) }}
              </td>
              <td class="py-3 px-4 font-semibold">
                {{
                  segments.formatSegmentMetricAverage(
                    segment,
                    segments.selectedSegmentStatistics.displayMetadata.primaryMetric
                  )
                }}
              </td>
              <td
                v-for="metric in segments.supportingDisplayMetrics"
                :key="metric"
                class="py-3 px-4"
              >
                {{ segments.formatSegmentMetricAverage(segment, metric) }}
              </td>
              <td v-if="segments.hasSegmentElevation" class="py-3 pl-4">
                {{ segments.formatSegmentElevation(segment.elevationGain, segment.elevationLoss) }}
              </td>
              <td class="py-3 pl-4">
                <button
                  type="button"
                  class="text-xs font-bold text-verve-orange hover:text-verve-brown"
                  @click="segments.toggleSegmentDetails(index)"
                >
                  {{ segments.isSegmentDetailsExpanded(index) ? 'Hide' : 'Show' }}
                </button>
              </td>
            </tr>
            <tr
              v-if="segments.isSegmentDetailsExpanded(index)"
              class="bg-verve-light/20 text-verve-brown"
            >
              <td :colspan="segments.segmentStatsColumnCount" class="p-4">
                <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div
                    v-for="metric in segments.displayMetrics"
                    :key="metric"
                    class="rounded-xl border border-verve-medium/30 bg-white p-3"
                  >
                    <p class="text-xs font-bold uppercase tracking-wider text-verve-brown/50">
                      {{ segments.metricLabel(metric) }}
                    </p>
                    <div class="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p class="text-verve-brown/50">Min</p>
                        <p class="font-semibold">
                          {{
                            segments.formatSegmentMetric(
                              metric,
                              segments.segmentMetricValue(segment, metric)?.min ?? null
                            )
                          }}
                        </p>
                      </div>
                      <div>
                        <p class="text-verve-brown/50">Avg</p>
                        <p class="font-semibold">
                          {{
                            segments.formatSegmentMetric(
                              metric,
                              segments.segmentMetricValue(segment, metric)?.avg ?? null
                            )
                          }}
                        </p>
                      </div>
                      <div>
                        <p class="text-verve-brown/50">Max</p>
                        <p class="font-semibold">
                          {{
                            segments.formatSegmentMetric(
                              metric,
                              segments.segmentMetricValue(segment, metric)?.max ?? null
                            )
                          }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
<style scoped>
.cut-range {
  min-height: 2rem;
  accent-color: var(--color-verve-orange);
  cursor: pointer;
}

.cut-nudge-button {
  min-height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  border: 1px solid rgb(205 212 164 / 70%);
  border-radius: 0.5rem;
  background: rgb(255 255 255 / 92%);
  color: var(--color-verve-brown);
  font-size: 0.75rem;
  font-weight: 700;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    color 150ms ease;
}

.cut-nudge-button:hover:not(:disabled) {
  background: rgb(239 243 219 / 80%);
  border-color: var(--color-verve-medium);
}

.cut-nudge-button:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}
</style>

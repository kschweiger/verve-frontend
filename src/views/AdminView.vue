<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { RefreshCw, Shield, Wrench } from "@lucide/vue";
import { useUserStore } from "@/stores/auth";
import { useAdminStore } from "@/stores/admin";

const auth = useUserStore();
const admin = useAdminStore();
const router = useRouter();
const { t, n } = useI18n();

onMounted(() => {
  void admin.ensureUsers();
});
watch(
  () => auth.isAdmin,
  (isAdmin) => {
    if (!isAdmin) void router.replace({ name: auth.isAuthenticated ? "dashboard" : "login" });
  },
);
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-7xl space-y-8">
      <header>
        <div class="flex items-center gap-3 text-verve-brown">
          <Shield class="size-7" aria-hidden="true" />
          <h1 class="text-3xl font-bold">{{ t('navigation.admin') }}</h1>
        </div>
        <p class="mt-2 text-sm text-verve-brown/70">
          {{ t('admin.description') }}
        </p>
      </header>

      <section aria-labelledby="maintenance-heading"
        class="rounded-xl border border-verve-medium/30 bg-white p-5 sm:p-6">
        <h2 id="maintenance-heading" class="text-xl font-bold text-verve-brown">
          {{ t('admin.maintenance') }}
        </h2>
        <p v-if="admin.isLoadingUsers" role="status" class="mt-4 text-sm text-verve-brown/70">
          {{ t('admin.loadingUsers') }}
        </p>
        <div v-if="admin.usersError" role="alert" class="mt-4 text-sm text-red-600">
          <p>{{ admin.usersError.detail ?? t('admin.loadUsersFailed') }}</p>
          <button type="button" :disabled="admin.isLoadingUsers" @click="admin.ensureUsers()"
            class="mt-2 rounded-lg border border-verve-medium px-3 py-2 font-semibold text-verve-brown hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-verve-orange disabled:opacity-50">
            {{ t('admin.retry') }}
          </button>
        </div>

        <div class="mt-5 max-w-xl">
          <label for="admin-user" class="block text-sm font-semibold text-verve-brown">{{ t('admin.user') }}</label>
          <select id="admin-user" v-model="admin.selectedUserId"
            :disabled="!admin.usersLoaded || admin.isLoadingUsers || admin.isSubmitting"
            class="mt-2 w-full rounded-lg border border-verve-medium bg-white px-3 py-2 text-sm text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-orange disabled:opacity-50">
            <option v-if="!admin.usersLoaded" value="">{{ t('admin.selectUser') }}</option>
            <option v-for="user in admin.users" :key="user.id" :value="user.id">
              {{ t(user.id === auth.currentUser?.id ? 'admin.currentUser' : 'admin.otherUser',
                { name: user.full_name || user.name, email: user.email }) }}
            </option>
          </select>
        </div>

        <div class="mt-6 grid gap-6 border-t border-verve-light pt-6 md:grid-cols-2">
          <div>
            <h3 class="font-bold text-verve-brown">{{ t('admin.tracks') }}</h3>
            <p class="mt-2 text-sm text-verve-brown/70">
              {{ t('admin.tracksDescription') }}
            </p>
            <button type="button" :disabled="!admin.canSubmit" @click="admin.submit('reprocess-tracks')"
              class="mt-4 inline-flex items-center gap-2 rounded-xl bg-verve-brown px-4 py-2.5 text-sm font-semibold text-white hover:bg-verve-brown/90 focus-visible:outline-2 focus-visible:outline-verve-orange focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <Wrench class="size-4" aria-hidden="true" />
              {{ t('admin.operations.reprocess-tracks') }}
            </button>
          </div>
          <div>
            <h3 class="font-bold text-verve-brown">{{ t('admin.highlights') }}</h3>
            <p class="mt-2 text-sm text-verve-brown/70">
              {{ t('admin.highlightsDescription') }}
            </p>
            <button type="button" :disabled="!admin.canSubmit" @click="admin.submit('recalculate-highlights')"
              class="mt-4 inline-flex items-center gap-2 rounded-xl bg-verve-brown px-4 py-2.5 text-sm font-semibold text-white hover:bg-verve-brown/90 focus-visible:outline-2 focus-visible:outline-verve-orange focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw class="size-4" aria-hidden="true" />
              {{ t('admin.operations.recalculate-highlights') }}
            </button>
          </div>
        </div>
        <p v-if="admin.isSubmitting" role="status" class="mt-4 text-sm text-verve-brown/70">
          {{ t('admin.submitting') }}
        </p>
        <p v-if="admin.submissionError" role="alert" class="mt-4 text-sm text-red-600">
          {{ t('admin.submissionFailed') }}
          <span v-if="admin.submissionError.detail" class="block">{{ admin.submissionError.detail }}</span>
        </p>
      </section>

      <section aria-labelledby="jobs-heading">
        <h2 id="jobs-heading" class="text-xl font-bold text-verve-brown">{{ t('admin.jobs') }}</h2>
        <p class="mt-2 text-sm text-verve-brown/70">
          {{ t('admin.jobsDescription') }}
        </p>
        <p v-if="!admin.runs.length" class="mt-6 text-sm text-verve-brown/60">
          {{ t('admin.noJobs') }}
        </p>
        <div v-else class="mt-5 space-y-5" aria-live="polite">
          <details v-for="run in admin.runs" :key="run.id" open
            class="rounded-xl border border-verve-medium/30 bg-white p-5">
            <summary
              class="cursor-pointer font-semibold text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-orange">
              {{ t(`admin.operations.${run.operation}`) }} · {{ run.user.full_name || run.user.name }}
              <span class="ml-2 text-sm font-normal text-verve-brown/60">{{ t('admin.taskCount', { count: n(run.tasks.length) }, run.tasks.length) }}</span>
            </summary>
            <p class="mt-2 text-sm text-verve-brown/70">{{ run.user.email }}</p>
            <p v-if="!run.tasks.length" class="mt-4 text-sm text-verve-brown/60">
              {{ t('admin.noTasks') }}
            </p>
            <ul v-else class="mt-4 max-h-96 divide-y divide-verve-light overflow-y-auto">
              <li v-for="task in run.tasks" :key="`${task.kind}-${task.taskId}`" class="py-4 first:pt-0">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-verve-brown">{{ t(`admin.taskKinds.${task.kind}`) }}</p>
                    <p class="mt-1 break-all font-mono text-xs text-verve-brown/60">
                      {{ t('admin.taskId', { id: task.taskId }) }}
                    </p>
                    <p v-if="task.activityId" class="mt-1 break-all font-mono text-xs text-verve-brown/60">
                      {{ t('admin.activityId', { id: task.activityId }) }}
                    </p>
                    <p class="mt-2 text-sm text-verve-brown">
                      {{ task.status?.state ?? t('admin.unchecked') }}
                    </p>
                  </div>
                  <button type="button" :disabled="task.isRefreshing" @click="admin.refreshTask(task)"
                    :aria-label="t('admin.refreshTask', { id: task.taskId })"
                    class="inline-flex shrink-0 items-center gap-2 rounded-lg border border-verve-medium px-3 py-2 text-sm font-semibold text-verve-brown hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-verve-orange disabled:opacity-50">
                    <RefreshCw class="size-4" :class="{ 'animate-spin': task.isRefreshing }" aria-hidden="true" />
                    {{ t(task.isRefreshing ? 'admin.refreshing' : 'admin.refresh') }}
                  </button>
                </div>
                <p v-if="task.refreshError" role="alert" class="mt-2 text-sm text-red-600">
                  {{ task.refreshError.detail ?? t('admin.refreshFailed') }}
                </p>
                <p v-if="task.status?.error" class="mt-2 text-sm text-red-600">
                  {{ task.status.error }}
                </p>
                <details v-if="task.status?.result" class="mt-3">
                  <summary
                    class="cursor-pointer text-sm font-semibold text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-orange">
                    {{ t('admin.result') }}
                  </summary>
                  <pre class="mt-2 overflow-x-auto whitespace-pre-wrap break-all text-xs text-verve-brown/80">{{
                    JSON.stringify(task.status.result, null, 2) }}</pre>
                </details>
              </li>
            </ul>
          </details>
        </div>
      </section>
    </div>
  </div>
</template>

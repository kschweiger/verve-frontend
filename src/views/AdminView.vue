<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { RefreshCw, Shield, Wrench } from "@lucide/vue";
import { useUserStore } from "@/stores/auth";
import { useAdminStore, type AdminOperation, type AdminTask } from "@/stores/admin";

const auth = useUserStore();
const admin = useAdminStore();
const router = useRouter();

onMounted(() => {
  void admin.ensureUsers();
});
watch(
  () => auth.isAdmin,
  (isAdmin) => {
    if (!isAdmin) void router.replace({ name: auth.isAuthenticated ? "dashboard" : "login" });
  },
);

function operationLabel(operation: AdminOperation): string {
  return operation === "reprocess-tracks" ? "Reprocess tracks" : "Recalculate highlights";
}

function taskLabel(task: AdminTask): string {
  if (task.kind === "track") return "Track rebuild";
  if (task.kind === "completion") return "Completion and highlights";
  return "Highlight rebuild";
}
</script>

<template>
  <div class="p-4 sm:p-6 lg:p-8">
    <div class="mx-auto max-w-7xl space-y-8">
      <header>
        <div class="flex items-center gap-3 text-verve-brown">
          <Shield class="size-7" aria-hidden="true" />
          <h1 class="text-3xl font-bold">Admin</h1>
        </div>
        <p class="mt-2 text-sm text-verve-brown/70">
          Maintain tracks and highlights for a selected user.
        </p>
      </header>

      <section aria-labelledby="maintenance-heading"
        class="rounded-xl border border-verve-medium/30 bg-white p-5 sm:p-6">
        <h2 id="maintenance-heading" class="text-xl font-bold text-verve-brown">
          User maintenance
        </h2>
        <p v-if="admin.isLoadingUsers" role="status" class="mt-4 text-sm text-verve-brown/70">
          Loading users...
        </p>
        <div v-if="admin.usersError" role="alert" class="mt-4 text-sm text-red-600">
          <p>{{ admin.usersError }}</p>
          <button type="button" :disabled="admin.isLoadingUsers" @click="admin.ensureUsers()"
            class="mt-2 rounded-lg border border-verve-medium px-3 py-2 font-semibold text-verve-brown hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-verve-orange disabled:opacity-50">
            Retry
          </button>
        </div>

        <div class="mt-5 max-w-xl">
          <label for="admin-user" class="block text-sm font-semibold text-verve-brown">User</label>
          <select id="admin-user" v-model="admin.selectedUserId"
            :disabled="!admin.usersLoaded || admin.isLoadingUsers || admin.isSubmitting"
            class="mt-2 w-full rounded-lg border border-verve-medium bg-white px-3 py-2 text-sm text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-orange disabled:opacity-50">
            <option v-if="!admin.usersLoaded" value="">Select a user</option>
            <option v-for="user in admin.users" :key="user.id" :value="user.id">
              {{ user.full_name || user.name }} — {{ user.email
              }}{{ user.id === auth.currentUser?.id ? " (you)" : "" }}
            </option>
          </select>
        </div>

        <div class="mt-6 grid gap-6 border-t border-verve-light pt-6 md:grid-cols-2">
          <div>
            <h3 class="font-bold text-verve-brown">Tracks</h3>
            <p class="mt-2 text-sm text-verve-brown/70">
              Rebuild this user's stored tracks and refresh their highlights after processing.
            </p>
            <button type="button" :disabled="!admin.canSubmit" @click="admin.submit('reprocess-tracks')"
              class="mt-4 inline-flex items-center gap-2 rounded-xl bg-verve-brown px-4 py-2.5 text-sm font-semibold text-white hover:bg-verve-brown/90 focus-visible:outline-2 focus-visible:outline-verve-orange focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <Wrench class="size-4" aria-hidden="true" />
              Reprocess tracks
            </button>
          </div>
          <div>
            <h3 class="font-bold text-verve-brown">Highlights</h3>
            <p class="mt-2 text-sm text-verve-brown/70">
              Recalculate this user's highlights from their existing activity data.
            </p>
            <button type="button" :disabled="!admin.canSubmit" @click="admin.submit('recalculate-highlights')"
              class="mt-4 inline-flex items-center gap-2 rounded-xl bg-verve-brown px-4 py-2.5 text-sm font-semibold text-white hover:bg-verve-brown/90 focus-visible:outline-2 focus-visible:outline-verve-orange focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw class="size-4" aria-hidden="true" />
              Recalculate highlights
            </button>
          </div>
        </div>
        <p v-if="admin.isSubmitting" role="status" class="mt-4 text-sm text-verve-brown/70">
          Submitting job...
        </p>
        <p v-if="admin.submissionError" role="alert" class="mt-4 text-sm text-red-600">
          {{ admin.submissionError }}
        </p>
      </section>

      <section aria-labelledby="jobs-heading">
        <h2 id="jobs-heading" class="text-xl font-bold text-verve-brown">Submitted jobs</h2>
        <p class="mt-2 text-sm text-verve-brown/70">
          Jobs from this session appear here. Refresh a task to check its status.
        </p>
        <p v-if="!admin.runs.length" class="mt-6 text-sm text-verve-brown/60">
          No jobs submitted yet.
        </p>
        <div v-else class="mt-5 space-y-5" aria-live="polite">
          <details v-for="run in admin.runs" :key="run.id" open
            class="rounded-xl border border-verve-medium/30 bg-white p-5">
            <summary
              class="cursor-pointer font-semibold text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-orange">
              {{ operationLabel(run.operation) }} · {{ run.user.full_name || run.user.name }}
              <span class="ml-2 text-sm font-normal text-verve-brown/60">{{ run.tasks.length }} tasks</span>
            </summary>
            <p class="mt-2 text-sm text-verve-brown/70">{{ run.user.email }}</p>
            <p v-if="!run.tasks.length" class="mt-4 text-sm text-verve-brown/60">
              No tasks were queued.
            </p>
            <ul v-else class="mt-4 max-h-96 divide-y divide-verve-light overflow-y-auto">
              <li v-for="task in run.tasks" :key="`${task.kind}-${task.taskId}`" class="py-4 first:pt-0">
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-verve-brown">{{ taskLabel(task) }}</p>
                    <p class="mt-1 break-all font-mono text-xs text-verve-brown/60">
                      Task: {{ task.taskId }}
                    </p>
                    <p v-if="task.activityId" class="mt-1 break-all font-mono text-xs text-verve-brown/60">
                      Activity: {{ task.activityId }}
                    </p>
                    <p class="mt-2 text-sm text-verve-brown">
                      {{ task.status?.state ?? "Status not checked" }}
                    </p>
                  </div>
                  <button type="button" :disabled="task.isRefreshing" @click="admin.refreshTask(task)"
                    :aria-label="`Refresh status for task ${task.taskId}`"
                    class="inline-flex shrink-0 items-center gap-2 rounded-lg border border-verve-medium px-3 py-2 text-sm font-semibold text-verve-brown hover:bg-verve-light focus-visible:outline-2 focus-visible:outline-verve-orange disabled:opacity-50">
                    <RefreshCw class="size-4" :class="{ 'animate-spin': task.isRefreshing }" aria-hidden="true" />
                    {{ task.isRefreshing ? "Refreshing..." : "Refresh status" }}
                  </button>
                </div>
                <p v-if="task.refreshError" role="alert" class="mt-2 text-sm text-red-600">
                  {{ task.refreshError }}
                </p>
                <p v-if="task.status?.error" class="mt-2 text-sm text-red-600">
                  {{ task.status.error }}
                </p>
                <details v-if="task.status?.result" class="mt-3">
                  <summary
                    class="cursor-pointer text-sm font-semibold text-verve-brown focus-visible:outline-2 focus-visible:outline-verve-orange">
                    Result
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

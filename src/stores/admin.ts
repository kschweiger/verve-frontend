import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useUserStore } from './auth';
import { ApiResponseError } from '../services/authHeaders';
import {
  fetchAdminUsers, reprocessUserTracks, recalculateUserHighlights, fetchAdminTask,
  type AdminTaskStatus, type AdminUserJob,
} from '../services/admin';
import type { UserPublic } from '../services/users';

export type AdminOperation = 'reprocess-tracks' | 'recalculate-highlights';
export interface AdminTask {
  taskId: string;
  userId: string;
  kind: 'track' | 'completion' | 'highlights';
  activityId: string | null;
  status: AdminTaskStatus | null;
  isRefreshing: boolean;
  refreshError: string | null;
}
export interface AdminRun {
  id: number;
  operation: AdminOperation;
  user: UserPublic;
  tasks: AdminTask[];
}

function createTask(job: AdminUserJob, kind: AdminTask['kind'], activityId: string | null = null): AdminTask {
  return { taskId: job.task_id, userId: job.user_id, kind, activityId,
    status: null, isRefreshing: false, refreshError: null };
}

export const useAdminStore = defineStore('admin', () => {
  const auth = useUserStore();
  const users = ref<UserPublic[]>([]);
  const selectedUserId = ref('');
  const usersLoaded = ref(false);
  const isLoadingUsers = ref(false);
  const usersError = ref<string | null>(null);
  const runs = ref<AdminRun[]>([]);
  const isSubmitting = ref(false);
  const submissionError = ref<string | null>(null);
  let session = 0;
  let nextRunId = 0;
  let usersRequest: Promise<void> | null = null;

  const selectedUser = computed(() => users.value.find(user => user.id === selectedUserId.value) ?? null);
  const canSubmit = computed(() => auth.isAdmin && usersLoaded.value && !isLoadingUsers.value &&
    !isSubmitting.value && selectedUser.value !== null);

  watch(() => [auth.token, auth.isAdmin], () => {
    session++;
    users.value = [];
    selectedUserId.value = '';
    usersLoaded.value = false;
    isLoadingUsers.value = false;
    usersError.value = null;
    usersRequest = null;
    runs.value = [];
    isSubmitting.value = false;
    submissionError.value = null;
  }, { flush: 'sync' });

  function handleAccessError(error: unknown) {
    if (!(error instanceof ApiResponseError)) return;
    if (error.status === 401) auth.logout();
    if (error.status === 403) auth.revokeAdmin();
  }

  function ensureUsers(): Promise<void> {
    if (!auth.isAdmin) return Promise.resolve();
    if (usersRequest) return usersRequest;
    if (usersLoaded.value) return Promise.resolve();
    const currentSession = session;
    const me = auth.currentUser;
    if (!me) return Promise.resolve();
    isLoadingUsers.value = true;
    usersError.value = null;
    const request = fetchAdminUsers().then(others => {
      if (currentSession !== session) return;
      users.value = [me, ...others.filter(user => user.id !== me.id)];
      selectedUserId.value = me.id;
      usersLoaded.value = true;
    }).catch((error: unknown) => {
      if (currentSession !== session) return;
      usersError.value = error instanceof Error ? error.message : 'Failed to load users.';
      handleAccessError(error);
    }).finally(() => {
      if (currentSession === session) isLoadingUsers.value = false;
      if (usersRequest === request) usersRequest = null;
    });
    usersRequest = request;
    return request;
  }

  async function submit(operation: AdminOperation): Promise<void> {
    const user = selectedUser.value;
    if (!canSubmit.value || !user) return;
    const currentSession = session;
    isSubmitting.value = true;
    submissionError.value = null;
    try {
      let tasks: AdminTask[];
      if (operation === 'reprocess-tracks') {
        const jobs = await reprocessUserTracks(user.id);
        tasks = [...jobs.tracks.map(job => createTask(job, 'track', job.activity_id)),
          ...jobs.completion_tasks.map(job => createTask(job, 'completion'))];
      } else {
        const jobs = await recalculateUserHighlights(user.id);
        tasks = jobs.users.map(job => createTask(job, 'highlights'));
      }
      if (currentSession !== session) return;
      runs.value.unshift({ id: ++nextRunId, operation, user, tasks });
    } catch (error: unknown) {
      if (currentSession !== session) return;
      submissionError.value = error instanceof ApiResponseError ? error.message
        : 'Could not confirm that the job was queued. Check before submitting again.';
      handleAccessError(error);
    } finally {
      if (currentSession === session) isSubmitting.value = false;
    }
  }

  async function refreshTask(task: AdminTask): Promise<void> {
    if (!auth.isAdmin || task.isRefreshing || !runs.value.some(run => run.tasks.includes(task))) return;
    const currentSession = session;
    task.isRefreshing = true;
    task.refreshError = null;
    try {
      const status = await fetchAdminTask(task.taskId);
      if (currentSession === session) task.status = status;
    } catch (error: unknown) {
      if (currentSession !== session) return;
      task.refreshError = error instanceof Error ? error.message : 'Failed to refresh task status.';
      handleAccessError(error);
    } finally {
      if (currentSession === session) task.isRefreshing = false;
    }
  }

  return { users, selectedUserId, selectedUser, usersLoaded, isLoadingUsers, usersError,
    runs, isSubmitting, submissionError, canSubmit, ensureUsers, submit, refreshTask };
});

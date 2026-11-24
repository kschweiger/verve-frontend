import { ref } from 'vue';
import { ApiResponseError } from '../services/authHeaders';
import type { en } from '../i18n/equipment';

type EquipmentErrorKey = keyof typeof en.errors;

export function useEquipmentAction() {
  const actionError = ref<{ key: EquipmentErrorKey; detail?: string } | null>(null);

  async function runAction(key: EquipmentErrorKey, action: () => Promise<unknown>) {
    actionError.value = null;
    try {
      await action();
      return true;
    } catch (error) {
      actionError.value = { key, detail: error instanceof ApiResponseError ? error.detail : undefined };
      return false;
    }
  }

  return { actionError, runAction };
}

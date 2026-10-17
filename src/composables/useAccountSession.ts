import { watch } from 'vue';
import { useUserStore } from '../stores/auth';

/** Reset account state; check the captured predicate immediately after awaits, before side effects. */
export function useAccountSession(reset: () => void) {
  const auth = useUserStore();
  let generation = 0;
  watch(
    () => auth.token,
    () => {
      generation++;
      reset();
    },
    { flush: 'sync' }
  );

  return function captureSession() {
    const current = generation;
    return () => current === generation;
  };
}

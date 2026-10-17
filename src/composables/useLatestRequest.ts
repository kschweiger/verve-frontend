/** Give each resource to its latest request, while retaining account-session isolation. */
export function useLatestRequest(captureSession: () => () => boolean) {
  let latest = 0;
  return function beginRequest() {
    const request = ++latest;
    const isCurrentSession = captureSession();
    return () => request === latest && isCurrentSession();
  };
}

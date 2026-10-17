type FetchHandler = (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>;

// Bun adds preconnect to fetch; test handlers implement it without opening sockets.
export function stubFetch<T extends FetchHandler>(handler: T) {
  return Object.assign(handler, { preconnect: () => undefined });
}

import { AsyncLocalStorage } from "async_hooks";

export interface RequestLogStore {
  requestId?: string;
}

const requestAls = new AsyncLocalStorage<RequestLogStore>();

export function getRequestLogStore(): RequestLogStore | undefined {
  return requestAls.getStore();
}

export function runWithRequestLogStore<T>(
  store: RequestLogStore,
  fn: () => T,
): T {
  return requestAls.run(store, fn);
}

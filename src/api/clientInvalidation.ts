type ClientInvalidationListener = (clientId: string) => void;
type ReportInvalidationListener = () => void;

const listeners = new Set<ClientInvalidationListener>();
const reportListeners = new Set<ReportInvalidationListener>();

/**
 * Registers a callback invoked whenever client-related queries
 * (`/clients/:id`, `/clients/:id/service-records`, `/clients/:id/packs`)
 * are invalidated after a mutation.
 */
export function subscribeClientInvalidation(
  listener: ClientInvalidationListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notifies active subscribers to refetch client details, service history, and packs.
 */
export function invalidateClientQueries(clientId?: string | null): void {
  if (!clientId) return;
  for (const listener of listeners) {
    listener(clientId);
  }
}

/**
 * Registers a callback invoked whenever service-record or report queries
 * (`/service-records`, `/reports/daily`, `/reports/periodic`) should refresh.
 */
export function subscribeReportInvalidation(
  listener: ReportInvalidationListener,
): () => void {
  reportListeners.add(listener);
  return () => {
    reportListeners.delete(listener);
  };
}

/**
 * Notifies active management/report views to refetch records and financial summaries.
 */
export function invalidateReportQueries(): void {
  for (const listener of reportListeners) {
    listener();
  }
}

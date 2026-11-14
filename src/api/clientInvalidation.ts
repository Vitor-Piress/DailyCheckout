type ClientInvalidationListener = (clientId: string) => void;

const listeners = new Set<ClientInvalidationListener>();

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

export type DeletionOutcome =
  | { status: 'complete' }
  | { status: 'unchanged'; message: string }
  | { status: 'cleanup-pending'; message: string };

export type EvidenceCleanup = { id: string; name: string };
/** The marker is committed before either irreversible evidence operation. */
export async function deleteEvidence(
  item: EvidenceCleanup,
  io: {
    readMarkers(): Promise<EvidenceCleanup[]>;
    writeMarkers(markers: EvidenceCleanup[]): Promise<void>;
    onPending(markers: EvidenceCleanup[]): void;
    ensureAllowed(): Promise<void>;
    removeCache(id: string): Promise<void>;
    removeActive(id: string): Promise<void>;
  },
): Promise<DeletionOutcome> {
  let marked = false;
  let cacheRemoved = false;
  let activeRemoved = false;
  try {
    await io.ensureAllowed();
    const markers = await io.readMarkers();
    if (!markers.some((row) => row.id === item.id)) await io.writeMarkers([...markers, item]);
    marked = true;
    io.onPending(markers.some((row) => row.id === item.id) ? markers : [...markers, item]);
    await io.ensureAllowed();
    await io.removeCache(item.id);
    cacheRemoved = true;
    await io.ensureAllowed();
    await io.removeActive(item.id);
    activeRemoved = true;
    const latest = await io.readMarkers();
    const next = latest.filter((row) => row.id !== item.id);
    await io.writeMarkers(next);
    io.onPending(next);
    return { status: 'complete' };
  } catch (error) {
    try {
      const observed = await io.readMarkers();
      const hasMarker = observed.some((row) => row.id === item.id);
      if (hasMarker) {
        marked = true;
        io.onPending(observed);
      } else if (marked && cacheRemoved && activeRemoved) {
        io.onPending(observed);
        return { status: 'complete' };
      }
    } catch {
      // An unreadable marker does not authorize further mutations.
    }
    return marked
      ? {
          status: 'cleanup-pending',
          message:
            'Removal is incomplete. This data is unavailable; retry deletion. ' + String(error),
        }
      : { status: 'unchanged', message: 'Data was not removed. ' + String(error) };
  }
}

/** Bound decoded response bytes before constructing a JSON string, including chunked responses. */
export async function readBoundedResponseText(
  response: Pick<Response, 'headers' | 'body'>,
  maximumBytes: number,
): Promise<string> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0)
    throw new Error('Invalid response limit.');
  const tooLarge = () => new Error('Regional response exceeds the download limit.');
  if (Number(response.headers.get('content-length')) > maximumBytes) {
    await response.body?.cancel().catch(() => {});
    throw tooLarge();
  }
  if (!response.body) return '';
  if (typeof response.body.getReader !== 'function')
    throw new Error('This runtime cannot stream regional data safely. Update the app.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel().catch(() => {});
        throw tooLarge();
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join('');
  } finally {
    reader.releaseLock();
  }
}

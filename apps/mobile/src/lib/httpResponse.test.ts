import test from 'node:test';
import assert from 'node:assert/strict';
import { readBoundedResponseText } from './httpResponse';

test('chunked regional responses enforce actual byte limit and cancel an oversized transfer', async () => {
  let cancelled = false;
  const encoder = new TextEncoder();
  const response = new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('12345'));
        controller.enqueue(encoder.encode('6'));
      },
      cancel() {
        cancelled = true;
      },
    }),
    { headers: { 'Content-Length': '1' } },
  );
  await assert.rejects(readBoundedResponseText(response, 5), /download limit/);
  assert.equal(cancelled, true);
});
test('UTF-8 characters spanning chunks are decoded correctly and counted by bytes', async () => {
  const text = 'Żółć';
  const bytes = new TextEncoder().encode(text);
  const response = () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(bytes.slice(0, 1));
          controller.enqueue(bytes.slice(1, 5));
          controller.enqueue(bytes.slice(5));
          controller.close();
        },
      }),
    );
  assert.equal(await readBoundedResponseText(response(), bytes.byteLength), text);
  await assert.rejects(readBoundedResponseText(response(), bytes.byteLength - 1), /download limit/);
});
test('a declared oversized response is cancelled before reading its body', async () => {
  let pulls = 0;
  let cancelled = false;
  const response = new Response(
    new ReadableStream(
      {
        pull() {
          pulls++;
        },
        cancel() {
          cancelled = true;
        },
      },
      { highWaterMark: 0 },
    ),
    { headers: { 'Content-Length': '6000000' } },
  );
  await assert.rejects(readBoundedResponseText(response, 4_000_000), /download limit/);
  assert.equal(pulls, 0);
  assert.equal(cancelled, true);
});

import { ApiError } from './errors';
import { objectInput } from './validate';
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'application/json') throw new ApiError('CONTENT_TYPE', '请使用 JSON 格式提交。', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError('INVALID_BODY', '提交内容格式不正确。');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16_384) { await reader.cancel(); throw new ApiError('BODY_TOO_LARGE', '提交内容过长。', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes)); }
  catch { throw new ApiError('INVALID_BODY', '提交内容格式不正确。'); }
  return objectInput(parsed);
}

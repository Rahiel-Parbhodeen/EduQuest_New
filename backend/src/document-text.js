// @ts-nocheck - subprocess errors are normalised to safe user-facing codes.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { pythonRuntime } from '../../scripts/python-runtime.mjs';
export const documentMessages = {
  DOCUMENT_NO_TEXT:
    'No readable text was found. Scanned PDFs need OCR; upload a text-based PDF, Word, PowerPoint, TXT or Markdown file.',
  DOCUMENT_TOO_LARGE:
    'This document exceeds the 500,000-character processing limit. Select relevant chapters and upload them as separate files.',
  DOCUMENT_READ_FAILED:
    'The uploaded file could not be read. Check the file, or export it as TXT and upload it again.',
  GENERATION_SOURCE_MISMATCH:
    'Some generated questions could not be linked to your uploaded text. Try generating again.',
  AI_NOT_CONFIGURED:
    'Live AI is not configured. Follow AI_SETUP.md to add a provider key and model, then restart the app.',
  AI_PROVIDER_ERROR:
    'The live AI service could not generate a quiz. Check your provider key, model, account credit and connection.',
  SOURCE_TOO_SHORT:
    'There is not enough distinct material for that many offline questions. Request fewer questions or upload more notes.',
};
export async function readDocument(resource) {
  const script = fileURLToPath(
    new URL('../../ai-service/extract_text.py', import.meta.url),
  );
  let output;
  try {
    const { stdout } = await promisify(execFile)(
      pythonRuntime(),
      [script, resource.file_location, resource.resource_type.toLowerCase()],
      { timeout: 120000, maxBuffer: 8 * 1024 * 1024, windowsHide: true },
    );
    output = JSON.parse(stdout);
  } catch (error) {
    let code = 'DOCUMENT_READ_FAILED';
    try {
      const parsed = JSON.parse(error.stdout);
      if (documentMessages[parsed.error_code]) code = parsed.error_code;
    } catch {}
    const failure = new Error(documentMessages[code]);
    failure.code = code;
    throw failure;
  }
  const text = output.text;
  if (typeof text !== 'string' || !text.trim()) {
    const failure = new Error(documentMessages.DOCUMENT_NO_TEXT);
    failure.code = 'DOCUMENT_NO_TEXT';
    throw failure;
  }
  return {
    text,
    characters: text.length,
    sha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex'),
  };
}
export const quoteMatches = (quote, text) => {
  if (typeof quote !== 'string' || quote.trim().length < 15 || typeof text !== 'string') return false;
  const excerpt = quote.trim();
  if (text.includes(excerpt)) return true;
  const tokens = (value) => {
    const normalized = value.normalize('NFKC').toLocaleLowerCase();
    const merged = normalized.replace(/[-\u2010\u2011\u00ad][ \t]*\r?\n[ \t]*/g, '');
    return merged.match(/[\p{L}\p{N}]+/gu) || [];
  };
  const needle = tokens(quote);
  const haystack = tokens(text);
  if (needle.length < 3 || needle.length > haystack.length) return false;
  outer: for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (haystack[start + offset] !== needle[offset]) continue outer;
    }
    return true;
  }
  return false;
};

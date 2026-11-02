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
    'This document is too large to read safely. Split it into smaller sections.',
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
      { timeout: 30000, maxBuffer: 2 * 1024 * 1024, windowsHide: true },
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
export const quoteMatches = (quote, text) =>
  typeof quote === 'string' &&
  quote.trim().length >= 15 &&
  text.replace(/\s+/g, ' ').includes(quote.trim().replace(/\s+/g, ' '));

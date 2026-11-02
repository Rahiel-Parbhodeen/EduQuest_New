import React, { useEffect, useState } from 'react';
export function GenerationNotice() {
  const [status, setStatus] = useState(null);
  useEffect(() => {
    let live = true;
    fetch('/api/v1/generation-status', { credentials: 'include' })
      .then((r) => r.json())
      .then((body) => {
        if (live) setStatus(body);
      })
      .catch(() => {
        if (live)
          setStatus({
            mode: 'unavailable',
            message: 'Start the question service with npm run dev.',
          });
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <article className="card generation-notice" aria-live="polite">
      <h2>
        {status?.mode === 'offline'
          ? 'Offline practice generator'
          : status?.mode === 'live'
            ? 'Live AI generation'
            : 'Question generation'}
      </h2>
      <p>{status?.message || 'Checking the question service…'}</p>
      <p>
        Use “Preview uploaded text” on a resource to check what was read.
        Generated drafts include supporting excerpts from that upload.
      </p>
    </article>
  );
}
export const generationErrorMessages = {
  DOCUMENT_NO_TEXT:
    'No readable text was found. If this is a scanned PDF, apply OCR or upload a text-based document.',
  DOCUMENT_TOO_LARGE:
    'This document exceeds the 500,000-character processing limit. Select relevant chapters and upload them as separate files.',
  DOCUMENT_READ_FAILED:
    'This file could not be read. Check the file or upload a TXT export.',
  SOURCE_TOO_SHORT:
    'There is not enough material for that many offline questions. Request fewer questions or upload more notes.',
  AI_NOT_CONFIGURED:
    'Live AI setup is incomplete. Follow AI_SETUP.md and restart the app.',
  AI_PROVIDER_ERROR:
    'The AI provider could not generate a quiz. Check your key, model, account credit and connection.',
  GENERATION_SOURCE_MISMATCH:
    'The generated questions could not be linked to this upload. Try generating again.',
  AI_OUTPUT_TEXT_NOT_ALLOWED:
    'The generated response failed validation. Try fewer questions or review your material.',
};

import { describe, expect, it } from 'vitest';
import { classifyProviderError } from '../scripts/ai-worker.js';

describe('classifyProviderError', () => {
  it('reports citation linking failures separately from provider outages', () => {
    expect(classifyProviderError('Could not find supporting text in this document.'))
      .toBe('GENERATION_SOURCE_MISMATCH');
    expect(classifyProviderError('Gemini service unavailable')).toBe('AI_PROVIDER_ERROR');
  });
});

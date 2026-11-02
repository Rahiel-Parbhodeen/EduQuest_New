import { it, expect } from 'vitest';
import { quoteMatches } from './document-text.js';
it('accepts a verbatim supporting quote with normalised whitespace', () => {
  expect(
    quoteMatches(
      'Photosynthesis converts light energy',
      'Photosynthesis\nconverts light energy into chemical energy.',
    ),
  ).toBe(true);
});
it('rejects unrelated excerpts and empty evidence', () => {
  expect(
    quoteMatches(
      'Databases store structured information',
      'Photosynthesis converts light energy into chemical energy.',
    ),
  ).toBe(false);
  expect(quoteMatches('', 'Material')).toBe(false);
});

import { describe, expect, it } from 'vitest';
import { quoteMatches } from '../src/document-text.js';

describe('quoteMatches', () => {
  it('matches an exact source span despite PDF punctuation and whitespace changes', () => {
    expect(quoteMatches('A reliable system supports stu-\ndent learning outcomes.', 'A reliable system supports student learning outcomes.'))
      .toBe(true);
  });

  it('accepts exact source excerpts before applying normalized token matching', () => {
    const source = 'Protocol_A sends a reliable message to Protocol_B over the channel.';
    const excerpt = 'sends a reliable message to Protocol_B over';
    expect(quoteMatches(excerpt, source)).toBe(true);
  });

  it('rejects unrelated or reordered citations', () => {
    const source = 'Normalization removes transitive dependencies from relational tables.';
    expect(quoteMatches('Unrelated source text that was invented.', source)).toBe(false);
    expect(quoteMatches('transitive removes Normalization dependencies', source)).toBe(false);
  });
});

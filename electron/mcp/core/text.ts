import { EN_STOP_WORDS, FR_STOP_WORDS } from '../../services/KeywordsExtractor/stopWords.const';
import { foldText, mentions } from '../../utils/text';

// Only the grammar words, as the keyword extractor's phrase boundaries: its job-context lists ("equipe", "client")
// are noise in an offer but meaningful in a query.
const STOP_WORDS = new Set(
  [...EN_STOP_WORDS.structural, ...EN_STOP_WORDS.fillers, ...FR_STOP_WORDS.structural, ...FR_STOP_WORDS.fillers].map(foldText),
);

/** Keeps "c++", "c#", "node.js" whole. */
export function terms(text: string): string[] {
  const words = foldText(text).split(/[^a-z0-9+#.-]+/).map((word) => word.replace(/^[.-]+|[.-]+$/g, ''));
  return [...new Set(words.filter((word) => word.length > 1 && !STOP_WORDS.has(word)))];
}

/** Share of the query terms the text mentions, 0..1. */
export function keywordScore(queryTerms: string[], text: string): number {
  if (!queryTerms.length) return 0;
  return queryTerms.filter((term) => mentions(text, term)).length / queryTerms.length;
}

const numbersIn = (text: string) => new Set((text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((number) => number.replace(',', '.')));

/** Figures a written text has and its source has not: the likeliest invention in a rewrite. */
export function newNumbers(text: string, source: string): string[] {
  const known = numbersIn(source);
  return [...numbersIn(text)].filter((number) => !known.has(number));
}

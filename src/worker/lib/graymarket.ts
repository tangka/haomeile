import { GRAY_MARKET_KEYWORDS } from './graymarket-config';
export function detectGrayMarket(text: string): string[] {
  const normalized = text.normalize('NFKC').toLowerCase();
  return GRAY_MARKET_KEYWORDS.filter((keyword) => normalized.includes(keyword.toLowerCase()));
}

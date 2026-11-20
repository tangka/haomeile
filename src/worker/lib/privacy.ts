export const PRIVACY_RULES = [
  ['email', /[\w.+-]+@[\w-]+(\.[\w-]+)+/i, '这段文字里像是有邮箱地址，删掉后再提交。'],
  ['link', /https?:\/\/|www\.|\b[\w-]+\.(com|net|org|cn|io|ai|rip|xyz|top|me|app|dev|co)\b/i, '这段文字里像是有链接或网址，删掉后再提交。'],
  ['phone', /(?<!\d)1[3-9]\d{9}(?!\d)/, '这段文字里像是有手机号，删掉后再提交。'],
  ['identity', /(?<!\d)\d{17}[\dXx](?!\d)/, '这段文字里像是有证件号码，删掉后再提交。'],
  ['api_key', /\b(sk-|sk_|pk_|rk_|AIza|ghp_|gho_|xox[abp]-)[\w-]{8,}/i, '这段文字里像是有 API Key，删掉后再提交。如果是真的 Key，建议马上去厂商后台作废它。'],
  ['long_number', /(?<!\d)\d{12,}(?!\d)/, '这段文字里有一串很长的数字，像是订单号，删掉后再提交。'],
  ['contact', /(微信|vx|v信|wx|QQ|扣扣)\s*[:：号]?\s*[\w-]{5,}/i, '这段文字里像是有微信或 QQ 号，删掉后再提交。'],
] as const;
export function checkPrivacy(value: string): { code: string; message: string } | null {
  for (const [code, pattern, message] of PRIVACY_RULES) if (pattern.test(value.normalize('NFKC'))) return { code, message };
  return null;
}

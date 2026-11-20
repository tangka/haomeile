import { describe, expect, it } from 'vitest';
import { ApiError } from '../../src/worker/lib/errors';
import { checkPrivacy } from '../../src/worker/lib/privacy';
import { validateTombInput, validateVisitor } from '../../src/worker/lib/validate';
import { detectGrayMarket } from '../../src/worker/lib/graymarket';
import { beijingDay, beijingMidnight, shiftDay, validDate } from '../../src/worker/lib/time';
const input = { codename: '单元测试示例', vendor: 'claude', event_type: 'verification', died_at: '2026-11-18', story: '这是一段仅供单元测试使用的示例经过。', consent: true };
describe('shared validation and privacy', () => {
  it.each([
    ['email', 'hello@example.com'], ['link', 'https://example.test'], ['link', 'example.ai'],
    ['phone', '13800138000'], ['identity', '110101199001011234'], ['api_key', 'sk-abcdefgh12345678'],
    ['api_key', 'AIzaabcdefgh12345678'], ['long_number', '123456789012345'], ['contact', '微信：test_name'],
    ['phone', '１３８００１３８０００'],
  ])('rejects %s without reflecting matched content', (code, text) => {
    const result = checkPrivacy(text);
    expect(result?.code).toBe(code);
    expect(result?.message).not.toContain(text);
    expect(() => validateTombInput({ ...input, story: '示例经过里面含有：' + text }, '2026-11-20')).toThrow(ApiError);
  });
  it('normalizes defaults and keeps codepoint lengths', () => {
    expect(validateTombInput(input, '2026-11-20')).toMatchObject({ plan: 'unknown', born_at: null, born_precision: 'none', card_style: 'flower', nickname: '' });
    expect(validateTombInput({ ...input, codename: '🙂'.repeat(32) }, '2026-11-20').codename).toHaveLength(64);
    expect(() => validateTombInput({ ...input, codename: '🙂'.repeat(33) }, '2026-11-20')).toThrow('32');
  });
  it.each([
    { codename: '' }, { vendor: 'demo_orange' }, { event_type: [] }, { plan: 'admin' }, { card_style: 'logo' }, { consent: false },
    { died_at: '2026-11-21' }, { died_at: '2026-02-30' }, { born_precision: 'day', born_at: '2026-11-19' },
    { born_precision: 'month', born_at: '2026-13' }, { story: '太短了' }, { nickname: 123 },
  ])('rejects invalid fields: %j', (patch) => expect(() => validateTombInput({ ...input, ...patch }, '2026-11-20')).toThrow(ApiError));
  it('accepts valid day/month dates', () => {
    expect(validateTombInput({ ...input, born_precision: 'month', born_at: '2026-11' }, '2026-11-20').born_at).toBe('2026-11');
    expect(validateTombInput({ ...input, born_precision: 'day', born_at: '2026-11-18' }, '2026-11-20').born_at).toBe('2026-11-18');
  });
  it('flags gray market terms for human review', () => {
    expect(detectGrayMarket('示例提到了拼车和代理API')).toEqual(['拼车', '代理API']);
    expect(detectGrayMarket('只是正常记录验证情况')).toEqual([]);
  });
  it('requires random UUID v4 visitor format', () => {
    expect(validateVisitor(crypto.randomUUID())).toHaveLength(36);
    expect(() => validateVisitor('raw-ip')).toThrow(ApiError);
  });
});
describe('Beijing calendar boundaries', () => {
  it('changes day at UTC 16:00', () => {
    expect(beijingDay(Date.parse('2026-11-19T15:59:59Z'))).toBe('2026-11-19');
    expect(beijingDay(Date.parse('2026-11-19T16:00:00Z'))).toBe('2026-11-20');
    expect(beijingMidnight('2026-11-20')).toBe('2026-11-19T16:00:00.000Z');
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('rejects overflow dates and accepts leap day', () => {
    expect(validDate('2024-02-29')).toBe(true);
    expect(validDate('2026-02-29')).toBe(false);
    expect(validDate('2026-13', 'month')).toBe(false);
  });
});

import {
  APPEALS,
  EVENTS,
  LEGACY_PLANS,
  PLANS,
  PRODUCT_PLANS,
  STYLES,
  VENDORS,
  type TombInput,
  type StoredTombInput,
  type LegacyPlan,
} from '../types';
import { ApiError } from './errors';
import { checkPrivacy } from './privacy';
import { beijingDay, validDate } from './time';
export function objectInput(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ApiError('INVALID_BODY', '提交内容格式不正确。');
  return value as Record<string, unknown>;
}
export function validateTombInput(
  value: unknown,
  today = beijingDay(),
): TombInput {
  const input = objectInput(value);
  const fields: Record<string, string> = {};
  const text = (name: string, min: number, max: number): string => {
    const raw = input[name];
    if (raw !== undefined && typeof raw !== 'string')
      fields[name] = '请填写文字。';
    const result = typeof raw === 'string' ? raw.trim() : '';
    const length = Array.from(result).length;
    if (length < min)
      fields[name] =
        name === 'story' && length > 0
          ? '再多写几句吧，至少 10 个字。'
          : '这一项需要填写。';
    if (length > max) fields[name] = `这一项最多 ${max} 个字。`;
    const privacy = checkPrivacy(result);
    if (privacy) fields[name] = privacy.message;
    return result;
  };
  const enumeration = <T extends string>(
    name: string,
    options: readonly T[],
    fallback?: T,
  ): T => {
    const raw =
      input[name] === undefined || input[name] === '' ? fallback : input[name];
    if (typeof raw !== 'string' || !options.includes(raw as T))
      fields[name] = '请选择有效的选项。';
    return raw as T;
  };
  const result: TombInput = {
    codename: text('codename', 1, 32),
    nickname: text('nickname', 0, 24),
    vendor: enumeration('vendor', VENDORS),
    event_type: enumeration('event_type', EVENTS),
    plan: enumeration('plan', PLANS, 'unknown'),
    born_at: null,
    born_precision: enumeration(
      'born_precision',
      ['none', 'month', 'day'] as const,
      'none',
    ),
    died_at: typeof input.died_at === 'string' ? input.died_at : '',
    story: text('story', 10, 800),
    epitaph: text('epitaph', 0, 120),
    appeal_status: enumeration('appeal_status', APPEALS, 'none'),
    card_style: enumeration('card_style', STYLES, 'flower'),
    consent: true,
  };
  if (
    !fields.vendor &&
    !fields.plan &&
    !(PRODUCT_PLANS[result.vendor] as readonly string[]).includes(result.plan)
  )
    fields.plan = '这个产品没有此套餐，请重新选择。';
  if (!validDate(result.died_at)) fields.died_at = '请填写有效的出事日期。';
  else if (result.died_at > today) fields.died_at = '出事日期不能晚于今天。';
  if (result.born_precision !== 'none') {
    if (
      typeof input.born_at !== 'string' ||
      !validDate(input.born_at, result.born_precision)
    )
      fields.born_at = '请填写有效的注册日期。';
    else {
      result.born_at = input.born_at;
      if (
        (result.born_precision === 'month'
          ? input.born_at + '-01'
          : input.born_at) > result.died_at
      )
        fields.born_at = '注册日期不能晚于出事日期。';
    }
  }
  if (input.consent !== true) fields.consent = '勾选同意公开后才能提交。';
  if (Object.keys(fields).length)
    throw new ApiError(
      'VALIDATION_ERROR',
      Object.values(fields)[0]!,
      400,
      fields,
    );
  return result;
}
// Review already-stored edits without inventing a named tier for an old category.
// New submissions and owner edits always use the stricter validateTombInput above.
export function validateStoredTombInput(
  value: unknown,
  today = beijingDay(),
): StoredTombInput {
  const input = objectInput(value);
  if (
    typeof input.plan === 'string' &&
    (LEGACY_PLANS as readonly string[]).includes(input.plan)
  ) {
    return {
      ...validateTombInput({ ...input, plan: 'unknown' }, today),
      plan: input.plan as LegacyPlan,
    };
  }
  return validateTombInput(input, today);
}
export function validateVisitor(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new ApiError('INVALID_VISITOR', '访客编号不正确，请刷新页面后重试。');
  return value;
}

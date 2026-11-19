/* 展示格式的唯一来源。纪念墙、详情页、墓志铭卡片、后台都用这里的函数，保证说法一致。
   移植：改成 src/site/scripts/format.ts 并补上类型；同时写单元测试（见 DESIGN.md §9）。 */
(function () {
  // 'YYYY-MM-DD' → '2026.11.18'；'YYYY-MM' → '2025.09'；空 → ''
  function fmtDate(s) {
    return s ? String(s).replaceAll('-', '.') : '';
  }

  // 两个日期之间的天数。只认 'YYYY-MM-DD' / 'YYYY-MM'，按 UTC 计算，避免时区误差。
  function daysBetween(from, to) {
    const parse = v => {
      const [y, m, d] = String(v).split('-').map(Number);
      return Date.UTC(y, (m || 1) - 1, d || 1);
    };
    const n = Math.round((parse(to) - parse(from)) / 86400000);
    return n >= 0 ? n : null;
  }

  function num(n) {
    return Number(n).toLocaleString('zh-CN');
  }

  /* 存活信息。返回两行文字：
     days  —— 刻在碑上的那句（宋体）
     range —— 下面一行小字
     规则：
       born_precision = 'day'   → 存活 412 天 / 2025.09.02 至 2026.11.18
       born_precision = 'month' → 存活约 442 天 / 2025.09 至 2026.11.18（从当月 1 日算）
       born_precision = 'none'  → 存活天数不详 / 卒于 2026.11.15 */
  function lifeLine(t) {
    const died = fmtDate(t.died_at);
    if (t.born_precision === 'none' || !t.born_at) {
      return { days: '存活天数不详', range: `卒于 ${died}` };
    }
    const d = daysBetween(t.born_at, t.died_at);
    if (d === null) return { days: '存活天数不详', range: `卒于 ${died}` };
    const prefix = t.born_precision === 'month' ? '存活约 ' : '存活 ';
    return { days: `${prefix}${num(d)} 天`, range: `${fmtDate(t.born_at)} 至 ${died}` };
  }

  // 后台用：'11 分钟前'、'3 小时前'、'2 天前'，超过 7 天显示日期
  function ago(iso, now = Date.now()) {
    const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
    if (s < 60) return '刚刚';
    if (s < 3600) return `${Math.floor(s / 60)} 分钟前`;
    if (s < 86400) return `${Math.floor(s / 3600)} 小时前`;
    if (s < 7 * 86400) return `${Math.floor(s / 86400)} 天前`;
    return fmtDate(new Date(iso).toISOString().slice(0, 10));
  }

  window.HML_FORMAT = { fmtDate, daysBetween, num, lifeLine, ago };
})();

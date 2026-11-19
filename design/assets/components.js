/* 前台组件。全部用 DOM API + textContent 构建，不拼 innerHTML（PLAN.md §7）。
   入参 t 的字段与 GET /api/tombstones 返回的单条记录完全一致（PLAN.md §5、§6.1）：
   { id, codename, nickname, vendor, event_type, plan, born_at, born_precision, died_at,
     story, epitaph, appeal_status, card_style, flowers, approved_at }

   移植：
   - createTombCard → src/site/components/TombCard.astro（服务端渲染首屏）
                      + src/site/scripts/wall.ts 里同名函数（“再看 20 块”时客户端追加）
   - createBars     → src/site/components/Bars.astro
   两边输出的 DOM 结构必须一致，样式才能共用。 */
(function () {
  const L = () => window.HML_LABELS;
  const F = () => window.HML_FORMAT;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function img(src, cls, w, h, alt = '') {
    const i = el('img', cls);
    i.src = src; i.alt = alt; i.width = w; i.height = h;
    return i;
  }

  const DECO = {
    flower: [['flower.svg', 'l', 20, 20], ['flower.svg', 'r', 20, 20]],
    cloud: [['cloud.svg', 'r', 24, 11]],
    star: [['star.svg', 'l', 20, 14], ['star.svg', 'r', 20, 14]]
  };

  /* opts:
     assetBase  图片目录，设计稿 'assets/'，正式站 '/assets/'
     href       详情页链接生成函数，默认 id => `/t/${id}`
     detail     true 时渲染详情页版本（标题用 h1，经过不截断，显示附加信息）
     flowered   今天是否已献过花（来自 localStorage 记录或接口返回）
     onFlower   async (id) => 新的献花数；抛错时按钮恢复原状
     demo       设计稿专用：显示“示例”标签 */
  function createTombCard(t, opts = {}) {
    const base = opts.assetBase ?? 'assets/';
    const href = opts.href ?? (id => `/t/${id}`);

    const card = el('article', 'tomb');
    card.dataset.id = t.id;

    (DECO[t.card_style] || DECO.flower).forEach(([f, side, w, h]) => {
      card.append(img(base + f, `tomb-deco ${side}`, w, h));
    });

    const body = el('div', 'tomb-body stone-shape');
    const face = el('div', 'tomb-face stone-shape');
    body.append(face);
    card.append(body);

    // 代号
    const name = el(opts.detail ? 'h1' : 'h3', 'tomb-name', t.codename || '无名氏');
    if (opts.detail) {
      face.append(name);
    } else {
      const a = el('a', 'tomb-link');
      a.href = href(t.id);
      a.append(name);
      face.append(a);
    }

    // 存活
    const life = F().lifeLine(t);
    const lifeP = el('p', 'tomb-life');
    lifeP.append(el('span', 'tomb-days', life.days), el('span', 'tomb-range', life.range));
    face.append(lifeP);

    // 标签
    const tags = el('ul', 'tags');
    tags.append(
      el('li', 'tag', (L().vendor[t.vendor]) || t.vendor),
      el('li', 'tag', L().event_type_short[t.event_type] || '其他')
    );
    if (opts.demo) tags.append(el('li', 'tag tag-example', '示例'));
    face.append(tags);

    if (t.epitaph) face.append(el('p', 'tomb-epitaph', t.epitaph));
    face.append(el('p', 'tomb-story', t.story));

    if (opts.detail) {
      const dl = el('dl', 'facts');
      const add = (k, v) => { dl.append(el('dt', null, k), el('dd', null, v)); };
      add('署名', t.nickname || '匿名');
      add('套餐', L().plan[t.plan] || '不详');
      add('申诉', L().appeal_status[t.appeal_status] || '还没申诉');
      if (t.approved_at) add('立碑', F().fmtDate(t.approved_at.slice(0, 10)));
      face.append(dl);
    }

    // 底栏
    const foot = el('div', 'tomb-foot');
    foot.append(el('span', 'tomb-unverified', '用户自述，未经核实'));
    foot.append(createFlowerButton(t, opts, base));
    face.append(foot);

    return card;
  }

  function createFlowerButton(t, opts, base) {
    const b = el('button', 'flower-btn');
    b.type = 'button';
    let count = t.flowers || 0;
    const label = el('span', null);
    const render = pressed => {
      b.setAttribute('aria-pressed', String(pressed));
      label.textContent = `献花 ${F().num(count)}`;
      b.setAttribute('aria-label', pressed ? `今天已献花，共 ${count} 朵` : `献一朵花，现在有 ${count} 朵`);
    };
    b.append(img(base + 'flower.svg', null, 14, 14), label);
    render(!!opts.flowered);

    b.addEventListener('click', async () => {
      if (b.getAttribute('aria-pressed') === 'true' || b.disabled) return;
      b.disabled = true;
      const before = count;
      count += 1; render(true);                   // 先乐观更新
      const pop = img(base + 'flower.svg', 'pop', 14, 14);
      b.append(pop); setTimeout(() => pop.remove(), 650);
      try {
        if (opts.onFlower) count = await opts.onFlower(t.id);
        render(true);
      } catch (e) {
        count = before; render(false);
        if (window.HML_TOAST) window.HML_TOAST(e && e.message ? e.message : '献花没成功，稍后再试。');
      } finally {
        b.disabled = false;
      }
    });
    return b;
  }

  /* 分布条。rows: [{ label, n }]，按 n 从大到小传入。 */
  function createBars(rows) {
    const max = Math.max(1, ...rows.map(r => r.n));
    const ul = el('ul', 'bars');
    rows.forEach(r => {
      const li = el('li');
      const bar = el('span', 'bar');
      bar.style.width = `${Math.max(2, Math.round((r.n / max) * 100))}%`;
      li.append(el('span', null, r.label), bar, el('span', 'n', F().num(r.n)));
      ul.append(li);
    });
    return ul;
  }

  /* 全站短提示。正式站点在 Layout 里放一个 <div class="toast" role="status" hidden>。 */
  window.HML_TOAST = function (msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = el('div', 'toast'); t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._timer); t._timer = setTimeout(() => { t.hidden = true; }, 2400);
  };

  window.HML_COMPONENTS = { el, createTombCard, createBars };
})();

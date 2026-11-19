/* 墓志铭卡片绘制。纯函数：只读入参、只画 canvas，不发任何请求（PLAN.md §3.7）。
   移植：src/site/scripts/epitaph-card.ts，原样搬过去补类型即可。

   drawEpitaphCard(canvas, d)
     canvas  760 × 960 的 <canvas>
     d = {
       codename,        代号
       vendorLabel,     厂商的显示名（来自 labels）
       born_at, born_precision, died_at,   与数据库同格式，交给 format.lifeLine
       causeLabel,      死因显示名
       epitaph,         墓志铭，最多 40 字，最多画 4 行
       card_style,      'flower' | 'cloud' | 'star'
       night,           true 画月夜版
       watermark        右下角文字，默认 'haomeile.rip'
     } */
(function () {
  const P = 8; // 一个像素块 = 8 个画布像素
  const CARVE = '"Songti SC","STSong","Noto Serif CJK SC","Noto Serif SC","Source Han Serif SC","SimSun",serif';
  const UI = 'system-ui,-apple-system,"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC","Microsoft YaHei",sans-serif';

  const FLOWER = ['..y.y..', '.yyoyy.', '..yyy..', '...g...', '.g.g...', '..gg.g.', '...gg..'];
  const CLOUD = ['...www...', '.wwwwwww.', 'wwwwwwwww', '.sssssss.'];
  const STAR = ['...y...', '...y...', '.yyyyy.', '..yyy..', '.yy.yy.'];
  const CAT = ['..k...k.', '..kk.kk.', '..kkkkk.', '.kkkkkkk', '.kekkkek', '.kkkpkkk', '.kkkkkkk', '..kkkkk.', '..kgggk.', '.kggggkk', '.kggggkk', '.kggggkk', '.kkkkkkkk', '..kk..kk'];

  const DAY = { sky: '#cde5f0', grass: '#5e9b4c', deep: '#3f7434', stone: '#dcdfe4', shade: '#b7bcc4', ink: '#1d2621', soft: '#4d5650', mark: '#f3f8ef', stem: '#3f7434' };
  const NIGHT = { sky: '#18213a', grass: '#2d4a33', deep: '#1f3624', stone: '#a3a9b4', shade: '#7d8390', ink: '#121722', soft: '#2c3340', mark: '#e6efe3', stem: '#5e9b4c' };

  function drawEpitaphCard(canvas, d) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height, GW = W / P, GH = H / P;
    const C = d.night ? NIGHT : DAY;

    const block = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * P, y * P, w * P, h * P); };
    const sprite = (rows, pal, gx, gy, s = 1) => rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (ch !== '.') { ctx.fillStyle = pal[ch]; ctx.fillRect((gx + x * s) * P, (gy + y * s) * P, s * P, s * P); }
    }));
    const wrap = (text, maxW) => {
      const out = []; let line = '';
      for (const ch of text) {
        if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch;
      }
      if (line) out.push(line);
      return out;
    };

    // 天空
    block(0, 0, GW, GH, C.sky);
    if (d.night) {
      [[8, 6], [22, 12], [40, 4], [70, 9], [86, 15], [60, 18], [14, 20]].forEach(([x, y]) => block(x, y, 1, 1, '#fff3c0'));
      block(80, 5, 6, 6, '#f4ecc8'); block(82, 5, 4, 4, C.sky); // 月牙
    } else {
      sprite(CLOUD, { w: '#ffffff', s: '#c9d6df' }, 8, 8, 2);
      sprite(CLOUD, { w: '#ffffff', s: '#c9d6df' }, 74, 16, 1);
    }

    // 草地
    const groundY = 100;
    block(0, groundY, GW, GH - groundY, C.grass);
    for (let x = 0; x < GW; x += 2) block(x, groundY - 1, 1, 1, C.grass);
    block(0, GH - 6, GW, 6, C.deep);

    // 墓碑：阶梯圆顶，先画描边再画石面
    const sx = 15, sw = 65, top = 14;
    const steps = [[0, 8], [1, 4], [2, 2], [4, 1], [8, 0]];
    block(sx, top + 8, sw, groundY - top - 7, C.ink);
    steps.forEach(([dx, dy]) => block(sx + dx, top + dy, sw - dx * 2, 8, C.ink));
    const fx = sx + 1, fw = sw - 2;
    block(fx, top + 9, fw, groundY - top - 9, C.stone);
    steps.forEach(([dx, dy]) => block(fx + dx, top + dy + 1, fw - dx * 2, 8, C.stone));
    block(fx + fw - 2, top + 9, 2, groundY - top - 9, C.shade);
    block(sx - 3, groundY, sw + 6, 2, C.deep);

    // 文字
    const cx = (fx + fw / 2) * P;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';

    const name = (d.codename || '').trim() || '无名氏';
    let size = 72; ctx.font = `900 ${size}px ${CARVE}`;
    while (ctx.measureText(name).width > (fw - 10) * P && size > 36) { size -= 4; ctx.font = `900 ${size}px ${CARVE}`; }
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText(name, cx, 302);
    ctx.fillStyle = C.ink; ctx.fillText(name, cx, 300);

    ctx.font = `600 26px ${UI}`; ctx.fillStyle = C.soft;
    ctx.fillText(`${(d.vendorLabel || '').trim() || '某 AI'} 账号`, cx, 350);

    const life = window.HML_FORMAT.lifeLine(d);
    ctx.font = `400 24px ${UI}`;
    ctx.fillText(life.range, cx, 396);
    ctx.font = `900 34px ${CARVE}`; ctx.fillStyle = C.ink;
    ctx.fillText(life.days, cx, 448);
    ctx.font = `600 24px ${UI}`; ctx.fillStyle = C.soft;
    ctx.fillText(`死因：${d.causeLabel || '原因不明'}`, cx, 494);

    for (let x = fx + 8; x < fx + fw - 8; x += 3) block(x, 66, 1, 1, C.shade);

    ctx.font = `400 34px ${CARVE}`; ctx.fillStyle = C.ink;
    wrap((d.epitaph || '').trim() || '它没留下什么话。', (fw - 12) * P).slice(0, 4)
      .forEach((l, i) => ctx.fillText(l, cx, 600 + i * 52));

    // 碑脚装饰
    const fpal = { y: '#f2c230', o: '#c9861a', g: C.stem };
    if (d.card_style === 'cloud') {
      sprite(CLOUD, { w: '#ffffff', s: '#c9d6df' }, sx + sw - 4, groundY - 4);
    } else if (d.card_style === 'star') {
      sprite(STAR, { y: '#f2c230' }, sx - 5, groundY - 5);
      sprite(STAR, { y: '#f2c230' }, sx + sw - 2, groundY - 5);
    } else {
      sprite(FLOWER, fpal, sx - 6, groundY - 7);
      sprite(FLOWER, fpal, sx + sw - 1, groundY - 7);
    }

    // 守墓小猫
    sprite(CAT, { k: '#353b47', g: '#6b7383', e: '#f2c230', p: '#e89aa6' }, 86, groundY - 14);

    // 水印
    ctx.textAlign = 'right'; ctx.font = `600 22px ${UI}`; ctx.fillStyle = C.mark;
    ctx.fillText(d.watermark || 'haomeile.rip', W - 24, H - 60);
  }

  window.HML_EPITAPH_CARD = { drawEpitaphCard };
})();

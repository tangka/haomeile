/* 设计稿专用的示例数据。不要移植到正式站点，也不要写进生产数据库（PLAN.md §2.4）。
   形状与 GET /api/tombstones、GET /api/stats 的返回值一致，方便对照。
   厂商用 demo_a…demo_d，避免把编出来的经历安在真实产品头上。 */
(function () {
  Object.assign(window.HML_LABELS.vendor, {
    demo_a: '厂商 A', demo_b: '厂商 B', demo_c: '厂商 C', demo_d: '厂商 D'
  });

  window.HML_SAMPLE = {
    tombstones: [
      {
        id: 'K7Q2M9XW4T', codename: '小橘号', nickname: '', vendor: 'demo_a', event_type: 'suspended',
        plan: 'paid_personal', born_at: '2025-09', born_precision: 'month', died_at: '2026-11-18',
        story: '早上打开就提示账号已停用，邮件里只说违反了使用政策，没写具体原因。前一天还在正常改论文。已经提交申诉，还没回音。',
        epitaph: '生前写了三万行代码，走的时候一行也没留下。', appeal_status: 'pending', card_style: 'flower',
        flowers: 28, approved_at: '2026-11-18T09:12:00Z'
      },
      {
        id: 'P3D8N1ZC6R', codename: '周五下午', nickname: '阿青', vendor: 'demo_b', event_type: 'verification',
        plan: 'free', born_at: null, born_precision: 'none', died_at: '2026-11-15',
        story: '换了手机以后一直卡在验证这一步，验证码收不到，客服是机器人。账号没被封，但也进不去，算半死。',
        epitaph: '', appeal_status: 'none', card_style: 'cloud', flowers: 9, approved_at: '2026-11-16T02:40:00Z'
      },
      {
        id: 'H5W2B7QY9L', codename: '研究生三号机', nickname: '', vendor: 'demo_c', event_type: 'billing',
        plan: 'paid_personal', born_at: '2026-09-12', born_precision: 'day', died_at: '2026-11-14',
        story: '续费那天扣了两次钱，然后账号被暂停。猜测是支付风控，但没有任何说明。退款申请已经提交。',
        epitaph: '它走得很安详，走之前还在思考。', appeal_status: 'pending', card_style: 'star',
        flowers: 54, approved_at: '2026-11-15T12:05:00Z'
      },
      {
        id: 'M9X4T2KQ7W', codename: '工位旁的那位', nickname: '某组长', vendor: 'demo_a', event_type: 'org_suspended',
        plan: 'paid_team', born_at: '2024-01', born_precision: 'month', died_at: '2026-11-12',
        story: '整个团队的账号同时不能用了，管理员说组织被暂停，在等审核。已恢复，前后大概一天。',
        epitaph: '', appeal_status: 'restored', card_style: 'flower', flowers: 13, approved_at: '2026-11-13T06:30:00Z'
      },
      {
        id: 'R2T6V8XZ3N', codename: '无名氏', nickname: '', vendor: 'demo_d', event_type: 'region',
        plan: 'free', born_at: '2026-11-03', born_precision: 'day', died_at: '2026-11-10',
        story: '注册完第七天收到通知，说所在地区不在服务范围内。',
        epitaph: '来过，看了一眼，走了。', appeal_status: 'none', card_style: 'flower', flowers: 4,
        approved_at: '2026-11-11T08:00:00Z'
      },
      {
        id: 'B8C3D5F7G2', codename: '写周报专用', nickname: '', vendor: 'other', event_type: 'suspended',
        plan: 'unknown', born_at: '2026-03', born_precision: 'month', died_at: '2026-11-08',
        story: '我也不知道发生了什么。登录提示账号异常，换浏览器也一样。猜测是同一网络下有别人违规，但只是猜测。',
        epitaph: '', appeal_status: 'rejected', card_style: 'star', flowers: 17, approved_at: '2026-11-09T15:20:00Z'
      }
    ],
    stats: {
      today: 3, last7: 41, total: 1204,
      by_vendor: [['demo_a', 412], ['demo_b', 293], ['demo_c', 157], ['demo_d', 90], ['other', 52]],
      by_event: [['suspended', 531], ['region', 340], ['verification', 154], ['billing', 97], ['org_suspended', 48]]
    }
  };
})();

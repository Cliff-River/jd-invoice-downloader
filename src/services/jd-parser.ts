import { OrderInfo } from '../types/order';

/**
 * 京东订单列表页 DOM 解析器
 *
 * 京东订单页 `order.jd.com/center/list.action` 的结构特征（2026-11 实测）：
 * 页面是 React + CSS Modules，类名带构建 hash（如 `orderCard-b731ca`），
 * 因此只能按前缀匹配，不能写死完整类名：
 * - 订单卡片: `[class*="orderCard"]`
 * - 日期: `[class*="orderTime"]`，形如 `2026-11-10 22:12:51`
 * - 订单号: `[class*="metaLabel"]` 文本为"订单号"的那个标签的下一个兄弟节点
 * - 商品: `a[href*="item.jd.com"]` 的 title 属性
 * - 金额: `[class*="priceSymbol"]`(¥) 与 `priceInteger` / `priceDecimal` 同级，取父节点文本
 * - 状态: `[class*="statusText"]`
 *
 * 同时保留旧版表格结构（`.order-item` / `.order-tb`）作为兜底。
 */

/** 尝试多种选择器获取文本（支持 Document 或 Element 作为查询上下文） */
function pickText(ctx: Document | Element, selectors: string[]): string {
  for (const sel of selectors) {
    const el = ctx.querySelector(sel);
    if (el && el.textContent) {
      return el.textContent.trim();
    }
  }
  return '';
}

/** 从包含 "订单号 XXXX" 的文本里抽出纯数字 */
function extractOrderNo(text: string): string {
  const m = text.match(/\d{10,}/);
  return m ? m[0] : text.trim();
}

/** 把京东的 "YYYY-MM-DD HH:mm:ss" 或 "YYYY/MM/DD HH:mm" 转成 Date */
function parseJdDate(raw: string): Date | null {
  if (!raw) return null;
  const normalized = raw.replace(/\//g, '-').trim();
  const d = new Date(normalized.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

/** 判断一个订单日期是否在近 N 天内 */
export function isWithinDays(orderDate: string | Date, days = 30): boolean {
  const d = typeof orderDate === 'string' ? parseJdDate(orderDate) : orderDate;
  if (!d) return true; // 解析不出来就保守放行
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return d.getTime() >= cutoff.getTime();
}

/**
 * 取订单号：优先找「订单号」标签的相邻节点，失败再用正则扫卡片文本
 */
function pickOrderNo(card: Element): string {
  const labels = Array.from(card.querySelectorAll('[class*="metaLabel"]'));
  const label = labels.find((el) => el.textContent?.trim() === '订单号');
  const fromSibling = label?.nextElementSibling?.textContent?.trim() || '';
  if (fromSibling) return extractOrderNo(fromSibling);

  const m = (card.textContent || '').match(/订单号\s*(\d{8,})/);
  return m ? m[1] : '';
}

/**
 * 取订单金额：¥ 符号、整数、小数是三个同级 span，取父节点拼出的 "¥21.01"
 */
function pickAmount(card: Element): string {
  const symbol = card.querySelector('[class*="priceSymbol"]');
  const raw = symbol?.parentElement?.textContent?.trim() || '';
  const m = raw.match(/[\d.]+/);
  return m ? m[0] : '';
}

/**
 * 判断金额是否为 0
 * 解析不出金额的（空串、`-` 等）视为未知，保留不删
 */
function isZeroAmount(amount: string): boolean {
  const n = Number.parseFloat(amount.replace(/[^\d.]/g, ''));
  return !isNaN(n) && n === 0;
}

/**
 * 从当前订单页 document 中解析订单列表
 * @param doc - 当前页面的 document 对象（content script 上下文直接传 document）
 * @param days - 只保留近 days 天内的订单，默认 30
 */
export function parseOrders(doc: Document, days = 30): OrderInfo[] {
  const orders: OrderInfo[] = [];
  const seen = new Set<string>();

  /** 按订单号去重后写入（同一订单可能被分拆成多个卡片） */
  const push = (order: OrderInfo) => {
    if (!order.orderNo || seen.has(order.orderNo)) return;
    seen.add(order.orderNo);
    orders.push(order);
  };

  // 策略 1（主）: 2024+ 新版订单卡片
  doc.querySelectorAll('[class*="orderCard"]').forEach((card) => {
    try {
      const orderNo = pickOrderNo(card);
      if (!orderNo) return;

      const orderDate = pickText(card, ['[class*="orderTime"]', '[class*="orderTimeValue"]']);
      if (!isWithinDays(orderDate, days)) return;

      const products = Array.from(card.querySelectorAll('a[href*="item.jd.com"]'))
        .map((a) => a.getAttribute('title')?.trim() || a.textContent?.trim() || '')
        .filter(Boolean);

      push({
        orderNo,
        product: products.join(' | ') || '(无法识别商品)',
        amount: pickAmount(card) || '-',
        status: pickText(card, ['[class*="statusText"]', '[class*="status-"]']) || '-',
        orderDate,
        rawDate: orderDate,
      });
    } catch (err) {
      console.warn('[jd-parser] 解析单个订单失败', err);
    }
  });

  if (orders.length > 0) return orders.filter((o) => !isZeroAmount(o.amount));

  // 策略 2（兜底）: 旧版表格行 .order-item / .order-tb
  const rows = doc.querySelectorAll('.order-item, .order-tb, .tb-tbody .order-row, [class*="order-item"]');

  rows.forEach((row) => {
    try {
      const rowEl = row as HTMLElement;

      // 订单号 - 从按钮文本里抽
      const orderNoRaw = pickText(rowEl, [
        '[class*="order-no"]',
        '[class*="orderNo"]',
        'button[class*="order"]',
      ]);
      const orderNo = extractOrderNo(orderNoRaw);
      if (!orderNo) return;

      // 商品标题 - 取第一个商品链接
      const product = pickText(rowEl, [
        '.p-name a',
        '.goods-item .p-name',
        '[class*="p-name"]',
        '[class*="goods-name"]',
        '.item-sku-name',
      ]);

      // 金额
      const amount = pickText(rowEl, [
        '.order-total .total-price',
        '.amount .price',
        '.order-total',
        '[class*="order-total"]',
        '[class*="total"] em',
        '.price',
      ]).replace(/[^\d.]/g, '');

      // 状态
      const status = pickText(rowEl, [
        '.order-status',
        '.status-txt',
        '[class*="status"]',
        '.order-operate .status',
      ]);

      // 日期
      let rawDate = pickText(rowEl, [
        '.order-time',
        '.time-row',
        '[class*="order-time"]',
        '[class*="create-time"]',
      ]);

      // 若当前卡片没有日期，尝试取页面上最近的日期分隔
      if (!rawDate) {
        const prevTime = rowEl.closest('.order-group, .date-group')?.querySelector('.time-row, .order-time');
        if (prevTime) rawDate = prevTime.textContent?.trim() || '';
      }

      // 日期过滤
      if (!isWithinDays(rawDate, days)) return;

      orders.push({
        orderNo,
        product: product || '(无法识别商品)',
        amount: amount || '-',
        status: status || '-',
        orderDate: rawDate,
        rawDate,
      });
    } catch (err) {
      console.warn('[jd-parser] 解析单个订单失败', err);
    }
  });

  // 如果上面的选择器策略完全没命中，降级尝试：遍历所有含订单号按钮的元素
  if (orders.length === 0) {
    const fallbackButtons = doc.querySelectorAll('button, a');
    fallbackButtons.forEach((btn) => {
      const text = btn.textContent?.trim() || '';
      if (text.includes('订单号')) {
        const orderNo = extractOrderNo(text);
        if (orderNo && !orders.find((o) => o.orderNo === orderNo)) {
          orders.push({
            orderNo,
            product: '(需刷新京东页面以识别完整信息)',
            amount: '-',
            status: '-',
            orderDate: '',
          });
        }
      }
    });
  }

  return orders.filter((o) => !isZeroAmount(o.amount));
}

/** 检测当前页面是否被重定向到登录页（说明登录失效） */
export function isRedirectedToLogin(doc: Document): boolean {
  const url = doc.location?.href || '';

  // 1. 被重定向到登录域，最可靠
  if (url.includes('passport.jd.com') || url.includes('uc.jd.com')) return true;

  // 2. 当前页面自身渲染了登录表单
  // 注意：不能用 [id*="login"]，京东全站顶栏都有 #ttbar-login-2024、
  // #login-sdk-root、#guide-login-bar 等 id，会让任何页面都被误判为登录过期
  return doc.querySelector('#loginname, #nloginpwd, #loginsubmit, .login-form') !== null;
}

/** 读取 document.cookie 中指定名称的 cookie 值（取不到返回空串） */
function readCookie(doc: Document, name: string): string {
  const m = doc.cookie?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]).trim() : '';
}

/**
 * 检测当前 tab 京东登录态
 *
 * 京东 2024 版顶栏（`#ttbar-login-2024`）由前端异步渲染：
 * - 已登录 → `<a class="nickname" href="//home.jd.com/">昵称</a>`
 * - 未登录 → `你好，请登录`(.link-login) / `免费注册`(.link-regist)
 * 顶栏渲染前 DOM 是空的，因此再用登录后必然写入的 `pin` cookie 兜底。
 */
export function checkJdLogin(doc: Document): boolean {
  // 1. 明确未登录：顶栏出现登录/注册入口
  if (doc.querySelector('#ttbar-login-2024 .link-login, .link-regist')) {
    return false;
  }

  // 2. 明确已登录：新版顶栏昵称，仍保留部分老页面/子站的选择器
  const loggedInIndicators = [
    '#ttbar-login-2024 .nickname',
    '.shortcut_userico .nickname',
    'a.nickname[href*="home.jd.com"]',
    '.user-info .name',
    '.header-user-info .name',
    '[class*="user-info"] .nickname',
    '.jd-header .user',
    '.user-icon',
  ];
  for (const sel of loggedInIndicators) {
    if (doc.querySelector(sel)) return true;
  }

  // 3. 兜底：京东顶栏组件自己也是靠 pin cookie 判断登录身份的
  return readCookie(doc, 'pin') !== '';
}

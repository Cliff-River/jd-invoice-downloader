import { OrderInfo } from '../types/order';

/**
 * 京东订单列表页 DOM 解析器
 *
 * 京东订单页 `order.jd.com/center/list.action` 的结构特征（2026-11）：
 * - 每个订单卡片外层: `.order-item` 或 `.order-tb` 包裹
 * - 订单号: `.order-tb .order-no` 内的按钮/文本节点，形如 `订单号 3678419000663507`
 * - 商品标题: `.p-name a` 的文本内容
 * - 金额: `.order-total .total-price` 或类似的价格区域
 * - 状态: `.order-tb .order-status` 中的状态文字
 * - 日期: 订单卡片上方的日期分隔 `.time-row` 或 `.order-item .order-time`
 *
 * 由于京东可能调整 DOM，本模块对外暴露 `parseOrders`，内部
 * 通过多个选择器策略尝试解析，任何一步失败都降级为空数组 + 日志。
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
 * 从当前订单页 document 中解析订单列表
 * @param doc - 当前页面的 document 对象（content script 上下文直接传 document）
 * @param days - 只保留近 days 天内的订单，默认 30
 */
export function parseOrders(doc: Document, days = 30): OrderInfo[] {
  const orders: OrderInfo[] = [];

  // 策略 1: 新版订单卡片 .order-item
  // 策略 2: 旧版表格行 .order-tb tr
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

  return orders;
}

/** 检测当前页面是否被重定向到登录页（说明登录失效） */
export function isRedirectedToLogin(doc: Document): boolean {
  const url = doc.location?.href || '';
  return (
    url.includes('passport.jd.com') ||
    url.includes('uc.jd.com') ||
    doc.querySelector('.login-form, .login-btn, [id*="login"]') !== null
  );
}

/** 检测当前 tab 京东登录态 - 通过页面上是否有用户头像/昵称 */
export function checkJdLogin(doc: Document): boolean {
  const loggedInIndicators = [
    '.user-info .name',
    '.header-user-info .name',
    '[class*="user-info"] .nickname',
    '.jd-header .user',
    '.user-icon',
    '.myjd',
  ];
  for (const sel of loggedInIndicators) {
    if (doc.querySelector(sel)) return true;
  }
  return false;
}

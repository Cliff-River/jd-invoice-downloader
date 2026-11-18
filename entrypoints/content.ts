import { ERROR_CODES, MessagePayload, OrderInfo } from '@/src/types/order';
import { checkJdLogin, isRedirectedToLogin, isWithinDays, parseOrders } from '@/src/services/jd-parser';

/**
 * Content Script - 在京东域内运行
 *
 * 职责：
 * - 响应 background 发来的 checkLogin / collectOrders 指令
 * - 在当前页面 DOM 上执行登录检测和订单解析
 * - 返回结构化的 OrderInfo[] 或错误码
 */

export default defineContentScript({
  matches: ['*://*.jd.com/*'],
  main() {
    console.log('[JD-Orders-Helper] content script loaded on', location.href);

    browser.runtime.onMessage.addListener((message: MessagePayload, _sender, sendResponse) => {
      const handle = async () => {
        try {
          switch (message.type) {
            case 'checkLogin':
              return { loggedIn: checkJdLogin(document) };

            case 'collectOrders':
              return await handleCollectOrders(message.days ?? 30);

            default:
              return null;
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[content] 处理消息失败', err);
          return { code: ERROR_CODES.UNKNOWN, message: msg };
        }
      };

      handle().then(sendResponse);
      return true; // 异步响应
    });
  },
});

/** content script 回传类型 */
type ContentResult =
  | { loggedIn: boolean }
  | { orders: OrderInfo[] }
  | { code: string; message: string };

/**
 * 在当前 tab 内采集订单
 * - 先确保页面是订单页（否则导航过去）
 * - 等待 DOM 加载
 * - 解析 + 翻页直到命中 > days 天前的订单
 */
async function handleCollectOrders(days: number): Promise<ContentResult> {
  // 1. 登录检查
  if (isRedirectedToLogin(document)) {
    return { code: ERROR_CODES.LOGIN_EXPIRED, message: '登录已过期，请重新登录京东' };
  }
  if (!checkJdLogin(document)) {
    return { code: ERROR_CODES.NOT_LOGGED_IN, message: '未检测到京东登录态' };
  }

  // 2. 如果当前不在订单列表页，跳转
  if (!location.href.includes('order.jd.com')) {
    location.href = 'https://order.jd.com/center/list.action';
    await waitForDocumentReady(8000);
  }

  // 3. 采集（带翻页）
  const collected: OrderInfo[] = [];
  let pageIndex = 0;
  const maxPages = 10; // 安全上限，避免死循环

  while (pageIndex < maxPages) {
    const pageOrders = parseOrders(document, days);

    if (pageOrders.length === 0) break;

    collected.push(...pageOrders);

    // 最后一条已超出边界 → 停止
    const oldestDate = pageOrders[pageOrders.length - 1]?.orderDate;
    if (oldestDate && !isWithinDays(oldestDate, days)) {
      collected.pop();
      break;
    }

    if (!goNextPage()) break;

    pageIndex++;
    await waitForDocumentReady(5000);
    if (isRedirectedToLogin(document)) {
      return { code: ERROR_CODES.LOGIN_EXPIRED, message: '翻页时登录态失效' };
    }
  }

  return { orders: collected };
}

/** 尝试点击"下一页"按钮 */
function goNextPage(): boolean {
  const candidates = [
    '.page-next',
    'a.next',
    'button.next',
    '[class*="next-page"]',
    '.pagination .next',
  ];
  for (const sel of candidates) {
    const btn = document.querySelector<HTMLElement>(sel);
    if (btn && !btn.classList.contains('disabled') && btn.offsetParent !== null) {
      btn.click();
      return true;
    }
  }
  return false;
}

/** 等待 document ready，超时则 resolve */
function waitForDocumentReady(timeout = 5000): Promise<void> {
  return new Promise((resolve) => {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(resolve, 800);
      return;
    }
    const handler = () => {
      if (document.readyState === 'complete') {
        window.removeEventListener('load', handler);
        setTimeout(resolve, 800);
      }
    };
    window.addEventListener('load', handler);
    setTimeout(() => {
      window.removeEventListener('load', handler);
      resolve();
    }, timeout);
  });
}

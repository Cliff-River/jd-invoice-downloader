/// <reference types="@types/webextension-polyfill" />

import { ERROR_CODES, MessagePayload, OrderInfo } from '@/src/types/order';

/** content script 回传的结构 */
type ContentResponse =
  | { loggedIn: boolean }
  | { orders: OrderInfo[] }
  | { code: string; message: string }
  | null
  | undefined;

/** 简化的 Tab 接口 */
interface TabRef {
  id?: number;
  url?: string;
}

export default defineBackground(() => {
  /**
   * Background Script - 消息路由中枢
   *
   * 消息流向：
   *   popup ──(browser.runtime.sendMessage)──▶ background
   *                                              │
   *                                              ▼
   *                                     content script (via tabs.sendMessage)
   *                                              │
   *                                              ▼
   *   popup ◀──(browser.runtime.sendMessage)── background
   */

  // 监听来自 popup / content 的消息
  browser.runtime.onMessage.addListener((message: MessagePayload, _sender, sendResponse) => {
    const handle = async (): Promise<MessagePayload> => {
      try {
        switch (message.type) {
          case 'checkLogin':
            return await handleCheckLogin();
          case 'collectOrders':
            return await handleCollectOrders(message.days ?? 30);
          default:
            return {
              type: 'error',
              code: ERROR_CODES.UNKNOWN,
              message: `未知消息类型: ${(message as { type: string }).type}`,
            };
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[background] 消息处理异常', err);
        return { type: 'error', code: ERROR_CODES.UNKNOWN, message: msg };
      }
    };

    handle().then(sendResponse);
    return true; // 保持 channel 打开以支持 async sendResponse
  });

  /**
   * 检查京东登录态
   */
  async function handleCheckLogin(): Promise<MessagePayload> {
    const tab = await findJdTab();
    if (!tab || !tab.id) {
      return {
        type: 'error',
        code: ERROR_CODES.CONTENT_SCRIPT_NOT_INJECTED,
        message: '未找到京东页面，请先打开 jd.com 任一页面后再试',
      };
    }

    try {
      const resp = await sendToContentScript(tab.id, { type: 'checkLogin' });
      const loggedIn = (resp as { loggedIn?: boolean })?.loggedIn === true;
      return { type: 'loginStatus', loggedIn };
    } catch (err) {
      // content script 未注入（页面在扩展安装前就已打开 / 未刷新），与"未登录"区分开
      console.warn('[background] checkLogin 失败', err);
      return {
        type: 'error',
        code: ERROR_CODES.CONTENT_SCRIPT_NOT_INJECTED,
        message: '京东页面上的脚本尚未就绪，请刷新该京东页面后重试',
      };
    }
  }

  /**
   * 找到可用于检测登录态的京东标签页
   * 优先当前活动标签，其次任意已打开的京东标签（活动标签可能不是京东页面）
   */
  async function findJdTab(): Promise<TabRef | null> {
    const active = await getActiveTab();
    if (active?.id && active.url?.includes('jd.com')) {
      return active;
    }

    const jdTabs = await browser.tabs.query({ url: ['*://*.jd.com/*'] });
    return jdTabs?.[0] ?? null;
  }

  /**
   * 采集订单主流程
   */
  async function handleCollectOrders(days: number): Promise<MessagePayload> {
    const tab = await ensureJdOrdersTab();
    if (!tab || !tab.id) {
      return {
        type: 'error',
        code: ERROR_CODES.NAVIGATE_FAILED,
        message: '无法打开京东订单页面',
      };
    }

    try {
      // 等 content script 注入并就绪
      await sleep(1500);
      const resp = await sendToContentScript(tab.id, { type: 'collectOrders', days });

      const errResp = resp as { code?: string; message?: string };
      if (errResp?.code) {
        return { type: 'error', code: errResp.code, message: errResp.message || '采集失败' };
      }

      const orders = ((resp as { orders?: OrderInfo[] })?.orders ?? []) as OrderInfo[];
      return { type: 'ordersResult', orders };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[background] collectOrders 失败', err);
      return {
        type: 'error',
        code: ERROR_CODES.UNKNOWN,
        message: msg,
      };
    }
  }

  /** 获取当前活动 tab */
  async function getActiveTab(): Promise<TabRef | null> {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    return tabs?.[0] ?? null;
  }

  /**
   * 确保有一个京东订单页面可用
   */
  async function ensureJdOrdersTab(): Promise<TabRef | null> {
    const tab = await getActiveTab();
    const url = tab?.url ?? '';

    if (url.includes('order.jd.com')) {
      return tab;
    }

    if (url.includes('jd.com')) {
      const updated = await browser.tabs.update(tab!.id!, {
        url: 'https://order.jd.com/center/list.action',
        active: true,
      });
      return updated ?? tab;
    }

    const created = await browser.tabs.create({
      url: 'https://order.jd.com/center/list.action',
      active: true,
    });
    return created;
  }

  /**
   * 向指定 tab 的 content script 发送消息并等待响应
   */
  function sendToContentScript(
    tabId: number,
    payload: { type: string; days?: number },
  ): Promise<ContentResponse> {
    return new Promise<ContentResponse>((resolve, reject) => {
      try {
        browser.tabs.sendMessage(tabId, payload, (resp: ContentResponse) => {
          const lastErr = browser.runtime.lastError;
          if (lastErr) {
            reject(lastErr);
          } else {
            resolve(resp);
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
});

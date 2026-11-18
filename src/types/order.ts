/**
 * 京东订单信息 - 标准化结构
 */
export interface OrderInfo {
  /** 京东订单号 */
  orderNo: string;
  /** 商品标题（多商品时用 " | " 拼接） */
  product: string;
  /** 订单金额（元） */
  amount: string;
  /** 订单状态（如 "已完成"、"待付款"、"已取消"） */
  status: string;
  /** 下单日期（ISO 字符串或 "YYYY-MM-DD HH:mm:ss"） */
  orderDate: string;
  /** 原始日期字符串，保留京东格式以便调试 */
  rawDate?: string;
}

/**
 * 扩展内部消息协议 - popup ↔ background ↔ content
 */
export type MessagePayload =
  | { type: 'checkLogin' }
  | { type: 'collectOrders'; days?: number }
  | { type: 'loginStatus'; loggedIn: boolean }
  | { type: 'ordersResult'; orders: OrderInfo[] }
  | { type: 'error'; code: string; message: string };

export const ERROR_CODES = {
  NOT_LOGGED_IN: 'NOT_LOGGED_IN',
  LOGIN_EXPIRED: 'LOGIN_EXPIRED',
  PARSE_FAILED: 'PARSE_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  NAVIGATE_FAILED: 'NAVIGATE_FAILED',
  CONTENT_SCRIPT_NOT_INJECTED: 'CONTENT_SCRIPT_NOT_INJECTED',
  UNKNOWN: 'UNKNOWN',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

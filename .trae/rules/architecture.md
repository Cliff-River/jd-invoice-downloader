# 扩展架构与消息流转

## 总体架构

```
┌─────────────────────────────────────────────────────────┐
│                    浏览器 (MV3)                          │
│                                                         │
│  ┌───────────┐   runtime.sendMessage    ┌────────────┐ │
│  │  Popup UI │ ──────────────────────▶ │ Background │ │
│  │ (Vue 3)   │ ◀────────────────────── │ (路由中枢)  │ │
│  └───────────┘   runtime.sendMessage    └─────┬──────┘ │
│                                               │         │
│                                    tabs.sendMessage     │
│                                               │         │
│                                               ▼         │
│  ┌──────────────────────────────────────────────────┐  │
│  │            Content Script (jd.com 域内)           │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  src/services/jd-parser.ts                  │ │  │
│  │  │  - parseOrders(doc, days)                   │ │  │
│  │  │  - checkJdLogin(doc)                        │ │  │
│  │  │  - isRedirectedToLogin(doc)                 │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │
                    京东订单页
              order.jd.com/center/list.action
```

## 各层职责

| 层 | 入口文件 | 职责 | 禁止做什么 |
|---|---|---|---|
| Popup | `entrypoints/popup/App.vue` | 用户交互、状态展示、错误反馈 | 不直接访问 DOM、不发 HTTP 请求到京东 |
| Background | `entrypoints/background.ts` | 消息路由、tab 管理、打开/导航京东域 | 不解析 DOM、不读页面内容 |
| Content Script | `entrypoints/content.ts` | 登录检测、DOM 解析、翻页 | 不弹窗、不做 UI |
| Parser | `src/services/jd-parser.ts` | 纯函数：Document → OrderInfo[] | 不直接读取 document（由调用方传入）、不做 IO |
| Types | `src/types/order.ts` | 跨层共享类型 | 零依赖 |

## 消息流转详细时序

### 登录检测 `checkLogin`

```
Popup                     Background                   Content (on jd.com)
  │                         │                            │
  │ ── checkLogin ─────────▶│                            │
  │                         │ ── tabs.sendMessage ──────▶│
  │                         │                            │ checkJdLogin(document)
  │                         │ ◀── { loggedIn: boolean } ─│
  │ ◀── { type: loginStatus, loggedIn } ─────────────────│
```

### 订单采集 `collectOrders`

```
Popup                     Background                   Content (on jd.com)
  │                         │                            │
  │ ── collectOrders ──────▶│                            │
  │                         │ ensureJdOrdersTab()        │
  │                         │ (打开 order.jd.com)        │
  │                         │ ── tabs.sendMessage ──────▶│
  │                         │                            │ waitForDocumentReady
  │                         │                            │ checkJdLogin → 登录过期?
  │                         │                            │ parseOrders → 翻页循环
  │                         │ ◀── { orders: [...] } ────│
  │ ◀── { type: ordersResult, orders } ─────────────────│
```

失败路径：content 返回 `{ code: ERROR_CODES.LOGIN_EXPIRED }`，background 原样透传给 popup 展示错误。

## 错误码

| 错误码 | 含义 | popup 展示 |
|---|---|---|
| `NOT_LOGGED_IN` | 未检测到登录态 | "未检测到京东登录态" |
| `LOGIN_EXPIRED` | 被重定向到登录页 | "登录已过期，请重新登录京东" |
| `PARSE_FAILED` | 解析 DOM 失败 | "页面结构变更，解析失败" |
| `NETWORK_ERROR` | 网络错误 | "网络异常" |
| `NAVIGATE_FAILED` | 无法打开订单页 | "无法打开京东订单页面" |
| `CONTENT_SCRIPT_NOT_INJECTED` | content 未注入 | 由 background catch 兜底 |
| `UNKNOWN` | 其他异常 | 原始错误信息 |

## 可扩展点

- **发票下载**：后续可以复用 content 中的订单定位逻辑，在每条订单的「更多」菜单中找到下载发票按钮并触发
- **导出功能**：popup 拿到 `OrderInfo[]` 后直接调 `browser.downloads.download` 即可，不需要碰 background
- **多账号**：如果要支持多账号，建议引入 `browser.storage.session` 做账号隔离
- **类型安全**：新增消息类型时只改 `src/types/order.ts` 中的 `MessagePayload` 联合类型

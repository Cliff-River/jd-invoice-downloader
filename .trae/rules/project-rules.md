# JD Orders Collector - 项目规则

本文件定义在本仓库中工作时必须遵守的约定。新增代码前请先阅读。

## 技术栈

- **扩展框架**: [WXT v0.20+](https://wxt.dev/)（MV3 兼容 MV2）
- **前端**: Vue 3 + TypeScript + Vuetify 3 + TailwindCSS 4
- **包管理**: pnpm
- **构建**: `pnpm dev` / `pnpm build`（底层由 WXT 驱动）

## 目录约定

```
entrypoints/
  background.ts        # 后台脚本（消息路由中枢，只放协调逻辑）
  content.ts           # 京东域内运行的 content script（DOM 解析入口）
  popup/               # 浏览器弹窗 UI（Vue 3 单文件组件）
    App.vue            # 只做状态编排与布局
    components/        # 展示型子组件（PopupHeader / LoginAlert / OrderList / OrderCard / EmptyState）
src/
  types/               # 共享类型定义（OrderInfo、MessagePayload、ErrorCode）
  services/            # 纯逻辑服务（jd-parser.ts：京东 DOM 解析）
components/            # 可复用 Vue 组件
public/icon/           # 扩展图标
```

**不要**在 entrypoints 内堆业务逻辑。解析/类型/通信类型一律放在 `src/` 下。

## 命名规范

- 文件名：kebab-case（`jd-parser.ts`、`order.ts`）
- 类型/接口：PascalCase（`OrderInfo`、`MessagePayload`）
- 常量枚举：`ERROR_CODES`（全大写下划线）
- Vue 组件：PascalCase 单文件组件

## Popup UI 约定

- **尺寸固定**：`entrypoints/popup/style.css` 中 `html / body / #app` 固定为 `380px × 560px`，超出内容只允许在 `main` 内部滚动，不得把 Popup 撑大
- **组件分工**：`App.vue` 只负责状态（登录态 / 采集 / 错误）与布局；展示型子组件放在 `entrypoints/popup/components/`，通过 `props` / `emits` 通信
- **消息收发集中**：`browser.runtime.sendMessage` 只出现在 `App.vue`，子组件不直接调用
- **样式分工**：结构用 Vuetify 组件，间距/排版用 TailwindCSS 工具类；Vuetify 的 `pa-*`、`mb-*`、`d-flex` 与 Tailwind 工具类二选一，同一组件内保持一致
- **图标**：项目未引入图标字体，`v-icon` 的 `mdi-*` 不会渲染；需要图标时使用内联 SVG（参考 `PopupHeader.vue`）
- 调整组件属性前先查 Vuetify MCP（`get_component_api_by_version`），不要凭记忆写 API

## 消息通信约定

所有跨层通信（popup ↔ background ↔ content）统一使用 `src/types/order.ts` 中的 `MessagePayload` 类型：

```typescript
type MessagePayload =
  | { type: 'checkLogin' }
  | { type: 'collectOrders'; days?: number }
  | { type: 'loginStatus'; loggedIn: boolean }
  | { type: 'ordersResult'; orders: OrderInfo[] }
  | { type: 'error'; code: string; message: string };
```

- **background** 只做路由，不解析 DOM
- **content** 负责所有 DOM 读取和页面导航
- **popup** 只负责用户交互与展示
- 新消息类型必须先在 `MessagePayload` 中追加联合成员

## 京东解析模块维护指引

`src/services/jd-parser.ts` 是最脆弱的模块，因为京东会改版式。维护时：

1. **选择器策略要多元**：同一字段提供 2–4 种选择器 fallback，不要只押一个
2. **降级解析**：所有选择器都没命中时，保留一条 fallback 路径（当前是正则扫按钮文本）
3. **日期过滤保守**：解析不出日期时返回 `true`（不过滤），避免误伤
4. **错误隔离**：`parseOrders` 内每条订单单独 try/catch，一条坏不拖垮全页
5. **遇到解析失败先手动探测**：按下方「页面结构分析」用 Trae 内置浏览器打开真实页面核对 DOM，再改选择器

## 页面结构分析

凡是涉及京东页面 DOM 的工作（登录判断、订单解析、翻页、任何选择器调整），都必须先用 Trae 内置浏览器实际访问页面、基于真实 DOM 分析，再动代码：

- **不要凭记忆或旧文档猜选择器**。京东前端是 React + CSS Modules，类名带构建 hash（如 `orderCard-b731ca`），改版频繁
- 需要登录态时，在内置浏览器里登录后再分析；只读取页面结构与内容，**不做**下单、支付、改设置等写操作
- 用 `browser_evaluate` 验证候选选择器的命中数量和取值，确认能覆盖真实数据后再写入代码
- 实测到的结构特征同步写进 `src/services/jd-parser.ts` 顶部注释，便于下次改版时比对

## 构建与检查

```bash
pnpm install          # 安装依赖
pnpm compile          # TypeScript 类型检查（vue-tsc --noEmit）
pnpm dev              # 开发构建 + 热更新（Chrome MV3）
pnpm dev:firefox      # Firefox 版本开发
pnpm build            # 生产构建
pnpm zip              # 打包成可上传的 zip
```

提交前必须跑 `pnpm compile`，`pnpm build` 必须成功。

## Manifest 权限

`wxt.config.ts` 中定义的权限：

- `host_permissions: ["*://*.jd.com/*"]` — 京东所有子域
- **不要**随意添加其他 host，遵守最小权限原则

## 隐私红线

- 订单数据只在扩展内存中流转，**不得**通过 fetch / websocket 发送到任何外部服务器
- `browser.storage.local` / `sync` 目前不持久化订单数据，未来如果要加持久化需先评审

## 注释语言

所有代码注释使用中文（简体），类型定义的 JSDoc 也用中文。commit message 可用英文。

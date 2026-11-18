# JD Orders Helper

一个基于 WXT + Vue 3 的 Chrome/Firefox 浏览器扩展，帮助你一键采集京东近一个月的订单信息。

## ✨ 功能

- **自动登录检测** — 打开扩展即可判断当前浏览器是否已登录京东
- **一键订单收集** — 点击按钮自动访问京东订单页，采集近 30 天内的全部订单
- **结构化展示** — popup 中以卡片形式展示每条订单：订单号、商品、金额、状态、下单日期
- **安全本地处理** — 订单数据仅在浏览器扩展内存中流转，不上传任何外部服务器
- **异常友好** — 登录过期、页面改版、网络异常都有清晰提示

## 🛠 技术栈

| 组件 | 技术 |
|---|---|
| 扩展框架 | [WXT](https://wxt.dev/) v0.20+ (MV3 兼容 MV2) |
| 前端 | Vue 3 + TypeScript + Vuetify 3 + TailwindCSS 4 |
| 包管理 | pnpm |

## 📦 安装与构建

```bash
# 安装依赖
pnpm install

# 开发模式 (Chrome)
pnpm dev

# 开发模式 (Firefox)
pnpm dev:firefox

# 生产构建
pnpm build

# 打包 zip（可上传到商店）
pnpm zip

# TypeScript 类型检查
pnpm compile
```

## 🧪 在浏览器中加载

1. `pnpm dev` 启动开发服务器
2. Chrome 打开 `chrome://extensions` → 右上角打开开发者模式 → 加载已解压的扩展程序 → 选择 `.output/chrome-mv3-dev`
3. 先在浏览器中登录 [www.jd.com](https://www.jd.com)
4. 点击扩展图标 → 应该能看到 popup 界面，点击「收集近一个月订单」

## 📂 项目结构

```
entrypoints/
  background.ts        # 后台消息路由中枢
  content.ts           # 京东域内运行的 content script
  popup/               # 浏览器弹窗 UI
    App.vue
    main.ts
    index.html
    style.css
src/
  types/order.ts       # OrderInfo、MessagePayload、ERROR_CODES
  services/jd-parser.ts # 京东订单页 DOM 解析（最脆弱的模块）
public/icon/           # 扩展图标
.trae/rules/
  project-rules.md     # 项目级 Trae 规则（目录约定、命名、消息协议）
  architecture.md      # 扩展架构图与消息流转说明
.trae/specs/          # Spec Mode 产出的需求文档与任务计划
wxt.config.ts          # 框架配置（manifest 权限在这里）
```

## 🔐 权限说明

扩展请求 `*://*.jd.com/*` 权限，用于：

- 在 `www.jd.com` 检测登录态
- 在 `order.jd.com/center/list.action` 读取订单列表 DOM

**不请求**任何其他网站权限，不发起任何外部网络请求。

## 🐛 常见问题

| 问题 | 原因 | 解决 |
|---|---|---|
| 提示「未检测到京东登录态」 | 当前 tab 不在京东域，或 cookie 已过期 | 先打开 jd.com 登录，再点扩展图标 |
| 提示「登录已过期」 | 访问订单页时被重定向到 passport.jd.com | 重新登录京东 |
| 订单列表为空但我明明有订单 | 可能筛选到了 30 天外 | 手动查看页面日期范围，或扩展没检测到翻页 |
| 解析后字段缺失 | 京东改版式导致选择器没命中 | 见下方"解析模块维护" |

## 🔧 京东解析模块维护

`src/services/jd-parser.ts` 是最脆弱的模块，京东改版式后解析会失败。维护时：

1. 用 Trae 内置浏览器打开 `order.jd.com/center/list.action`
2. 用开发者工具查看新的 DOM 结构
3. 给对应的字段追加选择器（每个字段保留多组 fallback）
4. 跑 `pnpm compile` + `pnpm build` 确认没问题

详细约定见 [.trae/rules/project-rules.md](.trae/rules/project-rules.md)。

## 📄 License

[Add your license here]

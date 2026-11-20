# JD Orders Collector

> 基于 WXT + Vue 3 的 Chrome / Firefox 扩展，一键采集京东近一个月的订单信息。

[![WXT](https://img.shields.io/badge/framework-WXT-0CABF7)](https://wxt.dev/)
[![Vue](https://img.shields.io/badge/vue-3-42b883)](https://cn.vuejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-3178c6)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/package-pnpm-f69220)](https://pnpm.io/)

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
  - [安装依赖](#安装依赖)
  - [在浏览器中加载扩展](#在浏览器中加载扩展)
- [常用命令](#常用命令)
- [项目结构](#项目结构)
- [架构与职责](#架构与职责)
- [权限与隐私](#权限与隐私)
- [常见问题](#常见问题)
- [京东解析模块维护](#京东解析模块维护)
- [License](#license)

---

## 功能特性

| 能力 | 说明 |
|---|---|
| 登录态检测 | 打开扩展即判断当前浏览器是否已登录京东 |
| 一键订单收集 | 自动访问京东订单页，采集近 30 天内的全部订单（含翻页） |
| 结构化展示 | popup 中以卡片展示订单号、商品、金额、状态、下单日期 |
| 本地安全 | 订单数据仅在扩展内存中流转，不上传任何外部服务器 |
| 异常友好 | 登录过期、页面改版、网络异常均有明确提示 |

## 技术栈

| 层次 | 技术选型 |
|---|---|
| 扩展框架 | [WXT](https://wxt.dev/) v0.20+（MV3，兼容 MV2） |
| UI | Vue 3（`<script setup>` + Composition API） |
| 组件库 | Vuetify 3 |
| 原子化样式 | TailwindCSS 4 |
| 语言 | TypeScript 5 |
| 包管理 | pnpm |

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 在浏览器中加载扩展

1. 执行 `pnpm dev` 启动开发服务器（Chrome）或 `pnpm dev:firefox`（Firefox）。
2. 打开扩展管理页：
   - Chrome：`chrome://extensions` → 开启「开发者模式」→「加载已解压的扩展程序」→ 选择 `.output/chrome-mv3-dev`
   - Firefox：`about:debugging#/runtime/this-firefox` → 「临时载入附加组件」→ 选择 `.output/firefox-mv2-dev/manifest.json`
3. 在浏览器中登录 [www.jd.com](https://www.jd.com)。
4. 点击扩展图标，确认 popup 正常显示，点击「收集近一个月订单」。

## 常用命令

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 开发构建（Chrome MV3），带热更新 |
| `pnpm dev:firefox` | 开发构建（Firefox） |
| `pnpm build` | 生产构建 |
| `pnpm build:firefox` | 生产构建（Firefox） |
| `pnpm zip` | 打包为可上传商店的 zip |
| `pnpm zip:firefox` | 打包 Firefox 版本 |
| `pnpm compile` | TypeScript 类型检查（`vue-tsc --noEmit`） |

> 提交前必须通过 `pnpm compile`，且 `pnpm build` 需构建成功。

## 项目结构

```
jd-orders-collector/
├── entrypoints/                  # WXT 入口：每个子目录/文件对应一个扩展入口
│   ├── background.ts             # 后台服务：消息路由中枢 + tab 管理
│   ├── content.ts                # content script：仅在 jd.com 域内运行
│   └── popup/                    # 浏览器弹窗 UI（固定 380 × 560）
│       ├── App.vue               # 只做状态编排与整体布局
│       ├── main.ts               # Vue 应用挂载入口
│       ├── index.html            # popup HTML 模板
│       ├── style.css             # 全局样式 + 固定尺寸约束
│       └── components/           # 纯展示型子组件
│           ├── PopupHeader.vue   # 顶部标题栏
│           ├── LoginAlert.vue    # 未登录 / 登录过期提示
│           ├── OrderList.vue     # 订单列表容器
│           ├── OrderCard.vue     # 单条订单卡片
│           └── EmptyState.vue    # 空态占位
├── src/                          # 跨入口共享的纯逻辑（无框架依赖）
│   ├── types/
│   │   └── order.ts              # OrderInfo / MessagePayload / ERROR_CODES
│   └── services/
│       └── jd-parser.ts          # 京东订单页 DOM 解析（最脆弱的模块）
├── components/                   # 通用 Vue 组件（当前仅模板示例）
├── public/
│   ├── icon/                     # 扩展图标（16/32/48/96/128）
│   └── wxt.svg
├── .trae/
│   ├── rules/                    # Trae 项目规则
│   │   ├── project-rules.md      # 目录约定、命名、消息协议、隐私红线
│   │   └── architecture.md       # 架构图与消息流转时序
│   └── specs/                    # Spec Mode 产出的需求与任务文档
├── wxt.config.ts                 # 框架配置（manifest 权限在 manifest 字段）
├── tsconfig.json
└── package.json
```

## 架构与职责

```
┌──────────────┐   sendMessage   ┌──────────────┐  tabs.sendMessage  ┌────────────────────┐
│   Popup UI   │ ──────────────▶ │  Background  │ ─────────────────▶ │ Content Script    │
│  (Vue 3)     │ ◀────────────── │  (路由中枢)   │ ◀───────────────── │ (jd.com 域内)      │
└──────────────┘   loginStatus   └──────────────┘   ordersResult     └────────────────────┘
                                          │                              │
                                          │                        jd-parser.ts
                                          ▼                              │
                              打开 / 导航 order.jd.com                  ▼
                                                          order.jd.com/center/list.action
```

| 层 | 入口文件 | 职责 | 禁止 |
|---|---|---|---|
| Popup | `entrypoints/popup/App.vue` | 用户交互、状态展示、错误反馈 | 直接访问 DOM |
| Background | `entrypoints/background.ts` | 消息路由、tab 管理、导航京东域 | 解析 DOM |
| Content Script | `entrypoints/content.ts` | 登录检测、DOM 解析、翻页 | 弹窗与 UI |
| Parser | `src/services/jd-parser.ts` | 纯函数 `Document → OrderInfo[]` | 直接读取 document、做 IO |
| Types | `src/types/order.ts` | 跨层共享类型与错误码 | 任何依赖 |

通信协议统一为 `src/types/order.ts` 中的 `MessagePayload` 联合类型，新增消息类型须先在该文件追加成员。完整时序图与错误码表见 [.trae/rules/architecture.md](.trae/rules/architecture.md)。

## 权限与隐私

扩展仅申请 `host_permissions: ["*://*.jd.com/*"]`，用途有两个：

- 在 `www.jd.com` 检测登录态；
- 在 `order.jd.com/center/list.action` 读取订单列表 DOM。

此外：

- **不申请**任何其他站点权限，遵守最小权限原则；
- **不发起**任何外部网络请求，订单数据不离开扩展内存；
- `browser.storage` 目前**不持久化**订单数据。

## 常见问题

| 问题 | 原因 | 解决方式 |
|---|---|---|
| 提示「未检测到京东登录态」 | 当前 tab 不在京东域，或 cookie 已过期 | 先打开 jd.com 登录，再点击扩展图标 |
| 提示「登录已过期」 | 访问订单页时被重定向到 passport.jd.com | 重新登录京东后重试 |
| 订单列表为空但确实有订单 | 筛选条件落在 30 天之外，或未识别到翻页 | 检查页面日期范围，确认翻页逻辑是否命中 |
| 解析后字段缺失 | 京东改版导致选择器失效 | 见下方「京东解析模块维护」 |
| popup 尺寸被撑大 | 子组件中混用了 Vuetify 与 Tailwind 的间距类 | 统一在同一组件内的间距方案 |

## 京东解析模块维护

`src/services/jd-parser.ts` 是最脆弱的模块——京东改版式后解析会失效。维护流程：

1. 用 Trae 内置浏览器打开 `order.jd.com/center/list.action` 并登录；
2. 基于**真实 DOM** 分析结构（京东类名带构建 hash，不要凭记忆猜选择器）；
3. 用 `browser_evaluate` 验证候选选择器的命中数量与取值；
4. 为对应字段追加 fallback 选择器，每个字段保留 2–4 组候选；
5. 跑 `pnpm compile` + `pnpm build` 验证。

具体约定（选择器多元、保守日期过滤、错误隔离等）见 [.trae/rules/project-rules.md](.trae/rules/project-rules.md)。

## License

[Add your license here]

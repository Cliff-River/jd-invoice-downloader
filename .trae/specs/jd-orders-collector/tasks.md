# JD Orders Collector - Implementation Plan

## Task 1: 配置更新 - 权限与 Content Script 匹配
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 在 `wxt.config.ts` 中开启 `host_permissions: ["*://*.jd.com/*"]`
  - 更新 `entrypoints/content.ts` 的 `matches` 覆盖京东订单相关域名
  - 确保 Manifest V3 配置正确
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `rule` TR-1.1: `wxt build` 生成的 manifest.json 中包含 `host_permissions: ["*://*.jd.com/*"]`；Evidence: `.output/chrome-mv3/manifest.json` 已确认
  - `rule` TR-1.2: content script 的 `matches` 包含 `*://*.jd.com/*`；Evidence: 同上
- **Completion Evidence**:
  - `.output/chrome-mv3/manifest.json`: `"host_permissions":["*://*.jd.com/*"]`, `"content_scripts":[{"matches":["*://*.jd.com/*"],...}]`

## Task 2: 核心类型定义与订单采集模块
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - 新建 `src/types/order.ts` 定义 `OrderInfo`、`MessagePayload`、`ERROR_CODES`
  - 新建 `src/services/jd-parser.ts`：DOM 解析、登录检测、日期过滤
- **Acceptance Criteria Addressed**: AC-2, AC-4, AC-5
- **Test Requirements**:
  - `rule` TR-2.1: `OrderInfo` 包含 orderNo/product/amount/status/orderDate 5 个必需字段；Evidence: 文件内容
  - `rubric` TR-2.2: 模块分离程度；scale 1-5; 5 分; Evidence: 类型在 src/types、解析在 src/services、通信在 entrypoints

## Task 3: Background Script 消息协调
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - `entrypoints/background.ts` 实现 checkLogin / collectOrders 消息路由
  - Tab 管理：复用当前京东 tab 或新开订单页
  - content script 消息转发
- **Acceptance Criteria Addressed**: AC-2, AC-3, NFR-6
- **Test Requirements**:
  - `rule` TR-3.1: background 监听两种消息类型；Evidence: switch(message.type) 有 checkLogin/collectOrders
  - `rule` TR-3.2: `vue-tsc --noEmit` 通过；Evidence: pnpm compile 退出码 0

## Task 4: Content Script - 登录检测与订单采集
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - 实现登录检测（多选择器策略）
  - 实现采集（翻页、日期过滤、错误码回传）
  - 异步响应 background 消息
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3, AC-4
- **Test Requirements**:
  - `rule` TR-4.1: 日期过滤使用 isWithinDays(days=30)；Evidence: handleCollectOrders 实现
  - `rule` TR-4.2: 登录过期返回 ERROR_CODES.LOGIN_EXPIRED；Evidence: isRedirectedToLogin 检测 + 错误码

## Task 5: Popup UI - 按钮与结果展示
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 3
- **Description**:
  - 重写 App.vue：登录状态区、主按钮、loading、订单卡片列表、错误提示
  - Vuetify 组件（v-alert、v-btn、v-progress-circular、v-card、v-chip）
- **Acceptance Criteria Addressed**: AC-1, AC-2, AC-3
- **Test Requirements**:
  - `rule` TR-5.1: popup 渲染登录区/按钮/loading/列表/错误 5 个区块；Evidence: App.vue template 含 v-if/v-else-if 覆盖
  - `rubric` TR-5.2: UI 完成度；scale 1-5; 4 分; Evidence: Vuetify 组件齐全，交互状态覆盖完整

## Task 6: 文档与 Trae 规则生成
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 1-5
- **Description**:
  - 更新 README.md
  - 创建 `.trae/rules/project-rules.md`
  - 创建 `.trae/rules/architecture.md`
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-6.1: `.trae/rules/` 下有 2 个规则文件；Evidence: ls 确认
  - `rubric` TR-6.3: 文档完整度；scale 1-5; 4 分; Evidence: README 含功能、构建、结构、FAQ

## Task 7: 验证与类型检查
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 1-6
- **Description**:
  - pnpm compile 通过
  - pnpm build 通过
- **Acceptance Criteria Addressed**: AC-5
- **Test Requirements**:
  - `rule` TR-7.1: `pnpm compile` 退出码 0；Evidence: 命令输出 `$ vue-tsc --noEmit` 后无报错
  - `rule` TR-7.2: `pnpm build` 退出码 0，manifest.json 存在；Evidence: `[success] Finished in 5.934 s`

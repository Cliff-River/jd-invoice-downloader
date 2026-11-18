# JD Orders Collector - Product Requirements Document

## Overview
- **Summary**: 为现有的 WXT + Vue 3 浏览器扩展添加订单收集功能——检测京东登录态，一键采集近一个月内的订单数据（订单号、商品、金额、状态、下单时间等）并在 popup 中展示。
- **Purpose**: 让用户快速汇总京东近期订单，作为发票下载和消费管理的前置步骤。
- **Target Users**: 已在 Chrome/Edge 浏览器中登录京东 (jd.com) 的普通用户。

## Goals
- 在 popup 界面提供一个醒目的「收集近一个月订单」按钮
- 自动检测当前浏览器是否已登录京东，未登录时按钮禁用并提示
- 点击后通过 content script 在京东订单页自动采集近 30 天的订单数据
- 采集结果以结构化列表展示在 popup 中，包含订单号、商品标题、金额、订单状态、下单日期等字段
- 支持基本的异常处理（登录失效、网络波动、京东页面结构变更等）

## Non-Goals
- 不自动下载发票（仅为后续发票下载功能铺路）
- 不爬取超过 1 个月的历史订单
- 不处理多账号切换场景
- 不提供导出（CSV/JSON）功能
- 不修改京东账号的任何订单状态

## Background & Context
- 项目已搭建：WXT v0.20.6 + Vue 3 + TypeScript + Vuetify 3 + TailwindCSS 4
- popup 已有基础框架（Vuetify App Container），展示当前 Tab 信息
- content script 目前只匹配 `*.google.com/*`，需要扩展到京东域名
- host_permissions 目前被注释掉了（`wxt.config.ts`），需要打开以支持京东域

## Functional Requirements

- **FR-1 (登录检测)**: 扩展启动时或用户点击按钮时，检测浏览器 Cookie/当前 Tab 中是否存在有效的京东登录态；未登录状态下按钮禁用并显示提示文案「请先登录京东」。
- **FR-2 (订单收集按钮)**: popup 中提供一个主按钮「收集近一个月订单」，点击后触发采集流程并展示 loading 状态。
- **FR-3 (数据采集)**: 在用户已登录的前提下，通过 content script 访问京东订单列表页 (`order.jd.com/center/list.action`)，自动翻页采集近 30 天内的订单基本信息。
- **FR-4 (结果展示)**: 采集完成后，在 popup 中以卡片或表格形式展示订单列表，每条包含：订单号、商品名称、金额、订单状态、下单日期。
- **FR-5 (异常反馈)**: 采集过程中出现登录失效、页面结构变化、网络错误时，在 popup 中给出清晰的错误提示，不静默失败。
- **FR-6 (消息通信)**: background script 负责协调 popup → content script 的消息流转，保持 WXT 推荐的 MV3 模式。

## Non-Functional Requirements

- **NFR-1 (性能)**: 30 天内订单数通常 < 50 条，单页采集应在 5 秒内完成；翻页后追加不应产生明显卡顿。
- **NFR-2 (可维护性)**: 采集逻辑与 UI 逻辑分离；京东 DOM 解析部分集中在独立模块，便于适配页面变更。
- **NFR-3 (隐私)**: 订单数据仅存在于扩展内存中，不上传任何外部服务器；popup 关闭后数据不持久化。
- **NFR-4 (兼容性)**: 支持 Chrome MV3 和 Firefox（WXT 默认兼容）。

## Constraints

- **Technical**: 必须使用 WXT 框架推荐的 API（`browser.*` namespace、`defineBackground`、`defineContentScript`）；京东页面可能有反爬/频率限制，采集逻辑需克制。
- **Business**: 订单数据解析依赖京东 `order.jd.com` 页面结构变更，解析模块需模块化以便快速修复。
- **Dependencies**: 项目当前已安装 Vuetify、TailwindCSS，新增依赖需通过 pnpm 安装。

## Assumptions

- 用户浏览器中已通过正常流程登录京东，扩展可以访问登录态 Cookie。
- 京东订单列表页可通过直接访问 URL 获取（`order.jd.com/center/list.action`），无需额外跳转。
- 京东不会对扩展的自动化访问做严格频率限制（单次采集 < 5 页）。

## Acceptance Criteria

### AC-1: 按钮存在与登录检测
- **Type**: `rule`
- **Given**: 扩展已加载
- **When**: 用户打开 popup
- **Then**: 可以看到「收集近一个月订单」主按钮；若未登录京东，按钮为禁用态且显示提示
- **Pass Condition**: 禁用态的按钮存在，且页面有「请先登录京东」或等效提示
- **Evidence**: 手动打开 popup 截图；devtools console 中无报错

### AC-2: 订单数据成功采集
- **Type**: `rule`
- **Given**: 用户已登录京东
- **When**: 点击「收集近一个月订单」按钮
- **Then**: popup 进入 loading 态，随后展示近 30 天内的订单列表（至少订单号、商品、金额、状态、日期 5 个字段）
- **Pass Condition**: popup 渲染出 ≥ 1 条订单，每条均含 5 个必需字段
- **Evidence**: popup 截图 + 采集到的订单 JSON 结构

### AC-3: 登录失效的异常处理
- **Type**: `rule`
- **Given**: 用户点击按钮时登录态已过期
- **When**: content script 访问订单页被重定向到登录页
- **Then**: popup 显示「登录已过期，请重新登录京东」提示
- **Pass Condition**: popup 不再处于 loading 态，且提示文案包含「登录」相关关键词
- **Evidence**: 模拟登录过期后点击按钮的 popup 状态

### AC-4: 最近订单过滤
- **Type**: `rule`
- **Given**: 用户有超过 30 天的历史订单
- **When**: 采集完成
- **Then**: 列表中只展示下单日期在最近 30 天内的订单
- **Pass Condition**: popup 中最旧订单日期 ≥ (当前日期 - 30 天)
- **Evidence**: 对比京东订单列表页与 popup 显示的日期范围

### AC-5: 代码质量与可维护性
- **Type**: `rubric`
- **Dimension**: 模块分离、类型安全、错误处理完整度
- **Scale**: 1-5
- **Anchors**: 1 = 所有逻辑堆在一个文件里，无类型定义；3 = 基本分模块，有基础类型；5 = background/content/popup 各司其职，解析模块独立，有完整 TypeScript 类型和错误边界
- **Pass Threshold**: >= 4
- **Evidence**: `vue-tsc --noEmit` 无报错；目录结构

## Open Questions

- [ ] 京东订单页是否需要额外的时间筛选参数（如 `year`、`month`）才能限制到 30 天内？（需要在实施时用浏览器实际探测确认）
- [ ] 是否需要支持手动翻页？（当前假设单页/少量翻页足够）

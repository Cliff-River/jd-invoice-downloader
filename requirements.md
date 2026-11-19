# 需求：Popup 视觉重构（Vuetify 3 + TailwindCSS 4）

## 背景

浏览器扩展的 Popup 目前全部 UI 都堆在 `entrypoints/popup/App.vue` 单个文件里，
并且 `entrypoints/popup/style.css` 仍是 Vite 模板的遗留样式（`#app { max-width: 1280px; padding: 2rem; text-align: center }`、
body 的 `place-items: center`、写死的深色 `color-scheme` 等），导致：

- Popup 宽度和布局不受控，容易撑得过宽；
- 订单卡片 `variant="outlined"` 直接拉满容器宽度，信息层级扁平、留白粗糙；
- 单组件承载了状态检测、采集、结果渲染等全部逻辑，后续维护困难。

本需求只做 **Popup 层的 UI/UX 重构**，不改动数据链路。

## 目标

在不改变现有功能与消息协议的前提下，用 Vuetify 3 组件 + TailwindCSS 工具类重做 Popup，
做到：尺寸固定、布局紧凑、组件拆分明晰、订单卡片信息层级清楚。

## 具体要求

### 1. 组件库使用

- 页面结构优先使用 Vuetify 组件：`v-app` / `v-container` / `v-card` / `v-btn` / `v-alert` / `v-chip` / `v-icon` / `v-progress-circular` 等。
- 间距、排版等样式优先使用 TailwindCSS 工具类（`flex`、`gap-*`、`text-*`、`truncate` 等）；
  Vuetify 已提供的间距工具类（`pa-*`、`mb-*`、`d-flex`）也可继续使用，二选一保持一致即可。
- 已配置 **Vuetify MCP** 与 **Vue MCP**，不确定组件 API 时先查 MCP，不要凭记忆写属性。

### 2. 尺寸与布局

- Popup 固定尺寸，避免内容撑开或出现横向滚动：
  - 宽度建议 `360px ~ 400px`（须是确定值，不能靠内容撑开）；
  - 高度设定确定值或最大高度（如 `560px`），超出部分采用**内部滚动**，而不是让整个 Popup 变高。
- 移除 `style.css` 中 Vite 模板遗留的全局样式（`#app` 的 `max-width` / `padding` / `text-align`、body 的 flex 居中、写死的深色配色等），改为适配 Popup 的紧凑基础样式；`@import "tailwindcss";` 保留。
- 深色/浅色主题表现正常，不要在浅色模式下出现深色残留。

### 3. 组件拆分

把 `App.vue` 拆成职责单一的小组件，建议结构（可调整，但单个组件不要超过约 120 行）：

```
entrypoints/popup/App.vue                    # 只负责状态与编排
entrypoints/popup/components/PopupHeader.vue # 标题 + 刷新按钮
entrypoints/popup/components/LoginAlert.vue  # 登录态提示（检测中/未登录/已登录）
entrypoints/popup/components/OrderList.vue   # 结果区：总数、列表、内部滚动
entrypoints/popup/components/OrderCard.vue   # 单条订单卡片
entrypoints/popup/components/EmptyState.vue  # 空状态 / loading 占位
```

- 组件统一放在 `entrypoints/popup/components/` 下，命名 PascalCase 单文件组件。
- 通过 `props` 传数据、`emits` 抛事件，**不要把 `browser.runtime.sendMessage` 分散到子组件里**。
- 状态检测、采集、错误处理逻辑仍集中在 `App.vue`，子组件保持纯展示。

### 4. 订单卡片优化

当前卡片的问题：宽度过宽、信息平铺、缺少视觉层级。请改成：

- 卡片宽度跟随内容区，不额外加宽；用内边距和分隔线组织信息，而不是靠拉宽。
- 信息分层建议：
  - 第一行：订单号（弱化，`text-caption`）+ 状态 `v-chip`（右对齐，按状态映射颜色：已完成/已送达 → success，已取消 → grey，其他 → warning）；
  - 第二行：商品标题，最多 2 行截断（`line-clamp-2`），`title` 保留完整文本；
  - 第三行：下单日期（弱化）在左、金额（强调，主色加粗）在右。
- 卡片之间用紧凑间距（`mb-2` 级别），避免大面积空白。
- hover 时有轻微反馈（边框/背景），但不要引入重动画。

### 5. 交互与状态

- 采集中的 loading、登录检测中的提示、错误提示、空状态、结果列表这 5 种状态都要有明确且不跳动的展示。
- 主按钮在未登录或采集中禁用，采集中显示 loading。
- 底部保留隐私说明文案："订单数据仅在本地处理，不会上传"。
- 无障碍：按钮带可识别的图标/文本，图标装饰性内容加 `aria-hidden`。

## 约束

- 遵守 `.trae/rules/project-rules.md`：popup 只负责交互与展示，不解析 DOM、不直接访问京东页面。
- 不修改 `src/types/order.ts` 的 `OrderInfo` / `MessagePayload` / `ERROR_CODES`，不新增消息类型。
- 不修改 `entrypoints/background.ts`、`entrypoints/content.ts`、`wxt.config.ts` 与 manifest 权限。
- 不新增运行时依赖；Vuetify、TailwindCSS、`@mdi/font` 已在项目中配置。
- 代码注释使用简体中文。
- 不新增与本次重构无关的功能（导出、筛选、持久化等）。

## 验收标准

1. `pnpm compile` 通过，无 TS / 模板类型错误。
2. `pnpm build` 成功。
3. 打开 Popup（`pnpm dev` 加载扩展）逐项确认：
   - 宽度固定不随内容变化，无横向滚动条，高度受控且列表区内部滚动；
   - 订单卡片不再占满并溢出，信息三行分层清晰；
   - 5 种状态切换正常（可用 mock 数据或真实登录态验证）；
   - 浅色/深色模式下均正常显示。
4. `App.vue` 行数明显下降，新增组件各司其职，无 `sendMessage` 逻辑散落在子组件。

## 最后同步文档

- 更新 `README.md` 的项目结构说明，补充 `entrypoints/popup/components/` 目录。
- 如 UI 约定（尺寸、组件分层、样式分工）形成固定规则，同步写入 `.trae/rules/project-rules.md`。

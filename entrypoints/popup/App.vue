<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue';
import { OrderInfo, MessagePayload } from '@/src/types/order';

/** 登录状态 */
const loggedIn = ref<boolean | null>(null); // null = 检测中, true/false = 已判定
/** 采集状态 */
const loading = ref(false);
/** 采集到的订单 */
const orders = ref<OrderInfo[]>([]);
/** 错误提示 */
const errorMsg = ref('');

/** 点击按钮是否禁用 */
const buttonDisabled = computed(() => loading.value || loggedIn.value !== true);

onMounted(async () => {
  await checkLogin();
});

/** 查询登录态 */
async function checkLogin() {
  loggedIn.value = null;
  errorMsg.value = '';
  try {
    const resp = (await browser.runtime.sendMessage({ type: 'checkLogin' } as MessagePayload)) as MessagePayload;
    if (resp?.type === 'loginStatus') {
      loggedIn.value = (resp as { loggedIn: boolean }).loggedIn;
    } else if (resp?.type === 'error') {
      // 区分"检测不到京东页面"和"确实未登录"，避免误导
      loggedIn.value = false;
      errorMsg.value = (resp as { message: string }).message || '无法检测登录状态';
    } else {
      loggedIn.value = false;
    }
  } catch (err) {
    console.warn('[popup] checkLogin 失败', err);
    loggedIn.value = false;
    errorMsg.value = '无法检测登录状态，请确认浏览器网络连接正常';
  }
}

/** 点击"收集订单"主按钮 */
async function collectOrders() {
  loading.value = true;
  errorMsg.value = '';
  orders.value = [];

  try {
    const resp = (await browser.runtime.sendMessage({
      type: 'collectOrders',
      days: 30,
    } as MessagePayload)) as MessagePayload;

    if (resp?.type === 'ordersResult') {
      orders.value = (resp as { orders: OrderInfo[] }).orders;
    } else if (resp?.type === 'error') {
      errorMsg.value = (resp as { message: string }).message || '采集失败';
      if ((resp as { code?: string }).code === 'LOGIN_EXPIRED') {
        loggedIn.value = false;
      }
    } else {
      errorMsg.value = '未收到有效响应';
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errorMsg.value = `请求异常：${msg}`;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-app class="jd-popup">
    <v-container class="pa-4" style="min-width: 380px">
      <!-- 标题栏 -->
      <div class="d-flex align-center mb-4">
        <v-icon color="primary" size="28">mdi-cart-outline</v-icon>
        <h2 class="text-h6 font-weight-bold ml-2 grow">京东订单助手</h2>
        <v-btn size="small" variant="text" @click="checkLogin">
          <v-icon size="18">mdi-refresh</v-icon>
        </v-btn>
      </div>

      <!-- 登录状态区 -->
      <v-alert
        v-if="loggedIn === null"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        正在检测京东登录态...
      </v-alert>

      <v-alert
        v-else-if="loggedIn === false"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        未检测到京东登录态，请先登录 <a href="https://www.jd.com" target="_blank" class="text-decoration-underline">京东</a> 后再试
      </v-alert>

      <v-alert
        v-else
        type="success"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        已登录京东，可以开始收集订单 ✓
      </v-alert>

      <!-- 主按钮 -->
      <v-btn
        block
        color="primary"
        size="large"
        :disabled="buttonDisabled"
        :loading="loading"
        @click="collectOrders"
        class="mb-4"
      >
        <template v-if="loading">采集中...</template>
        <template v-else>收集近一个月订单</template>
      </v-btn>

      <!-- 错误提示区 -->
      <v-alert
        v-if="errorMsg"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        {{ errorMsg }}
      </v-alert>

      <!-- Loading 中 -->
      <div v-if="loading" class="text-center py-4">
        <v-progress-circular indeterminate color="primary" size="32" />
        <div class="text-caption text-medium-emphasis mt-2">正在访问京东订单页，请稍候...</div>
      </div>

      <!-- 空状态 -->
      <div v-else-if="orders.length === 0 && !errorMsg && loggedIn === true" class="text-center py-6">
        <v-icon size="48" color="grey-lighten-2">mdi-file-document-outline</v-icon>
        <div class="text-body-2 text-medium-emphasis mt-2">点击上方按钮开始采集近 30 天订单</div>
      </div>

      <!-- 结果列表 -->
      <div v-else-if="orders.length > 0" class="orders-list">
        <div class="d-flex justify-space-between align-center mb-2">
          <span class="text-subtitle-2 font-weight-bold">共 {{ orders.length }} 条订单</span>
          <span class="text-caption text-medium-emphasis">近 30 天</span>
        </div>

        <v-card
          v-for="order in orders"
          :key="order.orderNo"
          variant="outlined"
          class="mb-2 order-card"
          density="compact"
        >
          <v-card-text class="pa-3">
            <div class="d-flex justify-space-between align-start mb-1">
              <span class="text-caption text-medium-emphasis">订单号 {{ order.orderNo }}</span>
              <v-chip
                size="x-small"
                :color="order.status.includes('完成') || order.status.includes('送达') ? 'success' : order.status.includes('取消') ? 'grey' : 'warning'"
                variant="tonal"
              >
                {{ order.status }}
              </v-chip>
            </div>
            <div class="text-body-2 text-truncate font-weight-medium mb-1" :title="order.product">
              {{ order.product }}
            </div>
            <div class="d-flex justify-space-between align-center">
              <span class="text-caption text-medium-emphasis">{{ order.orderDate }}</span>
              <span class="text-subtitle-2 font-weight-bold text-primary">¥ {{ order.amount }}</span>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- 底部提示 -->
      <div class="text-center text-caption text-disabled mt-4 pt-2 border-top">
        订单数据仅在本地处理，不会上传
      </div>
    </v-container>
  </v-app>
</template>

<style scoped>
.order-card:hover {
  border-color: rgb(var(--v-theme-primary));
}
</style>

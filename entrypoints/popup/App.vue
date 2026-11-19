<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { ERROR_CODES, type MessagePayload, type OrderInfo } from '@/src/types/order';
import PopupHeader from './components/PopupHeader.vue';
import LoginAlert from './components/LoginAlert.vue';
import EmptyState from './components/EmptyState.vue';
import OrderList from './components/OrderList.vue';

/** 登录态：检测中 / 已登录 / 未登录 */
type LoginStatus = 'checking' | 'loggedIn' | 'loggedOut';

/** 当前登录态 */
const loginStatus = ref<LoginStatus>('checking');
/** 登录检测失败的原因（展示在登录提示内） */
const loginMessage = ref('');
/** 是否正在采集订单 */
const loading = ref(false);
/** 采集到的订单 */
const orders = ref<OrderInfo[]>([]);
/** 采集过程中的错误提示 */
const errorMsg = ref('');

/** 主按钮是否禁用：未登录或采集中都不可点击 */
const buttonDisabled = computed(() => loading.value || loginStatus.value !== 'loggedIn');

onMounted(() => {
  void checkLogin();
});

/** 查询登录态 */
async function checkLogin() {
  loginStatus.value = 'checking';
  loginMessage.value = '';

  try {
    const resp = (await browser.runtime.sendMessage({
      type: 'checkLogin',
    } as MessagePayload)) as MessagePayload;

    if (resp?.type === 'loginStatus') {
      loginStatus.value = resp.loggedIn ? 'loggedIn' : 'loggedOut';
    } else if (resp?.type === 'error') {
      // 区分「检测不到京东页面」和「确实未登录」，避免误导
      loginStatus.value = 'loggedOut';
      loginMessage.value = resp.message || '无法检测登录状态';
    } else {
      loginStatus.value = 'loggedOut';
    }
  } catch (err) {
    console.warn('[popup] checkLogin 失败', err);
    loginStatus.value = 'loggedOut';
    loginMessage.value = '无法检测登录状态，请确认浏览器网络连接正常';
  }
}

/** 采集近 30 天订单 */
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
      orders.value = resp.orders;
    } else if (resp?.type === 'error') {
      if (resp.code === ERROR_CODES.LOGIN_EXPIRED) {
        // 登录过期属于登录态问题，回到未登录提示，而不是展示普通错误
        loginStatus.value = 'loggedOut';
        loginMessage.value = resp.message || '登录已过期，请重新登录京东';
      } else {
        errorMsg.value = resp.message || '采集失败';
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
  <v-app class="h-full">
    <div class="flex h-full flex-col">
      <PopupHeader
        :refreshing="loginStatus === 'checking'"
        @refresh="checkLogin"
      />

      <!-- 内容区：固定高度内滚动，避免整个 Popup 被内容撑高 -->
      <main class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
        <LoginAlert :status="loginStatus" :message="loginMessage" />

        <v-btn
          block
          color="primary"
          size="large"
          rounded="lg"
          class="mb-3"
          :disabled="buttonDisabled"
          :loading="loading"
          @click="collectOrders"
        >
          {{ loading ? '采集中...' : '收集近一个月订单' }}
        </v-btn>

        <v-alert
          v-if="errorMsg"
          type="error"
          variant="tonal"
          density="compact"
          :icon="false"
          class="mb-3 text-xs"
        >
          {{ errorMsg }}
        </v-alert>

        <OrderList v-if="orders.length > 0" :orders="orders" />
        <EmptyState v-else :loading="loading" />
      </main>

      <footer
        class="shrink-0 border-t border-black/10 px-3 py-2 text-center text-[11px] text-medium-emphasis"
      >
        订单数据仅在本地处理，不会上传
      </footer>
    </div>
  </v-app>
</template>

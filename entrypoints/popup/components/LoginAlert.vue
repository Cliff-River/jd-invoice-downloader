<script lang="ts" setup>
/** 登录态展示组件：检测中 / 已登录 / 未登录（含检测失败的提示文案） */
defineProps<{
  /** 当前登录态 */
  status: 'checking' | 'loggedIn' | 'loggedOut';
  /** 登录检测失败的原因，为空时展示默认引导文案 */
  message?: string;
}>();
</script>

<template>
  <v-alert
    v-if="status === 'checking'"
    type="info"
    variant="tonal"
    density="compact"
    :icon="false"
    class="mb-3 text-xs"
  >
    正在检测京东登录态...
  </v-alert>

  <v-alert
    v-else-if="status === 'loggedOut'"
    type="warning"
    variant="tonal"
    density="compact"
    :icon="false"
    class="mb-3 text-xs"
  >
    <template v-if="message">{{ message }}</template>
    <template v-else>
      未检测到京东登录态，请先登录
      <a href="https://www.jd.com" target="_blank" class="underline">京东</a>
      后再试
    </template>
  </v-alert>

  <v-alert
    v-else
    type="success"
    variant="tonal"
    density="compact"
    :icon="false"
    class="mb-3 text-xs"
  >
    已登录京东，可以开始收集订单
  </v-alert>
</template>

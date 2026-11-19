<script lang="ts" setup>
/** 结果区占位：采集中 loading / 尚未采集的空状态 */
defineProps<{
  /** 是否正在采集订单 */
  loading: boolean;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center py-10 text-center">
    <template v-if="loading">
      <v-progress-circular indeterminate color="primary" size="28" />
      <p class="mt-3 text-xs text-medium-emphasis">正在访问京东订单页，请稍候...</p>
    </template>

    <template v-else>
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        class="h-9 w-9 text-disabled"
        aria-hidden="true"
      >
        <path
          d="M6,2A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6M6,4H13V9H18V20H6V4M8,12V14H16V12H8M8,16V18H13V16H8Z"
        />
      </svg>
      <p class="mt-2 text-xs text-medium-emphasis">点击上方按钮开始采集近 30 天订单</p>
    </template>
  </div>
</template>

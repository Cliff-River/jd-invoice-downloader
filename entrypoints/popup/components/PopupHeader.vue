<script lang="ts" setup>
/** Popup 顶部标题栏：品牌标识 + 手动刷新登录态 */
defineProps<{
  /** 是否正在检测登录态（用于刷新按钮 loading） */
  refreshing: boolean;
}>();

defineEmits<{ refresh: [] }>();
</script>

<template>
  <header class="flex shrink-0 items-center gap-2.5 border-b border-black/10 px-3 py-2.5">
    <!-- 品牌图标：内联 SVG，避免依赖图标字体 -->
    <div
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
      style="background-color: rgba(var(--v-theme-primary), 0.1); color: rgb(var(--v-theme-primary))"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]">
        <path
          d="M17,18C15.89,18 15,18.89 15,20A2,2 0 0,0 17,22A2,2 0 0,0 19,20C19,18.89 18.1,18 17,18M1,2V4H3L6.6,11.59L5.24,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42A0.25,0.25 0 0,1 7.17,14.75C7.17,14.7 7.18,14.66 7.2,14.63L8.1,13H15.55C16.3,13 16.96,12.58 17.3,11.97L20.88,5.5C20.95,5.34 21,5.17 21,5A1,1 0 0,0 20,4H5.21L4.27,2M7,18C5.89,18 5,18.89 5,20A2,2 0 0,0 7,22A2,2 0 0,0 9,20C9,18.89 8.1,18 7,18Z"
        />
      </svg>
    </div>

    <div class="min-w-0 flex-1">
      <h1 class="truncate text-sm font-semibold leading-tight">京东订单助手</h1>
      <p class="truncate text-[11px] leading-tight text-medium-emphasis">近 30 天订单 · 本地处理</p>
    </div>

    <v-btn
      icon
      variant="text"
      size="small"
      density="comfortable"
      :loading="refreshing"
      aria-label="重新检测登录状态"
      @click="$emit('refresh')"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" class="h-[18px] w-[18px]" aria-hidden="true">
        <path
          d="M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z"
        />
      </svg>
    </v-btn>
  </header>
</template>

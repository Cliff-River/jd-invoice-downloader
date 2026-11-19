<script lang="ts" setup>
import { computed } from 'vue';
import type { OrderInfo } from '@/src/types/order';

const props = defineProps<{
  /** 单条订单数据 */
  order: OrderInfo;
}>();

/** 订单状态 → Chip 颜色：已完成/送达为绿色，取消为灰色，其余为橙色 */
const statusColor = computed(() => {
  const status = props.order.status;
  if (status.includes('完成') || status.includes('送达')) return 'success';
  if (status.includes('取消')) return 'grey';
  return 'warning';
});

/** 金额缺失时解析器会返回 "-"，此时不再拼接 ¥ 符号 */
const amountText = computed(() =>
  !props.order.amount || props.order.amount === '-' ? '-' : `¥ ${props.order.amount}`,
);
</script>

<template>
  <v-card variant="flat" rounded="lg" class="order-card mb-2 py-1">
    <div class="px-3 py-2.5">
      <!-- 第一行：订单号 + 订单状态 -->
      <div class="mb-1 flex items-start justify-between gap-2">
        <span class="min-w-0 truncate text-[11px] leading-tight text-medium-emphasis">
          订单号 {{ order.orderNo || '—' }}
        </span>
        <v-chip
          v-if="order.status"
          size="x-small"
          :color="statusColor"
          variant="tonal"
          class="shrink-0"
        >
          {{ order.status }}
        </v-chip>
      </div>

      <!-- 第二行：商品标题，最多两行 -->
      <p class="line-clamp-2 text-[13px] font-medium leading-snug" :title="order.product">
        {{ order.product }}
      </p>

      <!-- 第三行：下单日期 + 金额 -->
      <div class="mt-2 flex items-center justify-between gap-2 border-t border-black/5 pt-1.5">
        <span class="truncate text-[11px] text-medium-emphasis">{{ order.orderDate || '—' }}</span>
        <span class="shrink-0 text-sm font-bold text-primary">{{ amountText }}</span>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.order-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.order-card:hover {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.03);
}
</style>

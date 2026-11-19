<script lang="ts" setup>
import type { OrderInfo } from '@/src/types/order';
import OrderCard from './OrderCard.vue';

defineProps<{
  /** 采集到的订单列表 */
  orders: OrderInfo[];
}>();
</script>

<template>
  <section class="pb-1">
    <div class="mb-2 flex items-center justify-between">
      <span class="text-xs font-semibold">共 {{ orders.length }} 条订单</span>
      <span class="text-[11px] text-medium-emphasis">近 30 天</span>
    </div>

    <OrderCard
      v-for="(order, index) in orders"
      :key="order.orderNo || `order-${index}`"
      :order="order"
    />
  </section>
</template>

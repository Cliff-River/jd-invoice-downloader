<script lang="ts" setup>
import HelloWorld from '@/components/HelloWorld.vue';
</script>

<template>
  <v-app>
    <v-container>
      <div class="logo-container">
        <a href="https://wxt.dev" target="_blank">
          <img src="/wxt.svg" class="logo" alt="WXT logo" />
        </a>
        <a href="https://vuetifyjs.com/" target="_blank">
          <img src="https://vuetifyjs.com/apple-touch-icon.png" class="logo vuetify" alt="Vuetify logo" />
        </a>
        <a href="https://vuejs.org/" target="_blank">
          <img src="@/assets/vue.svg" class="logo vue" alt="Vue logo" />
        </a>
      </div>
      <HelloWorld msg="WXT + Vue + Vuetify" />
    </v-container>
  </v-app>
</template>

<style scoped>
.logo-container {
  display: flex;
  justify-content: center;
  gap: 2em;
}

.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #54bc4ae0);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

.logo.vuetify:hover {
  filter: drop-shadow(0 0 2em #1867c0aa);
}
</style>

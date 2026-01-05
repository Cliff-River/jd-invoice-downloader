<script lang="ts" setup>
import HelloWorld from '@/components/HelloWorld.vue';
</script>

<template>
  <v-app>
    <v-container>
      <v-btn variant="outlined" color="teal-lighten-2">Click me</v-btn>
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

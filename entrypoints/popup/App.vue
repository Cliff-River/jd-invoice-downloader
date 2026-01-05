<script lang="ts" setup>
import HelloWorld from "@/components/HelloWorld.vue";
import { ref, onMounted } from "vue";

const currentTab = ref<Browser.tabs.Tab | null>(null);

const getCurrentTab = async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  currentTab.value = tab;
};

onMounted(() => {
  getCurrentTab();
});
</script>

<template>
  <v-app>
    <v-container>
      <v-btn variant="outlined" color="teal-lighten-2" @click="getCurrentTab">Get Current Tab</v-btn>
      <div v-if="currentTab" class="mt-4">
        <p class="text-sm font-semibold">Current Tab Info:</p>
        <p class="text-xs">Title: {{ currentTab.title }}</p>
        <p class="text-xs">URL: {{ currentTab.url }}</p>
        <p class="text-xs">ID: {{ currentTab.id }}</p>
      </div>
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

import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest : {
    name : "JD orders helper",
    description : "A Chrome extension to help you manage your JD orders.",
    version : "1.0.0",
    host_permissions : ["https://*.jd.com/*"]
  }
});

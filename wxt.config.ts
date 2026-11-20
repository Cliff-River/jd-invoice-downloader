import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';
import ViteFonts from 'unplugin-fonts/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue"],
  manifest: {
    name: "JD Orders Collector",
    description: "A Chrome extension to help you manage your JD orders.",
    version: "1.0.0",
    host_permissions: ["*://*.jd.com/*"],
  },

  vite: () => ({
    plugins: [
      tailwindcss(),
      ViteFonts({
      fontsource: {
        families: [
          {
            name: 'Roboto',
            weights: [100, 300, 400, 500, 700, 900],
            styles: ['normal', 'italic'],
          },
        ],
      },
    }),
    ],
  }),
});

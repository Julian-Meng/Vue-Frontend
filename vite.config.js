import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';

const enableVueDevTools = false;

// https://vite.dev/config/
export default defineConfig({
    plugins: [vue(), enableVueDevTools && vueDevTools()].filter(Boolean),
    server: {
        open: false,
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
});

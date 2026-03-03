import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs'; // Import fs
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import tailwindcss from '@tailwindcss/vite';

// Read the VERSION file directly
// We use try/catch fallback just in case the file is missing during a fresh clone/setup
let appVersion = '0.0.0';
try {
  appVersion = readFileSync('./VERSION', 'utf-8').trim();
} catch (e) {
  console.warn('VERSION file not found, defaulting to 0.0.0');
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools(), tailwindcss()],
  define: {
    // Inject the content of the file as a global constant
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

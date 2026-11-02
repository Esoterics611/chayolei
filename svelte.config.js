import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    // The service worker shows push notifications; the app registers it only
    // when a member turns them on (NotificationBell.svelte).
    serviceWorker: { register: false },
    alias: {
      $lib: './src/lib',
      $components: './src/lib/components',
      $stores: './src/lib/stores',
      $types: './src/lib/types'
    }
  }
};

export default config;

import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Emulator tests clear the shared Firestore emulator between tests, so
    // test files run one at a time.
    fileParallelism: false,
  },
});

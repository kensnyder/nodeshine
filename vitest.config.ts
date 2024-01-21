import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      include: ['dist/index.mjs'],
      exclude: [
        'coverage/**',
        'dist/index.js',
        'scripts/**',
        'node_modules/**',
        'src/**',
        'index.ts',
      ],
    },
  },
});

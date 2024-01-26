import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    exclude: [],
    coverage: {
      allowExternal: true,
      include: ['dist/index.mjs'],
      exclude: [
        'coverage/**',
        'dist/index.js',
        'examples/**',
        'scripts/**',
        'node_modules/**',
        'src/**',
        'index.ts',
        'index.d.ts',
        'types.ts',
      ],
    },
  },
});

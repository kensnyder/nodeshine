import * as esbuild from 'esbuild'

const esmResult = await esbuild.build({
  entryPoints: ['index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node16',
  format: 'esm',
  splitting: false,
  sourcemap: false,
  minify: false,
  define: {
    'Bun': 'globalThis.Bun',
  },
  outfile: 'dist/index.mjs',
});

console.log('---- ESM Build ----')
console.log(esmResult);

const cjsResult = await esbuild.build({
  entryPoints: ['index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node16',
  format: 'cjs',
  splitting: false,
  sourcemap: false,
  minify: false,
  define: {
    'Bun': 'globalThis.Bun',
  },
  outfile: 'dist/index.js',
});

console.log('---- CommonJS Build ----')
console.log(cjsResult);

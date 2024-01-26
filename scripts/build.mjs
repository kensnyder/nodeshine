import * as esbuild from 'esbuild';
import fs from 'fs';

await doBuild('mjs');
await doBuild('js');

async function doBuild(ext) {
  const result = await esbuild.build({
    entryPoints: ['index.ts'],
    bundle: true,
    platform: 'node',
    target: 'node16',
    format: ext === 'mjs' ? 'esm' : 'cjs',
    splitting: false,
    sourcemap: false,
    minify: false,
    define: {
      Bun: 'globalThis.Bun',
    },
    outfile: `dist/index.${ext}`,
  });

  result.errors.slice(0, 10).map(console.error);
  result.warnings.slice(0, 10).map(console.warn);

  const contents = fs.readFileSync(`./dist/index.${ext}`, 'utf-8');
  const final = contents.replace(
    /\{\s*name:\s*"bunshine",\s*version:\s*"(.+?)".+?};/s,
    '{version:"$1"};'
  );
  const bytes = final.length.toLocaleString();
  fs.writeFileSync(`./dist/index.${ext}`, final, 'utf-8');
  console.log(
    `Compiled ./index.ts to ./dist/index.${ext} with ${bytes} bytes.`
  );
}

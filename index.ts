import { gzipSync } from 'node:zlib';
import { BunFile } from './src/BunFile/BunFile.ts';
import { BunServer } from './src/BunServer/BunServer.ts';

globalThis.Bun = {
  env: process.env,
  argv: process.argv,
  gzipSync,
  // @ts-expect-error
  file: path => new BunFile(path),
  // @ts-expect-error
  serve: options => new BunServer(options),
};

export * from 'bunshine';

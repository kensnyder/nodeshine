import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HttpRouter, serveFiles } from '../dist/index.mjs';

import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export type Server = {
  url: string;
  port: number;
  stop: (closeActiveConnections?: boolean) => void;
};

const fixturesPath = `${__dirname}/fixtures`;

describe('serveFiles middleware', () => {
  // @ts-expect-error
  let app: HttpRouter;
  let server: Server;
  beforeEach(() => {
    app = new HttpRouter();
    app.onError(c => {
      console.log('---------- error', c.error);
      return c.text('Unit Test Error', { status: 500 });
    });
  });
  afterEach(() => {
    server.stop(true);
  });
  it('should serve file', async () => {
    app.get('/files/*', serveFiles(fixturesPath));
    server = app.listen(7801);
    const resp = await fetch(`http://localhost:7801/files/home.html`);
    const text = await resp.text();
    expect(text).toBe('<h1>Welcome home</h1>\n');
    expect(resp.headers.get('content-length')).toBe('22');
    expect(resp.status).toBe(200);
    expect(resp.headers.get('content-type')).toBe('text/html');
  });
  it('should serve empty file', async () => {
    app.get('/files/*', serveFiles(fixturesPath));
    server = app.listen(7802);
    const resp = await fetch(`${server.url}files/empty.txt`);
    const text = await resp.text();
    expect(text).toBe('');
    expect(resp.headers.get('content-length')).toBe('0');
    expect(resp.status).toBe(200);
    expect(resp.headers.get('content-type')).toBe('text/plain');
  });
  it('should support head', async () => {
    app.head('/files/*', serveFiles(fixturesPath));
    server = app.listen(7803);
    const resp = await fetch(`${server.url}files/home.html`, {
      method: 'HEAD',
    });
    const text = await resp.text();
    expect(text).toBe('');
    expect(resp.headers.get('content-length')).toBe('22');
    expect(resp.status).toBe(204);
  });
  it('should 404 if file does not exist', async () => {
    app.get('/files/*', serveFiles(fixturesPath));
    server = app.listen(7804);
    const resp = await fetch(`${server.url}files/404.html`);
    expect(resp.status).toBe(404);
  });
});

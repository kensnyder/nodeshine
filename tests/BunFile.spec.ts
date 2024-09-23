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
    server = app.listen(7800);
    const resp = await fetch(`http://localhost:7800/files/home.html`);
    const text = await resp.text();
    expect(text).toBe('<h1>Welcome home</h1>\n');
    expect(resp.headers.get('content-length')).toBe('22');
    expect(resp.status).toBe(200);
    expect(resp.headers.get('content-type')).toBe('text/html');
  });
  it('should serve file', async () => {
    app.get(
      '/files/*',
      serveFiles(`${fixturesPath}/toGzip`, {
        // @ts-expect-error
        gzip: {
          minFileSize: 0,
          maxFileSize: 100000,
          cache: { type: 'never' },
        },
      })
    );
    server = app.listen(7801);
    const resp = await fetch(`http://localhost:7801/files/3.html`);
    const text = await resp.text();
    expect(text).toBe('<h1>This is file number three</h1>\n');
    expect(resp.headers.get('content-length')).toBe('55');
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
  it('should serve jpeg', async () => {
    app.get('/files/*', serveFiles(fixturesPath));
    server = app.listen(7802);
    const resp = await fetch(`${server.url}files/unicorn.tiny.jpg`);
    expect(resp.headers.get('content-length')).toBe('1493');
    expect(resp.status).toBe(200);
    expect(resp.headers.get('content-type')).toBe('image/jpeg');
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
  it('should support ranges', async () => {
    app.get('/files/*', serveFiles(fixturesPath));
    server = app.listen(7805);
    const resp = await fetch(`${server.url}files/home.html`, {
      headers: {
        Range: 'bytes=0-3',
      },
    });
    const text = await resp.text();
    expect(text).toBe('<h1>');
    expect(resp.headers.get('content-range')).toBe('bytes 0-3/22');
  });
  it('should support ranges on binary files', async () => {
    app.get('/files/*', serveFiles(fixturesPath));
    server = app.listen(7806);
    const resp = await fetch(`${server.url}files/unicorn.tiny.jpg`, {
      headers: {
        Range: 'bytes=0-5',
      },
    });
    const text = await resp.text();
    expect(text).toBe('\ufffd\ufffd\ufffd\ufffd\u0000\u0018');
    expect(resp.headers.get('content-range')).toBe('bytes 0-5/1493');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { HttpRouter } from '../../dist/index.mjs';

describe('BunServer', () => {
  it('should serve text', async () => {
    const app = new HttpRouter();
    app.get('/', c => c.text('Hello World'));
    app.listen({ port: 3301 });
    const spy = vi.fn();
    app.emitUrl({ to: spy });
    const res = await fetch('http://localhost:3301/');
    const text = await res.text();
    app.server.stop();
    expect(text).toBe('Hello World');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('http://localhost:3301/');
  });
});

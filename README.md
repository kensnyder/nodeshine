# Nodeshine

An HTTP & WebSocket server that is a little ray of sunshine.

<img alt="Nodeshine Logo" src="https://github.com/kensnyder/nodeshine/raw/main/assets/nodeshine-logo.png?v=0.12.11" width="200" height="187" />

[![NPM Link](https://img.shields.io/npm/v/nodeshine?v=0.12.11)](https://npmjs.com/package/nodeshine)
![Test Coverage: 94%](https://badgen.net/static/test%20coverage/94%25/green?v=0.12.11)
[![ISC License](https://img.shields.io/npm/l/nodeshine.svg?v=0.12.11)](https://opensource.org/licenses/ISC)

## Installation

```shell
npm install nodeshine
```

_Or on Bun, you can
[use Bunshine directly](https://npmjs.com/package/bunshine)._

## Features

Nodeshine adds compatibility layer under
[Bunshine](https://npmjs.com/package/bunshine) so that it can run on Node.

Features that come with Bunshine:

1. Use bare `Request` and `Response` objects
2. Support for routing `WebSocket` requests (Coming soon)
3. Support for Server Sent Events
4. Support ranged file downloads (e.g. for video streaming)
5. Be very lightweight
6. Treat every handler like middleware
7. Support async handlers
8. Provide common middleware out of the box
9. Built-in gzip compression
10. Comprehensive unit tests
11. Support for `X-HTTP-Method-Override` header

## Documentation

[Bunshine documentation](https://github.com/kensnyder/bunshine#readme)

## Basic example

```ts
import { HttpRouter } from 'nodeshine';

const app = new HttpRouter();

app.get('/', c => {
  return new Response('Hello at ' + c.url.pathname);
});

app.listen({ port: 3100 });
```

## Full example

```ts
import { HttpRouter, redirect } from 'nodeshine';

const app = new HttpRouter();

app.patch('/users/:id', async c => {
  await authorize(c.request.headers.get('Authorization'));
  const data = await c.request.json();
  const result = await updateUser(params.id, data);
  if (result === 'not found') {
    return c.json({ error: 'User not found' }, { status: 404 });
  } else if (result === 'error') {
    return c.json({ error: 'Error updating user' }, { status: 500 });
  } else {
    return c.json({ error: false });
  }
});

app.on404(c => {
  // called when no handlers match the requested path
  return c.text('Page Not found', { status: 404 });
});

app.on500(c => {
  // called when a handler throws an error
  console.error('500', c.error);
  return c.json({ error: 'Internal server error' }, { status: 500 });
});

app.listen({ port: 3100 });

function authorize(authHeader: string) {
  if (!authHeader) {
    throw redirect('/login');
  } else if (!jwtVerify(authHeader)) {
    throw redirect('/not-allowed');
  }
}
```

[Full bunshine documentation](https://github.com/kensnyder/bunshine#readme)

## Roadmap

- 🔲 Support for Bunshine's socket handling
- 🔲 Support for HTTPS
- 🔲 Support Bunshine's bin/serve.ts

## License

[ISC License](./LICENSE.md)

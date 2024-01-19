const {
  HttpRouter,
  devLogger,
  performanceHeader,
} = require('../dist/index.js');

const app = new HttpRouter();
console.log(`${process.cwd()}/src/testFixtures/folder/index.html`);
app.use(devLogger());
app.use(performanceHeader());
app.onError(c => {
  console.error('Bunshine Error:', c.error);
});
app.get('/', c => c.text('Hello World'));
app.get('/bye', c => c.html('<h1>Bye World</h1>'));
app.get('/json', c => c.json({ hello: 'world' }));
app.get('/js', c => c.js('alert("Hello World")'));
app.get('/file', c =>
  c.file(`${process.cwd()}/examples/server.js`)
);
app.post('/parrot', async c =>
  c.json({
    receivedJson: await c.request.json(),
    withHeaders: Object.fromEntries(c.request.headers),
  })
);

app.listen(3300);
app.emitUrl({ verbose: true });

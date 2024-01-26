import {
  SocketAddress,
  TLSWebSocketServeOptions,
  WebSocketServeOptions,
} from 'bun';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import https from 'node:https';
import { type TLSSocketOptions as NodeTLSOptions } from 'node:tls';
import { AllServerOptions, TLSFile, TLSOptions } from '../../types';
import { BunFile } from '../BunFile/BunFile.ts';
import {
  createReadableStreamFromReadable,
  writeReadableStreamToWritable,
} from '../streams/streams';

export class BunServer<W> {
  public fetch: AllServerOptions<W>['fetch'];
  public hostname: string;
  public port: number;
  public url: URL;
  protected _reqMap: WeakMap<Request, IncomingMessage>;
  protected _protocol: string = 'http';
  protected _nodeServer: http.Server | https.Server;
  protected _pendingReqCount: number = 0;
  constructor(options: AllServerOptions<W>) {
    const serverOpts = {
      // requestTimeout
    };
    // tweak options
    if (typeof options.port === 'string' && /^\d+$/.test(options.port)) {
      options.port = Number(options.port);
    }
    this._configureSsl(options, serverOpts);
    // validate and throw if invalid
    this._validateOptions(options);
    // go!
    this.fetch = options.fetch;
    this.hostname = options.hostname || 'localhost';
    this.port = typeof options.port === 'number' ? options.port : 3000;
    this._reqMap = new WeakMap();
    this._configureSsl(options, serverOpts);
    const listenOpts = {
      hostname: this.hostname,
      port: this.port,
    };
    const factory = this._protocol === 'https' ? https : http;
    // @ts-expect-error
    this._nodeServer = factory.createServer(
      serverOpts,
      this._handleRequest.bind(this)
    );
    if (options.tls?.serverNames) {
      for (const [hostname, opts] of Object.entries(options.tls.serverNames)) {
        // @ts-ignore
        this._nodeServer.addContext(hostname, opts);
      }
    }
    this._nodeServer.listen(listenOpts);
    const maybePort =
      (listenOpts.port === 80 && this._protocol === 'http') ||
      (listenOpts.port === 443 && this._protocol === 'https')
        ? ''
        : `:${listenOpts.port}`;
    this.url = new URL(
      `${this._protocol}://${listenOpts.hostname}${maybePort}/`
    );
    // I don't think this will work.
    if (options.websocket) {
      this._setupWebSockets(options.websocket);
    }
  }
  stop() {
    this.close();
  }
  /**
   * Shut down the server
   */
  close() {
    this._nodeServer.close();
  }
  /**
   * Upgrade HTTP request to WebSocket
   */
  upgrade() {}

  /**
   * Reload the server
   */
  reload() {
    throw new Error('Nodeshine does not support reloading the server.');
  }
  /**
   * Publish a message to all connected WebSocket clients
   */
  publish() {
    throw new Error('Nodeshine does not support publishing to websockets.');
  }
  /**
   * Function to get the IP address of the client based on a Request object
   * @see https://dev.to/sureshramani/how-to-get-the-ip-address-of-a-client-in-nodejs-3dj6
   */
  requestIP(request: Request): SocketAddress | null {
    const list = [
      'x-client-ip',
      'x-forwarded-for',
      'cf-connecting-ip',
      'fastly-client-ip',
      'true-client-ip',
      'x-real-ip',
      'x-cluster-client-ip',
      'x-forwarded',
      'x-forwarded-for',
      'forwarded',
    ];
    const req = this._reqMap.get(request);
    for (const header of list) {
      const ip = request.headers.get(header);
      if (ip) {
        return {
          address: ip,
          family: this._getIpFamily(ip),
          port: req?.socket.remotePort || 0,
        };
      }
    }
    if (!req) {
      return null;
    }
    const ip = req.socket.remoteAddress;
    if (!ip) {
      return null;
    }
    return {
      address: ip,
      family: this._getIpFamily(ip),
      port: req.socket.remotePort || 0,
    };
  }
  _getIpFamily(ip: string) {
    return /^[0-9.]+$/.test(ip) ? 'IPv4' : 'IPv6';
  }
  get pendingRequests() {
    return this._pendingReqCount;
  }
  get pendingWebSockets() {
    return 0;
  }
  get development() {
    return process.env.NODE_ENV === 'development';
  }
  get id() {
    return '';
  }
  private _validateOptions(options: AllServerOptions<W>) {
    if (!options.port) {
      throw new Error(
        'Nodeshine requires specifying a port. Use the get-port package if you want a random port.'
      );
    }
    if (typeof options.port !== 'number') {
      throw new Error('Nodeshine only supports passing a numeric port.');
    }
    if (process.versions.bun) {
      console.warn(
        'Since we are on Bun, please use Bunshine instead of Nodeshine.'
      );
    }
    if (options.reusePort) {
      throw new Error(
        'Nodeshine is not capable of reusing ports. Bun is required to reuse ports.'
      );
    }
    if (options.unix) {
      throw new Error('Nodeshine does not support unix sockets.');
    }
    if (options.websocket) {
      throw new Error('Nodeshine: WebSockets are not yet supported.');
    }
    // ignore development, id
  }
  private _configureSsl(
    options: AllServerOptions<W>,
    serverOptions: NodeTLSOptions
  ) {
    if (options.tls) {
      this._protocol = 'https';
    } else {
      this._protocol = 'http';
      return;
    }
    const fileIsh = ['ca', 'cert', 'key', 'passphrase'];
    for (const prop of fileIsh) {
      if (fileIsh[prop]) {
        serverOptions[prop] = this._getBuffer(options.tls[prop]);
      }
    }
    if (options.tls.dhParamsFile) {
      serverOptions.dhparam = this._getBuffer(options.tls.dhParamsFile);
    }
    const scalar = ['secureOptions'];
    for (const prop of scalar) {
      if (scalar[prop] !== undefined) {
        serverOptions[prop] = options.tls[prop];
      }
    }
    if (options.tls.serverName) {
      // @ts-ignore
      serverOptions.servername = options.tls.serverName;
    }
    // ignore serverNames since node has no option for it
    // or maybe they do under server.addContext(hostname, context
  }

  private _getBuffer(file: TLSFile) {
    if (Array.isArray(file)) {
      return file.map(f => this._getBuffer(f));
    }
    if (file instanceof Buffer) {
      return file;
    }
    if (typeof file === 'string') {
      file = new BunFile(file);
    }
    if (file instanceof BunFile) {
      return file.arrayBuffer();
    }
  }

  private _validateTls(options: TLSOptions) {
    // TODO: implement TLS
  }

  private _setupWebSockets(
    options: WebSocketServeOptions<W> | TLSWebSocketServeOptions<W>
  ) {
    // // server
    // require('net').createServer(function (socket) {
    //   console.log("connected");
    //
    //   socket.on('data', function (data) {
    //     console.log(data.toString());
    //   });
    // })
    // .listen(8080);
  }

  /**
   * @private
   * @see https://github.com/mcansh/remix-node-http-server/blob/main/packages/remix-raw-http/src/server.ts#L69-L109
   */
  private async _handleRequest(req: IncomingMessage, res: ServerResponse) {
    try {
      // convert close event into an abort signal
      const onCloseCtrl = new AbortController();
      res.on('close', () => onCloseCtrl.abort());
      const request = this._convertIncomingMessageToRequest(
        req,
        onCloseCtrl.signal
      );
      this._reqMap.set(request, req);
      this._pendingReqCount++;
      const response = await this.fetch.call(this, request, this);
      await this._sendResponseAsOutgoingMessage(response, res);
      this._reqMap.delete(request);
    } catch (e) {
      console.error('Nodeshine error!');
      console.error(e);
      res.statusCode = 500;
      res.end('Internal Server Error', 'utf-8');
    }
    this._pendingReqCount--;
  }

  /**
   * @private
   */
  private _convertIncomingMessageToRequest(
    req: IncomingMessage,
    signal: AbortSignal
  ) {
    const url = new URL(req.url!, `${this._protocol}://${req.headers.host}`);
    const init: RequestInit = {
      method: req.method,
      headers: this._getRequestHeaders(req),
      signal,
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = createReadableStreamFromReadable(req);
      // @ts-ignore
      init.duplex = 'half';
    }
    return new Request(url.toString(), init);
  }

  /**
   *
   * @see https://github.com/mcansh/remix-node-http-server/blob/main/packages/remix-raw-http/src/server.ts#L69-L91
   * @private
   */
  private _getRequestHeaders(req: IncomingMessage) {
    const headers = new Headers();
    for (const [key, values] of Object.entries(req.headers)) {
      if (values) {
        if (Array.isArray(values)) {
          for (const value of values) {
            headers.append(key, value);
          }
        } else {
          headers.set(key, values);
        }
      }
    }
    return headers;
  }

  /**
   * Create and send a response based on a Response object
   * @private
   */
  private async _sendResponseAsOutgoingMessage(
    response: Response,
    res: ServerResponse
  ) {
    for (const [name, value] of response.headers) {
      res.appendHeader(name, value);
    }
    res.statusCode = response.status;
    res.statusMessage = response.statusText;
    if (response.body) {
      // this will call res.end() when the stream is finished
      await writeReadableStreamToWritable(response.body, res);
    } else {
      // probably 204 or 3xx
      res.end();
    }
  }
}

import {
  TLSWebSocketServeOptions,
  WebSocketServeOptions,
  SocketAddress,
} from 'bun';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import https from 'node:https';
import {
  createReadableStreamFromReadable,
  writeReadableStreamToWritable,
} from '../streams/streams';
import { AllServerOptions, TLSOptions } from '../../types';

export class BunServer<W> {
  public fetch: AllServerOptions<W>['fetch'];
  public hostname: string;
  public port: number;
  public url: URL;
  protected _protocol: string = 'http';
  protected _nodeServer: http.Server | https.Server;
  constructor(options: AllServerOptions<W>) {
    // tweak options
    if (typeof options.port === 'string' && /^\d+$/.test(options.port)) {
      options.port = Number(options.port);
    }
    // validate and throw if invalid
    this._validateOptions(options);
    // go!
    this.fetch = options.fetch;
    this.hostname = options.hostname || 'localhost';
    this.port = typeof options.port === 'number' ? options.port : 3000;
    const serverOpts = {
      // requestTimeout
    };
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
    this._nodeServer.listen(listenOpts);
    const maybePort =
      (listenOpts.port === 80 && this._protocol === 'http') ||
      (listenOpts.port === 443 && this._protocol === 'https')
        ? ''
        : `:${listenOpts.port}`;
    this.url = new URL(
      `${this._protocol}://${listenOpts.hostname}${maybePort}/`
    );
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
  reload() {}
  /**
   * Publish a message to all connected WebSocket clients
   */
  publish() {}
  /**
   * The get
   */
  requestIP(request: Request) : SocketAddress | null {
    // TODO: get the requester ip
    return null;
  }
  get pendingRequests() {
    return 0;
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
      console.warn('Since we are on Bun, please use Bunshine instead of Nodeshine.')
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
    if (options.tls) {
      this._protocol = 'https';
      this._setupTls(options.tls);
      throw new Error('Nodeshine: HTTPS is not yet supported.');
    } else {
      this._protocol = 'http';
    }
    // ignore development, id
  }
  _setupTls(options: TLSOptions) {
    // TODO: implement TLS
  }

  private _setupWebSockets(options: WebSocketServeOptions<W> | TLSWebSocketServeOptions<W>) {
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
      const request = this._convertIncomingMessageToRequest(req, onCloseCtrl.signal);
      const response = await this.fetch.call(this, request, this);
      await this._sendResponseAsOutgoingMessage(response, res);
    } catch (e) {
      console.error('Nodeshine error!');
      console.error(e);
      res.statusCode = 500;
      res.end('Internal Server Error', 'utf-8');
    }
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
    // @ts-ignore
    if (res.setHeaders) {
      // Node >= 18.15
      // @ts-ignore
      res.setHeaders(response.headers);
    } else {
      // Node < 18.15
      for (const [name, value] of Object.entries(response.headers)) {
        res.appendHeader(name, value);
      }
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

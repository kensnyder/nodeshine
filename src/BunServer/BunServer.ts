import type { ServeOptions, Server, WebSocketServeOptions } from 'bun';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import https from 'node:https';
import { BunFile } from '../BunFile/BunFile.ts';
import {
  createReadableStreamFromReadable,
  writeReadableStreamToWritable,
} from '../streams/streams';

export class BunServer<W> {
  public fetch: (
    this: Server,
    request: Request,
    server: BunServer<W>
  ) => Response | Promise<Response>;
  public hostname: string;
  public port: number;
  public url: URL;
  protected _protocol: string;
  protected _nodeServer: http.Server | https.Server;
  constructor(options: ServeOptions & WebSocketServeOptions<W>) {
    if (!options.port) {
      throw new Error(
        'Nodeshine requires specifying a port. Use the get-port package if you want a random port.'
      );
    }
    if (typeof options.port !== 'number') {
      throw new Error('Nodeshine only supports passing a numeric port.');
    }
    // @ts-expect-error
    this.fetch = options.fetch;
    this.hostname = options.hostname || 'localhost';
    // TODO: support Bun's TlsOptions
    this._protocol = 'http';
    this.port = options.port;
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
      // @ts-expect-error
      this._setupWebSockets(options.websocket);
    }
  }
  stop() {
    this.close();
  }
  upgrade() {}
  reload() {}
  publish() {}
  get requestIP() {
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

  /**
   * Shut down the server
   */
  close() {
    this._nodeServer.close();
  }

  private _setupWebSockets(options: WebSocketServeOptions<W>) {
    throw new Error('Nodeshine: WebSockets are not yet supported.');
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
      const [request, signal] = this._convertIncomingMessageToRequest(req);
      // get response from handler!
      // @ts-expect-error
      const response = await this.fetch(request, this);
      // // check if request was aborted
      if (signal.aborted) {
        console.log('signal.aborted! but why?');
        // return this._sendAbortedResponse(res);
      }
      await this._sendResponseAsOutgoingMessage(response, res);
    } catch (e) {
      console.error('Nodeshine error!');
      console.error(e);
      res.statusCode = 500;
      res.end('Internal Server Error', 'utf-8');
    }
  }

  // /**
  //  * @private
  //  */
  // private _sendAbortedResponse(res: ServerResponse) {
  //   console.error('Nodeshine request was aborted. Returning 500.');
  //   res.statusCode = 500;
  //   res.end('Internal Server Error', 'utf-8');
  // }
  /**
   * @private
   */
  private _convertIncomingMessageToRequest(
    req: IncomingMessage
  ): [Request, AbortSignal] {
    // convert close event into an abort signal
    const onCloseCtrl = new AbortController();
    req.on('close', () => onCloseCtrl.abort());
    // convert node request to fetch request
    const url = new URL(req.url!, `${this._protocol}://${req.headers.host}`);
    const init: RequestInit = {
      method: req.method,
      headers: this._getRequestHeaders(req),
      signal: onCloseCtrl.signal,
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = createReadableStreamFromReadable(req);
      // @ts-ignore
      init.duplex = 'half';
    }
    return [new Request(url.toString(), init), onCloseCtrl.signal];
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
    // console.log('typeof response.body', typeof response.body);
    // console.log('response.body', response.body);
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
      console.log('no response body!');
      // call res.end() ourselves
      res.end();
    }
  }
}

import https from "node:https";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import {
  createReadableStreamFromReadable,
  writeReadableStreamToWritable
} from "../streams/streams";

type ServeOptions = {
  fetch: (request: Request, server: BunServer) => Promise<Response>;
  port: number;
  hostname?: string;
}

export class BunServer {
  public fetch: (request: Request, server: BunServer) => Promise<Response>;
  public port: number;
  public url: URL;
  protected _hostname: string;
  protected _protocol: string;
  protected _nodeServer: http.Server | https.Server;
  constructor(options: ServeOptions) {
    if (!options.port) {
      throw new Error('Nodeshine requires specifying a port. Use the get-port package if you want a random port.');
    }
    this.fetch = options.fetch;
    this._hostname = options.hostname || 'localhost';
    // TODO: support Bun's TlsOptions
    this._protocol = 'http';
    this.port = options.port;
    const serverOpts = {
      // requestTimeout
    };
    const listenOpts = {
      hostname: this._hostname,
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
    this.url = new URL(`${this._protocol}://${listenOpts.hostname}${maybePort}/`);
  }

  /**
   * Shut down the server
   */
  close() {
    this._nodeServer.close();
  }

  /**
   * @private
   * @see https://github.com/mcansh/remix-node-http-server/blob/main/packages/remix-raw-http/src/server.ts#L69-L109
   */
  private async _handleRequest(req: IncomingMessage, res: ServerResponse) {
    try {
      const [request, signal] = this._convertIncomingMessageToRequest(req);
      // get response from handler!
      const response = await this.fetch(request, this);
      // // check if request was aborted
      // if (signal.aborted) {
      //   return this._sendAbortedResponse(res);
      // }
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
  private _sendAbortedResponse(res: ServerResponse) {
    console.error('Nodeshine request was aborted. Returning 500.');
    res.statusCode = 500;
    res.end('Internal Server Error', 'utf-8');
  }
  /**
   * @private
   */
  private _convertIncomingMessageToRequest(req: IncomingMessage) : [Request, AbortSignal] {
    // convert close event into an abort signal
    const onCloseCtrl = new AbortController();
    req.on('close', () => onCloseCtrl.abort());
    // convert node request to fetch request
    const url = new URL(req.url!, `${this._protocol}://${req.headers.host}`);
    const init : RequestInit = {
      method: req.method,
      headers: this._getRequestHeaders(req),
      signal: onCloseCtrl.signal,
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = createReadableStreamFromReadable(req);
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
  private async _sendResponseAsOutgoingMessage(response: Response, res: ServerResponse) {
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
      // call res.end() ourselves
      res.end();
    }
  }
}

import {
  TLSWebSocketServeOptions,
  WebSocketServeOptions,
} from 'bun';
import type { BunServer } from './src/BunServer/BunServer';
import type { BunFile } from './src/BunFile/BunFile';

export type AllServerOptions<W> = {
  hostname?: string;
  port?: string | number;
  websocket?: WebSocketServeOptions<W> | TLSWebSocketServeOptions<W>;
  tls?: TLSOptions;
  fetch: (
    this: BunServer<W>,
    request: Request,
    server: BunServer<W>
  ) => Response | Promise<Response>;
  reusePort?: boolean;
  unix?: string;
}

export type TLSOptions = {
  /**
   * Passphrase for the TLS key
   */
  passphrase?: string;
  /**
   * File path to a .pem file custom Diffie Helman parameters
   */
  dhParamsFile?: string;
  /**
   * Explicitly set a server name
   */
  serverName?: string;
  /**
   * This sets `OPENSSL_RELEASE_BUFFERS` to 1.
   * It reduces overall performance but saves some memory.
   * @default false
   */
  lowMemoryMode?: boolean;
  /**
   * Optionally override the trusted CA certificates. Default is to trust
   * the well-known CAs curated by Mozilla. Mozilla's CAs are completely
   * replaced when CAs are explicitly specified using this option.
   */
  ca?:
    | string
    | Buffer
    | BunFile
    | Array<string | Buffer | BunFile>
    | undefined;
  /**
   *  Cert chains in PEM format. One cert chain should be provided per
   *  private key. Each cert chain should consist of the PEM formatted
   *  certificate for a provided private key, followed by the PEM
   *  formatted intermediate certificates (if any), in order, and not
   *  including the root CA (the root CA must be pre-known to the peer,
   *  see ca). When providing multiple cert chains, they do not have to
   *  be in the same order as their private keys in key. If the
   *  intermediate certificates are not provided, the peer will not be
   *  able to validate the certificate, and the handshake will fail.
   */
  cert?:
    | string
    | Buffer
    | BunFile
    | Array<string | Buffer | BunFile>
    | undefined;
  /**
   * Private keys in PEM format. PEM allows the option of private keys
   * being encrypted. Encrypted keys will be decrypted with
   * options.passphrase. Multiple keys using different algorithms can be
   * provided either as an array of unencrypted key strings or buffers,
   * or an array of objects in the form {pem: <string|buffer>[,
   * passphrase: <string>]}. The object form can only occur in an array.
   * object.passphrase is optional. Encrypted keys will be decrypted with
   * object.passphrase if provided, or options.passphrase if it is not.
   */
  key?:
    | string
    | Buffer
    | BunFile
    | Array<string | Buffer | BunFile>
    | undefined;
  /**
   * Optionally affect the OpenSSL protocol behavior, which is not
   * usually necessary. This should be used carefully if at all! Value is
   * a numeric bitmask of the SSL_OP_* options from OpenSSL Options
   */
  secureOptions?: number | undefined; // Value is a numeric bitmask of the `SSL_OP_*` options
  /**
   *  The keys are [SNI](https://en.wikipedia.org/wiki/Server_Name_Indication) hostnames.
   *  The values are SSL options objects.
   */
  serverNames?: Record<string, TLSOptions>;
}

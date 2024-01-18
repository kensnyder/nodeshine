import { statSync, type Stats } from 'node:fs';
import {readFile } from 'node:fs/promises';

export class BunFile {
  private readonly _path: string;
  private _stats: Stats | null = null;
  /**
   * @param {string} path  The path to the file
   */
  constructor(path: string) {
    this._path = path;
  }

  /**
   * Check if this file exists
   */
  async exists() {
    if (!this._stats) {
      this._stats = statSync(this._path);
    }
    return Boolean(this._stats);
  }

  /**
   * Get last modified time in milliseconds
   */
  get lastModified() {
    if (!this._stats) {
      this._stats = statSync(this._path) || { ghost: true };
    }
    return this._stats.mtimeMs;
  }

  /**
   * Get the size of the file in bytes
   */
  get size() {
    if (!this._stats) {
      this._stats = statSync(this._path) || { ghost: true };
    }
    return this._stats.size;
  }

  /**
   * Get the mime type of the file
   */
  get type() {
    const ext = this._path.split('.').pop() || '';
    // TODO: use mimedb or minimime or something that Bun uses
    return (
      {
        css: 'text/css',
        eot: 'application/vnd.ms-fontobject',
        gif: 'image/gif',
        html: 'text/html',
        ico: 'image/x-icon',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        js: 'text/javascript',
        json: 'application/json',
        otf: 'font/otf',
        png: 'image/png',
        svg: 'image/svg+xml',
        ttf: 'font/ttf',
        txt: 'text/plain',
        woff2: 'font/woff2',
        woff: 'font/woff',
        xml: 'text/xml',
      }[ext] || 'application/octet-stream'
    );
  }
  // other functions that facilitate reading the file when passed to a function

  /**
   * Return the file as a Buffer
   * @private
   */
  async _toBuffer() {
    console.log('_toBuffer', this._path, this._stats);
    return readFile(this._path);
  }

  /**
   * Return the file as a Buffer, because that is all bunshine actually needs
   */
  async arrayBuffer() {
    console.log('arrayBuffer', this._path, this._stats);
    return readFile(this._path);
    // If we really wanted a Uint8Array, we could do this:
    // const buffer = await fs.readFile(this._path);
    // return new Uint8Array(buffer);
  }
}

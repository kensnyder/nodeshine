import { statSync, type Stats } from 'node:fs';
import { readFile } from 'node:fs/promises';
import mime from 'mime';

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
    return mime.getType(this._path) || 'application/octet-stream';
  }

  /**
   * Return the file as a Buffer, because that is all bunshine actually needs
   */
  async arrayBuffer() {
    return readFile(this._path);
    // If we really wanted a Uint8Array, we could do this:
    // const buffer = await fs.readFile(this._path);
    // return new Uint8Array(buffer);
  }
}

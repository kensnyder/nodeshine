import mime from 'mime/lite';
import { statSync, type Stats } from 'node:fs';
import { readFile } from 'node:fs/promises';

const missingFile = { size: 0, mtimeMs: undefined };

export class BunFile {
  private readonly _path: string;
  private _stats: Stats | typeof missingFile | null = null;
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
    return this._getStats().mtimeMs !== undefined;
  }

  /**
   * Get last modified time in milliseconds
   */
  get lastModified() {
    return this._getStats().mtimeMs;
  }

  /**
   * Get the size of the file in bytes
   */
  get size() {
    return this._getStats().size;
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
    if (this._getStats().mtimeMs === undefined) {
      return null;
    }
    return readFile(this._path);
    // If we really wanted a Uint8Array, we could do this:
    // const buffer = await fs.readFile(this._path);
    // return new Uint8Array(buffer);
  }

  private _getStats() {
    if (!this._stats) {
      try {
        this._stats = statSync(this._path);
      } catch (e) {
        this._stats = missingFile;
      }
    }
    return this._stats;
  }
}

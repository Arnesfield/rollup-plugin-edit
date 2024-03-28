import {
  MaybePromise,
  OutputAsset,
  OutputBundle,
  OutputChunk,
  Plugin
} from 'rollup';

/** Chunk data. */
export interface ChunkData {
  /** Output file name. */
  fileName: string;
  /** Output chunk contents. */
  contents: OutputChunk['code'];
  /** Output chunk. */
  output: OutputChunk;
  /** Output bundle. */
  bundle: OutputBundle;
}

/** Asset data. */
export interface AssetData {
  /** Output file name. */
  fileName: string;
  /** Output asset contents. */
  contents: OutputAsset['source'];
  /** Output asset. */
  output: OutputAsset;
  /** Output bundle. */
  bundle: OutputBundle;
}

/** The plugin options. */
export interface Options {
  /**
   * Disable plugin and prevent firing {@linkcode chunk} and {@linkcode asset} callbacks.
   */
  disabled?: boolean;
  /**
   * Handle output chunks.
   *
   * If a string is returned, it will be used to replace the generated file contents.
   * Otherwise, the file contents remain unchanged.
   * @param data The chunk data.
   * @returns The new file contents.
   */
  chunk?(data: ChunkData): MaybePromise<OutputChunk['code'] | null | void>;
  /**
   * Handle output assets.
   *
   * If a string or {@linkcode Uint8Array} is returned,
   * it will be used to replace the generated file contents.
   * Otherwise, the file contents remain unchanged.
   * @param data The chunk data.
   * @returns The new file contents.
   */
  asset?(data: AssetData): MaybePromise<OutputAsset['source'] | null | void>;
}

function isUint8Array(value: unknown): value is Uint8Array {
  return (
    value instanceof Uint8Array ||
    Object.prototype.toString.call(value) === '[object Uint8Array]'
  );
}

/**
 * A Rollup plugin to edit generated files.
 * @param options The plugin options.
 * @returns The plugin.
 */
export function edit(options: Options = {}): Plugin {
  const name = 'edit';
  return {
    name,
    async generateBundle(_, bundle) {
      if (options.disabled) {
        return;
      }
      for (const fileName in bundle) {
        const output = bundle[fileName];
        const chunk = output.type === 'chunk';
        const contents = chunk ? output.code : output.source;
        const fn = chunk ? options.chunk : options.asset;
        const value =
          typeof fn === 'function'
            ? await fn({ fileName, contents, output, bundle } as ChunkData &
                AssetData)
            : undefined;
        const string = typeof value === 'string';
        if (chunk && string) {
          output.code = value;
        } else if (!chunk && (string || isUint8Array(value))) {
          output.source = value;
        }
      }
    }
  };
}

export default edit;

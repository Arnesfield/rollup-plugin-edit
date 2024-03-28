import {
  MaybePromise,
  NormalizedOutputOptions,
  OutputAsset,
  OutputBundle,
  OutputChunk
} from 'rollup';

/**
 * Contains data from the `generateBundle` hook.
 * @see https://rollupjs.org/plugin-development/#generatebundle
 */
export interface Data {
  /** Output file name. */
  fileName: string;
  /** Output bundle. */
  bundle: OutputBundle;
  /** Options from the `generateBundle` hook. */
  options: NormalizedOutputOptions;
  /** `isWrite` paramter from the `generateBundle` hook. */
  isWrite: boolean;
}

/** Chunk data. */
export interface ChunkData extends Data {
  /** Output chunk contents. */
  contents: OutputChunk['code'];
  /** Output chunk. */
  output: OutputChunk;
}

/** Asset data. */
export interface AssetData extends Data {
  /** Output asset contents. */
  contents: OutputAsset['source'];
  /** Output asset. */
  output: OutputAsset;
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

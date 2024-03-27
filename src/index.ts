import {
  MaybePromise,
  OutputAsset,
  OutputBundle,
  OutputChunk,
  Plugin
} from 'rollup';

export interface ChunkData {
  fileName: string;
  contents: OutputChunk['code'];
  output: OutputChunk;
  bundle: OutputBundle;
}

export interface AssetData {
  fileName: string;
  contents: OutputAsset['source'];
  output: OutputAsset;
  bundle: OutputBundle;
}

export interface Options {
  disabled?: boolean;
  chunk?(data: ChunkData): MaybePromise<OutputChunk['code'] | null | void>;
  asset?(data: AssetData): MaybePromise<OutputAsset['source'] | null | void>;
}

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
        const isString = typeof value === 'string';
        if (chunk && isString) {
          output.code = value;
        } else if (!chunk && (isString || Buffer.isBuffer(value))) {
          output.source = value;
        }
      }
    }
  };
}

export default edit;

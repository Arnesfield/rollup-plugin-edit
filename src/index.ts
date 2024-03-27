import { OutputAsset, OutputBundle, OutputChunk, Plugin } from 'rollup';

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
  chunk?(data: ChunkData): string | null | void | Promise<string | null | void>;
  asset?(data: AssetData): string | null | void | Promise<string | null | void>;
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
            ? fn({ fileName, contents, output, bundle } as ChunkData &
                AssetData)
            : undefined;
        if (typeof value !== 'string') {
          // do nothing
        } else if (chunk) {
          output.code = value;
        } else {
          output.source = value;
        }
      }
    }
  };
}

export default edit;

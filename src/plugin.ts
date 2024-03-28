import { Plugin } from 'rollup';
import { AssetData, ChunkData, Options } from './types.js';

function isUint8Array(value: unknown): value is Uint8Array {
  return (
    value instanceof Uint8Array ||
    Object.prototype.toString.call(value) === '[object Uint8Array]'
  );
}

/**
 * A Rollup plugin to edit generated file contents.
 * @param options The plugin options.
 * @returns The plugin.
 */
export function edit(options: Options = {}): Plugin {
  return {
    name: 'edit',
    async generateBundle(opts, bundle, isWrite) {
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
            ? await fn({
                fileName,
                contents,
                output,
                bundle,
                options: opts,
                isWrite
              } as ChunkData & AssetData)
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

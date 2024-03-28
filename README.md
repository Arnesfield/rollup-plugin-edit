[npm-img]: https://img.shields.io/npm/v/rollup-plugin-edit.svg
[npm-url]: https://www.npmjs.com/package/rollup-plugin-edit
[ci-img]: https://github.com/Arnesfield/rollup-plugin-edit/workflows/Node.js%20CI/badge.svg
[ci-url]: https://github.com/Arnesfield/rollup-plugin-edit/actions?query=workflow%3A"Node.js+CI"

# rollup-plugin-edit

[![npm][npm-img]][npm-url]
[![Node.js CI][ci-img]][ci-url]

A Rollup plugin to edit generated file contents.

## Install

```sh
npm install rollup-plugin-edit --save-dev
```

## Usage

```javascript
// ESM
import edit from 'rollup-plugin-edit';

// CommonJS
const { edit } = require('rollup-plugin-edit');
```

Use the plugin:

```javascript
// rollup.config.js
import edit from 'rollup-plugin-edit';

export default {
  input: 'src/index.js',
  output: { dir: 'dist' },
  plugins: [edit(/* plugin options */)]
};
```

## Options

You can pass an options object to `edit` with the following properties:

### disabled

Type: `boolean`

Disable plugin and prevent firing [`chunk`](#chunk) and [`asset`](#asset) callbacks.

### chunk

Type: `(data: ChunkData) => MaybePromise<OutputChunk['code'] | null | void>`

Handle output chunks.

If a string is returned, it will be used to replace the generated file contents. Otherwise, the file contents remain unchanged.

### asset

Type: `(data: AssetData) => MaybePromise<OutputAsset['source'] | null | void>`

Handle output assets.

If a string or `Uint8Array` is returned, it will be used to replace the generated file contents. Otherwise, the file contents remain unchanged.

## Example

Both [`chunk`](#chunk) and [`asset`](#asset) callbacks are fired with a parameter, `ChunkData` and `AssetData` respectively.

```typescript
interface ChunkData {
  fileName: string;
  contents: OutputChunk['code'];
  output: OutputChunk;
  bundle: OutputBundle;
}

interface AssetData {
  fileName: string;
  contents: OutputAsset['source'];
  output: OutputAsset;
  bundle: OutputBundle;
}
```

The `contents` property contains the generated file contents.

You can set the callbacks and return a value to replace the file's contents.

```javascript
// rollup.config.js
import edit from 'rollup-plugin-edit';

export default {
  input: 'src/index.js',
  output: [
    { file: 'dist/file1.js', sourcemap: true },
    { file: 'dist/file2.js', sourcemap: true }
  ],
  plugins: [
    edit({
      chunk(data) {
        // modify file1.js but keep file2.js contents
        if (data.fileName === 'file1.js') {
          return data.contents + '// Hello World!\n';
        }
      },
      asset(data) {
        // modify file1.js.map but keep file2.js.map contents
        if (data.fileName === 'file1.js.map') {
          // return a string or Uint8Array
          return Buffer.from('{"file":"file1.js"}');
        }
      }
    })
  ]
};
```

## License

Licensed under the [MIT License](LICENSE).

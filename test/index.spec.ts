import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { rimraf } from 'rimraf';
import { RollupOptions, rollup } from 'rollup';
import { fileURLToPath } from 'url';
import { edit } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolve(value: string, ...values: string[]) {
  return path.resolve(path.resolve(__dirname, value, ...values));
}

const files = {
  index: resolve('fixtures/index.js'),
  tmp: resolve('fixtures/tmp')
};

function file(fileName: string) {
  const sourceMapName = fileName + '.map';
  return {
    js: resolve(files.tmp, fileName),
    sourceMap: resolve(files.tmp, sourceMapName),
    name: {
      js: fileName,
      sourceMap: sourceMapName
    }
  };
}

function toUint8Array(value: string) {
  return new Uint8Array(value.split('').map(char => char.charCodeAt(0)));
}

async function bundle(options: RollupOptions) {
  const build = await rollup(options);
  const outputOptions = Array.isArray(options.output)
    ? options.output
    : options.output
      ? [options.output]
      : [];
  await Promise.all(outputOptions.map(output => build.write(output)));
}

// remove tmp dir after build.write()
afterEach(async () => {
  await rimraf(resolve('fixtures/tmp'));
});

describe('edit', () => {
  it('should be a function', () => {
    expect(edit).to.be.a('function');
  });

  it('should return an object (plugin)', () => {
    const plugin = edit();
    expect(plugin).to.be.an('object');
    expect(plugin).to.have.property('name').that.equals('edit');
    expect(plugin).to.have.property('generateBundle').that.is.a('function');
  });

  it('should run `chunk()` and `asset()` callbacks', async () => {
    const count = { chunk: 0, asset: 0 };
    const plugin = edit({
      chunk(data) {
        count.chunk++;
        expect(data).to.be.an('object');
        expect(data).to.have.property('bundle').that.is.an('object');
        expect(data).to.have.property('output').that.is.an('object');
        expect(data).to.have.property('contents').that.is.a('string');
        expect(data)
          .to.have.property('fileName')
          .that.is.a('string')
          .that.equals('index.js');
      },
      asset(data) {
        count.asset++;
        expect(data).to.be.an('object');
        expect(data).to.have.property('bundle').that.is.an('object');
        expect(data).to.have.property('output').that.is.an('object');
        expect(data).to.have.property('contents').that.is.a('string');
        expect(data)
          .to.have.property('fileName')
          .that.is.a('string')
          .that.equals('index.js.map');
      }
    });

    await bundle({
      input: files.index,
      output: [{ dir: files.tmp }, { dir: `${files.tmp}/dir1` }],
      plugins: [plugin]
    });
    expect(count.chunk).to.equal(2);
    expect(count.asset).to.equal(0);

    count.chunk = count.asset = 0;
    await bundle({
      input: files.index,
      output: [
        { dir: files.tmp, sourcemap: true },
        { dir: `${files.tmp}/dir1`, sourcemap: true }
      ],
      plugins: [plugin]
    });
    expect(count.chunk).to.equal(2);
    expect(count.asset).to.equal(2);
  });

  it('should not run callbacks when disabled', async () => {
    const count = { chunk: 0, asset: 0 };
    for (const disabled of [false, true]) {
      count.chunk = count.asset = 0;
      await bundle({
        input: files.index,
        output: [
          { dir: files.tmp, sourcemap: true },
          { dir: `${files.tmp}/dir1`, sourcemap: true }
        ],
        plugins: [
          edit({
            disabled,
            chunk: () => void count.chunk++,
            asset: () => void count.asset++
          })
        ]
      });
      const total = disabled ? 0 : 2;
      expect(count.chunk).to.equal(total);
      expect(count.asset).to.equal(total);
    }
  });

  it('should modify output contents (string)', async () => {
    const file1 = file('file1.js');
    const file2 = file('file2.js');
    const content = {
      file: "console.log('Hello World!');",
      sourceMap: '{"file": "file1.js"}'
    };
    await bundle({
      input: files.index,
      output: [
        { file: file1.js, sourcemap: true },
        { file: file2.js, sourcemap: true }
      ],
      plugins: [
        edit({
          chunk(data) {
            if (data.fileName === file1.name.js) {
              return content.file;
            }
          },
          asset(data) {
            if (data.fileName === file1.name.sourceMap) {
              return content.sourceMap;
            }
          }
        })
      ]
    });

    // check if written files actually have updated contents
    let contents = await fs.promises.readFile(file1.js, 'utf8');
    expect(contents).to.equal(content.file);

    contents = await fs.promises.readFile(file2.js, 'utf8');
    expect(contents).to.not.equal(content.file);

    contents = await fs.promises.readFile(file1.sourceMap, 'utf8');
    expect(contents).to.equal(content.sourceMap);

    contents = await fs.promises.readFile(file2.sourceMap, 'utf8');
    expect(contents).to.not.equal(content.sourceMap);
  });

  it('should modify output contents (async)', async () => {
    const file1 = file('file1.js');
    const content = {
      file: "console.log('Hello World!');",
      sourceMap: toUint8Array('{"file":"file1.js"}')
    };
    await bundle({
      input: files.index,
      output: { file: file1.js, sourcemap: true },
      plugins: [
        edit({
          chunk: async () => content.file,
          asset: async () => content.sourceMap
        })
      ]
    });

    // check if written files actually have updated contents
    const contents = await fs.promises.readFile(file1.js, 'utf8');
    expect(contents).to.equal(content.file);

    const buffer = await fs.promises.readFile(file1.sourceMap);
    expect(buffer.equals(content.sourceMap)).to.be.true;
  });

  it('should only allow string contents for chunks', async () => {
    const file1 = file('file1.js');
    const content = toUint8Array('{"file":"file1.js"}');
    await bundle({
      input: files.index,
      output: { file: file1.js },
      // force unwanted return value
      plugins: [edit({ chunk: () => content as any })]
    });
    const buffer = await fs.promises.readFile(file1.js);
    expect(buffer.equals(content)).to.be.false;
  });

  it('should accept Uint8Array for assets', async () => {
    const file1 = file('file1.js');
    const file2 = file('file2.js');
    const content = {
      array: toUint8Array('{"file":"file1.js"}'),
      buffer: Buffer.from('{"file":"file2.js"}')
    };
    await bundle({
      input: files.index,
      output: [
        { file: file1.js, sourcemap: true },
        { file: file2.js, sourcemap: true }
      ],
      // force unwanted return value
      plugins: [
        edit({
          asset(data) {
            return data.fileName === file1.name.sourceMap
              ? content.array
              : content.buffer;
          }
        })
      ]
    });

    let buffer = await fs.promises.readFile(file1.sourceMap);
    expect(buffer.equals(content.array)).to.be.true;

    buffer = await fs.promises.readFile(file2.sourceMap);
    expect(buffer.equals(content.buffer)).to.be.true;
  });
});

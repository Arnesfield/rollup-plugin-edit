import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { rimraf } from 'rimraf';
import { RollupOptions, rollup } from 'rollup';
import { fileURLToPath } from 'url';
import { edit } from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function file(value: string, ...values: string[]) {
  return path.resolve(path.resolve(__dirname, value, ...values));
}

const files = {
  add: file('fixtures/add.js'),
  index: file('fixtures/index.js'),
  tmp: file('fixtures/tmp')
};

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
  await rimraf(file('fixtures/tmp'));
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
      output: [
        { dir: files.tmp },
        { dir: `${files.tmp}/dir1` },
        { dir: `${files.tmp}/dir2` }
      ],
      plugins: [plugin]
    });
    expect(count.chunk).to.equal(3);
    expect(count.asset).to.equal(0);

    count.chunk = count.asset = 0;
    await bundle({
      input: files.index,
      output: [
        { dir: files.tmp, sourcemap: true },
        { dir: `${files.tmp}/dir1`, sourcemap: true },
        { dir: `${files.tmp}/dir2`, sourcemap: true }
      ],
      plugins: [plugin]
    });
    expect(count.chunk).to.equal(3);
    expect(count.asset).to.equal(3);
  });

  it('should not run callbacks when disabled', async () => {
    const count = { chunk: 0, asset: 0 };
    for (const disabled of [false, true]) {
      count.chunk = count.asset = 0;
      await bundle({
        input: files.index,
        output: [
          { dir: files.tmp, sourcemap: true },
          { dir: `${files.tmp}/dir1`, sourcemap: true },
          { dir: `${files.tmp}/dir2`, sourcemap: true }
        ],
        plugins: [
          edit({
            disabled,
            chunk: () => void count.chunk++,
            asset: () => void count.asset++
          })
        ]
      });
      const total = disabled ? 0 : 3;
      expect(count.chunk).to.equal(total);
      expect(count.asset).to.equal(total);
    }
  });

  it('should modify output contents', async () => {
    const content = {
      file: "console.log('Hello World!');",
      sourceMap: {
        string: '{"file": "file1.js"}',
        array: Buffer.from('{"file":"file2.js"}')
      }
    };
    const output = {
      file1: file(files.tmp, 'file1.js'),
      file2: file(files.tmp, 'file2.js'),
      file3: file(files.tmp, 'file3.js'),
      sourceMap: {
        file1: file(files.tmp, 'file1.js.map'),
        file2: file(files.tmp, 'file2.js.map'),
        file3: file(files.tmp, 'file3.js.map')
      }
    };
    await bundle({
      input: files.index,
      output: [
        { file: output.file1, sourcemap: true },
        { file: output.file2, sourcemap: true },
        { file: output.file3, sourcemap: true }
      ],
      plugins: [
        edit({
          chunk(data) {
            if (data.fileName === 'file1.js') {
              return content.file;
            }
          },
          asset(data) {
            switch (data.fileName) {
              case 'file1.js.map':
                return content.sourceMap.string;
              case 'file2.js.map':
                return content.sourceMap.array;
            }
          }
        })
      ]
    });

    // check if written files actually have updated contents
    let contents = await fs.promises.readFile(output.file1, 'utf8');
    expect(contents).to.equal(content.file);

    contents = await fs.promises.readFile(output.file2, 'utf8');
    expect(contents).to.not.equal(content.file);

    contents = await fs.promises.readFile(output.file3, 'utf8');
    expect(contents).to.not.equal(content.file);

    contents = await fs.promises.readFile(output.sourceMap.file1, 'utf8');
    expect(contents).to.equal(content.sourceMap.string);

    let buffer = await fs.promises.readFile(output.sourceMap.file2);
    expect(buffer.equals(content.sourceMap.array)).to.be.true;

    buffer = await fs.promises.readFile(output.sourceMap.file3);
    contents = buffer.toString();
    expect(contents).to.not.equal(content.sourceMap.string);
    expect(buffer.equals(content.sourceMap.array)).to.be.false;
  });

  it('should modify output contents (async)', async () => {
    const content = {
      file: "console.log('Hello World!');",
      sourceMap: Buffer.from('{"file":"file1.js"}')
    };
    const output = {
      file: file(files.tmp, 'file1.js'),
      sourceMap: file(files.tmp, 'file1.js.map')
    };
    await bundle({
      input: files.index,
      output: { file: output.file, sourcemap: true },
      plugins: [
        edit({
          chunk: async () => content.file,
          asset: async () => content.sourceMap
        })
      ]
    });

    // check if written files actually have updated contents
    const contents = await fs.promises.readFile(output.file, 'utf8');
    expect(contents).to.equal(content.file);

    const buffer = await fs.promises.readFile(output.sourceMap);
    expect(buffer.equals(content.sourceMap)).to.be.true;
  });

  it('should only allow string contents for chunks', async () => {
    const output = file(files.tmp, 'file1.js');
    const content = Buffer.from('{"file":"file1.js"}');
    await bundle({
      input: files.index,
      output: { file: output },
      // force unwanted return value
      plugins: [edit({ chunk: () => content as any })]
    });
    const buffer = await fs.promises.readFile(output);
    expect(buffer.equals(content)).to.be.false;
  });
});

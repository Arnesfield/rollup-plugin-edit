# template.ts

TypeScript template repository.

---

Run initial setup:

```sh
npm init
```

Install dependencies:

```sh
npm install --save-dev \
  @rollup/plugin-eslint @rollup/plugin-typescript @types/node \
  @typescript-eslint/eslint-plugin @typescript-eslint/parser \
  eslint prettier rimraf rollup rollup-plugin-dts \
  rollup-plugin-esbuild rollup-plugin-output-size \
  tslib typescript
```

Install testing dependencies:

```sh
npm install --save-dev \
  @types/chai @types/mocha @types/sinon \
  chai concurrently mocha sinon tsx
```

Finally, sort `package.json` with [sort-package-json](https://www.npmjs.com/package/sort-package-json):

```sh
sort-package-json
```

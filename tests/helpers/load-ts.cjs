/* eslint-disable @typescript-eslint/no-require-imports -- Node test fixtures use CommonJS. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const ts = require('typescript');

// Execute the production TypeScript with explicit boundary mocks, without loading Next or dotenv.
module.exports = function createLoader(mocks = {}, globals = {}) {
  const root = path.resolve(__dirname, '../..');
  const cache = new Map();
  function load(relative) {
    const absolute = path.resolve(root, relative);
    if (cache.has(absolute)) return cache.get(absolute);
    const output = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: absolute,
    }).outputText;
    const exports = {};
    cache.set(absolute, exports);
    const nativeRequire = createRequire(absolute);
    vm.runInNewContext(output, {
      exports, console, Date, Promise, BigInt, Buffer, URL, setTimeout, clearTimeout, ...globals,
      require(name) {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
        return nativeRequire(name);
      },
    }, { filename: absolute });
    return exports;
  }
  return load;
};

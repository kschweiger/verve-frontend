import { plugin } from 'bun';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileScript, parse } from '@vue/compiler-sfc';

const sourceRoot = resolve(import.meta.dir, '../../src');

plugin({
  name: 'vue-components-for-render-tests',
  setup(build) {
    build.onLoad({ filter: /\.vue$/ }, ({ path }) => {
      const { descriptor } = parse(readFileSync(path, 'utf8'), { filename: path });
      const script = compileScript(descriptor, {
        id: path, inlineTemplate: true, templateOptions: { ssr: true },
      });
      return {
        contents: script.content.replace(/(['"])@\//g, `$1${sourceRoot}/`),
        loader: 'ts',
      };
    });
    build.onLoad({ filter: /\.svg$/ }, ({ path }) => ({
      contents: `export default ${JSON.stringify(path)}`, loader: 'js',
    }));
  },
});

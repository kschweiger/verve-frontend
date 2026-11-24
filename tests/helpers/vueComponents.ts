import { plugin } from 'bun';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compileScript, parse } from '@vue/compiler-sfc';

const sourceRoot = resolve(import.meta.dir, '../../src');
// Bun caches the first compilation of each component, so the mode must be
// known before any test imports that component or one of its parents.
const clientRenderPaths = new Set([
  'components/ActivityExportButton.vue',
  'components/ActivitySegmentsPanel.vue',
  'components/ActivityWorkout.vue',
  'components/CombinedMetricsChart.vue',
  'components/WorkoutExerciseFields.vue',
  'components/WorkoutMuscleMap.vue',
  'components/WorkoutPlanActivities.vue',
  'views/WorkoutPlanListView.vue',
  'views/WorkoutPlanView.vue',
].map((path) => resolve(sourceRoot, path)));

plugin({
  name: 'vue-components-for-render-tests',
  setup(build) {
    build.onLoad({ filter: /\.vue$/ }, ({ path }) => {
      const { descriptor } = parse(readFileSync(path, 'utf8'), { filename: path });
      const script = compileScript(descriptor, {
        id: path, inlineTemplate: true, templateOptions: { ssr: !clientRenderPaths.has(path) },
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

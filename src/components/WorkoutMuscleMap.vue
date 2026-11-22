<script setup lang="ts">
import { computed, useId } from 'vue';
import type { ActivityMuscleGroup } from '@/services/workoutPlans';

const props = defineProps<{ groups: readonly ActivityMuscleGroup[] }>();
const titleId = useId();
const roles = computed(() => new Map(props.groups.map(({ code, role }) => [code, role])));
const legend = computed(() =>
  [
    { role: 'primary', label: 'Primary muscles', swatch: 'bg-verve-dark' },
    {
      role: 'secondary',
      label: 'Secondary muscles',
      swatch: 'bg-verve-medium ring-1 ring-verve-dark/80 ring-inset',
    },
  ].map((item) => ({
    ...item,
    groups: props.groups
      .filter((group) => group.role === item.role)
      .sort((a, b) => a.name.localeCompare(b.name)),
  }))
);
const regionColors = {
  primary: 'fill-verve-dark',
  secondary: 'fill-verve-medium stroke-verve-dark/80',
  inactive: 'fill-verve-brown/10',
};

const outline = `M80 9
  C69 9 63 17 64 29 C64 40 68 48 71 52
  C72 56 68 59 61 61 L50 65 C43 68 39 75 38 85
  L36 109 C34 119 35 125 32 136 C30 145 27 152 27 160
  C27 168 25 171 25 179 L25 188 Q25 192 28 192 Q30 192 31 188
  L33 179 Q34 176 35 175 L36 179 Q37 182 39 180
  Q40 179 39 176 L38 172 C36.5 166 38 160 40 155
  C42 149 44 143 46 139 Q49 129 50 117
  C51 108 50.5 90 53.5 90 C56.5 90 55 101 57 108
  C60 123 61 135 57 149 C54 159 50 176 50 189
  C50 207 55 228 57 243 Q59 255 57 267
  C53 279 55 295 57 309 L58 328 Q53 334 47 338
  C43 342 46 348 51 348 L65 348 Q70 347 70 341
  L70 328 C69 317 73 304 73 292 Q74 282 71 270
  Q69 259 71 248 L74 216 Q75 194 80 185
  Q85 194 86 216 L89 248 Q91 259 89 270
  Q86 282 87 292 C87 304 91 317 90 328
  L90 341 Q90 347 95 348 L109 348 C114 348 117 342 113 338
  Q107 334 102 328 L103 309 C105 295 107 279 103 267
  Q101 255 103 243 C105 228 110 207 110 189
  C110 176 106 159 103 149 C99 135 100 123 103 108
  C105 101 103.5 90 106.5 90 C109.5 90 109 108 110 117
  Q111 129 114 139 C116 143 118 149 120 155
  C122 160 123.5 166 122 172 L121 176 Q120 179 121 180 Q123 182 124 179
  L125 175 Q126 176 127 179
  L129 188 Q130 192 132 192 Q135 192 135 188 L135 179
  C135 171 133 168 133 160 C133 152 130 145 128 136
  C125 125 126 119 124 109
  L122 85 C121 75 117 68 110 65 L99 61 C92 59 88 56 89 52
  C92 48 96 40 96 29 C97 17 91 9 80 9 Z`;

// Region keys match the muscle group codes in the backend exercise catalog.
const views: { name: string; contours: string; regions: Record<string, string> }[] = [
  {
    name: 'Front',
    contours: `M71 52 Q80 61 89 52 M70 63 Q75 67 80 65 Q85 67 90 63
      M34 171 Q32 173 32 177 M126 171 Q128 173 128 177
      M61 248 Q64 253 68 249 M92 249 Q96 253 99 248
      M58 332 L65 332 M102 332 L95 332`,
    regions: {
      side_shoulders: 'M53 69 Q44 71 41 81 L40 88 Q44 87 47 81 Q50 73 53 69 Z',
      front_shoulders: 'M56 70 Q60 72 56 79 Q51 88 44 91 L42 91 Q49 85 51 79 Q53 73 56 70 Z',
      chest: 'M64 72 Q71 70 77 74 L78 91 Q77 97 69 98 Q61 98 59 92 Q59 83 64 72 Z',
      front_upper_arms:
        'M44 97 Q48 94 49 101 Q48 110 46 117 Q44 125 41 127 Q37 125 38 116 L39 106 Q40 100 44 97 Z',
      forearms:
        'M39 132 Q43 130 44 135 Q40 149 34 161 Q31 164 30 160 Q30 157 32 150 L35 139 Q36 134 39 132 Z',
      side_chest: 'M58 99 Q62 101 66 103 L67 111 L61 108 L59 112 Q58 106 58 99 Z',
      front_abdomen: `M71 102 Q75 101 78 102 L78 115 Q74 117 70 114 Q69 106 71 102 Z
        M70 118 Q74 119 78 118 L78 130 Q75 132 71 130 Z
        M71 134 Q74 135 78 134 L78 151 Q76 155 74 151 Z`,
      side_abdomen: 'M60 114 L67 115 L68 130 Q67 137 70 146 Q64 144 61 138 Q62 124 60 114 Z',
      front_hips: 'M62 145 Q69 150 73 157 Q76 162 76 172 Q69 164 60 160 Q60 153 62 145 Z',
      outer_hips: 'M57 152 Q59 156 57 164 L53 177 Q53 166 57 152 Z',
      front_thighs:
        'M57 166 Q63 169 68 177 Q69 185 66 208 L67 230 Q68 240 64 244 Q59 239 58 228 L54 202 Q52 185 57 166 Z',
      inner_thighs: 'M71 178 Q74 180 77 176 Q75 184 73 200 L70 226 Q68 229 68 222 L69 199 Z',
      tibialis:
        'M63 260 Q68 261 68 273 L66 299 Q65 313 62 321 Q59 318 60 308 L59 281 Q59 269 63 260 Z',
    },
  },
  {
    name: 'Back',
    contours: `M72 54 Q80 57 88 54 M80 59 L80 142
      M33 170 Q32 173 31 176 M127 170 Q128 173 129 176
      M61 248 Q64 251 68 248 M92 248 Q96 251 99 248
      M61 315 L63 330 M99 315 L97 330`,
    regions: {
      side_shoulders: 'M53 69 Q46 69 42 78 Q40 83 40 88 Q45 87 48 81 Q50 73 53 69 Z',
      rear_shoulders: 'M56 69 Q61 70 57 77 L53 85 Q49 90 42 91 Q48 87 51 78 Z',
      upper_trapezius: 'M75 59 L78 62 L78 77 Q70 73 63 74 Q65 70 75 59 Z',
      middle_back: 'M68 77 Q74 78 78 81 L78 112 Q75 110 72 104 Q69 100 68 94 L71 90 Z',
      rotator_cuff: 'M60 77 Q63 76 66 80 L68 89 Q65 93 60 90 L56 87 Z',
      back_sides:
        'M58 93 Q64 93 67 98 Q70 108 74 115 Q67 123 64 138 Q61 132 61 123 Q60 111 58 104 Z',
      lower_back: 'M73 122 Q76 117 78 116 L78 145 Q73 145 68 150 Q67 146 68 139 Z',
      back_upper_arms:
        'M45 94 Q49 92 50 98 L48 111 Q46 122 42 127 Q38 129 38 121 L39 105 Q40 98 45 94 Z',
      forearms:
        'M39 132 Q42 130 44 134 Q42 142 38 150 Q35 159 32 162 Q29 161 31 154 L35 140 Q36 135 39 132 Z',
      outer_hips: 'M59 145 Q62 145 65 148 Q60 150 57 155 L54 168 Q53 163 56 153 Z',
      buttocks:
        'M69 149 Q75 147 78 152 L78 172 Q75 181 66 181 Q59 180 54 174 L59 158 Q62 152 69 149 Z',
      back_thighs:
        'M54 180 Q61 184 69 185 Q67 194 66 210 L67 231 Q68 240 64 243 Q59 240 58 227 L54 204 Q52 192 54 180 Z',
      inner_thighs:
        'M72 184 L77 180 Q75 190 73 201 L70 227 Q68 230 68 221 L69 200 Q70 190 72 184 Z',
      calves:
        'M63 259 Q69 262 70 273 Q71 288 66 300 Q64 309 63 316 Q60 311 60 303 Q56 289 58 274 Q59 263 63 259 Z',
    },
  },
];
</script>

<template>
  <section :aria-labelledby="titleId">
    <h3 :id="titleId" class="font-semibold">Muscle map</h3>
    <div class="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-verve-light/60 p-3">
      <figure v-for="view in views" :key="view.name" class="text-center">
        <svg viewBox="11 4 138 350" class="h-auto w-full" aria-hidden="true" focusable="false">
          <path
            :d="outline"
            class="fill-white/65 stroke-verve-brown/35"
            stroke-width="1.25"
            stroke-linejoin="round"
          />
          <g
            v-for="(shape, code) in view.regions"
            :key="code"
            :data-muscle="code"
            :data-role="roles.get(code)"
            :class="regionColors[roles.get(code) ?? 'inactive']"
            stroke-width="0.85"
            stroke-linejoin="round"
          >
            <path :d="shape" />
            <path :d="shape" transform="translate(160 0) scale(-1 1)" />
          </g>
          <path
            :d="view.contours"
            class="fill-none stroke-verve-brown/25"
            stroke-width="1"
            stroke-linecap="round"
          />
        </svg>
        <figcaption class="mt-1 text-xs font-medium">{{ view.name }}</figcaption>
      </figure>
    </div>
    <details class="mt-2 border-t border-verve-medium/60">
      <summary
        class="cursor-pointer rounded-sm py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-verve-orange"
      >
        Muscle groups
      </summary>
      <dl class="space-y-3 pt-1 pb-2 text-sm">
        <div v-for="item in legend" v-show="item.groups.length" :key="item.role">
          <dt class="flex items-center gap-2 font-semibold">
            <span class="size-3 rounded-sm" :class="item.swatch" aria-hidden="true"></span>
            {{ item.label }}
          </dt>
          <dd class="mt-1.5 pl-5 text-verve-brown/85">
            <ul class="flex flex-wrap gap-x-3 gap-y-1">
              <li v-for="group in item.groups" :key="group.code" class="wrap-anywhere">
                {{ group.name }}
              </li>
            </ul>
          </dd>
        </div>
      </dl>
    </details>
  </section>
</template>

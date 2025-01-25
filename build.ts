import { $ } from 'bun'

const outdir = './dist'

await $`rm -fr ${outdir}`

await Bun.build({
	target: 'bun',
	entrypoints: ['./src/index.ts'],
	minify: true,
	outdir,
	external: ['commander']
})

await $`tsc --project tsconfig.dts.json`

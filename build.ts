import { $ } from 'bun'

const outdir = './dist'

await $`rm -fr ${outdir}`

await Bun.build({
	target: 'bun',
	entrypoints: ['./src/index.ts'],
	minify: true,
	outdir,
	external: ['commander', 'consola', 'typescript', '@faker-js/faker']
})

await $`tsc --project tsconfig.dts.json`

import { consola } from 'consola'
import type { UnionOfPossibleTuples } from './types'

type Level =
	| 'error'
	| 'warning'
	| 'info'
	| 'debug'
	| 'trace'
	| 'silent'
	| 'verbose'

export type Options = {
	level?: Level
}

export const levels = Object.freeze([
	'error',
	'warning',
	'info',
	'debug',
	'trace',
	'silent',
	'verbose'
] satisfies UnionOfPossibleTuples<Level>)

export function configure({ level }: Options) {
	switch (level) {
		case 'error':
			consola.level = 0
			break
		case 'warning':
			consola.level = 1
			break
		case 'info':
			consola.level = 3
			break
		case 'debug':
			consola.level = 4
			break
		case 'trace':
			consola.level = 5
			break
		case 'silent':
			consola.level = -999
			break
		case 'verbose':
			consola.level = 999
			break
	}
}

export function withScope(tag: string, intend = 1) {
	return consola.withDefaults({ tag, message: '  '.repeat(intend) })
}

export function instance() {
	return consola
}

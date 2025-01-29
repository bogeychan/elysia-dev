import type { AST } from '../ast'
import type { UnionOfPossibleTuples } from '../types'
import * as logger from '../logger'

export type Options =
	| import('./typescript/types').Options
	| import('./open-api').Options

export type Parse<O extends Options = Options> = (
	entrypoint: string,
	options: O
) => Promise<AST | undefined>

export type ParseWatch<O extends Options = Options> = (
	entrypoint: string,
	options: O,
	cb: (ast?: AST) => void
) => void

export const parsers = Object.freeze([
	'typescript',
	'open-api'
] satisfies UnionOfPossibleTuples<Options['$type']>)

function getParser(
	type: Options['$type']
): Promise<{ parse: Parse<any>; watch?: ParseWatch<any> }> {
	switch (type) {
		case 'typescript':
			return import('./typescript')

		case 'open-api':
			return import('./open-api')

		default:
			throw new Error(
				`Unsupported parser "${
					// @ts-expect-error
					options.$type
				}"`
			)
	}
}

// TODO: ref class
function init(entrypoint: string, options: Options) {
	const log = logger.withScope('parser')

	log.info(`Using entrypoint "${entrypoint}"`)
	log.info(`Using parser "${options.$type}"`)

	return { log }
}

export async function parse(entrypoint: string, options: Options) {
	const { log } = init(entrypoint, options)

	const parser = await getParser(options.$type)

	log.start(`Parsing entrypoint...`)

	const ast = await parser.parse(entrypoint, options)

	log.success(`Parsed entrypoint!`)

	return ast
}

export function watch(
	entrypoint: string,
	options: Options,
	cb: (ast?: AST) => void
): void {
	const { log } = init(entrypoint, options)

	getParser(options.$type).then(({ watch }) => {
		if (typeof watch === 'undefined') {
			return log.fail(`Watching ${options.$type} is not supported :(`)
		}

		log.start(`Watching entrypoint...`)

		watch(entrypoint, options, cb)
	})
}

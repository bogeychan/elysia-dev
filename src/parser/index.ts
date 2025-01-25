import type { AST } from '../ast'
import type { BaseOptions, UnionOfPossibleTuples } from '../types'
import * as logger from '../logger'

export type Options =
	| import('./typescript').Options
	| import('./open-api').Options

export type Parse<O extends Options = Options> = (
	entrypoint: string,
	options: O
) => Promise<AST | undefined>

export const parsers = Object.freeze([
	'typescript',
	'open-api'
] satisfies UnionOfPossibleTuples<Options['$type']>)

export async function parse(entrypoint: string, options: Options) {
	const log = logger.withScope('parser')

	log.info(`Using entrypoint "${entrypoint}"`)
	log.info(`Using parser "${options.$type}"`)

	let parser: { parse: Parse<any> }

	switch (options.$type) {
		case 'typescript':
			parser = await import('./typescript')
			break
		case 'open-api':
			parser = await import('./open-api')
			break
		default:
			throw new Error(
				`Unsupported parser "${
					// @ts-expect-error
					options.$type
				}"`
			)
	}

	log.start(`Parsing entrypoint...`)

	const elysiaAST = await parser.parse(entrypoint, options)

	log.success(`Parsed entrypoint!`)

	return elysiaAST
}

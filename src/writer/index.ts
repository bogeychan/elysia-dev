import * as ast from '../ast'
import type { UnionOfPossibleTuples } from '../types'
import * as logger from '../logger'
import type { ConsolaInstance } from 'consola'

export type Options =
	| import('./treaty').Options
	| import('./rest').Options
	| import('./open-api').Options
	| import('./typescript').Options

export abstract class Writer<O extends Options = Options> {
	protected log!: ConsolaInstance
	protected out = ''

	constructor(
		protected ast: ast.AST,
		protected options: O,
		protected relativeImport: string
	) {}

	abstract init(): Promise<void>

	async write(): Promise<string> {
		const { routes } = this.ast.type

		for (const path in routes.entries) {
			const entry = routes.entries[path]

			if (!ast.isType(entry) || !ast.isObject(entry)) {
				this.log.warn(`Writing entry "${path}" not supported`)
				continue
			}

			this.findRoute([path], entry)
		}

		return this.out
	}

	protected abstract writeRoute(
		args: { pathname: string; pathAccess: string; method: string },
		route: ast.TypeObject
	): void

	protected findRoute(paths: string[], entry: ast.TypeObject) {
		for (const method in entry.entries) {
			const route = entry.entries[method]

			if (!ast.isType(route) || !ast.isObject(route)) {
				this.log.warn(`Writing entry "${paths.join('.')}" not supported`)
				continue
			}

			if (!ast.isRoute(route)) {
				this.findRoute([...paths, method], route)
				continue
			}

			if (method === 'subscribe') {
				this.log.warn(`Skipping WS route "${paths.join('.')}": Unsupported atm`)
				continue
			}

			if (ast.isType(route) && ast.isObject(route)) {
				const pathname = this.joinPaths(paths)

				let pathAccess = this.joinPathAccess(paths)
				if (pathAccess.startsWith('.')) {
					pathAccess = pathAccess.replace('.', '/')
				}

				this.writeRoute({ pathname, method, pathAccess }, route)
			} else {
				this.log.warn(
					`Writing route not supported: "${method}" - "${paths.join('.')}"`
				)
			}
		}
	}

	protected joinPathAccess(parts: string[]) {
		return parts.join('.')
	}

	protected joinPaths(parts: string[]) {
		const paths = parts.reduce<string[]>((result, value) => {
			if (value !== 'index') {
				result.push(value)
			}
			return result
		}, [])
		const pathname = paths.join('/')
		return pathname.startsWith('/') ? pathname : `/${pathname}`
	}
}

export const writers = Object.freeze([
	'rest',
	'treaty',
	'open-api',
	'typescript'
] satisfies UnionOfPossibleTuples<Options['$type']>)

export async function write(
	ast: ast.AST,
	options: Options,
	relativeImport: string
) {
	const log = logger.withScope('writer')

	log.info(`Using writer "${options.$type}"`)
	log.info(`Using relative import "${relativeImport}"`)

	let Writer: new (ast: ast.AST, options: any, relativeImport: string) => Writer

	switch (options.$type) {
		case 'rest':
			Writer = (await import('./rest')).RestWriter
			break
		case 'treaty':
			Writer = (await import('./treaty')).TreatyWriter
			break
		case 'open-api':
			Writer = (await import('./open-api')).OpenApiWriter
			break
		case 'typescript':
			Writer = (await import('./typescript')).TypeScriptWriter
			break
		default:
			throw new Error(
				`Unsupported writer "${
					// @ts-expect-error
					options.$type
				}"`
			)
	}

	log.start(`Generating content...`)

	const writer = new Writer(ast, options, relativeImport)
	await writer.init()
	const content = await writer.write()

	log.success(`Content generated!`)

	return content
}

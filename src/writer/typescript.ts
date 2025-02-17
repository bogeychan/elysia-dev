import * as ast from '../ast'
import type { BaseOptions } from '../types'
import { Writer } from '.'
import * as logger from '../logger'
import ts from 'typescript'

export type Options = BaseOptions<'typescript'>

function createNoop() {
	return ts.factory.createArrowFunction(
		undefined,
		undefined,
		[],
		undefined,
		ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
		ts.factory.createBlock([], false)
	)
}

type Schema = Partial<{
	params: ts.Expression
	query: ts.Expression
	headers: ts.Expression
	cookie: ts.Expression
	body: ts.Expression
	response: ts.Expression
}>

type Route = { path: string; schema: Schema }

function createRouteHandler(route: Route): ts.Expression[] {
	const properties: ts.ObjectLiteralElementLike[] = []

	function pushSchema(name: keyof Schema) {
		const entry = route.schema[name]
		if (entry) {
			properties.push(
				ts.factory.createPropertyAssignment(
					ts.factory.createIdentifier(name),
					entry
				)
			)
		}
	}

	pushSchema('params')
	pushSchema('query')
	pushSchema('headers')
	pushSchema('cookie')
	pushSchema('body')
	pushSchema('response')

	const expressions: ts.Expression[] = [
		ts.factory.createStringLiteral(route.path),
		createNoop()
	]

	if (properties.length > 0) {
		expressions.push(ts.factory.createObjectLiteralExpression(properties, true))
	}

	return expressions
}

function createRoute(args: {
	previous: ts.Expression
	method: string
	route: Route
}) {
	return ts.factory.createCallExpression(
		ts.factory.createPropertyAccessExpression(
			args.previous,
			ts.factory.createIdentifier(args.method)
		),
		undefined,
		createRouteHandler(args.route)
	)
}

export class TypeScriptWriter extends Writer<Options> {
	protected routes: Record<
		/* path: */ string,
		Record</* method: */ string, Schema>
	> = {}

	override async init() {
		this.log = logger.withScope('typescript', 2)
	}

	override async write(): Promise<string> {
		await super.write()

		// import { Elysia, t } from "elysia"
		const importDeclaration = ts.factory.createImportDeclaration(
			undefined,
			ts.factory.createImportClause(
				false,
				undefined,
				ts.factory.createNamedImports([
					ts.factory.createImportSpecifier(
						false,
						undefined,
						ts.factory.createIdentifier('Elysia')
					),
					ts.factory.createImportSpecifier(
						false,
						undefined,
						ts.factory.createIdentifier('t')
					)
				])
			),
			ts.factory.createStringLiteral('elysia')
		)

		const elysiaInstance = ts.factory.createNewExpression(
			ts.factory.createIdentifier('Elysia'),
			undefined,
			[]
		)

		const initializer = Object.entries(this.routes).reduce<ts.Expression>(
			(previous, [path, methods]) =>
				Object.entries(methods).reduce<ts.Expression>(
					(previous, [method, schema]) =>
						createRoute({
							previous,
							method,
							route: {
								path,
								schema
							}
						}),
					previous
				),
			elysiaInstance
		)

		// export const app = new Elysia()...
		const variableStatement = ts.factory.createVariableStatement(
			[ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
			ts.factory.createVariableDeclarationList(
				[
					ts.factory.createVariableDeclaration(
						'app',
						undefined,
						undefined,
						initializer
					)
				],
				ts.NodeFlags.Const
			)
		)
		const nodes = ts.factory.createNodeArray([
			importDeclaration,
			variableStatement
		])

		const resultFile = ts.createSourceFile(
			'app.ts',
			'',
			ts.ScriptTarget.Latest,
			false,
			ts.ScriptKind.TS
		)
		const printer = ts.createPrinter({
			newLine: ts.NewLineKind.CarriageReturnLineFeed
		})
		return printer.printList(ts.ListFormat.MultiLine, nodes, resultFile)
	}

	override writeRoute(
		args: { pathname: string; method: string; pathAccess: string },
		route: ast.TypeObject
	) {
		const { params, query, headers, cookie, body, response } = route.entries

		if (!this.routes[args.pathname]) {
			this.routes[args.pathname] = {}
		}

		if (args.method in this.routes[args.pathname]) {
			this.log.warn(
				`Duplicate route detected (path: ${args.pathname}, method: ${args.method}), overwriting it...`
			)
		}

		this.routes[args.pathname][args.method] = {
			params: this.typeToParams(params),
			query: this.typeToQuery(query),
			headers: this.typeToHeaders(headers),
			cookie: this.typeToCookie(cookie),
			body: this.typeToBody(body),
			response: this.typeToResponse(response)
		}
	}

	protected isDefaultLike(type: ast.TypeValue) {
		return ast.isType(type) && ast.isUnknown(type)
	}

	protected typeToParams(type: ast.TypeValue): Schema['params'] {
		if (this.isDefaultLike(type)) {
			return
		}
		return this.typeToBox(type, true)
	}

	protected typeToQuery(type: ast.TypeValue): Schema['query'] {
		if (this.isDefaultLike(type)) {
			return
		}
		return this.typeToBox(type, true)
	}

	protected typeToHeaders(type: ast.TypeValue): Schema['headers'] {
		if (this.isDefaultLike(type)) {
			return
		}
		return this.typeToBox(type, true)
	}

	protected typeToCookie(type: ast.TypeValue): Schema['cookie'] {
		if (this.isDefaultLike(type)) {
			return
		}
		return this.typeToBox(type, true)
	}

	protected typeToBody(type: ast.TypeValue): Schema['body'] {
		if (this.isDefaultLike(type)) {
			return
		}
		return this.typeToBox(type, false)
	}

	protected typeToResponse(type: ast.TypeValue): Schema['response'] {
		if (this.isDefaultLike(type)) {
			return
		}

		if (ast.isType(type) && ast.isObject(type)) {
			const { entries } = type
			const properties: ts.PropertyAssignment[] = []

			for (const statusCode in entries) {
				const entry = entries[statusCode]

				const expression = this.typeToBox(entry, false)

				if (expression) {
					properties.push(
						ts.factory.createPropertyAssignment(statusCode, expression)
					)
				}
			}

			return ts.factory.createObjectLiteralExpression(properties, true)
		}

		this.log.warn(
			`Unsupported typeToResponse "${JSON.stringify(type, null, ' ')}"`
		)
	}

	protected typeToBox(
		type: ast.TypeValue,
		skipEmpty: boolean
	): ts.Expression | undefined {
		if (ast.isType(type)) {
			if (ast.isString(type)) {
				// t.String()
				return ts.factory.createCallExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier('t'),
						ts.factory.createIdentifier('String')
					),
					undefined,
					[]
				)
			} else if (ast.isNumber(type)) {
				// t.Number()
				return ts.factory.createCallExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier('t'),
						ts.factory.createIdentifier('Number')
					),
					undefined,
					[]
				)
			} else if (ast.isUndefined(type)) {
				// t.Undefined()
				return ts.factory.createCallExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier('t'),
						ts.factory.createIdentifier('Undefined')
					),
					undefined,
					[]
				)
			} else if (ast.isUnknown(type)) {
				// t.Unknown()

				if (skipEmpty) {
					return
				}

				return ts.factory.createCallExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier('t'),
						ts.factory.createIdentifier('Unknown')
					),
					undefined,
					[]
				)
			} else if (ast.isVoid(type)) {
				// t.Void()
				return ts.factory.createCallExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier('t'),
						ts.factory.createIdentifier('Void')
					),
					undefined,
					[]
				)
			} else if (ast.isFile(type)) {
				// t.File()
				return ts.factory.createCallExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier('t'),
						ts.factory.createIdentifier('File')
					),
					undefined,
					[]
				)
			} else if (ast.isObject(type)) {
				// t.Object(...)

				const properties = Object.entries(type.entries).reduce<
					ts.PropertyAssignment[]
				>((result, [name, type]) => {
					const expression = this.typeToBox(type, false)

					if (expression) {
						result.push(
							ts.factory.createPropertyAssignment(
								ts.factory.createIdentifier(name),
								expression
							)
						)
					}

					return result
				}, [])

				if (skipEmpty && properties.length === 0) {
					return
				}

				return ts.factory.createCallExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier('t'),
						ts.factory.createIdentifier('Object')
					),
					undefined,
					[ts.factory.createObjectLiteralExpression(properties, true)]
				)
			} else if (ast.isUnion(type)) {
				// t.Union([...])

				const expressions: ts.Expression[] = []

				for (const entry of type.types) {
					const box = this.typeToBox(entry, false)
					if (box) {
						expressions.push(box)
					}
				}

				return ts.factory.createCallExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier('t'),
						ts.factory.createIdentifier('Union')
					),
					undefined,
					[ts.factory.createArrayLiteralExpression(expressions, true)]
				)
			} else if (ast.isIntersection(type)) {
				// t.Intersect([...])

				const expressions: ts.Expression[] = []

				for (const entry of type.types) {
					const box = this.typeToBox(entry, false)
					if (box) {
						expressions.push(box)
					}
				}

				return ts.factory.createCallExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier('t'),
						ts.factory.createIdentifier('Intersect')
					),
					undefined,
					[ts.factory.createArrayLiteralExpression(expressions, true)]
				)
			} else if (ast.isArray(type)) {
				// t.Array(...)

				const entry = this.typeToBox(type.entry, true)

				if (!entry) {
					// is required
					return
				}

				return ts.factory.createCallExpression(
					ts.factory.createPropertyAccessExpression(
						ts.factory.createIdentifier('t'),
						ts.factory.createIdentifier('Array')
					),
					undefined,
					[entry]
				)
			}
		} else if (ast.isLiteral(type)) {
			const argumentsArray: ts.Expression[] = []

			if (ast.isStringLiteral(type)) {
				argumentsArray.push(ts.factory.createStringLiteral(type))
			} else if (ast.isNumberLiteral(type)) {
				argumentsArray.push(ts.factory.createNumericLiteral(type))
			} else if (ast.isBooleanLiteral(type)) {
				argumentsArray.push(
					type ? ts.factory.createTrue() : ts.factory.createFalse()
				)
			}

			// t.Literal(...)
			return ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					ts.factory.createIdentifier('t'),
					ts.factory.createIdentifier('Literal')
				),
				undefined,
				argumentsArray
			)
		}

		if (typeof type == 'undefined') {
			// TODO ???
			return
		}

		this.log.warn(`Unsupported typeToBox "${JSON.stringify(type, null, ' ')}"`)
	}
}

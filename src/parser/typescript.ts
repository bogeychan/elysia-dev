import ts from 'typescript'
import * as ast from '../ast'
import type { Parse } from '.'
import type { BaseOptions } from '../types'
import * as logger from '../logger'
import { isTest } from '../utils'

export type Options = BaseOptions<'typescript'> & ts.CompilerOptions

export const parse: Parse<Options> = async (entrypoint, options) => {
	const log = logger.withScope('typescript', 2)

	options.strict ||= true

	const program = ts.createProgram([entrypoint], options)
	const checker = program.getTypeChecker()

	const sourceFile = program.getSourceFile(entrypoint)!

	return ts.forEachChild(sourceFile, visit)

	function visit(node: ts.Node): ast.AST | undefined {
		if (!ts.isVariableStatement(node)) {
			return
		}

		const declaration = node.declarationList.declarations[0]

		if (
			!declaration ||
			!ts.isIdentifier(declaration.name) ||
			!isNodeExported(declaration)
		) {
			return
		}

		const type = checker.getTypeAtLocation(declaration)

		if (!type.symbol) {
			log.warn(
				`Unable to find symbol for type \`${checker.typeToString(
					type
				)}\` at location \`${declaration.name.text}\``
			)
			return
		}

		const typeDeclaration = type.symbol.declarations?.[0]

		if (
			!typeDeclaration ||
			!ts.isClassDeclaration(typeDeclaration) ||
			typeDeclaration.name?.text !== 'Elysia'
		) {
			return
		}

		return elysiaToJson(type, declaration)
	}

	function elysiaToJson(
		type: ts.Type,
		node: ts.VariableDeclaration
	): ast.AST | undefined {
		if (!isTypeReference(type)) {
			log.warn('no type ref')
			return
		}

		const targetArgs = checker.getTypeArguments(type.target)
		const typeArgs = checker.getTypeArguments(type)

		const exportName = node.name.getText()

		const elysiaAST: ast.AST = {
			exportName,
			type: {
				routes: {
					$type: 'object',
					text: '',
					entries: {}
				}
			},
			origin: tryGetOrigin(exportName)
		}

		loop: for (let i = 0; i < targetArgs.length; i++) {
			const targetArg = targetArgs[i]
			const typeArg = typeArgs[i]

			switch (targetArg.symbol.name) {
				case 'Routes':
					const routes = tryGetValueFromType(typeArg, node)
					if (ast.isType(routes) && ast.isObject(routes)) {
						elysiaAST.type.routes = routes
						log.success(`Routes found!`)
					} else {
						log.fail(`Routes not found`)
					}
					break loop
			}
		}

		return elysiaAST
	}

	function tryGetValueFromType(type: ts.Type, node: ts.Node): ast.TypeValue {
		if (type.isStringLiteral() || type.isNumberLiteral()) {
			return type.value
		} else if (isBooleanLiteral(type)) {
			return checker.typeToString(type, node) === 'true'
		} else if (isObject(type)) {
			const object: ast.TypeObject = {
				$type: 'object',
				text: '',
				entries: {}
			}

			switch (type.symbol?.name) {
				case 'Response':
				case 'File':
					object.text = type.symbol!.name
					return object
				case 'Array':
					object.text = 'Array'
					if (isTypeReference(type)) {
						const arrayType = checker.getTypeArguments(type)[0]
						if (arrayType) {
							return {
								$type: 'array',
								entry: tryGetValueFromType(arrayType, node)
							}
						}
					}
					return object
			}

			for (const property of type.getProperties()) {
				object.entries[property.name] = tryGetValueFromType(
					checker.getTypeOfSymbolAtLocation(
						property,
						property.valueDeclaration ?? node
					),
					property.valueDeclaration ?? node
				)
			}
			object.text = isTest ? 'test' : checker.typeToString(type)
			return object
		} else if (isUnknown(type)) {
			return {
				$type: 'unknown'
			}
		} else if (isString(type)) {
			return {
				$type: 'string'
			}
		} else if (isNumber(type)) {
			return {
				$type: 'number'
			}
		} else if (isVoid(type)) {
			return {
				$type: 'void'
			}
		} else if (isNull(type)) {
			return {
				$type: 'null'
			}
		} else if (isUndefined(type)) {
			return {
				$type: 'undefined'
			}
		} else if (isNever(type)) {
			return {
				$type: 'never'
			}
		} else if (type.isIntersection()) {
			const types = type.types.map((type) => tryGetValueFromType(type, node))
			const text = checker.typeToString(type)

			return mergeIntersection(text, ...types)
		} else if (isAny(type)) {
			return {
				$type: 'any'
			}
		} else if (type.isUnion()) {
			return {
				$type: 'union',
				types: type.types.map((type) => tryGetValueFromType(type, node)),
				text: isTest ? 'test' : checker.typeToString(type)
			}
		} else {
			log.warn(`Unsupported type "${checker.typeToString(type, node)}"`)
		}
	}

	function tryGetOrigin(exportName: string) {
		const origin = {
			protocol: '',
			hostname: '',
			port: 0
		}

		ts.forEachChild(sourceFile, (node) => {
			if (!ts.isIfStatement(node)) {
				return
			}

			if (ts.isBlock(node.thenStatement)) {
				for (const statement of node.thenStatement.statements) {
					if (
						!ts.isExpressionStatement(statement) ||
						!ts.isCallExpression(statement.expression) ||
						!ts.isPropertyAccessExpression(statement.expression.expression) ||
						!ts.isIdentifier(statement.expression.expression.expression) || // "server"
						statement.expression.expression.expression.text !== exportName ||
						!ts.isIdentifier(statement.expression.expression.name) || // "listen"
						statement.expression.expression.name.text !== 'listen'
					) {
						continue
					}
					// if (process.env.NODE_ENV !== 'test') {
					// 	server.listen(8080)
					// }

					if (statement.expression.arguments.length > 1) {
						log.warn(`Unsupported CallExpression trying to find "listen"`)
						continue
					}

					const argument = statement.expression.arguments[0]

					if (ts.isNumericLiteral(argument)) {
						// server.listen(8080)
						origin.port = parseInt(argument.text)
						log.success(`Port found!`)
						return true // break
					} else if (ts.isObjectLiteralExpression(argument)) {
						// server.listen({
						// 	hostname: '127.0.0.1',
						// 	port: 8080
						// })

						for (const property of argument.properties) {
							if (
								ts.isPropertyAssignment(property) &&
								ts.isIdentifier(property.name)
							) {
								switch (property.name.text) {
									case 'hostname':
										if (ts.isStringLiteral(property.initializer)) {
											origin.hostname = property.initializer.text
											log.success(`Hostname found!`)
										}
										break

									case 'port':
										if (ts.isNumericLiteral(property.initializer)) {
											origin.port = parseInt(property.initializer.text)
											log.success(`Port found!`)
										}
										break

									case 'tls':
										origin.protocol = 'https'
										log.success(`TLS found, using "https" protocol!`)
										break
								}
							} else if (
								ts.isShorthandPropertyAssignment(property) &&
								ts.isIdentifier(property.name)
							) {
								// server.listen({
								// 	tls
								// })

								switch (property.name.text) {
									case 'tls':
										origin.protocol = 'https'
										log.success(`TLS found, using "https" protocol!`)
										break
								}
							}
						}

						return true // break
					}
				}
			}
		})

		if (!origin.protocol) {
			log.fail('No TLS found')
			origin.protocol = 'http'
		}

		if (!origin.hostname) {
			log.fail('No hostname found')
			origin.hostname = 'localhost'
		}

		if (!origin.port) {
			log.fail('No port found')
			origin.port = 80
		}

		log.info(`Using protocol "${origin.protocol}"`)
		log.info(`Using hostname "${origin.hostname}"`)
		log.info(`Using port "${origin.port}"`)

		return origin
	}
}

function isNodeExported(node: ts.Declaration): boolean {
	return (
		(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0 ||
		(!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
	)
}

function hasFlag(type: ts.Type, flag: number): boolean {
	return (type.flags & flag) === flag
}

function hasObjectFlag(type: ts.ObjectType, flag: number): boolean {
	return (type.objectFlags & flag) === flag
}

function isObject(type: ts.Type): type is ts.ObjectType {
	return hasFlag(type, ts.TypeFlags.Object)
}

function isBooleanLiteral(type: ts.Type) {
	return hasFlag(type, ts.TypeFlags.BooleanLiteral)
}

function isUnknown(type: ts.Type) {
	return hasFlag(type, ts.TypeFlags.Unknown)
}

function isString(type: ts.Type) {
	return hasFlag(type, ts.TypeFlags.String)
}

function isNumber(type: ts.Type) {
	return hasFlag(type, ts.TypeFlags.Number)
}

function isAny(type: ts.Type) {
	return hasFlag(type, ts.TypeFlags.Any)
}

function isVoid(type: ts.Type) {
	return hasFlag(type, ts.TypeFlags.Void)
}

function isNull(type: ts.Type) {
	return hasFlag(type, ts.TypeFlags.Null)
}

function isUndefined(type: ts.Type) {
	return hasFlag(type, ts.TypeFlags.Undefined)
}

function isNever(type: ts.Type) {
	return hasFlag(type, ts.TypeFlags.Never)
}

function isTypeReference(type: ts.Type): type is ts.TypeReference {
	return isObject(type) && hasObjectFlag(type, ts.ObjectFlags.Reference)
}

function isEveryEntryObject(types: ast.TypeValue[]): types is ast.TypeObject[] {
	return types.every((entry) => ast.isType(entry) && ast.isObject(entry))
}

function mergeIntersection(
	text: string,
	...types: ast.TypeValue[]
): ast.TypeObject | ast.TypeIntersection {
	if (!isEveryEntryObject(types)) {
		return {
			$type: 'intersection',
			types,
			text
		}
	}

	return types.reduce<ast.TypeObject>(
		(result, obj) => {
			for (const key in obj.entries) {
				const value = obj.entries[key]
				const oldValue = result.entries[key]

				if (!oldValue) {
					result.entries[key] = value
				} else if (!isEveryEntryObject([value])) {
					result.entries[key] = {
						$type: 'intersection',
						types,
						text
					}
				} else {
					result.entries[key] = mergeIntersection(
						typeof value === 'object' && 'text' in value ? value.text : '',
						value,
						oldValue
					)
				}
			}

			return result
		},
		{
			$type: 'object',
			entries: {},
			text
		}
	)
}

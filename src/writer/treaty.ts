import * as ast from '../ast'
import { fakeTypeValue } from '../faker'
import type { BaseOptions } from '../types'
import { Writer } from '.'
import * as logger from '../logger'

export type Options = BaseOptions<'treaty'>

export class TreatyWriter extends Writer {
	override async init() {
		this.log = logger.withScope('treaty', 2)
		this.out = `import { describe, it, expect } from 'bun:test'
import { treaty } from '@elysiajs/eden'
import { ${this.ast.exportName} } from '${this.relativeImport}'
	
await ${this.ast.exportName}.modules

const api = treaty(${this.ast.exportName})

describe('Elysia', () => {`
	}

	override async write() {
		this.out = await super.write()
		this.out += `
})`
		return this.out
	}

	protected override writeRoute(
		args: { pathname: string; method: string; pathAccess: string },
		route: ast.TypeObject
	): void {
		const { params, body, response } = route.entries

		let { pathAccess } = args
		const comment = [args.method.toUpperCase(), args.pathname]
		let reqBody = ''
		const reqValid: string[] = []

		if (ast.isType(params)) {
			if (ast.isObject(params)) {
				for (const paramName in params.entries) {
					const param = params.entries[paramName]

					let paramValue

					function fakeTypeParam(param: ast.TypeValue) {
						if (ast.isType(param)) {
							if (ast.isString(param)) {
								return `"${fakeTypeValue(param, paramName)}"`
							} else if (ast.isNumber(param)) {
								return `${fakeTypeValue(param, paramName)}`
							}
						}
					}

					if (ast.isType(param)) {
						if (ast.isUnion(param)) {
							for (const type of param.types) {
								paramValue = fakeTypeParam(type)
								if (typeof paramValue !== 'undefined') {
									break
								}
							}
						} else {
							paramValue = fakeTypeParam(param)
						}
					}

					if (typeof paramValue === 'undefined') {
						this.log.warn(
							`Unsupported param "${paramName}" in "${
								args.pathname
							}": ${JSON.stringify(param, null, ' ')}`
						)
						continue
					}

					if (pathAccess.startsWith(':')) {
						pathAccess = pathAccess.replace(
							`:${paramName}`,
							`index({ "${paramName}": ${paramValue} })`
						)
					} else {
						pathAccess = pathAccess.replace(
							`.:${paramName}`,
							`({ "${paramName}": ${paramValue} })`
						)
					}
				}
			}
		}

		if (ast.isType(body)) {
			if (ast.isObject(body)) {
				comment.push(`Request: ${body.text}`)
				const value = fakeTypeValue(body) as Record<string, any>

				if (ast.isMultipart(body)) {
					// TODO refactoring... stinky :(

					reqBody = JSON.stringify(fakeTypeValue(body), (name, value) => {
						const entry = body.entries[name]

						if (ast.isType(entry) && ast.isFile(entry)) {
							return `null#${name}`
						}
						return value
					})

					for (const name in body.entries) {
						const entry = body.entries[name]

						if (ast.isType(entry) && ast.isFile(entry)) {
							reqBody = reqBody.replace(
								`"null#${name}"`,
								`new File(['${fakeTypeValue(
									entry
								)}'], '${name}.txt', { type: 'text/plain' })`
							)
						}
					}
				} else {
					reqBody = JSON.stringify(value)
				}
			} else if (ast.isString(body)) {
				reqBody = `"${fakeTypeValue(body)}"`
			} else if (ast.isNumber(body)) {
				reqBody = `${fakeTypeValue(body)}`
			} else if (ast.isUnion(body)) {
				this.out += `
	// >>> UNION`
				for (const type of body.types) {
					const routeClone = structuredClone(route)
					routeClone.entries.body = type
					this.writeRoute(args, routeClone)
				}
				this.out += `	// <<< UNION
`
				return
			}
		}

		function pushRequestValidation(type: ast.TypeValue) {
			if (ast.isType(type)) {
				if (ast.isObject(type)) {
					reqValid.push(`expect(data).toBeTypeOf('object')`)
				} else if (ast.isString(type)) {
					reqValid.push(`expect(data).toBeTypeOf('string')`)
				} else if (ast.isNumber(type)) {
					reqValid.push(`expect(data).toBeTypeOf('number')`)
				}
			}
		}

		if (ast.isType(response)) {
			if (ast.isObject(response)) {
				comment.push(`Response: ${response.text}`)

				const ok = response.entries['200']
				pushRequestValidation(ok)
			} else {
				pushRequestValidation(response)
			}
		}

		this.out += `
	it('${comment.join(' - ')}"', async () => {
		const { data, error } = await api.${pathAccess}.${args.method}(${
			reqBody ? reqBody : ''
		})
		expect(error).toBeNull()
		${reqValid.join('\n')}
	})
`
	}
}

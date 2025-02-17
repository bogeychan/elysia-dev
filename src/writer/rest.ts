import * as ast from '../ast'
import { fakeTypeMultipart, fakeTypeValue, fakeTypeValueShort } from '../faker'
import type { BaseOptions } from '../types'
import { Writer } from '.'
import * as logger from '../logger'

export type Options = BaseOptions<'rest'>

export class RestWriter extends Writer<Options> {
	override async init() {
		this.log = logger.withScope('rest', 2)
		this.out = `
@protocol = ${this.ast.origin.protocol}
@hostname = ${this.ast.origin.hostname}
@port     = ${this.ast.origin.port}
@origin   = {{protocol}}://{{hostname}}:{{port}}

###

`
	}

	override writeRoute(
		args: { pathname: string; method: string; pathAccess: string },
		route: ast.TypeObject
	) {
		let { pathname } = args
		const { params, body } = route.entries

		if (ast.isType(params)) {
			if (ast.isObject(params)) {
				for (const paramName in params.entries) {
					const param = params.entries[paramName]

					let paramValue

					function fakeTypeParam(param: ast.TypeValue) {
						if (ast.isType(param)) {
							if (ast.isString(param) || ast.isNumber(param)) {
								return `${fakeTypeValueShort(param, paramName)}`
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

					pathname = pathname.replace(`:${paramName}`, paramValue)
				}
			}
		}

		const comment = [args.pathAccess]
		let reqHeaders = ''
		let reqBody = ''

		if (!ast.isType(body)) {
			return
		}

		if (ast.isUnion(body)) {
			for (const type of body.types) {
				const routeClone = structuredClone(route)
				routeClone.entries.body = type
				this.writeRoute(args, routeClone)
			}
			return
		}

		if (ast.isObject(body)) {
			comment.push(body.text)
			if (ast.isMultipart(body)) {
				const boundary = 'abcde12345'
				reqHeaders = `Content-Type: multipart/form-data; boundary=${boundary}`
				reqBody = fakeTypeMultipart(body, boundary)
			} else {
				reqHeaders = `Content-Type: application/json`
				reqBody = JSON.stringify(fakeTypeValue(body), null, '  ')
			}
		} else if (ast.isString(body) || ast.isNumber(body)) {
			reqHeaders = `Content-Type: text/plain`
			reqBody = `${fakeTypeValue(body)}`
		}

		this.out += `# ${comment.join(' - ')}
${args.method.toUpperCase()} {{origin}}${pathname} HTTP/1.1
${reqHeaders}

${reqBody}

###

`
	}
}

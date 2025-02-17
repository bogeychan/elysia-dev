import * as ast from '../ast'
import type { BaseOptions } from '../types'
import { Writer } from '.'
import * as logger from '../logger'
import type { OpenAPIV3 } from 'openapi-types'
import { isTest } from '../utils'

export type Options = BaseOptions<'open-api'>

const ALLOWED_METHODS = [
	'GET',
	'PUT',
	'POST',
	'DELETE',
	'OPTIONS',
	'HEAD',
	'PATCH',
	'TRACE'
]

// https://swagger.io/docs/specification/describing-request-body/
const NOT_ALLOWED_BODY_METHODS = ['GET', 'DELETE', 'HEAD']

type MediaObjectMap = {
	[media: string]: OpenAPIV3.MediaTypeObject
}

const MEDIA_TYPE = {
	text: 'text/plain',
	json: 'application/json',
	binary: 'application/octet-stream',
	multipart: 'multipart/form-data'
}

export class OpenApiWriter extends Writer<Options> {
	protected doc: OpenAPIV3.Document = {
		openapi: '3.1.0',
		info: {
			title: 'Elysia Documentation',
			description: 'Development documentation',
			version: '0.0.0'
		},
		// servers: [
		// 	{
		// 		url: '/'
		// 	}
		// ],
		paths: {}
	}

	override async init() {
		this.log = logger.withScope('open-api', 2)

		if (!isTest) {
			try {
				this.log.start(`Parsing "package.json"`)
				const { version } = await Bun.file('package.json').json()
				this.log.success(`Parsed "package.json"!`)
				this.doc.info.version = version
			} catch {
				this.log.fail(`No "package.json" found`)
			} finally {
				this.log.info(`Using version "${this.doc.info.version}"`)
			}
		}

		// const { origin } = this.ast
		// this.doc.servers!.push({
		// 	url: `${origin.protocol}://${origin.hostname}:${origin.port}`,
		// 	description: 'Development Server'
		// })
	}

	override async write() {
		await super.write()
		return JSON.stringify(this.doc, null, '\t')
	}

	override writeRoute(
		args: { pathname: string; method: string; pathAccess: string },
		route: ast.TypeObject
	) {
		const { pathname, method } = args
		const { params, query, headers, cookie, body, response } = route.entries

		if (!ALLOWED_METHODS.includes(method.toUpperCase())) {
			return
		}

		const openApiPath = pathname
			.split('/')
			.map((part) => {
				if (part.startsWith(':')) {
					part = `{${part.substring(1)}}`
				}
				return part
			})
			.join('/')

		if (!this.doc.paths[openApiPath]) {
			this.doc.paths[openApiPath] = {}
		}
		if (!this.doc.paths[openApiPath][method as OpenAPIV3.HttpMethods]) {
			this.doc.paths[openApiPath][method as OpenAPIV3.HttpMethods] = {
				parameters: [],
				responses: {}
			}
		}

		const routeAPI =
			this.doc.paths[openApiPath][method as OpenAPIV3.HttpMethods]!

		if (ast.isType(params) && ast.isObject(params)) {
			routeAPI.parameters!.push(
				...Object.entries(params.entries).map(([name, value]) => ({
					in: 'path',
					name,
					required: true,
					schema: this.toOpenApiSchema(value)
				}))
			)
		}

		if (ast.isType(query) && ast.isObject(query)) {
			routeAPI.parameters!.push(
				...Object.entries(query.entries).map(([name, value]) => ({
					in: 'query',
					name,
					schema: this.toOpenApiSchema(value)
				}))
			)
		}

		if (ast.isType(headers) && ast.isObject(headers)) {
			routeAPI.parameters!.push(
				...Object.entries(headers.entries).map(([name, value]) => ({
					in: 'header',
					name,
					schema: this.toOpenApiSchema(value)
				}))
			)
		}

		//! `cookie` isn't exposed by elysia types yet...
		// if (ast.isType(cookie) && ast.isObject(cookie)) {
		// 	routeAPI.parameters!.push(
		// 		...Object.entries(cookie.entries).map(([name, value]) => ({
		// 			in: 'cookie',
		// 			name,
		// 			schema: toOpenApiSchema(value)
		// 		}))
		// 	)
		// }

		if (
			typeof body !== 'undefined' &&
			!NOT_ALLOWED_BODY_METHODS.includes(method.toUpperCase())
		) {
			routeAPI.requestBody = {
				content: this.toOpenApiContent(body),
				required: true
			}
		}

		if (ast.isType(response) && ast.isObject(response)) {
			routeAPI.responses = Object.entries(
				response.entries
			).reduce<OpenAPIV3.ResponsesObject>((result, [status, value]) => {
				result[status] = {
					description: status,
					content: this.toOpenApiContent(value)
				}
				return result
			}, {})
		}
	}

	protected toOpenApiSchema(value: ast.TypeValue): OpenAPIV3.SchemaObject {
		if (ast.isType(value)) {
			if (ast.isObject(value)) {
				return {
					type: 'object',
					properties: Object.entries(value.entries).reduce<{
						[name: string]: OpenAPIV3.SchemaObject
					}>((result, [name, value]) => {
						result[name] = this.toOpenApiSchema(value)
						return result
					}, {})
				}
			} else if (ast.isArray(value)) {
				return {
					type: 'array',
					items: this.toOpenApiSchema(value.entry)
				}
			} else if (ast.isString(value)) {
				return {
					type: 'string'
				}
			} else if (ast.isNumber(value)) {
				return {
					type: 'number'
				}
			} else if (ast.isBoolean(value)) {
				return {
					type: 'boolean'
				}
			} else if (ast.isUnion(value)) {
				return {
					oneOf: value.types.map((type) => this.toOpenApiSchema(type))
				}
			} else if (
				ast.isNull(value) ||
				ast.isUndefined(value) ||
				ast.isNever(value) ||
				ast.isVoid(value) ||
				ast.isUnknown(value) // ? unknown
			) {
				return {
					nullable: true
				}
			} else if (ast.isFile(value)) {
				return {
					type: 'string',
					format: 'binary'
				}
			}
		} else if (ast.isStringLiteral(value)) {
			return {
				type: 'string'
			}
		} else if (ast.isNumberLiteral(value)) {
			return {
				type: 'number'
			}
		} else if (ast.isBooleanLiteral(value)) {
			return {
				type: 'boolean'
			}
		}

		this.log.warn(
			`Unsupported toOpenApiSchema "${JSON.stringify(value, null, ' ')}"`
		)

		return {}
	}

	protected toOpenApiContent(value: ast.TypeValue): MediaObjectMap {
		const result: MediaObjectMap = {}
		const types: ast.TypeValue[] = []

		if (ast.isType(value) && ast.isUnion(value)) {
			const objectsUnion: ast.TypeValue[] = []
			const stringyUnions: ast.TypeValue[] = []

			for (const type of value.types) {
				if (ast.isType(type)) {
					if (ast.isObject(type)) {
						objectsUnion.push(type)
					} else if (
						ast.isBoolean(type) ||
						ast.isString(type) ||
						ast.isNumber(type) ||
						ast.isLiteral(type)
					) {
						stringyUnions.push(type)
					}
				}
			}

			switch (objectsUnion.length) {
				case 0:
					break
				case 1:
					types.push(objectsUnion[0])
					break
				default:
					types.push({
						$type: 'union',
						types: objectsUnion,
						text: ''
					})
					break
			}

			switch (stringyUnions.length) {
				case 0:
					break
				case 1:
					types.push(stringyUnions[0])
					break
				default:
					types.push({
						$type: 'union',
						types: stringyUnions,
						text: ''
					})
					break
			}
		} else {
			types.push(value)
		}

		for (const type of types) {
			const content = this.toOpenApiMediaTypeObject(type)

			if (content.media) {
				result[content.media] = content.object
			}
		}

		return result
	}

	protected toOpenApiMediaTypeObject(value: ast.TypeValue): {
		media: string
		object: OpenAPIV3.MediaTypeObject
	} {
		const schema = this.toOpenApiSchema(value)
		let media = ''

		const { type, format, properties } = schema as OpenAPIV3.SchemaObject

		switch (type) {
			case 'array':
			case 'object':
				media = MEDIA_TYPE.json

				if (properties) {
					if (
						// contains any file?
						(Object.values(properties) as OpenAPIV3.SchemaObject[]).findIndex(
							({ type, format }) => type === 'string' && format === 'binary'
						) !== -1
					) {
						media = MEDIA_TYPE.multipart
					}
				}

				break
			case 'boolean':
			case 'number':
			case 'string':
				media = format === 'binary' ? MEDIA_TYPE.binary : MEDIA_TYPE.text
				break
			default:
				if (typeof type !== 'undefined') {
					this.log.warn(
						`Unsupported SchemaObject.type "${
							(schema as OpenAPIV3.SchemaObject).type
						}": ${JSON.stringify(value, null, ' ')}`
					)
				}
		}

		if (schema.oneOf) {
			const anyObject = schema.oneOf.some(
				(value) => (value as OpenAPIV3.SchemaObject).type === 'object'
			)
			media = anyObject ? MEDIA_TYPE.json : MEDIA_TYPE.text
		}

		return { media, object: { schema } }
	}
}

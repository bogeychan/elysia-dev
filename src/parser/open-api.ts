import type { OpenAPIV3 } from 'openapi-types'
import type { Parse } from '.'
import type { BaseParseOptions } from '../types'
import * as logger from '../logger'
import * as ast from '../ast'

export type Options = BaseParseOptions<'open-api'>

export const parse: Parse<Options> = async (entrypoint, _options) => {
	const log = logger.withScope('open-api', 2)
	let json: OpenAPIV3.Document

	try {
		log.start(`Loading json`)
		json = await Bun.file(entrypoint).json()
		log.success(`Loaded json!`)
	} catch {
		log.fail(`Failed to load json`)
		return
	}

	const elysiaRoutes: ast.TypeObject = {
		$type: 'object',
		entries: {},
		text: ''
	}

	for (const pathname in json.paths) {
		let path = pathname
			.split('/')
			.map((part) => {
				if (part.startsWith('{') && part.endsWith('}')) {
					return `:${part.substring(1, part.length - 1)}`
				}
				return part
			})
			.join('/')
		path = path === '/' ? 'index' : path

		if (path.startsWith('/')) {
			path = path.substring(1)
		}

		const elysiaMethod: ast.TypeObject = {
			$type: 'object',
			entries: {},
			text: ''
		}

		for (const methodName in json.paths[pathname]) {
			const route = json.paths[pathname][methodName as OpenAPIV3.HttpMethods]!
			const elysiaRoute: ast.TypeObject = {
				$type: 'object',
				entries: {},
				text: ''
			}

			extractParameters(elysiaRoute, route.parameters)

			elysiaRoute.entries['body'] = bodyToType(route.requestBody)
			elysiaRoute.entries['response'] = responseToType(route.responses)

			elysiaMethod.entries[methodName] = elysiaRoute
		}

		elysiaRoutes.entries[path] = elysiaMethod
	}

	return {
		exportName: '',
		origin: {
			protocol: 'http',
			hostname: 'localhost',
			port: 80
		},
		type: { routes: elysiaRoutes }
	}
}

function bodyToType(
	body?: OpenAPIV3.RequestBodyObject | OpenAPIV3.ReferenceObject
): ast.TypeValue {
	if (!body || (body as OpenAPIV3.ReferenceObject).$ref) {
		return { $type: 'unknown' }
	}
	return contentToType((body as OpenAPIV3.RequestBodyObject).content)
}

function contentToType(content?: {
	[media: string]: OpenAPIV3.MediaTypeObject
}): ast.TypeValue {
	if (!content) {
		return {
			$type: 'unknown'
		}
	}

	const contents = Object.values(content)

	if (contents.length === 1) {
		return schemaToType(contents[0].schema)
	}

	return contents.reduce<ast.TypeUnion>(
		(result, content) => {
			const type = schemaToType(content.schema)

			if (ast.isType(type) && ast.isUnion(type)) {
				result.types.push(...type.types)
			} else {
				result.types.push(type)
			}
			return result
		},
		{
			$type: 'union',
			types: [],
			text: ''
		}
	)
}

function responseToType(responses?: OpenAPIV3.ResponsesObject): ast.TypeValue {
	if (!responses) {
		return {
			$type: 'unknown'
		}
	}

	const elysiaResponse: ast.TypeObject = {
		$type: 'object',
		entries: {},
		text: ''
	}

	for (const status in responses) {
		const response = responses[status]
		if ((response as OpenAPIV3.ReferenceObject).$ref) {
			continue
		}

		const resp = response as OpenAPIV3.ResponseObject
		if (!resp.content) {
			continue
		}

		elysiaResponse.entries[status] = contentToType(resp.content)
	}

	makeObjectUnknown(elysiaResponse)
	return elysiaResponse
}

function extractParameters(
	route: ast.TypeObject,
	parameters?: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[]
) {
	if (!parameters) {
		return
	}

	const params: ast.TypeObject = (route.entries['params'] = {
		$type: 'object',
		entries: {},
		text: ''
	})
	const query: ast.TypeObject = (route.entries['query'] = {
		$type: 'object',
		entries: {},
		text: ''
	})
	const headers: ast.TypeObject = (route.entries['headers'] = {
		$type: 'object',
		entries: {},
		text: ''
	})
	const cookie: ast.TypeObject = (route.entries['cookie'] = {
		$type: 'object',
		entries: {},
		text: ''
	})

	for (const parameter of parameters) {
		if ((parameter as OpenAPIV3.ReferenceObject).$ref) {
			continue
		}

		const param = parameter as OpenAPIV3.ParameterObject

		switch (param.in) {
			case 'path':
				params.entries[param.name] = schemaToType(param.schema)
				break
			case 'query':
				query.entries[param.name] = schemaToType(param.schema)
				break
			case 'header':
				headers.entries[param.name] = schemaToType(param.schema)
				break
			case 'cookie':
				cookie.entries[param.name] = schemaToType(param.schema)
				break
		}
	}

	makeObjectUnknown(params)
	makeObjectUnknown(query)
	makeObjectUnknown(headers)
	makeObjectUnknown(cookie)
}

function makeObjectUnknown(obj: ast.TypeObject) {
	if (Object.keys(obj.entries).length !== 0) {
		return
	}

	type ObjectToUnknown = Partial<Omit<ast.TypeObject, '$type'>> &
		ast.TypeUnknown

	const unknownObj = obj as unknown as ObjectToUnknown

	unknownObj.$type = 'unknown'
	delete unknownObj.entries
	delete unknownObj.text
}

function schemaToType(
	schema?: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
): ast.TypeValue {
	if (!schema || (schema as OpenAPIV3.ReferenceObject).$ref) {
		return {
			$type: 'unknown'
		}
	}

	const schemaObj = schema as OpenAPIV3.SchemaObject

	switch (schemaObj.type) {
		case 'boolean':
			return {
				$type: 'boolean'
			}
		case 'number':
		case 'integer':
			return {
				$type: 'number'
			}
		case 'string':
			return {
				$type: 'string'
			}
		case 'object':
			return {
				$type: 'string'
			}
		case 'array':
			return {
				$type: 'array',
				entry: schemaToType(schemaObj.items)
			}
		case 'object':
			const obj: ast.TypeObject = {
				$type: 'object',
				entries: {},
				text: ''
			}
			if (schemaObj.properties) {
				for (const [name, value] of Object.entries(schemaObj.properties)) {
					obj.entries[name] = schemaToType(value)
				}
			}
			return obj
		default:
			if (schemaObj.oneOf) {
				return {
					$type: 'union',
					types: schemaObj.oneOf.map((schema) => schemaToType(schema)),
					text: ''
				}
			}
			break
	}

	return {
		$type: 'unknown'
	}
}

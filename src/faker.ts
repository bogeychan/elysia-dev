import { faker } from '@faker-js/faker'
import * as ast from './ast'
import * as logger from './logger'
import { isTest } from './utils'

function fakeTypeObject(value: ast.TypeObject) {
	const result: Record<string, any> = {}
	for (const name in value.entries) {
		result[name] = fakeTypeValue(value.entries[name], name)
	}
	return result
}

function fakeTypeString(name?: string): string {
	if (isTest) {
		return '##TEST##'
	}

	if (name) {
		const nameLower = name.toLocaleLowerCase()

		if (nameLower.includes('name')) {
			return faker.person.fullName()
		} else if (nameLower.includes('uuid')) {
			return faker.string.uuid()
		}
	}

	return faker.word.words()
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function fakeTypeNumber(_name?: string): number {
	if (isTest) {
		return 42
	}

	return faker.number.int({ min: 1, max: 100 })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function fakeTypeBoolean(_name?: string): boolean {
	if (isTest) {
		return true
	}

	return faker.datatype.boolean()
}

export function fakeTypeValue(value: ast.TypeValue, name?: string) {
	if (ast.isType(value)) {
		if (ast.isObject(value)) {
			return fakeTypeObject(value)
		} else if (ast.isString(value)) {
			return fakeTypeString(name)
		} else if (ast.isNumber(value)) {
			return fakeTypeNumber(name)
		} else if (ast.isBoolean(value)) {
			return fakeTypeBoolean(name)
		}
	} else if (ast.isLiteral(value)) {
		return value
	} else {
		const log = logger.withScope('faker', 2)
		log.warn(`Unsupported type value: "${JSON.stringify(value, null, ' ')}"`)
	}
}

export function fakeTypeValueShort(value: ast.TypeValue, name?: string) {
	if (ast.isType(value)) {
		if (ast.isString(value)) {
			if (isTest) {
				return '##TEST##'
			}

			return faker.word.sample()
		} else if (ast.isNumber(value)) {
			return fakeTypeNumber(name)
		} else if (ast.isBoolean(value)) {
			return fakeTypeBoolean(name)
		}
	}

	return fakeTypeValue(value, name)
}

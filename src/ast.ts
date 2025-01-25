import type { UnionOfPossibleTuples } from './types'

export function isStringLiteral(value: TypeValue): value is string {
	return typeof value === 'string'
}
export function isNumberLiteral(value: TypeValue): value is number {
	return typeof value === 'number'
}
export function isBooleanLiteral(value: TypeValue): value is boolean {
	return typeof value === 'boolean'
}
export function isLiteral(
	value: TypeValue
): value is string | number | boolean {
	return (
		isStringLiteral(value) || isNumberLiteral(value) || isBooleanLiteral(value)
	)
}
export function isType(value: TypeValue): value is Type {
	return typeof value === 'object' && typeof value.$type !== 'undefined'
}

export function isObject(value: Type): value is TypeObject {
	return value.$type === 'object'
}
export function isArray(value: Type): value is TypeArray {
	return value.$type === 'array'
}
export function isString(value: Type): value is TypeString {
	return value.$type === 'string'
}
export function isNumber(value: Type): value is TypeNumber {
	return value.$type === 'number'
}
export function isBoolean(value: Type): value is TypeBoolean {
	return value.$type === 'boolean'
}
export function isUnion(value: Type): value is TypeUnion {
	return value.$type === 'union'
}
export function isVoid(value: Type): value is TypeVoid {
	return value.$type === 'void'
}
export function isNull(value: Type): value is TypeNull {
	return value.$type === 'null'
}
export function isUnknown(value: Type): value is TypeUnknown {
	return value.$type === 'unknown'
}
export function isUndefined(value: Type): value is TypeUndefined {
	return value.$type === 'undefined'
}
export function isNever(value: Type): value is TypeNever {
	return value.$type === 'never'
}
export function isIntersection(value: Type): value is TypeIntersection {
	return value.$type === 'intersection'
}

type RouteEntries =
	| 'body'
	| 'params'
	| 'query'
	| 'headers'
	| 'response'
	| 'cookie'
const ROUTE_ENTRIES: UnionOfPossibleTuples<RouteEntries> = [
	'body',
	'params',
	'query',
	'headers',
	'response',
	'cookie'
]
export function isRoute(value: TypeObject): value is TypeObject<RouteEntries> {
	const keys = Object.keys(value.entries)
	return (
		(keys.length === ROUTE_ENTRIES.length ||
			// some routes may not contain "cookie"
			keys.length === ROUTE_ENTRIES.length - 1) &&
		keys.every((key) => (ROUTE_ENTRIES as string[]).includes(key))
	)
}

// types

export type Type =
	| TypeObject
	| TypeString
	| TypeUnknown
	| TypeNumber
	| TypeAny
	| TypeBoolean
	| TypeIntersection
	| TypeUnion
	| TypeVoid
	| TypeNull
	| TypeUndefined
	| TypeNever
	| TypeArray

export type TypeString = {
	$type: 'string'
}
export type TypeUnknown = {
	$type: 'unknown'
}
export type TypeNumber = {
	$type: 'number'
}
export type TypeAny = {
	$type: 'any'
}
export type TypeVoid = {
	$type: 'void'
}
export type TypeNull = {
	$type: 'null'
}
export type TypeUndefined = {
	$type: 'undefined'
}
export type TypeNever = {
	$type: 'never'
}
export type TypeBoolean = {
	$type: 'boolean'
}
export type TypeIntersection = {
	$type: 'intersection'
	text: string
	types: TypeValue[]
}
export type TypeUnion = {
	$type: 'union'
	text: string
	types: TypeValue[]
}

export type TypeObject<E extends string = string> = {
	$type: 'object'
	text: string
	entries: Record<E, TypeValue>
}

export type TypeArray = {
	$type: 'array'
	entry: TypeValue
}

export type TypeValue = Type | string | number | boolean | undefined

export type ElysiaType = {
	routes: TypeObject
}

export type AST = {
	exportName: string
	type: ElysiaType
	origin: {
		protocol: 'http' | 'https' | (string & {})
		hostname: 'localhost' | (string & {})
		port: number
	}
}

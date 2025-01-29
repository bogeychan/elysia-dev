import path from 'node:path'
import type { MaybePromise } from 'elysia'

import type { AST } from './ast'

import * as parser from './parser'
import * as writer from './writer'

import { parsers } from './parser'
import { writers } from './writer'

import * as logger from './logger'

export const supported = {
	parsers,
	writers,
	levels: logger.levels
}

export type Options = {
	entrypoint: string
	outFile: string
	parse: parser.Options
	write: writer.Options
	logging?: logger.Options
}

function makeImportRelative(entrypoint: string, outFilePath: string) {
	let relativeImport = path.relative(path.dirname(outFilePath), entrypoint)

	if (!relativeImport.startsWith('.')) {
		relativeImport = `./${relativeImport}`
	}

	const lastIndexOfDot = relativeImport.lastIndexOf('.')
	if (lastIndexOfDot !== -1) {
		relativeImport = relativeImport.substring(0, lastIndexOfDot)
	}

	return relativeImport
}

export function gen({
	entrypoint,
	parse,
	write,
	outFile,
	logging
}: Options): MaybePromise<void> {
	if (logging) {
		logger.configure(logging)
	}

	const log = logger.instance()
	log.info(`Using log level "${logging?.level ?? 'info'}"`)

	try {
		if (parse.$watch === true) {
			return parser.watch(entrypoint, parse, handleParse)
		} else {
			return parser.parse(entrypoint, parse).then(handleParse)
		}
	} catch (error) {
		log.error(error)
	}

	async function handleParse(ast?: AST) {
		try {
			if (!ast) {
				return log.error(
					'No AST available after parsing. Make sure to `export` your main elysia instance!'
				)
			}
			const outFilePath = path.resolve(outFile)
			const relativeImport = makeImportRelative(entrypoint, outFilePath)

			const content = await writer.write(ast, write, relativeImport)

			log.info(`Using output file "${outFilePath}"`)
			log.start(`Writing generated content to file...`)

			await Bun.write(outFilePath, content)

			log.success(`File written!`)
		} catch (error) {
			log.error(error)
		}
	}
}

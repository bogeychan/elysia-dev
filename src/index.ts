import path from 'node:path'
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

export async function gen({
	entrypoint,
	parse,
	write,
	outFile,
	logging
}: Options) {
	if (logging) {
		logger.configure(logging)
	}

	const log = logger.instance()
	log.info(`Using log level "${logging?.level ?? 'info'}"`)

	try {
		const elysiaAST = await parser.parse(entrypoint, parse)
		if (!elysiaAST) {
			return log.error(
				'No AST available after parsing. Make sure to `export` your main elysia instance!'
			)
		}

		const outFilePath = path.resolve(outFile)
		const relativeImport = makeImportRelative(entrypoint, outFilePath)

		const content = await writer.write(elysiaAST, write, relativeImport)

		log.info(`Using output file "${outFilePath}"`)
		log.start(`Writing generated content to file...`)

		await Bun.write(outFilePath, content)

		log.success(`File written!`)
	} catch (error) {
		log.error(error)
	}
}

#!/usr/bin/env bun

import { argv } from 'bun'
import { program } from 'commander'
import { version, bin } from '../package.json'
// @ts-ignore
import { gen, supported } from '../dist/index'

// ./bin/index.ts gen ./examples/app.ts --writer=treaty

program
	.name(Object.keys(bin)[0])
	.description('CLI to some elysia development utilities')
	.version(version)

program
	.command('gen')
	.argument('<entrypoint>', 'file path')
	.requiredOption(
		`--parser <${supported.parsers.join(' | ')}>`,
		'parser',
		'typescript'
	)
	.requiredOption(`--writer <${supported.writers.join(' | ')}>`, 'writer')
	.option('--watch', 'automatically restart parsing on file change')
	.option('--outfile <string>', 'output file (test.test.ts, request.http, ...)')
	.option(`--loglevel [${supported.levels.join(' | ')}]`, 'log level', 'info')
	.action(async function (
		entrypoint,
		{ parser, watch, outfile: outFile, writer, loglevel: logLevel }
	) {
		if (!supported.parsers.includes(parser)) {
			return program.error(`Unsupported parser "${parser}"`)
		}

		if (!supported.writers.includes(writer)) {
			return program.error(`Unsupported writer "${writer}"`)
		}

		if (!supported.levels.includes(logLevel)) {
			return program.error(`Unsupported log level "${logLevel}"`)
		}

		if (!outFile) {
			switch (writer) {
				case 'treaty':
					outFile = './test.test.ts'
					break
				case 'rest':
					outFile = './request.http'
					break
				case 'open-api':
					outFile = './open-api.json'
					break
				default:
					return program.error(
						`No default --outfile for writer "${writer}" found`
					)
			}
		}

		await gen({
			entrypoint,
			parse: {
				$type: parser
			},
			write: {
				$type: writer
			},
			outFile,
			logging: { level: logLevel },
			watch: watch as boolean
		})
	})

program.showHelpAfterError().parse(argv)

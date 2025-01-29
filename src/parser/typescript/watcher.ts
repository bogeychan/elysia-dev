import ts from 'typescript'
import path from 'node:path'
import { parseAST } from './parser'
import type { Options } from './types'
import { init } from './base'
import type { ParseWatch } from '..'

export const watch: ParseWatch<Options> = (entrypoint, options, cb) => {
	const { log } = init(options)

	const formatHost: ts.FormatDiagnosticsHost = {
		getCanonicalFileName: (path) => path,
		getCurrentDirectory: ts.sys.getCurrentDirectory,
		getNewLine: () => ts.sys.newLine
	}

	const configPath = ts.findConfigFile(
		path.dirname(entrypoint),
		ts.sys.fileExists
		// 'tsconfig.json'
	)

	if (!configPath) {
		log.fail("Could not find a valid 'tsconfig.json'.")
		return
	}

	const createProgram = ts.createSemanticDiagnosticsBuilderProgram

	const host = ts.createWatchCompilerHost(
		configPath,
		options,
		ts.sys,
		createProgram,
		reportDiagnostic,
		reportWatchStatusChanged
	)

	const originalCreateProgram = host.createProgram
	host.createProgram = function () {
		const buildProgram = originalCreateProgram.apply(
			host,
			// @ts-ignore
			arguments
		)

		cb(parseAST(buildProgram.getProgram(), entrypoint, log))

		return buildProgram
	}

	const watcher = ts.createWatchProgram(host)

	process.on('SIGINT', () => {
		watcher.close()
		process.exit(0)
	})

	function reportDiagnostic(diagnostic: ts.Diagnostic) {
		log.error(ts.formatDiagnostic(diagnostic, formatHost))
	}

	function reportWatchStatusChanged(diagnostic: ts.Diagnostic) {
		log.info(ts.formatDiagnostic(diagnostic, formatHost))
	}
}

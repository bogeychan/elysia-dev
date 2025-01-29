import type { Options } from './types'
import * as logger from '../../logger'

// TODO: ref class
export function init(options: Options) {
	options.strict ||= true

	return {
		log: logger.withScope('typescript', 2)
	}
}

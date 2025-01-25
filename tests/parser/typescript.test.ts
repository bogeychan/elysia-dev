import { describe, expect, it } from 'bun:test'
import * as parser from '../../src/parser'

import { files } from '../utils'

describe('TypeScript-Parser', () => {
	it.each(files)(
		'parsing %s should match snapshot',
		async (_name, entrypoint) => {
			expect(
				await parser.parse(entrypoint, { $type: 'typescript' })
			).toMatchSnapshot()
		}
	)
})

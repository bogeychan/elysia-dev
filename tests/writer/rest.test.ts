import { describe, expect, it } from 'bun:test'
import { parse } from '../../src/parser'
import { write } from '../../src/writer'

import { files } from '../utils'

describe('Rest-Writer', () => {
	it.each(files)(
		'writing %s should match snapshot',
		async (_name, entrypoint) => {
			const elysiaAST = await parse(entrypoint, { $type: 'typescript' })
			expect(elysiaAST).toBeDefined()
			expect(
				await write(elysiaAST!, { $type: 'rest' }, './whelp')
			).toMatchSnapshot()
		}
	)
})

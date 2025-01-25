import { describe, expect, it } from 'bun:test'
import * as parser from '../../src/parser'

import { openApiFiles } from '../utils'

describe('OpenAPI-Parser', () => {
	it.each(openApiFiles)(
		'parsing %s should match snapshot',
		async (_name, entrypoint) => {
			expect(
				await parser.parse(entrypoint, { $type: 'open-api' })
			).toMatchSnapshot()
		}
	)
})

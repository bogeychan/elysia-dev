import { Elysia, t } from 'elysia'

export const server = new Elysia()
	.get('/:param', () => '' as string | number, {
		headers: t.Object({
			head: t.String()
		}),
		cookie: t.Object({
			cookie: t.String()
		}),
		query: t.Object({ query: t.String() }),
		params: t.Object({
			param: t.Union([t.String(), t.Number()])
		}),
		response: {
			200: t.Union([t.String(), t.Number()]),
			400: t.Array(t.String())
		}
	})
	.listen(8080)

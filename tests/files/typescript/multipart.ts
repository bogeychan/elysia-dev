import { Elysia, t } from 'elysia'

export const server = new Elysia()
	.post('/upload', () => {}, {
		body: t.Object({
			file: t.File({ type: 'application/json' }),
			text: t.String()
		})
	})
	.listen(8080)

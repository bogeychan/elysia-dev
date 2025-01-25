import { Elysia, t } from 'elysia'

export const app = new Elysia()
	.model(
		'user',
		t.Object({
			name: t.String(),
			age: t.Number()
		})
	)
	.post('/', () => '', { body: 'user' })
	.listen(8080)

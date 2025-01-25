import { Elysia, t } from 'elysia'

let model

if (process.env.NODE_ENV === 'production') {
	model = t.Object({
		name: t.String(),
		age: t.Number()
	})
} else {
	model = t.String()
}

export const app = new Elysia()
	.model('model', model)
	.post('/', () => '', { body: 'model' })
	.listen(8080)

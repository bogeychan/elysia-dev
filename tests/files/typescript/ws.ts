import { Elysia } from 'elysia'

export const app = new Elysia()
	.ws('/ws', {
		open() {}
	})
	.get('/', () => 'yay')

if (process.env.NODE_ENV !== 'test') {
	app.listen(8080)
}

import { Elysia } from 'elysia'

export const server = new Elysia().get('/', () => '').listen(8080)

if (process.env.NODE_ENV !== 'test') {
	server.listen(8080)
}

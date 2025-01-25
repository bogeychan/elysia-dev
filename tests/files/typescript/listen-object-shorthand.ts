import { Elysia } from 'elysia'

export const server = new Elysia().get('/', () => '').listen(8080)

if (process.env.NODE_ENV !== 'test') {
	const tls = {}

	server.listen({
		hostname: '127.0.0.1',
		port: 5000,
		tls
	})
}

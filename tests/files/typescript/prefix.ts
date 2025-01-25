import { Elysia } from 'elysia'

export const app = new Elysia({ prefix: '/prefix' })
	.get('/', () => '')
	.listen(8080)

import { Elysia } from 'elysia'

export const server = new Elysia()
	.get('/yay/:id', ({ params: { id } }) => `yay: ${id}`)
	.get('/whelp/:id/:name', ({ params: { id, name } }) => `yay: ${id} ${name}`)
	.listen(8080)

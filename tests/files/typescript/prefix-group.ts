import { Elysia } from 'elysia'

export const server = new Elysia({ prefix: '/prefix' })
	.get('/prefix-route', () => {})
	.group('/prefix-group', (app) =>
		app.group('/inner-group', (app) => app.get('/inner-route', () => ''))
	)

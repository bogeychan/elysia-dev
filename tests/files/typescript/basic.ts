import { Elysia } from 'elysia'

export const server = new Elysia().get('/', () => '').listen(8080)

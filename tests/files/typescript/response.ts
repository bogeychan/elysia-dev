import { Elysia } from 'elysia'

export const server = new Elysia().get('/', () => new Response('')).listen(8080)

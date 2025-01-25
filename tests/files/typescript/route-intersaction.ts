import { Elysia } from 'elysia'

export const server = new Elysia().get('/', () => 'string').post('/', () => 42)

import { Elysia } from 'elysia'

const plugin = new Elysia({ name: 'plugin' }).get('/', () => '')

export const app = new Elysia().use(plugin).listen(8080)

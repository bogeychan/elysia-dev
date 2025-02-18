# Migration Guide

## v0.1.1 to v0.2

### The `watch` option moved

Use:

```ts
import { gen } from 'elysia-dev'

await gen({
	entrypoint: './app.ts',
	parse: {
		$type: 'typescript'
	},
	outFile: './open-api.json',
	write: {
		$type: 'open-api'
	},
	watch: true // <---
})
```

Instead of:

```ts
import { gen } from 'elysia-dev'

await gen({
	entrypoint: './app.ts',
	parse: {
		$type: 'typescript',
		$watch: true // <---
	},
	outFile: './open-api.json',
	write: {
		$type: 'open-api'
	}
})
```

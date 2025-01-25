import path from 'node:path'
import { Elysia, t } from 'elysia'

export const app = new Elysia()
	.model(
		'user',
		t.Object({
			name: t.String(),
			age: t.Number()
		})
	)
	.get('/', () => 'yay')
	.post('/user', ({ body }) => body, { body: 'user' })

// below routes are excluded from open-api.json due to `export` above

app
	.get('/json', () => Bun.file(path.join(__dirname, 'out', 'open-api.json')))
	.get('/swagger', ({ set }) => {
		set.headers['content-type'] = 'text/html'
		return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="SwaggerUI" />
  <title>SwaggerUI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
<script>
  window.onload = () => {
    window.ui = SwaggerUIBundle({
      url: '/json',
      dom_id: '#swagger-ui',
    });
  };
</script>
</body>
</html>`
	})

if (process.env.NODE_ENV !== 'test') {
	app.listen(3000)
	console.log(`View docs at ${app.server!.url}swagger`)
}

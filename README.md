# elysia-dev

## Collection of development tools for [Elysia.js](https://elysiajs.com)

With Bun:

```bash
bunx elysia-dev@exp --help
```

> [!TIP]
> Use `--loglevel=silent | error | warning` flag to disable logs

> [!CAUTION]
> This is EXPERIMENTAL software. The CLI / API may change!
> You have to use `@exp` tag to get latest updates atm!

## Usage

```ts
// app.ts
import { Elysia, t } from "elysia";

// make sure to export the main instance (variable name doesn't matter)
export const app = new Elysia()
  .model(
    "user",
    t.Object({
      name: t.String(),
      age: t.Number(),
    })
  )
  .get("/", () => "yay")
  .post("/", () => "", { body: "user" });

if (process.env.NODE_ENV !== "test") {
  // we don't need to call `listen` within `bun test`
  app.listen(8080);
}
```

### Generate [Eden Treaty](https://elysiajs.com/eden/treaty/overview.html#eden-treaty) test file

```bash
bunx elysia-dev gen ./app.ts --writer=treaty --outfile=./test.test.ts
```

<details>

<summary>Click to view result</summary>

```ts
import { describe, it, expect } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "./app";

await app.modules;

const api = treaty(app);

describe("Elysia", () => {
  it('GET - / - Response: { 200: string; }"', async () => {
    const { data, error } = await api.index.get();
    expect(error).toBeNull();
    expect(data).toBeTypeOf("string");
  });

  it('POST - /user - Request: { name: string; age: number; } - Response: { 200: string; }"', async () => {
    const { data, error } = await api.user.post({
      name: "Bogeychan",
      age: 42,
    });
    expect(error).toBeNull();
    expect(data).toBeTypeOf("string");
  });
});
```

</details>

### Generate [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) requests file

```bash
bunx elysia-dev gen ./app.ts --writer=rest --outfile=./request.http
```

<details>

<summary>Click to view result</summary>

```
@protocol = http
@hostname = localhost
@port     = 8080
@origin   = {{protocol}}://{{hostname}}:{{port}}

###

# index
GET {{origin}}/ HTTP/1.1

###

# user - { name: string; age: number; }
POST {{origin}}/user HTTP/1.1
Content-Type: application/json

{
  "name": "Bogeychan",
  "age": 42
}

###
```

</details>

### Generate [OpenAPI](https://swagger.io/specification/) definition file

```bash
bunx elysia-dev gen ./app.ts --writer=open-api --outfile=./open-api.json
```

<details>

<summary>Click to view result</summary>

```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "Elysia Documentation",
    "description": "Development documentation",
    "version": "0.0.0"
  },
  "paths": {
    "/": {
      "post": {
        "responses": {
          "200": {
            "description": "200",
            "content": {
              "text/plain": {
                "schema": {
                  "type": "string"
                }
              }
            }
          }
        },
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "age": {
                    "type": "number"
                  }
                }
              }
            }
          },
          "required": true
        }
      },
      "get": {
        "responses": {
          "200": {
            "description": "200",
            "content": {
              "text/plain": {
                "schema": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

</details>

<details>

<summary>Click to see how to integrate the generated definition into Elysia</summary>

Based on [Swagger UI docs](https://github.com/swagger-api/swagger-ui/blob/HEAD/docs/usage/installation.md#unpkg)

```ts
new Elysia()
  .get("/json", () => Bun.file(path.join(__dirname, "./open-api.json")))
  .get("/swagger", ({ set }) => {
    set.headers["content-type"] = "text/html";
    const path = "/json";
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
      url: '${path}',
      dom_id: '#swagger-ui',
    });
  };
</script>
</body>
</html>`;
  });
```

</details>

## License

[MIT](LICENSE)

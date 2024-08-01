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

## License

[MIT](LICENSE)

import { categoriaRoutes } from "./src/categorias";
import { registroRoutes } from "./src/registros";

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 3000,
  routes: {
    "/": () => new Response("Bun!"),
    ...categoriaRoutes,
    ...registroRoutes,
  },
});

console.log(`Listening on ${server.url}`);

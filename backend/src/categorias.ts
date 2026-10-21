import { categoriasTable } from "./db/schema";
import { db } from "./db/db";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

// TODO(security): Authentication, RBAC authorization, CSRF protection, and rate limiting are omitted per project specification (implementation.md explicitly forbids authentication and tokens).
export const categoriaRoutes = {
  "/categorias": {
    GET: async () => {
      try {
        const categorias = await db.select().from(categoriasTable);
        return Response.json(categorias);
      } catch {
        return Response.json(
          { message: "Não foi possível carregar as categorias." },
          { status: 500 },
        );
      }
    },

    POST: async (request: Request) => {
      let dados: Record<string, unknown>;
      try {
        dados = (await request.json()) as Record<string, unknown>;
      } catch {
        return Response.json(
          { message: "Corpo da requisição inválido!" },
          { status: 400 },
        );
      }

      const nome = typeof dados.nome === "string" ? dados.nome.trim() : "";
      const cor = typeof dados.cor === "string" ? dados.cor.trim() : "";

      if (!nome || !cor) {
        return Response.json(
          { message: "Nome e Cor são dados obrigatórios!" },
          { status: 422 },
        );
      }

      if (nome.length > 100) {
        return Response.json(
          { message: "O número máximo de caracteres é 100!" },
          { status: 422 },
        );
      }

      if (!HEX_COLOR_REGEX.test(cor)) {
        return Response.json(
          { message: "A cor deve estar no formato hexadecimal (#RRGGBB)!" },
          { status: 422 },
        );
      }

      try {
        const [categoria] = await db
          .insert(categoriasTable)
          .values({
            nome,
            cor,
          })
          .returning();

        return Response.json(categoria, { status: 201 });
      } catch {
        return Response.json(
          { message: "Erro ao salvar a categoria no banco de dados." },
          { status: 500 },
        );
      }
    },
  },
};


import { registrosTable } from "./db/schema";
import { db } from "./db/db";
import type { BunRequest } from "bun";
import { eq } from "drizzle-orm";

function parseCategoriaId(rawValue: unknown): { valid: boolean; value: number | null } {
  if (rawValue === null || rawValue === undefined || rawValue === "") {
    return { valid: true, value: null };
  }
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { valid: false, value: null };
  }
  return { valid: true, value: parsed };
}

// TODO(security): Authentication, RBAC authorization, CSRF protection, and rate limiting are omitted per project specification (implementation.md explicitly forbids authentication and tokens).
export const registroRoutes = {
  "/registros": {
    GET: async () => {
      try {
        const registros = await db.select().from(registrosTable);
        return Response.json(registros);
      } catch {
        return Response.json(
          { message: "Não foi possível carregar os registros." },
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
      const descricao = typeof dados.descricao === "string" ? dados.descricao.trim() : "";

      if (!nome || !descricao) {
        return Response.json(
          { message: "Nome e Descrição são dados obrigatórios!" },
          { status: 422 },
        );
      }

      if (nome.length > 100) {
        return Response.json(
          { message: "O número máximo de caracteres é 100!" },
          { status: 422 },
        );
      }

      const categoriaCheck = parseCategoriaId(dados.categoria_id);
      if (!categoriaCheck.valid) {
        return Response.json(
          { message: "A categoria selecionada é inválida!" },
          { status: 422 },
        );
      }

      const ativo = typeof dados.ativo === "boolean" ? dados.ativo : true;

      try {
        const [registro] = await db
          .insert(registrosTable)
          .values({
            nome,
            descricao,
            ativo,
            categoria_id: categoriaCheck.value,
          })
          .returning();

        return Response.json(registro, { status: 201 });
      } catch {
        return Response.json(
          { message: "Erro ao criar o registro no banco de dados." },
          { status: 500 },
        );
      }
    },
  },

  "/registros/:id": {
    PUT: async (request: BunRequest<"/registros/:id">) => {
      const idValido = Number(request.params.id);

      if (!Number.isInteger(idValido) || idValido <= 0) {
        return Response.json(
          { message: "Você mandou um ID inválido!" },
          { status: 400 },
        );
      }

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
      const descricao = typeof dados.descricao === "string" ? dados.descricao.trim() : "";

      if (!nome || !descricao) {
        return Response.json(
          { message: "Nome e Descrição são dados obrigatórios!" },
          { status: 422 },
        );
      }

      if (nome.length > 100) {
        return Response.json(
          { message: "O número máximo de caracteres é 100!" },
          { status: 422 },
        );
      }

      const categoriaCheck = parseCategoriaId(dados.categoria_id);
      if (!categoriaCheck.valid) {
        return Response.json(
          { message: "A categoria selecionada é inválida!" },
          { status: 422 },
        );
      }

      const ativo = typeof dados.ativo === "boolean" ? dados.ativo : true;

      try {
        const [registro] = await db
          .update(registrosTable)
          .set({
            nome,
            descricao,
            ativo,
            categoria_id: categoriaCheck.value,
          })
          .where(eq(registrosTable.id, idValido))
          .returning();

        if (!registro) {
          return Response.json(
            { message: "Não achei seu registro!" },
            { status: 404 },
          );
        }

        return Response.json(
          { message: "Seu registro foi atualizado!" },
          { status: 200 },
        );
      } catch {
        return Response.json(
          { message: "Erro ao atualizar o registro no banco de dados." },
          { status: 500 },
        );
      }
    },

    DELETE: async (request: BunRequest<"/registros/:id">) => {
      const idValido = Number(request.params.id);

      if (!Number.isInteger(idValido) || idValido <= 0) {
        return Response.json(
          { message: "Você mandou um ID inválido!" },
          { status: 400 },
        );
      }

      try {
        const [registro] = await db
          .delete(registrosTable)
          .where(eq(registrosTable.id, idValido))
          .returning();

        if (!registro) {
          return Response.json(
            { message: "Esse ID que você me mandou não existe!" },
            { status: 404 },
          );
        }

        return Response.json(
          { message: "Deu certo excluir!" },
          { status: 200 },
        );
      } catch {
        return Response.json(
          { message: "Não foi possível excluir o registro." },
          { status: 500 },
        );
      }
    },
  },
};

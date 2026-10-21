import { boolean, integer, pgTable, serial, text, varchar } from "drizzle-orm/pg-core";

export const categoriasTable = pgTable("categorias", {
  id: serial().primaryKey().notNull(),
  nome: varchar({ length: 100 }).notNull(),
  cor: varchar({ length: 7 }).notNull()
});

export const registrosTable = pgTable("registros", {
  id: serial().primaryKey().notNull(),
  nome: varchar({ length: 100 }).notNull(),
  descricao: text().notNull(),
  categoria_id: integer("categoria_id").references(() => categoriasTable.id),
  ativo: boolean().notNull().default(true)
});

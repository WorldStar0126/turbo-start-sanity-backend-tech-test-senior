import { defineField, defineType } from "sanity";

export const pokemonLink = defineType({
  name: "pokemonLink",
  title: "Pokemon Link",
  type: "object",
  fields: [
    defineField({
      name: "name",
      type: "string",
      title: "Name",
    }),
    defineField({
      name: "id",
      type: "number",
      title: "Pokedex ID",
    }),
    defineField({
      name: "types",
      type: "array",
      title: "Types",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "sprite",
      type: "url",
      title: "Sprite URL",
    }),
  ],
});


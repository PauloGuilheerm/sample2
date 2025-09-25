import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const cityRouter = createTRPCRouter({
  autocomplete: publicProcedure
    .input(z.object({ text: z.string().min(1), limit: z.number().min(1).max(50).default(8) }))
    .query(async ({ ctx, input }) => {
      const term = input.text.trim();
      if (!term) return [];
      return ctx.db.city.findMany({
        where: { name: { contains: term } },
        select: { id: true, name: true, state: true, country: true, lat: true, lon: true, population: true, timezone: true, ibgeCode: true },
        orderBy: [{ name: "asc" }],
        take: input.limit,
      });
    }),
});

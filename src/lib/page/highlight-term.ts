import { z } from "zod";

export const HighlightTermSchema = z.object({
  term: z.string().min(1),
  normalizedTerm: z.string().min(1),
  aliases: z.array(z.string()).default([]),
});

export type HighlightTerm = z.infer<typeof HighlightTermSchema>;

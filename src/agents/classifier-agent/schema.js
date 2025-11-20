import { z } from "zod";

export const classifierAgentSchema = z.object({
    thoughts: z.array(z.string()),
    type: z.literal("classifier"),
    inScope: z.literal(true),
    content: z.object({
        agent: z.enum(["api", "sql"]), 
        confidence: z.number().min(0).max(1).optional(), 
    }),
});



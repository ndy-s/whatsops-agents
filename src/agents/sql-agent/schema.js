import { z } from "zod";

export const sqlActionSchema = z.object({
    thoughts: z.array(z.string()),
    type: z.literal("sql_action"),
    inScope: z.literal(true),               
    content: z.object({
        id: z.string(),
        query: z.string(),                    
        params: z.record(z.any()),             
    }),
});

export const sqlMessageSchema = z.object({
    thoughts: z.array(z.string()),
    type: z.literal("message"),
    inScope: z.boolean(),
    content: z.object({
        id: z.string().nullable().optional(),
        query: z.string().nullable().optional(),   
        params: z.record(z.any()).nullable().optional(),
        message: z.string(),                      
    }),
});

export const sqlAgentSchema = z.union([sqlActionSchema, sqlMessageSchema]);



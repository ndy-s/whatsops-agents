import { loadConfig } from "../../config/env.js";
import logger from "../../helpers/logger.js";
import { formatLLMMessage } from "../../helpers/llm.js";
import { EmbeddingStore } from "../base/EmbeddingStore.js";
import { buildMemoryPrompt, sqlRegistryPrompt } from "../base/prompt-builder.js";
import { schemaRegistry, sqlRegistry } from "./registry.js";

const sqlStore = new EmbeddingStore("sql-embeddings");
const schemaStore = new EmbeddingStore("schema-embeddings");

export async function buildSqlPrompt(msgJSON, memory) {
    const config = await loadConfig();
    const userMessage = formatLLMMessage(
        msgJSON.sender, 
        msgJSON.content, 
        msgJSON.quotedContext
    );

    const defaultSchemas = Object.entries(schemaRegistry).map(([id, meta]) => ({ id, meta }));
    const defaultSqls = Object.entries(sqlRegistry).map(([id, meta]) => ({ id, meta }));
    let schemas = defaultSchemas;
    let sqls = defaultSqls;
    let systemPrompt;

    if (config.useEmbedding) {
        const contextText = [
            ...memory.map(m => `[${m.role}] ${m.content}`), 
            userMessage
        ].join(" ");

        await sqlStore.load(
            defaultSqls,
            ({ id, meta }) => {
                const fields = (meta.params || []).join(", ");
                return `${id}: ${meta.description}. Parameters: ${fields}`;
            }
        )

        await schemaStore.load(
            defaultSchemas,
            ({ id, meta }) => {
                const columns = meta.columns
                    .map(c => `${c.name} (${c.type}): ${c.description}`)
                    .join("; ");
                const relations = (meta.relations || [])
                    .map(r => `${r.column} -> ${r.references} (${r.description})`)
                    .join("; ");
                return `${id}: ${meta.description}. Columns: ${columns}. Relations: ${relations || "none"}`;
            }
        );

        const relevantSql = await sqlStore.findRelevant(contextText, config.embeddingLimitSql);
        const relevantSchema = await schemaStore.findRelevant(contextText, config.embeddingLimitSchema);

        if (relevantSql.length > 0 && relevantSchema.length > 0) {
            sqls = relevantSql;
            schemas = relevantSchema;
            logger.info("[sqlAgent] Using dynamic SQL prompt");
        } else {
            logger.info("[sqlAgent] Using fallback default SQL prompt");
        }
    }

    systemPrompt = sqlRegistryPrompt(sqls, schemas);
    const memoryPrompt = buildMemoryPrompt(memory);

    return {
        systemPrompt,
        memoryPrompt,
        userMessage
    };
}


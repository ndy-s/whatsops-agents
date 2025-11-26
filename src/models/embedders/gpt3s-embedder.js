import { OpenAIEmbeddings } from "@langchain/openai";
import { loadConfig } from "../../config/env.js";

const config = await loadConfig();

const client = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: config.openaiApiKeys?.[0] ?? null,
});

export async function embedQuery(text) {
    return client.embedQuery(text);
}

export async function embedDocuments(texts) {
    return client.embedDocuments(texts);
}


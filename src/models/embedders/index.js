import * as gpt3s from "./gpt3s-embedder.js";
import * as minilm from "./minilm-embedder.js";
import { loadConfig } from "../../config/env.js";

const config = await loadConfig();

const embedders = {
    gpt3s,
    minilm
};

export const embedder = embedders[config.embeddingModel] || minilm;

console.log(`[embedder] ${config.useEmbedding ? `Using embedding model: ${config.embeddingModel || "minilm"}` : "Embeddings disabled"}`);

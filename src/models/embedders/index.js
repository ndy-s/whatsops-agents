import logger from "../../helpers/logger.js";
import { loadConfig } from "../../config/env.js";
import * as gpt3s from "./gpt3s-embedder.js";
import * as minilm from "./minilm-embedder.js";

const config = await loadConfig();

const embedders = {
    gpt3s,
    minilm
};

export const embedder = embedders[config.embeddingModel] || minilm;

logger.info(`[embedder] ${config.useEmbedding 
    ? `Using embedding model: ${config.embeddingModel || "minilm"}` 
    : "Embeddings disabled"}`);


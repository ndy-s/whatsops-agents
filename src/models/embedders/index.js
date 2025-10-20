import * as gpt3s from "./gpt3s-embedder.js";
import * as minilm from "./minilm-embedder.js";
import { config } from "../../config/env.js";

let activeEmbedder = null;

switch (config.embeddingModel) {
    case "gpt3s":
        activeEmbedder = gpt3s;
        break;
    case "minilm":
    default:
        activeEmbedder = minilm;
        break;
}

export const embedder = activeEmbedder;


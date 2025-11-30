import { ChatOpenAI } from "@langchain/openai";
import { loadConfig } from "../../config/env.js";

export async function getApiKeys() {
    const config = await loadConfig();
    return config.openaiApiKeys || [];
}

export function createModel(apiKey) {
    return new ChatOpenAI({
        temperature: 0,
        model: "gpt-4.1",
        apiKey,
    });
}

export async function hasQuota(apiKey) {
    return true;
}

import { ChatOpenAI } from "@langchain/openai";
import { config } from "../../config/env.js";

export const apiKeys = config.openrouterApiKeys || [];

export function createModel(apiKey) {
    return new ChatOpenAI({
        temperature: 0,
        model: "tngtech/deepseek-r1t2-chimera:free",
        apiKey,
        configuration: {
            baseURL: config.openrouterBaseUrl
        },
    });
}

export async function hasQuota(apiKey) {
    return true;
}



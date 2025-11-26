import { getApiAgent } from "./api-agent/index.js";
import logger from "../helpers/logger.js";
import { getClassifierAgent } from "./classifier-agent/index.js";
import { getSqlAgent } from "./sql-agent/index.js";
import { ModelManager } from "../models/llms/ModelManager.js";
import { loadConfig } from "../config/env.js";

export async function getAgent(agentId) {
    const config = await loadConfig();
    const modelManager = new ModelManager(config.modelPriority);

    const agentRegistry = {
        classifier: () => getClassifierAgent(modelManager),
        api: () => getApiAgent(modelManager),
        sql: () => getSqlAgent(modelManager),
    };

    const factory = agentRegistry[agentId];
    if (!factory) {
        logger.error(`Agent ID "${agentId}" not found in registry`);
        return null;
    }

    const agent = await factory();
    if (!agent) {
        logger.error(`Agent "${agentId}" could not be created: model unavailable or all keys exhausted`);
        return null;
    }

    return agent;
}

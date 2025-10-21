
import { apiAgent } from "./api-agent/index.js";

export const agentRegistry = {
    api: apiAgent,
};

export function getAgent(agentId) {
    return agentRegistry[agentId] || null;
}

import { ModelManager } from "../../models/llms/ModelManager.js";
import { AgentBase } from "../base/AgentBase.js";
import { handleSqlResult } from "./handler.js";
import { buildSqlPrompt } from "./prompt.js";
import { sqlAgentSchema } from "./schema.js";

const modelManager = new ModelManager(["deepseek", "gemini"]);

export async function getSqlAgent() {
    const model = await modelManager.getModel();
    if (!model) return null;

    return new AgentBase({
        id: "sqlAgent",
        model,
        schema: sqlAgentSchema,
        buildPrompt: buildSqlPrompt,
        handleResult: handleSqlResult,
    });
}

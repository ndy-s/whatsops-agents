import { ModelManager } from "../../models/llms/ModelManager.js";
import { AgentBase } from "../base/AgentBase.js";
import { handleClassifierResult } from "./handler.js";
import { buildClassifierPrompt } from "./prompt.js";
import { classifierAgentSchema } from "./schema.js";

const modelManager = new ModelManager(["deepseek", "gemini"]);

export async function getClassifierAgent() {
    const model = await modelManager.getModel();
    if (!model) return null;

    return new AgentBase({
        id: "classifierAgent",
        model,
        schema: classifierAgentSchema,
        buildPrompt: buildClassifierPrompt,
        handleResult: handleClassifierResult,
    });
}

import { AgentBase } from "../base/AgentBase.js";
import { model } from "../../models/llms/deepseek.js";
import { apiAgentSchema } from "./schema.js";
import { buildApiPrompt } from "./prompt.js";
import { handleApiResult } from "./handler.js";

export const apiAgent = new AgentBase({
    id: "apiAgent",
    model,
    schema: apiAgentSchema,
    buildPrompt: buildApiPrompt,
    handleResult: handleApiResult
});

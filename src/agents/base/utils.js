import { DateTime } from "luxon";
import { model } from "../../models/llms/deepseek.js";

export const jakartaTime = () => DateTime.now().setZone("Asia/Jakarta").toISO();

export function summarizeTokens(res) {
    const tokenUsage = res?.response_metadata?.tokenUsage || res?.usage_metadata || {};
    return {
        modelName: res?.response_metadata?.model_name || model?.name || "unknown",
        promptTokens: tokenUsage?.promptTokens || 0,
        completionTokens: tokenUsage?.completionTokens || 0,
        totalTokens: tokenUsage?.totalTokens || 0
    };
}

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { model } from "../models/deepseek.js";
import { buildApiSystemPrompt } from "../prompts/buildApiSystemPrompt.js";
import { parseAndValidateResponse, extractValidationErrors } from "../utils/helpers.js";
import { addMemory, getRecentMemory } from "../memory/memoryStore.js";
import { getOrCreateChat, insertChatMessage, insertModelResponse } from "../utils/chatRepository.js";
import { DateTime } from "luxon";

export async function invokeAgent(remoteJid, userJid, userMessage, maxRetries = 2) {
    let retryCount = 0;
    let lastContent = "";
    let lastErrors = {};

    const shortTermMemory = getRecentMemory(userJid);
    const systemPrompt = buildApiSystemPrompt();
    const jakartaTime = () => DateTime.now().setZone("Asia/Jakarta").toISO();

    const chat = await getOrCreateChat(remoteJid, userJid);

    while (retryCount <= maxRetries) {
        const messages = [new SystemMessage(systemPrompt)];

        if (shortTermMemory.length > 0) {
            messages.push(...shortTermMemory.map(m =>
                m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content)
            ));
        }

        messages.push(new HumanMessage(userMessage));

        if (retryCount > 0) {
            messages.push(new SystemMessage(
                `Previous response failed validation:\n${JSON.stringify(lastErrors, null, 2)}\nOriginal response:\n${lastContent}`
            ));
        }

        try {
            const res = await model.invoke(messages);
            const content = res?.content?.trim() || "";
            lastContent = content;

            if (!content) return "I couldn't understand your request.";

            const validated = parseAndValidateResponse(content);

            addMemory(userJid, "user", userMessage);
            addMemory(userJid, "assistant", content);

            const userMsgId = await insertChatMessage({
                chatDbId: chat.id,
                role: "user",
                content: userMessage,
                messageLength: userMessage.length,
                truncatedMemory: shortTermMemory.slice(-5),
                retryCount
            });

            const assistantMsgId = await insertChatMessage({
                chatDbId: chat.id,
                role: "assistant",
                content,
                messageLength: content.length,
                truncatedMemory: shortTermMemory.slice(-5),
                retryCount
            });

            const tokenUsage = res?.response_metadata?.tokenUsage || res?.usage_metadata || {};
            const promptTokens = tokenUsage.promptTokens || tokenUsage.input_tokens || null;
            const completionTokens = tokenUsage.completionTokens || tokenUsage.output_tokens || null;
            const totalTokens = tokenUsage.totalTokens || tokenUsage.total_tokens || null;
            const modelName = res?.response_metadata?.model_name || model?.name || "unknown";

            await insertModelResponse({
                messageId: assistantMsgId,
                modelName,
                messageIdFromModel: res?.id || null,
                promptTokens,
                completionTokens,
                totalTokens,
                validationType: validated.type,
                validationErrors: validated.errors || "",
                metadata: {
                    retryCount,
                    memorySize: shortTermMemory.length,
                    truncatedMemory: shortTermMemory.slice(-5).map(m => m.content),
                    timestamp: jakartaTime(),
                    inputLength: userMessage.length,
                    outputLength: content.length,
                    rawResponse: content,
                    rawObject: res 
                }
            });

            if (validated.type === "api_action") {
                return validated.content.apis.map(a => `API: ${a.id}, Params: ${JSON.stringify(a.params)}`).join("\n");
            }

            if (validated.type === "message") {
                return validated.content.message || "I need more details.";
            }

            return "Unexpected response type from model.";

        } catch (err) {
            retryCount++;
            lastErrors = err.name === "ZodError" ? extractValidationErrors(err, true) : { error: err.message || "Unknown error" };
        }
    }

    return "The model could not produce a valid response after multiple attempts.";
}


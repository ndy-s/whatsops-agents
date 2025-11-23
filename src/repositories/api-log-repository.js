import { openSqliteDB } from "../db/sqlite.js";
import logger from "../helpers/logger.js";
import { config } from "../config/env.js";

export async function saveApiLog(logData) {
    const {
        chatId, userId, systemPrompt, memoryPrompt,
        userMessage, modelResponse, validation,
        modelResMeta, retryCount = 0, metadata,
        success = true, errorMessage = null
    } = logData;

    const validationType = validation?.type || null;

    if (config.sqliteType === "cloud") {
        const db = await openSqliteDB();

        try {
            await db.sql`
                INSERT INTO api_logs (
                    chat_id, user_id,
                    system_prompt, memory_prompt, user_message,
                    model_response, validation_type, 
                    model_name, token_prompt, token_completion, token_total,
                    retry_count, metadata, success, error_message
                ) VALUES (
                    ${chatId}, ${userId},
                    ${systemPrompt}, ${memoryPrompt}, ${userMessage},
                    ${modelResponse}, ${validationType}, 
                    ${modelResMeta?.modelName ?? null},
                    ${modelResMeta?.promptTokens ?? 0},
                    ${modelResMeta?.completionTokens ?? 0},
                    ${modelResMeta?.totalTokens ?? 0},
                    ${retryCount},
                    ${JSON.stringify(metadata || {})},
                    ${success ? 1 : 0},
                    ${errorMessage}
                );
            `;
        } catch (err) {
            logger.error(`[saveApiLog] CLOUD log error:`, err);
        } finally {
            db.close();
        }

    } else {
        try {
            const db = await openSqliteDB();
            const stmt = db.prepare(`
                INSERT INTO api_logs (
                    chat_id, user_id,
                    system_prompt, memory_prompt, user_message,
                    model_response, validation_type, 
                    model_name, token_prompt, token_completion, token_total,
                    retry_count, metadata, success, error_message
                ) VALUES (
                    @chatId, @userId,
                    @systemPrompt, @memoryPrompt, @userMessage,
                    @modelResponse, @validationType, 
                    @modelName, @tokenPrompt, @tokenCompletion, @tokenTotal,
                    @retryCount, @metadata, @success, @errorMessage
                )
            `);

            stmt.run({
                chatId, userId, systemPrompt, memoryPrompt, userMessage,
                modelResponse,
                validationType,
                modelName: modelResMeta?.modelName || null,
                tokenPrompt: modelResMeta?.promptTokens || 0,
                tokenCompletion: modelResMeta?.completionTokens || 0,
                tokenTotal: modelResMeta?.totalTokens || 0,
                retryCount,
                metadata: JSON.stringify(metadata || {}),
                success: success ? 1 : 0,
                errorMessage
            });

        } catch (err) {
            logger.error(`[saveApiLog] LOCAL log error:`, err);
        }
    }
}


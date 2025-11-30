import { openSqliteDB } from "../db/sqlite.js";
import logger from "../helpers/logger.js";

export const apiLogRepository = {
    async saveApiLog(logData) {
        const {
            chatId, userId, systemPrompt, memoryPrompt,
            userMessage, modelResponse, validation,
            modelResMeta, retryCount = 0, metadata,
            success = true, errorMessage = null
        } = logData;

        const validationType = validation?.type || null;

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

            return true;
        } catch (err) {
            logger.error(`[apiLogRepository.saveApiLog] Failed to save api log:`, err);
            return false;
        }
    },


    async getLogs({ search, offset = 0, limit = 15, sortKey = "created_at", sortDir = "DESC" }) {
        try {
            const db = await openSqliteDB();
            const query = `
                SELECT * FROM api_logs
                ${search ? `WHERE chat_id LIKE @search
                OR user_id LIKE @search
                OR model_name LIKE @search
                OR user_message LIKE @search
                OR model_response LIKE @search` : ""}
                ORDER BY ${sortKey} ${sortDir}
                LIMIT @limit OFFSET @offset
            `;

            const stmt = db.prepare(query);
            const rows = stmt.all({
                search: search ? `%${search}%` : undefined,
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return rows;
        } catch (err) {
            logger.error(`[apiLogRepository.getLogs] Failed to fetch logs:`, err);
            return [];
        }
    }

};


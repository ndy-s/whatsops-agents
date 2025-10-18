import { Database } from "@sqlitecloud/drivers";
import { config } from "../config/env.js";
import logger from "./logger.js";

let dbInstance = null;

export async function openDB() {
    if (dbInstance) return dbInstance;

    try {
        logger.info("🌐 Connecting to SQLite Cloud...");
        dbInstance = new Database(config.sqliteUrl);

        // Chats
        await dbInstance.sql`
            CREATE TABLE IF NOT EXISTS chats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id TEXT NOT NULL UNIQUE,
                user_id TEXT NOT NULL,
                created_at DATETIME DEFAULT (datetime('now','localtime'))
            );
        `;

        // Chat messages
        await dbInstance.sql`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                message_length INTEGER,
                truncated_memory TEXT,
                retry_count INTEGER DEFAULT 0,
                timestamp DATETIME DEFAULT (datetime('now','localtime'))
            );
        `;

        // Model responses
        await dbInstance.sql`
            CREATE TABLE IF NOT EXISTS model_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
                model_name TEXT,
                message_id_from_model TEXT,
                prompt_tokens INTEGER,
                completion_tokens INTEGER,
                total_tokens INTEGER,
                validation_type TEXT,
                validation_errors TEXT,
                metadata JSON DEFAULT '{}',
                timestamp DATETIME DEFAULT (datetime('now','localtime'))
            );
        `;

        logger.info("✅ Database tables ready");
    } catch (err) {
        logger.error("❌ Failed to initialize DB:", err);
        throw err;
    }

    return dbInstance;
}



import { openSqliteDB } from "../db/sqlite.js";
import logger from "../helpers/logger.js";

export const settingsRepository = {
    async get(key) {
        try {
            const db = await openSqliteDB();
            const row = db.prepare("SELECT * FROM app_settings WHERE key = ?").get(key);

            if (!row) return null;

            let value = row.value;

            // Convert types
            if (row.type === "boolean") {
                value = value === "true";
            } else if (row.type === "number") {
                value = Number(value);
            }

            return value;
        } catch (err) {
            logger.error(`[settingsRepository.get] Failed to get setting for key "${key}":`, err);
            return null;
        }
    },

    
    async list() {
        try {
            const db = await openSqliteDB();
            return db.prepare("SELECT * FROM app_settings").all();
        } catch (err) {
            logger.error("[settingsRepository.list] Failed to fetch settings:", err);
            throw err;
        }
    },

    async saveMany(settingsObj) {
        try {
            const db = await openSqliteDB();

            const stmt = db.prepare(`
                INSERT INTO app_settings (key, value)
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            `);

            db.transaction(() => {
                for (const key in settingsObj) {
                    stmt.run(key, settingsObj[key]);
                }
            })();

            return true;
        } catch (err) {
            logger.error("[settingsRepository.saveMany] Failed to save settings:", err);
            throw err;
        }
    },
};


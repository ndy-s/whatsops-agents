import oracledb from "oracledb";
import logger from "../helpers/logger.js";
import { loadConfig } from "../config/env.js";
import { sleep } from "../helpers/utils.js";

let dbInstance = null;
let lastConfig = null;

const RETRY_INTERVAL_MS = 5000; // 5 seconds
const MAX_RETRIES = Infinity;

export async function openOracleDB() {
    let retries = 0;

    while (true) {
        const config = await loadConfig();

        const configChanged =
            !lastConfig ||
            lastConfig.oracleUser !== config.oracleUser ||
            lastConfig.oraclePassword !== config.oraclePassword ||
            lastConfig.oracleConnectString !== config.oracleConnectString;

        if (dbInstance && !configChanged) {
            return dbInstance;
        }

        if (dbInstance && configChanged) {
            try {
                await dbInstance.close();
                logger.info("🔄 Closed old Oracle DB connection due to config change");
            } catch (err) {
                logger.warn("⚠ Failed to close old Oracle DB connection:", err);
            }
            dbInstance = null;
        }

        try {
            dbInstance = await oracledb.getConnection({
                user: config.oracleUser,
                password: config.oraclePassword,
                connectString: config.oracleConnectString,
            });

            lastConfig = {
                oracleUser: config.oracleUser,
                oraclePassword: config.oraclePassword,
                oracleConnectString: config.oracleConnectString,
            };

            logger.info("🌐 Connected to Oracle database");
            return dbInstance;
        } catch (err) {
            logger.error(`❌ Failed to connect to Oracle DB (attempt ${retries + 1}):`, err);

            retries += 1;
            if (MAX_RETRIES !== Infinity && retries >= MAX_RETRIES) {
                logger.error("❌ Max retries reached. Giving up on Oracle DB connection.");
                return null;
            }

            logger.info(`⏳ Retrying in ${RETRY_INTERVAL_MS / 1000}s...`);
            await sleep(RETRY_INTERVAL_MS);
        }
    }
}


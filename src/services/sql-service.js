import oracledb from "oracledb";
import logger from "../helpers/logger.js";
import { config } from "../config/env.js";

let oraclePool = null;

export async function initOracle() {
    if (oraclePool) return oraclePool;

    oraclePool = await oracledb.createPool({
        user: config.oracleUser,
        password: config.oraclePassword,
        connectString: config.oracleConnectString,
        poolMin: 1,
        poolMax: 10,
        poolIncrement: 1,
    });

    logger.info("✅ Oracle pool initialized");
    return oraclePool;
}

export async function callSql(query, params = {}) {
    if (!oraclePool) await initOracle();

    let connection;
    try {
        connection = await oraclePool.getConnection();
        const result = await connection.execute(query, params, {
            outFormat: oracledb.OUT_FORMAT_OBJECT,
        });

        logger.info(`[Oracle] SQL executed: ${query} | params=${JSON.stringify(params)}`);
        return result.rows;
    } catch (err) {
        logger.error(`[Oracle] SQL execution failed: ${query} | error=${err.message} | params=${JSON.stringify(params)}`);
        throw err;
    } finally {
        if (connection) await connection.close();
    }
}



import { startBot } from "./core/bot.js";
import { startOpsDashboard } from "./services/dashboard.js";
import { openSqliteDB } from "./db/sqlite.js";
import { validateConfig } from "./config/env.js";

async function bootstrap() {
    await openSqliteDB();

    await startOpsDashboard();

    await validateConfig();

    startBot();
}

bootstrap();


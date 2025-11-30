import path from "path";
import express from "express";
import logger from "../helpers/logger.js";
import { loadConfig } from "../config/env.js";
import { agentPromptsRepository } from "../repositories/agent-prompts-repository.js";
import { registryRepository } from "../repositories/registry-repository.js";
import { apiLogRepository } from "../repositories/api-log-repository.js";
import { settingsRepository } from "../repositories/settings-repository.js";

export async function startOpsDashboard(port = 55555) {
    const config = await loadConfig();
    const app = express();

    app.use(express.text({ type: "text/plain" }));
    app.use(express.json());

    app.use((req, res, next) => {
        if (req.path.startsWith("/api-dummy/")) return next();

        const auth = req.headers.authorization;
        if (!auth) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Agents Dashboard"');
            return res.status(401).send("Authentication required.");
        }

        const [scheme, encoded] = auth.split(' ');
        if (scheme !== 'Basic') return res.status(400).send("Bad request");

        const decoded = Buffer.from(encoded, 'base64').toString();
        const [user, pass] = decoded.split(':');

        if (user === config.appAuthUser && pass === config.appAuthPass) return next();

        res.setHeader('WWW-Authenticate', 'Basic realm="Ops Agent Logs"');
        return res.status(401).send("Authentication failed.");
    });

    app.use(express.static(path.join(process.cwd(), "public")));

    app.get("/", (req, res) => {
        res.sendFile(path.join(process.cwd(), "public", "index.html"));
    });

    app.get("/api/logs", async (req, res) => {
        try {
            const rows = await apiLogRepository.getLogs(req.query);
            res.json(rows);
        } catch (err) {
            logger.error("Failed to fetch logs:", err);
            res.status(500).json({ error: "Failed to fetch logs" });
        }
    });

    app.get("/api/agent-prompts/:agent", async (req, res) => {
        const { agent } = req.params;

        try {
            const content = await agentPromptsRepository.get(agent);
            res.type("text/plain").send(content || "");
        } catch (err) {
            logger.error("Failed to fetch prompts:", err);
            res.status(500).json({ error: "Failed to fetch prompts"});
        }
    });

    app.post("/api/agent-prompts/:agent", async (req, res) => {
        const { agent } = req.params;

        try {
            let text = "";

            if (typeof req.body === "string") {
                text = req.body;
            } else if (req.body && req.body.text) {
                text = req.body.text;
            } else {
                text = req.rawBody?.toString() ?? "";
            }

            if (!text) {
                return res.status(400).send("Prompt content is empty");
            }

            const ok = await agentPromptsRepository.save(agent, text);

            if (!ok) return res.status(500).send("Failed to save prompts");

            res.json({ success: true });
        } catch (err) {
            logger.error("Failed to save prompts:", err);
            res.status(500).json({ error: "Failed to save prompts" });
        }
    });

    app.get("/api/registry/api", async (req, res) => {
        try {
            const data = await registryRepository.get("API_REGISTRY");
            res.json(data || {});
        } catch (err) {
            logger.error("Failed to fetch api registry:", err);
            res.status(500).json({ error: "Failed to fetch api registry" });
        }
    });

    app.post("/api/registry/api", async (req, res) => {
        try {
            const newRegistry = req.body;
            await registryRepository.save("API_REGISTRY", "api", newRegistry);
            res.json({ success: true, message: "API registry updated successfully" });
        } catch (err) {
            logger.error("Failed to update API registry:", err);
            res.status(500).json({ error: "Failed to update API registry" });
        }
    });

    app.get("/api/registry/sql", async (req, res) => {
        try {
            const data = await registryRepository.get("SQL_REGISTRY");
            res.json(data || {});
        } catch (err) {
            logger.error("Failed to fetch sql registry:", err);
            res.status(500).json({ error: "Failed to fetch sql registry" });
        }
    });

    app.post("/api/registry/sql", async (req, res) => {
        try {
            await registryRepository.save("SQL_REGISTRY", "sql", req.body);
            res.json({ success: true, message: "SQL registry updated successfully" });
        } catch (err) {
            logger.error("Failed to update SQL registry:", err);
            res.status(500).json({ error: "Failed to update SQL registry" });
        }
    });

    app.get("/api/registry/schema", async (req, res) => {
        try {
            const data = await registryRepository.get("SCHEMA_REGISTRY");
            res.json(data || {});
        } catch (err) {
            logger.error("Failed to fetch schema registry:", err);
            res.status(500).json({ error: "Failed to fetch schema registry" });
        }
    });

    app.post("/api/registry/schema", async (req, res) => {
        try {
            await registryRepository.save("SCHEMA_REGISTRY", "schema", req.body);
            res.json({ success: true, message: "Schema registry updated successfully" });
        } catch (err) {
            logger.error("Failed to update schema registry:", err);
            res.status(500).json({ error: "Failed to update schema registry" });
        }
    });

    app.get("/api/settings", async (req, res) => {
        try {
            const rows = await settingsRepository.list();

            const normalized = rows.map(r => {
                let value = r.value;
                const key = r.key;

                const isListField =
                    key.endsWith("_API_KEYS") ||
                        key.endsWith("_KEYWORDS") ||
                        key === "WHITELIST" ||
                        key === "MODEL_PRIORITY" ||
                        key === "API_CUSTOM_HEADERS";

                // Convert comma → newline
                if (isListField && typeof value === "string") {
                    value = value.split(",").join("\n");
                }

                return { ...r, value };
            });

            res.json(normalized);
        } catch (err) {
            res.status(500).json({ error: "Failed to fetch settings" });
        }
    });

    app.post("/api/settings", async (req, res) => {
        try {
            const input = req.body;
            const finalToSave = {};

            for (const key in input) {
                let val = input[key];

                if (val === null || val === undefined) {
                    val = "";
                } else if (typeof val === "boolean") {
                    val = val ? "true" : "false";
                }

                const isListField =
                    key.endsWith("_API_KEYS") ||
                        key.endsWith("_KEYWORDS") ||
                        key === "WHITELIST" ||
                        key === "MODEL_PRIORITY" ||
                        key === "API_CUSTOM_HEADERS";

                // Convert newline → comma for list fields
                if (isListField && typeof val === "string") {
                    val = val
                        .split("\n")
                        .map(s => s.trim())
                        .filter(Boolean)
                        .join(",");
                } else if (typeof val !== "string") {
                    val = val.toString();
                }

                finalToSave[key] = val;
            }

            await settingsRepository.saveMany(finalToSave);

            res.json({ success: true, message: "Settings saved" });
        } catch (err) {
            res.status(500).json({ error: "Failed to save settings" });
        }
    });

    app.all(/^\/api-dummy\/(.*)$/, (req, res) => {
        const pathAfterApi = req.url.replace(/^\/api\//, "");
        res.json({
            success: true,
            method: req.method,
            path: pathAfterApi,
            body: req.body
        });
    });

    app.listen(port, () => {
        logger.info(`🟢 Agents Dashboard running at http://localhost:${port}`);
    });
}


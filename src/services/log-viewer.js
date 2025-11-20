import express from "express";
import { openDB } from "../db/sqlite.js";
import logger from "../helpers/logger.js";

export async function startLoanAgentLogViewer(port = 4000) {
    const db = await openDB();
    const app = express();

    const USERNAME = "admin";
    const PASSWORD = "loan123";

    app.use((req, res, next) => {
        if (req.path.startsWith("/api-dummy/")) return next();

        const auth = req.headers.authorization;
        if (!auth) {
            res.setHeader('WWW-Authenticate', 'Basic realm="Ops Agent Logs"');
            return res.status(401).send("Authentication required.");
        }

        const [scheme, encoded] = auth.split(' ');
        if (scheme !== 'Basic') return res.status(400).send("Bad request");

        const decoded = Buffer.from(encoded, 'base64').toString();
        const [user, pass] = decoded.split(':');

        if (user === USERNAME && pass === PASSWORD) return next();

        res.setHeader('WWW-Authenticate', 'Basic realm="Ops Agent Logs"');
        return res.status(401).send("Authentication failed.");
    });

    app.use(express.static("public"));

    // API endpoint
    app.get("/api/logs", (req, res) => {
        try {
            const { search, offset = 0, limit = 15, sortKey = "created_at", sortDir = "DESC" } = req.query;
            let query = `
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
            res.json(rows);
        } catch (err) {
            logger.error("Failed to fetch logs:", err);
            res.status(500).json({ error: "Failed to fetch logs" });
        }
    });

    app.get("/", (req, res) => {
        res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Ops Agent Logs Viewer</title>
<style>
/* Reset and base */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: #f5f6fa; color: #2c3e50; padding: 20px; }

h1 { text-align: center; margin-bottom: 25px; font-weight: 600; color: #34495e; }

/* Search bar */
.search-bar { text-align: center; margin-bottom: 20px; }
.search-bar input {
width: 300px; max-width: 80%; padding: 10px 12px;
border: 1px solid #ccc; border-radius: 6px; font-size: 14px;
transition: border-color 0.2s;
}
.search-bar input:focus { border-color: #007bff; outline: none; }
.search-bar button {
padding: 10px 15px; margin-left: 8px; background: #007bff;
color: #fff; border: none; border-radius: 6px; cursor: pointer;
transition: background 0.2s;
}
.search-bar button:hover { background: #0056b3; }

/* Table */
.table-container {
overflow-x: auto;
border-radius: 8px;
box-shadow: 0 4px 15px rgba(0,0,0,0.1);
background: #fff;
}
table {
border-collapse: collapse; width: 100%; min-width: 1200px;
}
th, td {
padding: 12px 10px; text-align: left;
font-size: 13px; color: #2c3e50;
}
th {
background: #007bff; color: #fff;
position: sticky; top: 0;
cursor: pointer; user-select: none;
transition: background 0.2s;
text-align: center;
}
th:hover { background: #0056b3; }
tr:nth-child(even) { background: #f9fafb; }
tr:hover { background: #e3f2fd; }

td { max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Modal */
.modal {
display: none; position: fixed; top: 0; left: 0;
width: 100%; height: 100%; background: rgba(0,0,0,0.6);
justify-content: center; align-items: center; z-index: 1000;
}
.modal-content {
background: #fff; padding: 25px; width: 90%; max-width: 900px;
max-height: 90%; overflow: auto; border-radius: 10px;
box-shadow: 0 8px 25px rgba(0,0,0,0.3); position: relative;
}
.close {
position: absolute; top: 15px; right: 20px;
font-size: 22px; font-weight: 600; cursor: pointer; color: #555;
}
.close:hover { color: #000; }

pre {
white-space: pre-wrap; word-wrap: break-word;
font-family: 'Fira Code', monospace; background: #1e1e1e;
color: #d4d4d4; padding: 12px; border-radius: 6px;
max-height: 70vh; overflow: auto;
}
.json-key { color: #9cdcfe; }
.json-string { color: #ce9178; }
.json-number { color: #b5cea8; }
.json-boolean { color: #569cd6; }
.json-null { color: #569cd6; font-style: italic; }

/* Pagination */
.pagination { margin-top: 15px; text-align: center; }
.pagination button {
margin: 0 4px; padding: 6px 12px; background: #007bff;
color: #fff; border: none; border-radius: 5px; cursor: pointer;
transition: background 0.2s;
}
.pagination button:hover { background: #0056b3; }

@media (max-width: 768px) {
th, td { font-size: 12px; padding: 8px 6px; }
.search-bar input { width: 200px; }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>
</head>
<body>
<h1>Ops Agent Logs Viewer</h1>

<div class="search-bar">
<input type="text" id="searchInput" placeholder="Search chat, user, model, or content..." />
<button onclick="loadLogs(0)">Search</button>
</div>

<div id="loading" style="display:none; text-align:center; margin-bottom:10px;">
    <div style="display:inline-block; width:30px; height:30px; border:4px solid #007bff; border-top:4px solid transparent; border-radius:50%; animation: spin 1s linear infinite;"></div>
</div>

<div class="table-container">
<table id="logTable">
<thead>
<tr>
<th data-key="id">ID</th>
<th data-key="chat_id">Chat ID</th>
<th data-key="user_id">User ID</th>
<th data-key="system_prompt">System Prompt</th>
<th data-key="memory_prompt">Memory Prompt</th>
<th data-key="user_message">User Message</th>
<th data-key="model_response">Model Response</th>
<th data-key="validation_type">Validation Type</th>
<th data-key="validation_errors">Validation Errors</th>
<th data-key="model_name">Model Name</th>
<th data-key="token_prompt">Token Prompt</th>
<th data-key="token_completion">Token Completion</th>
<th data-key="token_total">Token Total</th>
<th data-key="retry_count">Retry Count</th>
<th data-key="metadata">Metadata</th>
<th data-key="created_at">Created At</th>
</tr>
</thead>
<tbody></tbody>
</table>
</div>

<div class="pagination" id="pagination"></div>

<div class="modal" id="modal">
<div class="modal-content">
<span class="close" onclick="closeModal()">&times;</span>
<pre id="modalContent"></pre>
</div>
</div>

<script>
let logs = [];
let sortKey = 'created_at';
let sortAsc = false;
let offset = 0;
const limit = 15;

function safeFormatJSON(text) { if (!text) return ""; try { return JSON.parse(text); } catch { return text; } }
function truncate(text, length = 50) { if (!text) return ''; return text.length > length ? text.slice(0, length) + '...' : text; }

function syntaxHighlight(json) {
if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\\s*:)?|\b(true|false|null)\b|-?\\d+(\\.\\d+)?([eE][+\\-]?\\d+)?)/g, function (match) {
let cls = 'json-number';
if (/^"/.test(match)) { if (/:$/.test(match)) cls = 'json-key'; else cls = 'json-string'; }
else if (/true|false/.test(match)) cls = 'json-boolean';
else if (/null/.test(match)) cls = 'json-null';
return '<span class="' + cls + '">' + match + '</span>';
});
}

function showModal(row) {
const modal = document.getElementById('modalContent');
const formatted = {};
Object.keys(row).forEach(key => { try { formatted[key] = JSON.parse(row[key]); } catch { formatted[key] = row[key]; } });
modal.innerHTML = syntaxHighlight(formatted);
document.getElementById('modal').style.display = 'flex';
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }

async function loadLogs(newOffset) {
offset = newOffset;
const search = document.getElementById('searchInput').value;

document.getElementById('loading').style.display = 'block';
document.querySelector('.table-container').style.opacity = '0.5';

const res = await fetch(\`/api/logs?limit=\${limit}&offset=\${offset}&sortKey=\${sortKey}&sortDir=\${sortAsc ? 'ASC':'DESC'}&search=\${encodeURIComponent(search)}\`);
logs = await res.json();
renderTable();

document.getElementById('loading').style.display = 'none';
document.querySelector('.table-container').style.opacity = '1';
}

function renderTable() {
const tbody = document.querySelector('#logTable tbody');
tbody.innerHTML = '';
logs.forEach(row => {
const tr = document.createElement('tr');
tr.innerHTML = Object.keys(row).map(key => \`<td title="\${row[key] || ''}">\${truncate(row[key])}</td>\`).join('');
tr.ondblclick = () => showModal(row);
tbody.appendChild(tr);
});
renderPagination();
}

function renderPagination() {
const pagination = document.getElementById('pagination');
pagination.innerHTML = '';
if (offset > 0) {
const prev = document.createElement('button');
prev.textContent = 'Prev';
prev.onclick = () => loadLogs(offset - limit);
pagination.appendChild(prev);
}
if (logs.length === limit) {
const next = document.createElement('button');
next.textContent = 'Next';
next.onclick = () => loadLogs(offset + limit);
pagination.appendChild(next);
}
}

document.querySelectorAll('th').forEach(th => {
th.addEventListener('click', () => {
const key = th.getAttribute('data-key');
if (sortKey === key) sortAsc = !sortAsc;
else { sortKey = key; sortAsc = true; }
loadLogs(0);
});
});

loadLogs(0);
</script>
</body>
</html>
`);
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
        logger.info(`📊 Ops Agent Logs Viewer running at http://localhost:${port}`);
    });
}


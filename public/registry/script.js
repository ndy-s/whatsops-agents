function switchTab(tab) {
    document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

    document.querySelector(`button[onclick="switchTab('${tab}')"]`).classList.add("active");
    document.getElementById(tab).classList.add("active");
}

async function loadApiRegistry() {
    const res = await fetch("/api/registry/api");
    const data = await res.json();
    renderTable("apiTableContainer", data);
}

async function loadSqlRegistry() {
    const res = await fetch("/api/registry/sql");
    const data = await res.json();
    renderTable("sqlTableContainer", data);
}

function renderTable(containerId, rows) {
    if (!rows.length) {
        document.getElementById(containerId).innerHTML = "<p>No data found.</p>";
        return;
    }

    let headers = Object.keys(rows[0]);

    let html = `<table><thead><tr>`;
    headers.forEach(h => html += `<th>${h}</th>`);
    html += `</tr></thead><tbody>`;

    rows.forEach(row => {
        html += "<tr>";
        headers.forEach(h => html += `<td>${row[h]}</td>`);
        html += "</tr>";
    });

    html += "</tbody></table>";

    document.getElementById(containerId).innerHTML = html;
}

loadApiRegistry();
loadSqlRegistry();



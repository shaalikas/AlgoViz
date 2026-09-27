require("dotenv").config();
const express = require("express");
const cors = require("cors");

const { parseCode } = require("./parser");
const { toMermaid } = require("./mermaidConverter");
const { explainCode } = require("./aiExplain");
const { ensureSchema, saveProject, getAllProjects, getProjectById } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---------- Health check ----------
app.get("/", (req, res) => {
    res.send("Code-to-Diagram backend is running.");
});

// ---------- Generate a diagram + explanation from pasted code ----------
app.post("/api/generate", async (req, res) => {
    const { code } = req.body;

    if (!code || typeof code !== "string" || !code.trim()) {
        return res.status(400).json({ error: "No code provided." });
    }

    let graph;
    try {
        graph = parseCode(code);
    } catch (err) {
        // Parser errors are expected (invalid/unsupported syntax) — return 400, not 500
        return res.status(400).json({ error: err.message });
    }

    const mermaidCode = toMermaid(graph);
    const explanation = await explainCode(code);

    // Save to DB, but don't fail the whole request if the DB write fails
    try {
        await saveProject({ code, mermaidCode, explanation });
    } catch (err) {
        console.error("Failed to save project to DB:", err.message);
    }

    res.json({ mermaidCode, explanation });
});

// ---------- Fetch all saved projects (history list) ----------
app.get("/api/projects", async (req, res) => {
    try {
        const projects = await getAllProjects();
        res.json(projects);
    } catch (err) {
        console.error("Failed to fetch projects:", err.message);
        res.status(500).json({ error: "Couldn't fetch project history." });
    }
});

// ---------- Fetch a single saved project by ID ----------
app.get("/api/projects/:id", async (req, res) => {
    try {
        const project = await getProjectById(req.params.id);
        if (!project) {
            return res.status(404).json({ error: "Project not found." });
        }
        res.json(project);
    } catch (err) {
        console.error("Failed to fetch project:", err.message);
        res.status(500).json({ error: "Couldn't fetch project." });
    }
});

// ---------- Start server ----------
async function start() {
    try {
        await ensureSchema();
        console.log("Database schema ready.");
    } catch (err) {
        console.error("Could not connect to Postgres. Check your .env settings.");
        console.error(err.message);
    }

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

start();


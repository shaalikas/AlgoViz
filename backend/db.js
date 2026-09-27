const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.PGHOST || "localhost",
    port: process.env.PGPORT || 5432,
    database: process.env.PGDATABASE || "code_diagram_db",
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "",
});

pool.on("error", (err) => {
    console.error("Unexpected Postgres error:", err.message);
});

/**
 * Creates the projects table if it doesn't already exist.
 * Safe to call every time the server starts.
 */
async function ensureSchema() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      code_input TEXT NOT NULL,
      mermaid_output TEXT NOT NULL,
      ai_explanation TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

async function saveProject({ code, mermaidCode, explanation }) {
    const result = await pool.query(
        `INSERT INTO projects (code_input, mermaid_output, ai_explanation)
     VALUES ($1, $2, $3)
     RETURNING id, created_at;`,
        [code, mermaidCode, explanation]
    );
    return result.rows[0];
}

async function getAllProjects() {
    const result = await pool.query(
        `SELECT id, code_input, mermaid_output, ai_explanation, created_at
     FROM projects
     ORDER BY created_at DESC;`
    );
    return result.rows;
}

async function getProjectById(id) {
    const result = await pool.query(
        `SELECT id, code_input, mermaid_output, ai_explanation, created_at
     FROM projects
     WHERE id = $1;`,
        [id]
    );
    return result.rows[0] || null;
}

module.exports = { pool, ensureSchema, saveProject, getAllProjects, getProjectById };


/**
 * Converts a { nodes, edges } graph into a Mermaid flowchart definition string.
 * Sanitizes names so they're safe to use as Mermaid node IDs.
 */
function toMermaid({ nodes, edges }) {
    if (!nodes || nodes.length === 0) {
        return "flowchart TD\n  empty[No structure detected]";
    }

    const safeId = (name) => name.replace(/[^a-zA-Z0-9_]/g, "_");

    const lines = ["flowchart TD"];

    // Declare every node once, with a readable label
    nodes.forEach((n) => {
        lines.push(`  ${safeId(n)}["${n}"]`);
    });

    // Draw edges
    edges.forEach(([from, to]) => {
        lines.push(`  ${safeId(from)} --> ${safeId(to)}`);
    });

    return lines.join("\n");
}

module.exports = { toMermaid };


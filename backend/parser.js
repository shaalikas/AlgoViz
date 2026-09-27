const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

/**
 * Parses a JavaScript code string and extracts a simple graph of
 * functions, function calls, conditionals, and loops.
 *
 * Returns: { nodes: string[], edges: [string, string][] }
 * Throws a plain Error with a readable message if the code can't be parsed.
 */
function parseCode(code) {
    let ast;

    try {
        ast = parser.parse(code, {
            sourceType: "module",
            allowReturnOutsideFunction: true,
            errorRecovery: false,
            plugins: ["jsx"],
        });
    } catch (err) {
        throw new Error(`Couldn't parse this code: ${err.message.split("\n")[0]}`);
    }

    const nodes = new Set();
    const edges = [];
    let anonCounter = 0;
    let conditionCounter = 0;
    let loopCounter = 0;

    // Track which function we're currently inside, so we know who is
    // "calling" whom, and who "branches" or "loops".
    const functionStack = ["global"];
    nodes.add("global");

    function currentScope() {
        return functionStack[functionStack.length - 1];
    }

    function getFunctionName(path) {
        if (path.node.id && path.node.id.name) return path.node.id.name;

        // Handle: const foo = function() {} / const foo = () => {}
        if (
            path.parent &&
            path.parent.type === "VariableDeclarator" &&
            path.parent.id &&
            path.parent.id.name
        ) {
            return path.parent.id.name;
        }

        anonCounter += 1;
        return `anonymous_${anonCounter}`;
    }

    traverse(ast, {
        "FunctionDeclaration|FunctionExpression|ArrowFunctionExpression": {
            enter(path) {
                const name = getFunctionName(path);
                nodes.add(name);
                functionStack.push(name);
            },
            exit() {
                functionStack.pop();
            },
        },

        CallExpression(path) {
            let calleeName = null;

            if (path.node.callee.type === "Identifier") {
                calleeName = path.node.callee.name;
            } else if (
                path.node.callee.type === "MemberExpression" &&
                path.node.callee.property &&
                path.node.callee.property.name
            ) {
                calleeName = path.node.callee.property.name;
            }

            if (calleeName) {
                nodes.add(calleeName);
                edges.push([currentScope(), calleeName]);
            }
        },

        IfStatement(path) {
            conditionCounter += 1;
            const label = `condition_${conditionCounter}`;
            nodes.add(label);
            edges.push([currentScope(), label]);
        },

        "ForStatement|WhileStatement|DoWhileStatement"(path) {
            loopCounter += 1;
            const label = `loop_${loopCounter}`;
            nodes.add(label);
            edges.push([currentScope(), label]);
        },
    });

    // De-duplicate edges while preserving order
    const seen = new Set();
    const uniqueEdges = edges.filter(([a, b]) => {
        const key = `${a}=>${b}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return {
        nodes: Array.from(nodes),
        edges: uniqueEdges,
    };
}

module.exports = { parseCode };


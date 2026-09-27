const Anthropic = require("@anthropic-ai/sdk");

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Sends the code to Claude and returns a short plain-English explanation.
 * Returns a fallback string instead of throwing, so a missing/invalid API key
 * doesn't take down the whole /api/generate request.
 */
async function explainCode(code) {
    if (!process.env.ANTHROPIC_API_KEY) {
        return "AI explanation unavailable: no ANTHROPIC_API_KEY set in .env.";
    }

    try {
        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 200,
            messages: [
                {
                    role: "user",
                    content: `Explain what this code does in short plain-English sentences. Be concise, no preamble, no markdown formatting:\n\n${code}`,
                },
            ],
        });

        const textBlock = response.content.find((block) => block.type === "text");
        return textBlock ? textBlock.text.trim() : "No explanation generated.";
    } catch (err) {
        console.error("Claude API error:", err.message);
        return "Couldn't generate an AI explanation right now.";
    }
}

module.exports = { explainCode };


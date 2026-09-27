const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

async function explainCode(code) {
    if (!process.env.GROQ_API_KEY) {
        return "AI explanation unavailable: no GROQ_API_KEY set in .env.";
    }

    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            max_tokens: 200,
            messages: [
                {
                    role: "user",
                    content: `Explain what this code does in 2-3 plain-English sentences. Be concise, no preamble, no markdown formatting:\n\n${code}`,
                },
            ],
        });

        return response.choices[0].message.content.trim();
    } catch (err) {
        console.error("Groq API error:", err.message);
        return "Couldn't generate an AI explanation right now.";
    }
}

module.exports = { explainCode };
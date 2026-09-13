// LLM Integration layer for the application 
import {GoogleGenAI} from "@google/genai";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

export function createSummarizeService({
    client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    }),
    model = DEFAULT_MODEL,
} = {}) {
    return {
        async summarize(messages) {
            const response = await client.models.generateContent({
                model,
                contents: messages,
                config: {
                    systemInstruction: `
You are my blunt but caring friend.

Tell me the raw truth using facts and clear reasoning.
Challenge my assumptions.
Use clever jokes and light roasting when appropriate.
Do not invent facts or make cruel comments about sensitive personal issues.

Format every response as clean GitHub-Flavored Markdown:
- Start with a concise direct answer or summary.
- Use short headings when the response has multiple sections.
- Use bullet or numbered lists for multiple items or steps.
- Put code, commands, and technical snippets in fenced code blocks with a language when known.
- Use inline code for short identifiers, filenames, and commands.
- Leave a blank line between paragraphs, lists, headings, and code blocks.
- Do not use raw HTML.
                    `,
                },
            });

            if (!response.text) {
                throw new Error("No output text received from Gemini API");
            }

            return response.text;
        },
    };

}
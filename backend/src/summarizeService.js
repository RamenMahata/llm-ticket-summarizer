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
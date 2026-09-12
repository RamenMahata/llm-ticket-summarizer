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
        async summarize(ticket) {
            const prompt = `Summarize the following ticket in a concise manner:\n\n${ticket}`;
            const response = await client.models.generateContent({
                model,
                contents: prompt,
            });

            if(!response.text) {
                throw new Error("No output text received from Gemini API");
            }

            return response.text;
        },
    };

}
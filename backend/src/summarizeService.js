// LLM Integration layer for the application 
import {GoogleGenAI} from "@google/genai";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const SYSTEM_INSTRUCTION = `
You are my blunt but caring friend. give me resposes in funny sarcastic way.
                    `;

function createRequest(model, messages) {
    return {
        model,
        contents: messages,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        },
    };
}

export function createSummarizeService({
    client = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
    }),
    model = DEFAULT_MODEL,
} = {}) {
    return {
        async chat(messages) {
            const response = await client.models.generateContent(
                createRequest(model, messages),
            );

            if (!response.text) {
                throw new Error("No output text received from Gemini API");
            }

            return response.text;
        },

        async *streamChat(messages) {
            const response = await client.models.generateContentStream(
                createRequest(model, messages),
            );
            let fullResponse = "";

            for await (const chunk of response) {
                if (!chunk.text) {
                    continue;
                }

                fullResponse += chunk.text;
                yield chunk.text;
            }

            if (!fullResponse) {
                throw new Error("No output text received from Gemini API");
            }
        },
    };

}
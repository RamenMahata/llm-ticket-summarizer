// HTTP / Api layer for the application

import express, { response } from "express";

export function createApp({summarizeService}) {
    if(!summarizeService?.summarize) {
        throw new Error("summarizeService is required and must have a summarize method");
    
    } 

    const app = express();

    app.use(express.text({type: "*/*", limit: "100kb"})); // Middleware to parse incoming text/plain requests 

    app.post("/api/summarize", async (request, response) => {
        const ticket = 
             typeof request.body === "string" ? request.body : "";

             if(!ticket.trim()) {
                return response
                   .status(400)
                   .type("text/plain")
                   .send("Ticket content is required.");
             }

             try {
                const summary = await summarizeService.summarize(ticket);

                return response
                   .status(200)
                   .type("text/plain")
                   .send(summary);
             } catch (error) {
                console.error("Error summarizing ticket:", error);
                return response
                   .status(500)
                   .type("text/plain")
                   .send("An error occurred while summarizing the ticket.");
             }
    });

    return app;
}
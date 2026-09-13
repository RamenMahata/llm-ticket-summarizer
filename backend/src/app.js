// HTTP / Api layer for the application

import express from "express";
import cors from "cors";

export function createApp({summarizeService}) {
    if(!summarizeService?.summarize) {
        throw new Error("summarizeService is required and must have a summarize method");
    } 

    const app = express();
    const history = [];

    let historyQueue = Promise.resolve(); // Initialize a resolved promise to manage the queue
    function useHistory(operation) {
      const result = historyQueue.then(operation);
      historyQueue = result.catch(() => {}); // Ensure the queue continues even if an operation fails
      return result;
    }

    app.use(cors());
      app.use(express.text({type: "*/*", limit: "100kb"})); // Middleware to parse incoming text/plain requests 
    
    app.post("/api/summarize", async (request, response,next) => {
      if(typeof request.body !== "string" || request.body.trim() === "") {
        return response
          .status(400)
          .type("text/plain")
          .send("Ticket content is required.");

      }

      try {
        const answer = await useHistory(async () => {
          const messages = [
            ...history.map((message) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{text: message.content}],
            })),
            {
              role: "user",
              parts: [{text: request.body}],
            },
          ];

          const summary = await summarizeService.summarize(messages);

          history.push({role: "user", content: request.body});
          history.push({role: "assistant", content: summary});
          return summary;
        });

        response.type("text/plain").send(answer);
      } catch (error) {
        next(error); // Pass the error to the error-handling middleware
      }
    });

    app.delete("/api/history", async (_request, response, next) => {
      try {
         await useHistory(async () => {
            history.length = 0; // Clear the history array
         });

         response.status(204).send(); // Send a 204 No Content response
      } catch (error) {
         next(error); // Pass the error to the error-handling middleware
      }
    });

    app.get("/api/history", (request, response) => {
      response.json(history); // Return the history as JSON
    });

    // Error-handling middleware
    app.use((err, _req, res, _next) => {
      console.error(err.stack); // Log the error stack trace for debugging
      res.status(500).type("text/plain").send("Internal Server Error"); // Send a generic error message
    });

    return app;
}
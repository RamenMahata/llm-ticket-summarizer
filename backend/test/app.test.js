import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

import { createApp } from "../src/app.js";

function parseEvents(text) {
  return text
    .trim()
    .split("\n\n")
    .map((event) => event.replace(/^data: /, ""));
}

test("POST /api/chat streams generated deltas and completes", async () => {
  let receivedMessages;
  const app = createApp({
    summarizeService: {
      async *streamChat(messages) {
        receivedMessages = messages;
        yield "Checkout is failing";
        yield " with a server error.";
      },
    },
  });

  const response = await request(app)
    .post("/api/chat")
    .type("text/plain")
    .send("The checkout page returns a 500 error.");

  assert.equal(response.status, 200);
  assert.match(response.headers["content-type"], /^text\/event-stream/);
  assert.deepEqual(receivedMessages, [
    {
      role: "user",
      parts: [{text: "The checkout page returns a 500 error."}],
    },
  ]);

  const events = parseEvents(response.text);
  assert.deepEqual(events.slice(0, 2).map(JSON.parse), [
    {choices: [{delta: {content: "Checkout is failing"}}]},
    {choices: [{delta: {content: " with a server error."}}]},
  ]);
  assert.equal(events[2], "[DONE]");

  const history = await request(app).get("/api/history");
  assert.deepEqual(history.body, [
    {role: "user", content: "The checkout page returns a 500 error."},
    {role: "assistant", content: "Checkout is failing with a server error."},
  ]);
});

test("POST /api/chat rejects an empty ticket before streaming", async () => {
  const service = {
    streamChat: async function* () {
      throw new Error("streamChat should not be called");
    },
  };

  const app = createApp({
    summarizeService: service,
  });

  const response = await request(app)
    .post("/api/chat")
    .type("text/plain")
    .send("   ");

  assert.equal(response.status, 400);

  assert.equal(
    response.text,
    "Ticket content is required.",
  );
});

test("POST /api/chat does not commit history when streaming fails", async () => {
  const service = {
    async *streamChat() {
      yield "Partial response";
      throw new Error("LLM service failed");
    },
  };

  const app = createApp({
    summarizeService: service,
  });

  const response = await request(app)
    .post("/api/chat")
    .type("text/plain")
    .send("The payment service is failing.");

  assert.equal(response.status, 200);
  assert.deepEqual(parseEvents(response.text).map(JSON.parse), [
    {choices: [{delta: {content: "Partial response"}}]},
  ]);

  const historyResponse = await request(app).get("/api/history");
  assert.deepEqual(historyResponse.body, []);
});

test("POST /api/chat includes previous messages in the next request", async () => {
  const requests = [];
  const app = createApp({
    summarizeService: {
      async *streamChat(messages) {
        requests.push(messages);
        yield `Reply ${requests.length}`;
      },
    },
  });

  await request(app)
    .post("/api/chat")
    .type("text/plain")
    .send("My name is Alex.");

  await request(app)
    .post("/api/chat")
    .type("text/plain")
    .send("What is my name?");

  assert.deepEqual(requests[1], [
    {
      role: "user",
      parts: [{text: "My name is Alex."}],
    },
    {
      role: "model",
      parts: [{text: "Reply 1"}],
    },
    {
      role: "user",
      parts: [{text: "What is my name?"}],
    },
  ]);
});

test("DELETE /api/history clears conversation history", async () => {
  const app = createApp({
    summarizeService: {
      async *streamChat() {
        yield "Reply";
      },
    },
  });

  await request(app)
    .post("/api/chat")
    .type("text/plain")
    .send("Remember this message.");

  const response = await request(app)
    .delete("/api/history");

  assert.equal(response.status, 204);

  const historyResponse = await request(app)
    .get("/api/history");

  assert.deepEqual(historyResponse.body, []);
});
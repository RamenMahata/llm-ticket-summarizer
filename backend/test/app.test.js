import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

import { createApp } from "../src/app.js";

const service = {
  summarize: async (messages) => {
    assert.deepEqual(messages, [
      {
        role: "user",
        parts: [{text: "The checkout page returns a 500 error."}],
      },
    ]);

    return "Checkout is failing with a server error.\nThe issue blocks purchases.";
  },
};

const app = createApp({
    summarizeService: service,
});

test("POST /api/summarize returns the generated plain-text summary", async () => {
  const response = await request(app)
    .post("/api/summarize")
    .type("text/plain")
    .send("The checkout page returns a 500 error.");

  assert.equal(response.status, 200);

  assert.match(
    response.headers["content-type"],
    /^text\/plain/,
  );

  assert.equal(
    response.text,
    "Checkout is failing with a server error.\nThe issue blocks purchases.",
  );
});

test("POST /api/summarize rejects an empty ticket", async () => {
  const service = {
    summarize: async () => {
      throw new Error("summarize should not be called");
    },
  };

  const app = createApp({
    summarizeService: service,
  });

  const response = await request(app)
    .post("/api/summarize")
    .type("text/plain")
    .send("   ");

  assert.equal(response.status, 400);

  assert.equal(
    response.text,
    "Ticket content is required.",
  );
});

test("POST /api/summarize returns 500 when summarization fails", async () => {
  const service = {
    summarize: async () => {
      throw new Error("LLM service failed");
    },
  };

  const app = createApp({
    summarizeService: service,
  });

  const response = await request(app)
    .post("/api/summarize")
    .type("text/plain")
    .send("The payment service is failing.");

  assert.equal(response.status, 500);

  assert.equal(
    response.text,
    "Internal Server Error",
  );
});

test("POST /api/summarize includes previous messages in the next request", async () => {
  const requests = [];
  const app = createApp({
    summarizeService: {
      summarize: async (messages) => {
        requests.push(messages);
        return `Reply ${requests.length}`;
      },
    },
  });

  await request(app)
    .post("/api/summarize")
    .type("text/plain")
    .send("My name is Alex.");

  await request(app)
    .post("/api/summarize")
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
      summarize: async () => "Reply",
    },
  });

  await request(app)
    .post("/api/summarize")
    .type("text/plain")
    .send("Remember this message.");

  const response = await request(app)
    .delete("/api/history");

  assert.equal(response.status, 204);

  const historyResponse = await request(app)
    .get("/api/history");

  assert.deepEqual(historyResponse.body, []);
});
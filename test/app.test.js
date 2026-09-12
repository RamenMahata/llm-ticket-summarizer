import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";

import { createApp } from "../src/app.js";

const service = {
  summarize: async (ticket) => {
    assert.equal(ticket, "The checkout page returns a 500 error.");

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
    "An error occurred while summarizing the ticket.",
  );
});
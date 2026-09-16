import assert from "node:assert/strict";
import test from "node:test";

import { createSummarizeService } from "../src/summarizeService.js";

test("streamChat yields Gemini text chunks in order", async () => {
  let request;

  const client = {
    models: {
      generateContentStream: async function* (input) {
        request = input;
        yield {text: "Line one."};
        yield {text: ""};
        yield {text: "\nLine two."};
      },
    },
  };

  const service = createSummarizeService({
    client,
    model: "test-model",
  });

  const messages = [
    {
      role: "user",
      parts: [{text: "Printer is offline."}],
    },
  ];

  const result = [];
  for await (const chunk of service.streamChat(messages)) {
    result.push(chunk);
  }

  assert.deepEqual(result, ["Line one.", "\nLine two."]);
  assert.equal(request.model, "test-model");
  assert.deepEqual(request.contents, messages);
  assert.match(request.config.systemInstruction, /blunt but caring friend/);
  assert.match(request.config.systemInstruction, /clean GitHub-Flavored Markdown/);
  assert.match(request.config.systemInstruction, /fenced code blocks/);
});

test("streamChat throws when Gemini returns an empty response", async () => {
  const client = {
    models: {
      generateContentStream: async function* () {
        yield {text: ""};
      },
    },
  };

  const service = createSummarizeService({
    client,
    model: "test-model",
  });

  await assert.rejects(
    async () => {
      for await (const _chunk of service.streamChat("Printer is offline.")) {
      }
    },
    {
        message: "No output text received from Gemini API",
    },
  );
});
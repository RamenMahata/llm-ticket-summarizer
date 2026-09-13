import assert from "node:assert/strict";
import test from "node:test";

import { createSummarizeService } from "../src/summarizeService.js";

test("summarize sends the expected prompt and model to Gemini", async () => {
  let request;

  const client = {
    models: {
      generateContent: async (input) => {
        request = input;

        return {
          text: "Line one.\nLine two.",
        };
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

  const result = await service.summarize(messages);

  assert.equal(result, "Line one.\nLine two.");

  assert.equal(request.model, "test-model");
  assert.deepEqual(request.contents, messages);
  assert.match(request.config.systemInstruction, /blunt but caring friend/);
});

test("summarize throws when Gemini returns an empty response", async () => {
  const client = {
    models: {
      generateContent: async () => {
        return {
          text: "",
        };
      },
    },
  };

  const service = createSummarizeService({
    client,
    model: "test-model",
  });

  await assert.rejects(
    () => service.summarize("Printer is offline."),
    {
        message: "No output text received from Gemini API",
    },
  );
});
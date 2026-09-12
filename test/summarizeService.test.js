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

  const result = await service.summarize("Printer is offline.");

  assert.equal(result, "Line one.\nLine two.");

  assert.deepEqual(request, {
  model: "test-model",
  contents:
    "Summarize the following ticket in a concise manner:\n\nPrinter is offline.",
});
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
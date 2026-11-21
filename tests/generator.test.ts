import assert from "node:assert/strict";
import test from "node:test";
import { createBatches, generateBatch, validateQuestion } from "../lib/generator";

const question = {
  question: "What does a binary digit represent?",
  options: ["A bit", "A byte", "A word", "A kilobyte"],
  correct_index: 0,
  explanation: "A bit represents a single binary digit.",
  option_explanations: ["A bit is one binary digit.", "A byte contains multiple digits.", "A word combines multiple bits.", "A kilobyte represents many bytes."],
};

test("validates options, correct index, and option-specific review", () => {
  assert.deepEqual(validateQuestion(question), question);
  assert.equal(validateQuestion({ ...question, options: ["A", " B ", "b", "D"] }), null);
  assert.equal(validateQuestion({ ...question, correct_index: "0" }), null);
  assert.equal(validateQuestion({ ...question, correct_index: 4 }), null);
  assert.equal(validateQuestion({ ...question, option_explanations: [] }), null);
});

test("generation batches cover the entire study document", () => {
  const text = ["BEGIN", "middle of the document ".repeat(4000), "END"].join("\n");
  const batches = createBatches(text, 45);
  assert.equal(batches.reduce((sum, batch) => sum + batch.count, 0), 45);
  assert.ok(batches[0].source.includes("BEGIN"));
  assert.ok(batches.at(-1)?.source.includes("END"));
  assert.ok(batches.every((batch) => batch.count <= 10));
});

test("provider adapter handles structured responses and drops malformed questions", async (t) => {
  const mocked = t.mock.method(globalThis, "fetch", async () => Response.json({
    choices: [{ message: { content: JSON.stringify([question, { ...question, options: [] }]) } }],
  }));
  const provider = { name: "OpenRouter" as const, key: "test-only", model: "test-model" };
  const result = await generateBatch(provider, createBatches("A bit is a single binary digit.", 2)[0], [], new AbortController().signal);
  assert.deepEqual(result, [question]);
  assert.equal(mocked.mock.callCount(), 1);
});

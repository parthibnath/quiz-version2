import assert from "node:assert/strict";
import test from "node:test";
import { generateFallbackQuestions, validateQuestion } from "../lib/generator";

test("rejects malformed question shapes", () => {
  assert.equal(validateQuestion({ questionText: "Too short", options: ["A"], correctIndex: 0, explanation: "Why" }), null);
});

test("accepts exactly four valid options", () => {
  const question = validateQuestion({
    questionText: "Which statement is correct?",
    options: ["A", "B", "C", "D"],
    correctIndex: 2,
    explanation: "The source supports option C.",
  });
  assert.equal(question?.options.length, 4);
  assert.equal(question?.correctIndex, 2);
});

test("fallback generation preserves the MCQ contract", () => {
  const questions = generateFallbackQuestions("This is a sufficiently long study sentence about biology and cells.", 3);
  assert.equal(questions.length, 3);
  assert.ok(questions.every((question) => question.options.length === 4 && question.correctIndex >= 0 && question.correctIndex <= 3));
});

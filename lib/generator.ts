import { saveQuestions, QuestionItem } from "./store";

export interface RawGeneratedQuestion {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export function validateQuestion(raw: any): RawGeneratedQuestion | null {
  if (!raw || typeof raw !== "object") return null;

  const questionText = String(raw.questionText || raw.question || "").trim();
  const explanation = String(raw.explanation || "").trim();
  const options = raw.options;
  const correctIndex = Number(raw.correctIndex ?? raw.correct_index ?? raw.answerIndex);

  if (!questionText || questionText.length < 5) return null;
  if (!explanation || explanation.length < 5) return null;
  if (!Array.isArray(options) || options.length !== 4) return null;

  const cleanOptions = options.map((opt) => String(opt || "").trim());
  if (cleanOptions.some((opt) => opt.length === 0)) return null;

  if (isNaN(correctIndex) || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex > 3) return null;
  if (new Set(cleanOptions.map((option) => option.toLowerCase())).size !== 4) return null;

  return {
    questionText,
    options: cleanOptions,
    correctIndex: Math.floor(correctIndex),
    explanation,
  };
}

export function generateFallbackQuestions(
  text: string,
  targetCount: number = 50
): RawGeneratedQuestion[] {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const pool = (sentences.length > 0 ? sentences : [text])
    .flatMap((sentence) => {
      const clauses = sentence.split(/[;:]\s+/).map((part) => part.trim()).filter((part) => part.length > 25);
      return clauses.length > 1 ? [sentence, ...clauses] : [sentence];
    })
    .filter((sentence, index, all) => all.indexOf(sentence) === index);
  const questions: RawGeneratedQuestion[] = [];

  let idx = 0;
  while (questions.length < targetCount) {
    const sentence = pool[idx % pool.length];
    const words = sentence.split(" ").filter((w) => w.length > 3);
    const targetWord = words[0] || "concept";

    const qNum = questions.length + 1;
    const questionText = `Which statement is supported by the study material about "${targetWord}"?`;
    
    const correctOpt = `The material explains that ${sentence.slice(0, 120)}${sentence.length > 120 ? "..." : ""}`;
    const distractor1 = `It contradicts the primary assertion regarding ${targetWord}.`;
    const distractor2 = `It only applies in unverified secondary cases.`;
    const distractor3 = `It describes an unrelated concept outside this material.`;

    // Rotate correctIndex 0..3
    const correctIndex = questions.length % 4;
    const options: string[] = ["", "", "", ""];
    options[correctIndex] = correctOpt;

    const distractors = [distractor1, distractor2, distractor3];
    let dIdx = 0;
    for (let i = 0; i < 4; i++) {
      if (i !== correctIndex) {
        options[i] = distractors[dIdx++];
      }
    }

    questions.push({
      questionText,
      options,
      correctIndex,
      explanation: `This answer is supported directly by the study material: "${sentence.slice(0, 140)}".`,
    });

    idx++;
  }

  return questions;
}

export async function generateQuestionsFromLLM(
  extractedText: string,
  count: number = 50
): Promise<RawGeneratedQuestion[]> {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY;
  const allowFallback = process.env.NODE_ENV !== "production";

  if (!apiKey) {
    if (!allowFallback) {
      throw new Error("QUESTION GENERATION PROVIDER IS NOT CONFIGURED.");
    }
    return generateFallbackQuestions(extractedText, count);
  }

  const prompt = `You are an expert educational test author. Generate exactly ${count} multiple-choice questions (MCQs) based on the following study text.
  
RULES:
1. Return strictly a JSON array of objects. Do NOT include markdown code fences or conversational text.
2. Each object must have:
   - "questionText": clear question string
   - "options": array of EXACTLY 4 distinct string choices
   - "correctIndex": integer 0, 1, 2, or 3 corresponding to the correct option index
   - "explanation": clear explanation of why the correct option is right
3. Ensure high quality and factual accuracy based ONLY on the source text.

SOURCE TEXT:
${extractedText.slice(0, 12000)}
`;

  try {
    const isAnthropicKey = apiKey.startsWith("sk-ant-");
    let responseText = "";

    if (isAnthropicKey) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 8192,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) throw new Error("QUESTION GENERATION PROVIDER REQUEST FAILED.");
      const data = await res.json();
      responseText = data.content?.[0]?.text || "";
    } else {
      // OpenRouter API call
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-sonnet",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      });

      if (!res.ok) throw new Error("QUESTION GENERATION PROVIDER REQUEST FAILED.");
      const data = await res.json();
      responseText = data.choices?.[0]?.message?.content || "";
    }

    if (!responseText) {
      if (!allowFallback) throw new Error("QUESTION GENERATION PROVIDER RETURNED NO CONTENT.");
      return generateFallbackQuestions(extractedText, count);
    }

    // Strip markdown formatting if LLM included ```json ... ```
    const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const cleanJson = jsonMatch ? jsonMatch[0] : responseText;

    const parsed = JSON.parse(cleanJson);
    if (!Array.isArray(parsed)) {
      if (!allowFallback) throw new Error("QUESTION GENERATION RETURNED INVALID STRUCTURE.");
      return generateFallbackQuestions(extractedText, count);
    }

    const validQuestions: RawGeneratedQuestion[] = [];
    for (const item of parsed) {
      const validated = validateQuestion(item);
      if (validated) {
        validQuestions.push(validated);
      }
    }

    if (validQuestions.length < count) {
      if (!allowFallback) {
        throw new Error("QUESTION GENERATION RETURNED TOO FEW VALID QUESTIONS.");
      }
      // Top up with heuristic questions if LLM generated fewer than expected
      const extraNeeded = count - validQuestions.length;
      const extraFallback = generateFallbackQuestions(extractedText, extraNeeded);
      return [...validQuestions, ...extraFallback];
    }

    return validQuestions.slice(0, count);
  } catch (err) {
    if (!allowFallback) {
      throw new Error("QUESTION GENERATION FAILED. PLEASE TRY AGAIN.");
    }
    return generateFallbackQuestions(extractedText, count);
  }
}

export async function processQuestionGeneration(
  userId: string,
  uploadId: string,
  extractedText: string,
  targetCount: number = 50
): Promise<QuestionItem[]> {
  const rawQuestions = await generateQuestionsFromLLM(extractedText, targetCount);
  if (rawQuestions.length < targetCount) {
    throw new Error(`QUESTION GENERATION PRODUCED ${rawQuestions.length} QUESTIONS; ${targetCount} ARE REQUIRED.`);
  }

  const formattedItems = rawQuestions.map((q) => ({
    userId,
    uploadId,
    questionText: q.questionText,
    options: q.options as [string, string, string, string],
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));

  const savedQuestions = await saveQuestions(formattedItems);
  if (savedQuestions.length !== targetCount) {
    throw new Error(`ONLY ${savedQuestions.length} QUESTIONS COULD BE SAVED; ${targetCount} ARE REQUIRED.`);
  }
  return savedQuestions;
}

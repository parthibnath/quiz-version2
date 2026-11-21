import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

type Attempt = {
  id: string;
  question_ids: string[];
  total: number;
  score: number;
  status: string;
  user_answers: Record<string, number>;
  incorrect_list: { whyUserWasWrong: string }[];
};

test("SQL migration, owner isolation, non-repeating practice, atomic scoring, and final progression", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    `);
    const schema = await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8");
    await db.exec(schema);
    await db.exec(schema);

    const user = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const other = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const upload = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    await db.query("insert into auth.users (id, email) values ($1, 'first@example.test'), ($2, 'second@example.test')", [user, other]);
    await db.query("insert into public.uploads (id,user_id,file_name,file_type,extracted_text,status) values ($1,$2,'notes.txt','text','Test material','done')", [upload, user]);
    await db.exec("set role authenticated");
    await assert.rejects(db.query("select correct_index from public.questions"), /permission denied/);
    await assert.rejects(db.query("select public.quiz_start_session(gen_random_uuid(), 1)"), /permission denied/);
    await db.exec("set role service_role");

    const start = async (number: number) => (await db.query<Attempt>("select * from public.quiz_start_session($1, $2)", [user, number])).rows[0];
    const submit = async (id: string, answers: Record<string, number>, owner = user) =>
      (await db.query<Attempt>("select * from public.quiz_submit_session($1, $2, $3)", [owner, id, JSON.stringify(answers)])).rows[0];

    await assert.rejects(start(11), /SESSION_LOCKED/);
    await assert.rejects(start(1), /INSUFFICIENT_QUESTIONS/);
    const bank = Array.from({ length: 500 }, (_, index) => ({
      question: `Study question ${index}?`,
      options: ["A", "B", "C", "D"],
      correct_index: 0,
      explanation: "The source supports A.",
      option_explanations: ["A is supported.", "B contradicts the source.", "C contradicts the source.", "D contradicts the source."],
    }));
    const save = (questions: typeof bank) => db.query<{ added: number }>("select public.quiz_add_questions($1, $2, $3) as added", [user, upload, JSON.stringify(questions)]);
    assert.equal((await save(bank)).rows[0].added, 500);
    assert.equal((await save([{ ...bank[0], question: "study  question 0!" }, bank[1]])).rows[0].added, 0);
    const seen = new Set<string>();
    for (let number = 1; number <= 10; number++) {
      const attempt = await start(number);
      assert.equal(attempt.total, 50);
      assert.ok(attempt.question_ids.every((id) => !seen.has(id)));
      attempt.question_ids.forEach((id) => seen.add(id));
      assert.equal((await start(number)).id, attempt.id);
      const choices = Object.fromEntries(attempt.question_ids.map((id, index) => [id, index === 0 ? 1 : 0]));
      if (number === 1) {
        await assert.rejects(start(2), /SESSION_LOCKED/);
        await assert.rejects(submit(attempt.id, {}), /INVALID_ANSWERS/);
        await assert.rejects(submit(attempt.id, choices, other), /SESSION_NOT_FOUND/);
        await db.query("select public.quiz_save_answer($1,$2,$3,$4)", [user, attempt.id, attempt.question_ids[0], 1]);
        assert.equal((await start(1)).user_answers[attempt.question_ids[0]], 1);
      }
      const done = await submit(attempt.id, choices);
      assert.equal(done.score, 49);
      assert.equal(done.incorrect_list[0].whyUserWasWrong, "B contradicts the source.");
      assert.equal((await submit(attempt.id, {})).score, 49);
    }
    const final = await start(11);
    assert.equal(new Set(final.question_ids).size, 100);
    assert.ok(final.question_ids.every((id) => seen.has(id)));
    const done = await submit(final.id, Object.fromEntries(final.question_ids.map((id) => [id, 0])));
    assert.equal(done.score, 100);
    const profile = (await db.query<{ cumulative_score: number; session_11_completed: boolean; attempts: number }>(
      "select cumulative_score, session_11_completed, jsonb_array_length(session_history) as attempts from public.profiles where id = $1", [user],
    )).rows[0];
    assert.deepEqual(profile, { cumulative_score: 590, session_11_completed: true, attempts: 11 });
  } finally {
    await db.close();
  }
});

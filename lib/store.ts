import crypto from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function throwStoreError(error: unknown): never {
  const supabaseError = error as { code?: string; message?: string };
  if (supabaseError.code === "PGRST205") {
    throw new Error(
      "Supabase database schema is not initialized. Run supabase/schema.sql in the Supabase SQL Editor.",
    );
  }
  throw new Error(
    supabaseError.message || "Supabase database request failed.",
  );
}

export interface QuestionItem { id: string; userId: string; uploadId: string; questionText: string; options: [string, string, string, string]; correctIndex: number; explanation: string; createdAt: string; }
export interface UploadItem { id: string; userId: string; fileName: string; fileType: "pdf" | "image" | "text" | "camera"; extractedText: string; status: "done" | "failed"; createdAt: string; }
export interface IncorrectReviewItem { questionId: string; questionText: string; userChoiceIndex: number; userChoiceText: string; correctChoiceIndex: number; correctChoiceText: string; explanation: string; whyUserWasWrong: string; }
export interface UserProfile { cumulativeScore: number; sessionsCompleted: number[]; session11Completed: boolean; sessionHistory: Array<{ sessionNumber: number; score: number; total: number; completedAt: string }>; }
export interface User { id: string; email: string; passwordHash: string; name: string; createdAt: string; profile: UserProfile; }
export interface SessionItem { id: string; userId: string; sessionNumber: number; questionIds: string[]; userAnswers: Record<string, number>; status: "in_progress" | "completed"; score: number; total: number; createdAt: string; completedAt?: string; incorrectList?: IncorrectReviewItem[]; }

const mapUser = (row: any): User | null => row ? ({ id: row.id, email: row.email, passwordHash: "", name: row.display_name || row.email, createdAt: row.created_at, profile: { cumulativeScore: row.cumulative_score, sessionsCompleted: row.sessions_completed || [], session11Completed: row.session_11_completed, sessionHistory: row.session_history || [] } }) : null;
const mapUpload = (row: any): UploadItem => ({ id: row.id, userId: row.user_id, fileName: row.file_name, fileType: row.file_type, extractedText: row.extracted_text, status: row.status, createdAt: row.created_at });
const mapQuestion = (row: any): QuestionItem => ({ id: row.id, userId: row.user_id, uploadId: row.upload_id, questionText: row.question_text, options: row.options, correctIndex: row.correct_index, explanation: row.explanation, createdAt: row.created_at });
const mapSession = (row: any): SessionItem => ({ id: row.id, userId: row.user_id, sessionNumber: row.session_number, questionIds: row.question_ids, userAnswers: row.user_answers || {}, status: row.status, score: row.score, total: row.total, createdAt: row.created_at, completedAt: row.completed_at || undefined, incorrectList: row.incorrect_list || undefined });

export function hashPassword(password: string): string { const salt = crypto.randomBytes(16).toString("hex"); return `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`; }
export function verifyPassword(): boolean { return false; }

export async function findUserByEmail(email: string): Promise<User | null> {
  const { data, error } = await createSupabaseAdminClient().from("profiles").select("*").eq("id", email).maybeSingle();
  if (error) throwStoreError(error);
  return mapUser(data);
}
export async function findUserById(id: string): Promise<User | null> {
  const { data, error } = await createSupabaseAdminClient().from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throwStoreError(error);
  return mapUser(data);
}
export async function createUser(): Promise<never> { throw new Error("Create users through Supabase Auth."); }

export async function createUpload(userId: string, fileName: string, fileType: UploadItem["fileType"], extractedText: string, status: UploadItem["status"] = "done"): Promise<UploadItem> {
  const { data, error } = await createSupabaseAdminClient().from("uploads").insert({ user_id: userId, file_name: fileName, file_type: fileType, extracted_text: extractedText, status }).select().single();
  if (error) throw error;
  return mapUpload(data);
}
export async function getUploadsByUserId(userId: string): Promise<UploadItem[]> { const { data, error } = await createSupabaseAdminClient().from("uploads").select("*").eq("user_id", userId).order("created_at", { ascending: false }); if (error) throw error; return (data || []).map(mapUpload); }
export async function getUploadById(id: string): Promise<UploadItem | null> { const { data, error } = await createSupabaseAdminClient().from("uploads").select("*").eq("id", id).maybeSingle(); if (error) throw error; return data ? mapUpload(data) : null; }
export async function saveQuestions(items: Array<Omit<QuestionItem, "id" | "createdAt">>): Promise<QuestionItem[]> { const rows = items.filter((item) => item.options.length === 4 && Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex <= 3 && item.questionText.trim() && item.explanation.trim()).map((item) => ({ user_id: item.userId, upload_id: item.uploadId, question_text: item.questionText.trim(), options: item.options.map((option) => option.trim()), correct_index: item.correctIndex, explanation: item.explanation.trim() })); if (!rows.length) return []; const { data, error } = await createSupabaseAdminClient().from("questions").insert(rows).select(); if (error) throw error; return (data || []).map(mapQuestion); }
export async function getQuestionsByUserId(userId: string): Promise<QuestionItem[]> { const { data, error } = await createSupabaseAdminClient().from("questions").select("*").eq("user_id", userId); if (error) throw error; return (data || []).map(mapQuestion); }
export async function getQuestionById(id: string): Promise<QuestionItem | null> { const { data, error } = await createSupabaseAdminClient().from("questions").select("*").eq("id", id).maybeSingle(); if (error) throw error; return data ? mapQuestion(data) : null; }

export function isSessionUnlocked(user: User, number: number): boolean { if (number === 1) return true; const completed = new Set(user.profile.sessionsCompleted); return number === 11 ? Array.from({ length: 10 }, (_, i) => i + 1).every((n) => completed.has(n)) : completed.has(number - 1); }
export async function createSession(userId: string, sessionNumber: number): Promise<SessionItem> { const user = await findUserById(userId); if (!user) throw new Error("User not found"); if (!isSessionUnlocked(user, sessionNumber)) throw new Error("SESSION IS LOCKED."); const total = sessionNumber === 11 ? 100 : 50; const pool = await getQuestionsByUserId(userId); if (pool.length < total) throw new Error(`NOT ENOUGH VALID QUESTIONS. THIS SESSION REQUIRES ${total}, BUT YOUR QUESTION BANK HAS ${pool.length}.`); const questionIds = pool.sort(() => 0.5 - Math.random()).slice(0, total).map((q) => q.id); const { data, error } = await createSupabaseAdminClient().from("sessions").insert({ user_id: userId, session_number: sessionNumber, question_ids: questionIds, total, status: "in_progress" }).select().single(); if (error) throw error; return mapSession(data); }
export async function getSessionById(id: string): Promise<SessionItem | null> { const { data, error } = await createSupabaseAdminClient().from("sessions").select("*").eq("id", id).maybeSingle(); if (error) throw error; return data ? mapSession(data) : null; }
export async function submitSessionAnswers(id: string, answers: Record<string, number>) { const session = await getSessionById(id); if (!session) throw new Error("Session not found"); if (session.status === "completed") return { session, score: session.score, total: session.total, incorrectList: session.incorrectList || [] }; const questions = (await Promise.all(session.questionIds.map(getQuestionById))).filter((q): q is QuestionItem => q !== null); if (questions.length !== session.total) throw new Error("SESSION CONTAINS A MISSING QUESTION."); let score = 0; const incorrectList: IncorrectReviewItem[] = []; for (const question of questions) { const choice = answers[question.id]; if (!Number.isInteger(choice) || choice < 0 || choice > 3) throw new Error("INVALID ANSWER PAYLOAD."); if (choice === question.correctIndex) score++; else incorrectList.push({ questionId: question.id, questionText: question.questionText, userChoiceIndex: choice, userChoiceText: question.options[choice], correctChoiceIndex: question.correctIndex, correctChoiceText: question.options[question.correctIndex], explanation: question.explanation, whyUserWasWrong: question.explanation }); } const completedAt = new Date().toISOString(); const user = await findUserById(session.userId); if (!user) throw new Error("User not found"); const completed = new Set(user.profile.sessionsCompleted); if (session.sessionNumber === 11) user.profile.session11Completed = true; else { completed.add(session.sessionNumber); user.profile.sessionsCompleted = Array.from(completed).sort((a, b) => a - b); } user.profile.cumulativeScore += score; user.profile.sessionHistory.push({ sessionNumber: session.sessionNumber, score, total: session.total, completedAt }); const client = createSupabaseAdminClient(); const { error: profileError } = await client.from("profiles").update({ cumulative_score: user.profile.cumulativeScore, sessions_completed: user.profile.sessionsCompleted, session_11_completed: user.profile.session11Completed, session_history: user.profile.sessionHistory }).eq("id", session.userId); if (profileError) throw profileError; const { error } = await client.from("sessions").update({ user_answers: answers, status: "completed", score, completed_at: completedAt, incorrect_list: incorrectList }).eq("id", id).eq("status", "in_progress"); if (error) throw error; const updated = (await getSessionById(id))!; return { session: updated, score, total: updated.total, incorrectList };
}

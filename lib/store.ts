import { ApiError } from "./api";
import { createSupabaseAdminClient } from "./supabase/admin";

export type FileType = "pdf" | "image" | "text" | "camera";

type UploadRow = {
  id: string;
  file_name: string;
  file_type: FileType;
  extracted_text: string;
};

type HistoryEntry = {
  sessionNumber: number;
  score: number;
  total: number;
  completedAt: string;
  sessionId?: string;
};

type ProfileRow = {
  display_name: string | null;
  cumulative_score: number;
  sessions_completed: number[];
  session_11_completed: boolean;
  session_history: HistoryEntry[];
};

export type PublicQuestion = { id: string; question_text: string; options: string[] };

export type SessionRow = {
  id: string;
  session_number: number;
  question_ids: string[];
  user_answers: Record<string, number>;
  status: "in_progress" | "completed";
  score: number;
  total: number;
  incorrect_list: unknown[] | null;
};

function handleDatabaseError(error: { message: string; code?: string }): never {
  switch (error.message) {
    case "SESSION_LOCKED":
      throw new ApiError(403, "Complete the previous sessions to unlock this session.");
    case "INSUFFICIENT_QUESTIONS":
      throw new ApiError(409, "Your bank needs more unique questions for this session. Generate more from your notes or add new study material.");
    case "SESSION_NOT_FOUND":
    case "UPLOAD_NOT_FOUND":
      throw new ApiError(404, "This item could not be found.");
    case "INVALID_ANSWERS":
      throw new ApiError(400, "Answer every question with a valid option before submitting.");
    default:
      throw new Error(`Supabase request failed (${error.code ?? "unknown"}): ${error.message}`);
  }
}

export async function checkDatabase() {
  const { error } = await createSupabaseAdminClient().from("sessions").select("id").limit(1);
  if (error) handleDatabaseError(error);
}

export async function createUpload(userId: string, fileName: string, fileType: FileType, text: string) {
  const { data, error } = await createSupabaseAdminClient().from("uploads")
    .insert({ user_id: userId, file_name: fileName, file_type: fileType, extracted_text: text, status: "done" })
    .select("id,file_name,file_type,extracted_text").single<UploadRow>();
  if (error) handleDatabaseError(error);
  return data;
}

export async function getUpload(userId: string, id: string) {
  const { data, error } = await createSupabaseAdminClient().from("uploads")
    .select("id,file_name,file_type,extracted_text").eq("user_id", userId).eq("id", id)
    .eq("status", "done").maybeSingle<UploadRow>();
  if (error) handleDatabaseError(error);
  return data;
}

export async function getRecentQuestions(userId: string, uploadId: string) {
  const { data, error } = await createSupabaseAdminClient().from("questions")
    .select("question_text").eq("user_id", userId).eq("upload_id", uploadId)
    .order("created_at", { ascending: false }).limit(150);
  if (error) handleDatabaseError(error);
  return data.map((row) => row.question_text as string);
}

type GeneratedRow = {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  option_explanations: string[];
};

export async function saveQuestions(userId: string, uploadId: string, questions: GeneratedRow[]) {
  const { data, error } = await createSupabaseAdminClient()
    .rpc("quiz_add_questions", { p_user: userId, p_upload: uploadId, p_questions: questions });
  if (error) handleDatabaseError(error);
  return data as number;
}

export async function getDashboard(userId: string) {
  const db = createSupabaseAdminClient();
  const [profile, uploads, count, active, completed] = await Promise.all([
    db.from("profiles").select("display_name,cumulative_score,sessions_completed,session_11_completed,session_history")
      .eq("id", userId).single<ProfileRow>(),
    db.from("uploads").select("id,file_name").eq("user_id", userId).eq("status", "done")
      .order("created_at", { ascending: false }).limit(20),
    db.from("questions").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db.from("sessions").select("session_number").eq("user_id", userId).eq("status", "in_progress"),
    db.from("sessions").select("id,session_number,score,total,completed_at").eq("user_id", userId)
      .eq("status", "completed").order("completed_at", { ascending: false }).limit(10),
  ]);
  if (profile.error) handleDatabaseError(profile.error);
  if (uploads.error) handleDatabaseError(uploads.error);
  if (count.error) handleDatabaseError(count.error);
  if (active.error) handleDatabaseError(active.error);
  if (completed.error) handleDatabaseError(completed.error);
  return { profile: profile.data, uploads: uploads.data, questionCount: count.count ?? 0, active: active.data, completed: completed.data };
}

export async function createSession(userId: string, sessionNumber: number) {
  const { data, error } = await createSupabaseAdminClient()
    .rpc("quiz_start_session", { p_user: userId, p_number: sessionNumber }).single<SessionRow>();
  if (error) handleDatabaseError(error);
  return data;
}

export async function getSession(userId: string, id: string) {
  const { data, error } = await createSupabaseAdminClient().from("sessions")
    .select("id,session_number,question_ids,user_answers,status,score,total,incorrect_list")
    .eq("user_id", userId).eq("id", id).maybeSingle<SessionRow>();
  if (error) handleDatabaseError(error);
  if (!data) throw new ApiError(404, "This session could not be found.");
  return data;
}

export async function getSessionQuestions(userId: string, session: SessionRow) {
  const { data, error } = await createSupabaseAdminClient().from("questions")
    .select("id,question_text,options").eq("user_id", userId).in("id", session.question_ids)
    .returns<PublicQuestion[]>();
  if (error) handleDatabaseError(error);
  const byId = new Map(data.map((question) => [question.id, question]));
  return session.question_ids.map((id) => {
    const question = byId.get(id);
    if (!question) throw new ApiError(409, "A question is missing from this saved session.");
    return { id, questionText: question.question_text, options: question.options };
  });
}

export async function saveAnswer(userId: string, sessionId: string, questionId: string, choice: number) {
  const { data, error } = await createSupabaseAdminClient()
    .rpc("quiz_save_answer", { p_user: userId, p_session: sessionId, p_question: questionId, p_choice: choice });
  if (error) handleDatabaseError(error);
  if (!data) throw new ApiError(404, "This question is unavailable in the active session.");
}

export async function submitSession(userId: string, id: string, answers: unknown) {
  const { data, error } = await createSupabaseAdminClient()
    .rpc("quiz_submit_session", { p_user: userId, p_session: id, p_answers: answers }).single<SessionRow>();
  if (error) handleDatabaseError(error);
  return data;
}

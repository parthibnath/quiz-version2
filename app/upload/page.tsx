import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { isUuid } from "@/lib/api";
import { getUpload } from "@/lib/store";
import UploadForm from "./UploadForm";

export const metadata = {
  title: "Upload & Generate — MCQ Platform",
  description: "Extract notes and generate multiple-choice questions.",
};

export default async function UploadPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const { source } = await searchParams;
  if (!source) return <UploadForm />;
  if (!isUuid(source)) notFound();
  const upload = await getUpload(session.user.id, source);
  if (!upload) notFound();
  return (
    <UploadForm key={upload.id} initialSource={{
      uploadId: upload.id,
      fileName: upload.file_name,
      fileType: upload.file_type,
      extractedText: upload.extracted_text,
      charCount: upload.extracted_text.length,
    }} />
  );
}

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Navbar } from "./Navbar";

export default async function StudyLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  return <><Navbar user={session.user} />{children}</>;
}

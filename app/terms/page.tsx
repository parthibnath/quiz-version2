import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title: "Terms of Use - Quiz.Platform",
  description: "Terms governing use of Quiz.Platform.",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main>
        <Card>
          <h1>TERMS OF USE</h1>
          <p>Quiz.Platform provides automated study assistance. Generated questions may contain errors and must not be treated as authoritative advice.</p>
          <p>You are responsible for the content you upload, your account credentials, and your use of generated material.</p>
          <p>Do not abuse the service, upload unlawful content, or attempt to access another user&apos;s data.</p>
        </Card>
      </main>
    </>
  );
}

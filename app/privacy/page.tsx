import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/Card";

export const metadata: Metadata = {
  title: "Privacy Policy - Quiz.Platform",
  description: "How Quiz.Platform handles accounts, study materials, and quiz data.",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main>
        <Card>
          <h1>PRIVACY POLICY</h1>
          <p>We store your account, uploaded study material, generated questions, answers, and scores to provide the service.</p>
          <p>Uploaded content is sent to configured extraction and question-generation providers only to deliver requested features. Do not upload confidential material unless you have permission.</p>
          <p>Contact the service operator to request correction or deletion of your account and associated data.</p>
        </Card>
      </main>
    </>
  );
}

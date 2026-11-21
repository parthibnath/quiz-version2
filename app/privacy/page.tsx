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
          <p>We store your account, text extracted from your study materials, generated questions, answers, and scores.</p>
          <p>The app extracts text from files and photos on the server. When you request questions, it sends the extracted text to the configured AI provider. Only upload materials you have permission to use.</p>
          <p>Contact the service operator to request correction or deletion of your account and associated data.</p>
        </Card>
      </main>
    </>
  );
}

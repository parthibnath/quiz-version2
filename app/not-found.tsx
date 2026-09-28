import Link from "next/link";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { SectionTag } from "@/components/SectionTag";
import { Navbar } from "@/components/Navbar";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main>
        <Card accent="magenta" className={styles.card}>
          <SectionTag>404</SectionTag>
          <h1>PAGE NOT FOUND</h1>
          <p className={styles.subtitle}>
            THIS PAGE DOESN&apos;T EXIST. IT MIGHT BE IN A DIFFERENT SESSION.
          </p>
          <Link href="/dashboard">
            <Button variant="primary">RETURN TO DASHBOARD</Button>
          </Link>
        </Card>
      </main>
    </>
  );
}

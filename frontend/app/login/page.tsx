"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login fejlede");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Netværksfejl");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>🔐 Login</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.input}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className={styles.button}
          >
            {isSubmitting ? "Logger ind..." : "Login"}
          </button>

          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </main>
  );
}
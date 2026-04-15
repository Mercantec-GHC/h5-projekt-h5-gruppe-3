import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAuthToken } from "@/lib/auth";
import styles from "./dashboard.module.css";
import LuxLive from "../components/LuxLive";
import { pool } from "@/lib/db";

type Measurement = {
  device_id: string;
  lux: number;
  sun_phase: string;
  solar_angle: number | null;
  status: string;
  recommendation: string;
  created_at: string;
};

async function getLatestMeasurement(): Promise<Measurement | null> {
  const result = await pool.query(
    `SELECT device_id, lux, sun_phase, solar_angle, status, recommendation, created_at
     FROM measurements
     ORDER BY created_at DESC
     LIMIT 1`
  );

  if (result.rows.length === 0) return null;

  return result.rows[0];
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const user = await verifyAuthToken(token);
    const initialData = await getLatestMeasurement();

    return (
      <main className={styles.page}>
        <div className={styles.container}>
          
      

          {/* LUX CARD */}
          {initialData && (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>LATEST LUX READING</h2>
              <LuxLive initialData={initialData} />
            </div>
          )}

        </div>
      </main>
    );
  } catch {
    redirect("/login");
  }
}
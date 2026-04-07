import styles from "../page.module.css";
import LuxLive from "./LuxLive";
import { Pool } from "pg";

type Measurement = {
  device_id: string;
  lux: number;
  sun_phase: string;
  solar_angle: number | null;
  status: string;
  recommendation: string;
  created_at: string;
};

const pool = new Pool({
  connectionString:
    process.env.PG_URL || "postgres://app:apppass@localhost:5432/sensordb",
});

async function getLatestMeasurement(): Promise<Measurement | null> {
  try {
    const result = await pool.query(
      `SELECT device_id, lux, sun_phase, solar_angle, status, recommendation, created_at
       FROM measurements
       ORDER BY created_at DESC
       LIMIT 1`
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as Measurement;
  } catch (error) {
    console.error("Failed to fetch initial measurement:", error);
    return null;
  }
}

export default async function LuxLiveCard() {
  const data = await getLatestMeasurement();

  if (!data) {
    return null;
  }

  return (
    <div className={styles.card}>
      <h1 className={styles.title}>🌞 Lux Monitor</h1>
      <LuxLive initialData={data} />
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import styles from "../page.module.css";

type Measurement = {
  device_id: string;
  lux: number;
  sun_phase: string;
  solar_angle: number | null;
  status: string;
  recommendation: string;
  created_at: string;
};

type LuxLiveProps = {
  initialData: Measurement;
};

function getStatusClass(status: string) {
  switch (status) {
    case "too_dark":
      return styles.statusTooDark;
    case "ok":
      return styles.statusGood;
    case "too_bright":
      return styles.statusTooBright;
    default:
      return styles.statusDefault;
  }
}

function formatSunPhase(phase: string) {
  switch (phase) {
    case "day":
      return "Day";
    case "dawn":
      return "Dawn";
    case "dusk":
      return "Dusk";
    case "night":
      return "Night";
    default:
      return phase;
  }
}

function formatStatus(status: string) {
  switch (status) {
    case "too_dark":
      return "Too Dark";
    case "ok":
      return "Good";
    case "too_bright":
      return "Too Bright";
    default:
      return status;
  }
}

function formatMeasuredAt(dateString: string) {
  return new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(dateString));
}

export default function LuxLive({ initialData }: LuxLiveProps) {
  const [data, setData] = useState<Measurement | null>(initialData);
  const [isPolling, setIsPolling] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/latest", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch latest measurement");
        }

        const json: Measurement = await res.json();
        setData(json);
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };

    if (!isPolling) return;

    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [isPolling]);

  if (!data) return null;

  return (
    <div className={styles.liveCardContent}>
      <div className={styles.heroSection}>
        <p className={styles.eyebrow}>Latest Lux Reading</p>
        <p className={styles.heroValue}>{data.lux}</p>

        <div className={styles.statusPanel}>
          <p className={styles.statusLabel}>Status</p>
          <p className={`${styles.statusText} ${getStatusClass(data.status)}`}>
            {formatStatus(data.status)}
          </p>
        </div>
      </div>

      <div className={styles.metricGrid}>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Device</p>
          <p className={styles.metricValue}>{data.device_id}</p>
        </div>

        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Measured Sun Phase</p>
          <p className={styles.metricValue}>{formatSunPhase(data.sun_phase)}</p>
        </div>

        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Measured Solar Angle</p>
          <p className={styles.metricValue}>
            {data.solar_angle !== null && data.solar_angle !== undefined
              ? `${data.solar_angle.toFixed(1)}°`
              : "—"}
          </p>
        </div>

        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Measured At</p>
          <p className={styles.metricValueSmall}>
            {formatMeasuredAt(data.created_at)}
          </p>
        </div>
      </div>

      <div className={styles.recommendationPanel}>
        <p className={styles.recommendationLabel}>Measurement Recommendation</p>
        <p className={styles.recommendationValue}>{data.recommendation}</p>
      </div>

      <div className={styles.footerRow}>
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => setIsPolling((prev) => !prev)}
        >
          {isPolling ? "Pause Live Updates" : "Resume Live Updates"}
        </button>

        <p className={styles.liveText}>
          Live status: {isPolling ? "ON" : "PAUSED"}
        </p>
      </div>
    </div>
  );
}
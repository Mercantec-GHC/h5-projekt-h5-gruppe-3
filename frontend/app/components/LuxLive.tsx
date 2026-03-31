"use client";

import { useEffect, useState } from "react";
import styles from "../page.module.css";

type Measurement = {
  device_id: string;
  lux: number;
  time_of_day: string;
  status: string;
  recommendation: string;
  created_at: string;
};

function getStatusClass(status: string) {
  switch (status) {
    case "too_dark":
      return styles.statusTooDark;
    case "good":
        return styles.statusGood;
    case "too_bright":
      return styles.statusTooBright;
    default:
      return styles.statusDefault;
  }
}

export default function LuxLive() {
  const [data, setData] = useState<Measurement | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/latest", {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to fetch latest measurement");
        }

        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    if (!isPolling) return;

    const interval = setInterval(fetchData, 2000);

    return () => clearInterval(interval);
  }, [isPolling]);

  if (isLoading && !data) {
    return <p className={styles.empty}>Loading...</p>;
  }

  if (!data) {
    return (
      <div className={styles.content}>
        <p className={styles.empty}>No data available</p>

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
    );
  }

  return (
    <div className={styles.content}>
      <div className={styles.luxSection}>
        <p className={styles.label}>Current Lux</p>
        <p className={styles.luxValue}>{data.lux}</p>
      </div>

      <div className={styles.statusWrapper}>
        <span
          className={`${styles.statusBadge} ${getStatusClass(data.status)}`}
        >
          {data.status.replace("_", " ").toUpperCase()}
        </span>
      </div>

      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <p className={styles.label}>Device</p>
          <p className={styles.value}>{data.device_id}</p>
        </div>

        <div className={styles.infoItem}>
          <p className={styles.label}>Time of day</p>
          <p className={styles.value}>{data.time_of_day}</p>
        </div>
      </div>

      <div className={styles.recommendationBox}>
        <p className={styles.label}>Recommendation</p>
        <p className={styles.value}>{data.recommendation}</p>
      </div>

      <p className={styles.timestamp}>
        {new Date(data.created_at).toLocaleString()}
      </p>

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
  );
}
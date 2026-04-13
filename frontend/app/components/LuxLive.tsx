"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Check, Lightbulb, Circle } from "lucide-react";
import styles from "./LuxLive.module.css";

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

function getStatusIcon(status: string) {
  switch (status) {
    case "ok":
      return <Check size={16} />;
    case "too_dark":
      return <Moon size={16} />;
    case "too_bright":
      return <Sun size={16} />;
    default:
      return null;
  }
}

function getSolarIcon(angle: number | null) {
  if (angle === null) return null;
  return angle >= 0 ? <Sun size={16} /> : <Moon size={16} />;
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

function formatSunPhase(phase: string) {
  return phase.charAt(0).toUpperCase() + phase.slice(1);
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
        console.error(err);
      }
    };

    if (!isPolling) return;

    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [isPolling]);

  if (!data) return null;

  return (
    <div className={styles.card}>
      

      <div className={styles.hero}>
        <div className={styles.heroLeft}>
        

          <div className={styles.heroValueRow}>
            <p className={styles.heroValue}>{data.lux}</p>
            <span className={styles.heroUnit}>lux</span>
          </div>
        </div>

        <div className={`${styles.statusBadge} ${getStatusClass(data.status)}`}>
          {getStatusIcon(data.status)}
          <span>{formatStatus(data.status)}</span>
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Device</span>
          <strong className={styles.detailValue}>{data.device_id}</strong>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Sun Phase</span>
          <strong className={styles.detailValue}>
            {formatSunPhase(data.sun_phase)}
          </strong>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Solar Angle</span>
          <strong className={`${styles.detailValue} ${styles.inlineIcon}`}>
            {getSolarIcon(data.solar_angle)}
            {data.solar_angle !== null ? `${data.solar_angle.toFixed(1)}°` : "—"}
          </strong>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Measured</span>
          <strong className={styles.detailValueMuted}>
            {formatMeasuredAt(data.created_at)}
          </strong>
        </div>
      </div>

      {data.recommendation && (
        <div className={styles.recommendationBox}>
          <div className={styles.recommendationHeader}>
            <Lightbulb size={16} />
            <span className={styles.recommendationLabel}>Recommendation</span>
          </div>
          <p className={styles.recommendationText}>{data.recommendation}</p>
        </div>
      )}

      <div className={styles.footer}>
        <div className={styles.liveState}>
          <Circle
            size={10}
            className={isPolling ? styles.liveActive : styles.livePaused}
            fill="currentColor"
          />
          <span>{isPolling ? "Live updates on" : "Live updates paused"}</span>
        </div>

        <button
          type="button"
          onClick={() => setIsPolling((p) => !p)}
          className={styles.toggleButton}
        >
          {isPolling ? "Pause" : "Resume"}
        </button>
      </div>
    </div>
  );
}
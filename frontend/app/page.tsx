import styles from "./page.module.css";
import LuxLive from "./components/LuxLive";

export default function Home() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>🌞 Lux Monitor</h1>

        <LuxLive />
      </div>
    </main>
  );
}
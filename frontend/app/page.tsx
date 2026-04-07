import styles from "./page.module.css";
import LuxLiveCard from "./components/LuxLiveCard";

export default function Home() {
  return (
    <main className={styles.page}>
      <LuxLiveCard />
    </main>
  );
}
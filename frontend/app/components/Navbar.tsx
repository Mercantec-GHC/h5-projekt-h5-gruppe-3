import Link from "next/link";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import styles from "./Navbar.module.css";

export default async function Navbar() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  let user: { email: string; role: string } | null = null;

  if (token) {
    try {
      const payload = await verifyAuthToken(token);
      user = {
        email: payload.email,
        role: payload.role,
      };
    } catch {
      user = null;
    }
  }

  return (
<header className={styles.header}>
  <div className={styles.inner}>
    
    {/* LEFT SIDE */}
    <div className={styles.left}>
      <Link href="/" className={styles.brand}>
        LUX MONITOR
      </Link>

      <nav className={styles.navLinks}>
        <Link href="/" className={styles.link}>
          Home
        </Link>

        {user && (
          <Link href="/dashboard" className={styles.link}>
            Dashboard
          </Link>
        )}
      </nav>
    </div>

    {/* RIGHT SIDE */}
    <div className={styles.right}>
      {user ? (
        <div className={styles.userBox}>
          <div className={styles.userMeta}>
            <span className={styles.userEmail}>{user.email}</span>
            <span className={styles.userRole}>{user.role}</span>
          </div>

          <form action="/api/auth/logout" method="POST">
            <button type="submit" className={styles.logoutButton}>
              Logout
            </button>
          </form>
        </div>
      ) : (
        <Link href="/login" className={styles.loginButton}>
          Login
        </Link>
      )}
    </div>

  </div>
</header>
  );
}
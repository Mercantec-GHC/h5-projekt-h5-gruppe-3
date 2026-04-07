import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAuthToken } from "@/lib/auth";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const user = await verifyAuthToken(token);

    return (
      <main style={{ padding: 24 }}>
        <h1>Dashboard</h1>
        <p>Du er logget ind som {user.email}</p>
        <p>Rolle: {user.role}</p>
      </main>
    );
  } catch {
    redirect("/login");
  }
}
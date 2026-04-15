import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;

        if (!token) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const user = await verifyAuthToken(token);

        return NextResponse.json({ user });
    } catch {
        return NextResponse.json({ user: null }, { status: 401 });
    }
}
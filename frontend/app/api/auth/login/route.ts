import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { signAuthToken } from "@/lib/auth";

type LoginBody = {
    email?: string;
    password?: string;
};

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as LoginBody;
        const email = body.email?.trim().toLowerCase();
        const password = body.password;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email og password er påkrævet" },
                { status: 400 }
            );
        }

        const result = await pool.query(
            `SELECT id, email, password_hash, role
       FROM users
       WHERE email = $1
       LIMIT 1`,
            [email]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Forkert email eller password" },
                { status: 401 }
            );
        }

        const user = result.rows[0];

        const passwordOk = await bcrypt.compare(password, user.password_hash);

        if (!passwordOk) {
            return NextResponse.json(
                { error: "Forkert email eller password" },
                { status: 401 }
            );
        }

        const token = await signAuthToken({
            sub: String(user.id),
            email: user.email,
            role: user.role,
        });

        const response = NextResponse.json({
            ok: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });

        response.cookies.set("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Noget gik galt under login" },
            { status: 500 }
        );
    }
}
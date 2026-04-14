import { NextResponse } from "next/server";

export async function POST(req: Request) {
    const url = new URL("/login", req.url);
    const response = NextResponse.redirect(url);

    response.cookies.set("auth_token", "", {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });

    return response;
}
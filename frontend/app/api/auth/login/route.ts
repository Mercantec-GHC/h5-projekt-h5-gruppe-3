import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { signAuthToken } from "@/lib/auth";

// Typen beskriver det JSON body vi forventer fra klienten.
// Brugeren sender email og password til login endpointet.
type LoginBody = {
    email?: string;
    password?: string;
};

export async function POST(req: Request) {
    try {
        // Læser request body og caster den til vores LoginBody type.
        const body = (await req.json()) as LoginBody;

        // Normaliserer email:
        // - fjerner mellemrum i start/slut
        // - gør email lowercase, så login er mere robust
        const email = body.email?.trim().toLowerCase();
        const password = body.password;

        // Grundlæggende validering:
        // Hvis email eller password mangler, returnerer vi 400 Bad Request.
        if (!email || !password) {
            return NextResponse.json(
                { error: "Email og password er påkrævet" },
                { status: 400 }
            );
        }

        // Finder brugeren i databasen ud fra email.
        // Vi henter:
        // - id: bruges som brugerens identitet
        // - email: bruges i svaret og i JWT payload
        // - password_hash: bruges til at verificere password
        // - role: bruges til rollebaseret adgangskontrol
        const result = await pool.query(
            `SELECT id, email, password_hash, role
       FROM users
       WHERE email = $1
       LIMIT 1`,
            [email]
        );

        // Hvis der ikke findes en bruger med den email,
        // returnerer vi 401 Unauthorized.
        // Vi bruger samme fejlbesked som ved forkert password,
        // så man ikke kan gætte hvilke emails der findes i systemet.
        if (result.rows.length === 0) {
            return NextResponse.json(
                { error: "Forkert email eller password" },
                { status: 401 }
            );
        }

        const user = result.rows[0];

        // Sammenligner det indtastede password med den hash,
        // der ligger gemt i databasen.
        // bcrypt.compare returnerer true hvis password matcher.
        const passwordOk = await bcrypt.compare(password, user.password_hash);

        // Hvis password ikke matcher, returnerer vi igen 401.
        if (!passwordOk) {
            return NextResponse.json(
                { error: "Forkert email eller password" },
                { status: 401 }
            );
        }

        // Her opretter vi JWT-tokenet.
        // Tokenet indeholder brugerens identitet og rolle:
        // - sub: standard JWT-felt for subject (her: user id)
        // - email: kan bruges til identifikation
        // - role: kan bruges til at beskytte routes baseret på rolle
        //
        // signAuthToken er den funktion der signerer payloaden
        // og returnerer et gyldigt JWT-token som streng.
        const token = await signAuthToken({
            sub: String(user.id),
            email: user.email,
            role: user.role,
        });

        // Sender et success response tilbage til klienten.
        // Vi sender kun sikre og nødvendige brugerdata tilbage.
        // Vi sender IKKE password_hash tilbage.
        const response = NextResponse.json({
            ok: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });

        // Gemmer JWT-tokenet i en cookie.
        //
        // auth_token:
        // - indeholder det signerede JWT-token
        //
        // httpOnly:
        // - gør at JavaScript i browseren ikke kan læse cookien
        // - beskytter mod mange XSS-relaterede angreb
        //
        // secure:
        // - cookien sendes kun over HTTPS i production
        //
        // sameSite: "lax":
        // - reducerer risikoen for CSRF-angreb
        //
        // path: "/":
        // - cookien gælder for hele applikationen
        //
        // maxAge:
        // - tokenet/cookien er gyldig i 7 dage
        response.cookies.set("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });

        // Returnerer response med både JSON-data og cookie.
        return response;
    } catch (error) {
        // Hvis noget uventet går galt, logger vi fejlen på serveren
        // og returnerer en generisk 500-fejl til klienten.
        console.error("Login error:", error);

        return NextResponse.json(
            { error: "Noget gik galt under login" },
            { status: 500 }
        );
    }
}
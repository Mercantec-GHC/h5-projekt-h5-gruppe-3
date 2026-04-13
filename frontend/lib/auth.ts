/*
import { SignJWT, jwtVerify } from "jose";

// Henter secret fra environment variables
// Denne bruges til at signere og verificere JWT
const secret = process.env.JWT_SECRET;

// Hvis der ikke er en secret, stopper appen
// JWT virker ikke uden en hemmelig nøgle
if (!secret) {
    throw new Error("Missing JWT_SECRET");
}

// Konverterer secret til en Uint8Array (kræves af jose)
// TextEncoder bruges til at lave string → byte array
const secretKey = new TextEncoder().encode(secret);

// Type der beskriver hvad vi gemmer i vores token
export type AuthUser = {
    sub: string;   // subject = brugerens id
    email: string; // brugerens email
    role: string;  // brugerens rolle (fx member/admin)
};

// Funktion der laver (signer) en JWT
export async function signAuthToken(user: AuthUser) {
    return new SignJWT({
        // payload data (det vi gemmer i tokenet)
        email: user.email,
        role: user.role,
    })
        // header: hvilken algoritme vi bruger til at signere
        .setProtectedHeader({ alg: "HS256" })

        // subject (standard JWT field) = user id
        .setSubject(user.sub)

        // sætter tidspunkt for hvornår token blev lavet
        .setIssuedAt()

        // token udløber efter 7 dage
        .setExpirationTime("7d")

        // signerer tokenet med vores secret key
        .sign(secretKey);
}

// Funktion der verificerer en JWT
export async function verifyAuthToken(token: string) {
    // Tjekker:
    // - signaturen er korrekt
    // - token ikke er udløbet
    // - algoritmen matcher
    const { payload } = await jwtVerify(token, secretKey, {
        algorithms: ["HS256"],
    });

    // Returnerer de data vi lagde i tokenet
    // (payload kommer fra JWT)
    return {
        sub: payload.sub as string,
        email: payload.email as string,
        role: payload.role as string,
    };
}

*/


import { SignJWT, jwtVerify } from "jose";

export type AuthUser = {
    sub: string;
    email: string;
    role: string;
};

function getSecretKey() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("Missing JWT_SECRET");
    }

    return new TextEncoder().encode(secret);
}

export async function signAuthToken(user: AuthUser) {
    const secretKey = getSecretKey();

    return new SignJWT({
        email: user.email,
        role: user.role,
    })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(user.sub)
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(secretKey);
}

export async function verifyAuthToken(token: string) {
    const secretKey = getSecretKey();

    const { payload } = await jwtVerify(token, secretKey, {
        algorithms: ["HS256"],
    });

    return {
        sub: payload.sub as string,
        email: payload.email as string,
        role: payload.role as string,
    };
}
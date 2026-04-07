import { SignJWT, jwtVerify } from "jose";

const secret = process.env.JWT_SECRET;

if (!secret) {
    throw new Error("Missing JWT_SECRET");
}

const secretKey = new TextEncoder().encode(secret);

export type AuthUser = {
    sub: string;
    email: string;
    role: string;
};

export async function signAuthToken(user: AuthUser) {
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
    const { payload } = await jwtVerify(token, secretKey, {
        algorithms: ["HS256"],
    });

    return {
        sub: payload.sub as string,
        email: payload.email as string,
        role: payload.role as string,
    };
}
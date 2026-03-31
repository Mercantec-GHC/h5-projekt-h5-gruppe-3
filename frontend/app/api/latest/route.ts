import { NextResponse } from "next/server";
import pg from "pg";

const { Client } = pg;

const client = new Client({
    connectionString:
        process.env.PG_URL ||
        "postgres://app:apppass@postgres:5432/sensordb",
});

let connected = false;

export async function GET() {
    try {
        if (!connected) {
            await client.connect();
            connected = true;
        }

        const result = await client.query(
            `SELECT * FROM measurements ORDER BY created_at DESC LIMIT 1`
        );

        return NextResponse.json(result.rows[0] || null);
    } catch (error) {
        console.error("API latest error:", error);
        return NextResponse.json(
            { error: "Failed to fetch latest measurement" },
            { status: 500 }
        );
    }
}
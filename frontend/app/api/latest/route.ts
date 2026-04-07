import { NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
    connectionString:
        process.env.PG_URL ||
        "postgres://app:apppass@localhost:5432/sensordb",
});

export async function GET() {
    try {
        const result = await pool.query(
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
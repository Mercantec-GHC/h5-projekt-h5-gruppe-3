import mqtt from "mqtt";
import pg from "pg";

const { Client } = pg;

const MQTT_URL = process.env.MQTT_URL || "mqtt://mqtt:1883";
const MQTT_TOPIC = process.env.MQTT_TOPIC || "sensors/#";
const PG_URL =
    process.env.PG_URL || "postgres://app:apppass@postgres:5432/sensordb";

const pgClient = new Client({ connectionString: PG_URL });

function getTimeOfDay() {
    const hour = new Date().getHours();

    if (hour >= 6 && hour < 18) return "day";
    if (hour >= 18 && hour < 22) return "evening";
    return "night";
}

function evaluateLux(lux, timeOfDay) {
    let status = "ok";
    let recommendation = "Lysniveauet er passende";

    if (timeOfDay === "day") {
        if (lux < 300) {
            status = "too_dark";
            recommendation = "Tænd lys eller åbn gardinerne";
        } else if (lux > 1000) {
            status = "too_bright";
            recommendation = "Dæmp lyset eller luk gardinerne lidt";
        }
    } else if (timeOfDay === "evening") {
        if (lux < 100) {
            status = "too_dark";
            recommendation = "Tænd lidt lys for bedre komfort";
        } else if (lux > 400) {
            status = "too_bright";
            recommendation = "Dæmp lyset for en mere behagelig aftenbelysning";
        }
    } else if (timeOfDay === "night") {
        if (lux > 100) {
            status = "too_bright";
            recommendation = "Sluk eller dæmp lyset for nattemiljø";
        }
    }

    return { status, recommendation };
}

async function start() {
    await pgClient.connect();
    console.log("✅ Connected to Postgres");

    const client = mqtt.connect(MQTT_URL);

    client.on("connect", () => {
        console.log("✅ Connected to MQTT:", MQTT_URL);
        client.subscribe(MQTT_TOPIC, (err) => {
            if (err) {
                console.error("❌ Subscribe error:", err);
            } else {
                console.log("📡 Subscribed to:", MQTT_TOPIC);
            }
        });
    });

    client.on("message", async (topic, payload) => {
        const raw = payload.toString();

        try {
            const msg = JSON.parse(raw);

            const deviceId = msg.deviceId || topic.split("/")[1] || "unknown";
            const lux = msg.lux ?? null;

            if (lux === null) {
                console.error("❌ Missing lux value in message:", raw);
                return;
            }

            const timeOfDay = getTimeOfDay();
            const { status, recommendation } = evaluateLux(lux, timeOfDay);

            await pgClient.query(
                `INSERT INTO measurements 
          (device_id, lux, time_of_day, status, recommendation)
         VALUES ($1, $2, $3, $4, $5)`,
                [deviceId, lux, timeOfDay, status, recommendation]
            );

            console.log("✅ Inserted:", {
                deviceId,
                lux,
                timeOfDay,
                status,
                recommendation,
            });
        } catch (e) {
            console.error("❌ Bad message or insert failed:", raw, e.message);
        }
    });
}

start().catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
});

// SEND MQTT DATA - mosquitto_pub -h localhost -t sensors/device1 -m '{"deviceId":"device1","lux":250}'
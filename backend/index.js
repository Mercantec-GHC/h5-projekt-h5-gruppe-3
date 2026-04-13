import mqtt from "mqtt";
import pg from "pg";
import SunCalc from "suncalc";

const { Client } = pg;

const MQTT_URL = process.env.MQTT_URL || "mqtt://mqtt:1883";
const MQTT_TOPIC = process.env.MQTT_TOPIC || "sensors/#";
const PG_URL =
    process.env.PG_URL || "postgres://app:apppass@postgres:5432/sensordb";

const SENSOR_LAT = Number(process.env.SENSOR_LAT || "56.1629");
const SENSOR_LNG = Number(process.env.SENSOR_LNG || "10.2039");

const pgClient = new Client({ connectionString: PG_URL });

function getSunContext(date, lat, lng) {
    const times = SunCalc.getTimes(date, lat, lng);
    const position = SunCalc.getPosition(date, lat, lng);

    const solarAngle = (position.altitude * 180) / Math.PI;

    let sunPhase = "night";

    if (date >= times.dawn && date < times.sunrise) {
        sunPhase = "dawn";
    } else if (date >= times.sunrise && date < times.sunset) {
        sunPhase = "day";
    } else if (date >= times.sunset && date < times.dusk) {
        sunPhase = "dusk";
    }

    return {
        sunPhase,
        solarAngle,
    };
}

function evaluateLux(lux, sunPhase, solarAngle) {
    let status = "ok";
    let recommendation = "";

    if (sunPhase === "day") {
        if (solarAngle > 20) {
            if (lux < 500) {
                status = "too_dark";
                recommendation = "Gå ud og få noget dagslys";
            } else if (lux > 10000) {
                status = "too_bright";
                recommendation = "Dæmp lyset";
            }
        } else {
            if (lux < 300) {
                status = "too_dark";
                recommendation = "Gå ud og få noget dagslys";
            } else if (lux > 5000) {
                status = "too_bright";
                recommendation = "Dæmp lyset";
            }
        }
    } else if (sunPhase === "dawn" || sunPhase === "dusk") {
        if (lux < 100) {
            status = "too_dark";
            recommendation = "Tænd lidt lys";
        } else if (lux > 1000) {
            status = "too_bright";
            recommendation = "Dæmp lyset";
        }
    } else if (sunPhase === "night") {
        if (lux > 100) {
            status = "too_bright";
            recommendation = "Sluk eller dæmp lyset";
        } else if (lux < 1) {
            status = "ok";
            recommendation = "";
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

            if (lux === null || Number.isNaN(Number(lux))) {
                console.error("❌ Missing or invalid lux value in message:", raw);
                return;
            }

            const measurementDate = msg.created_at
                ? new Date(msg.created_at)
                : new Date();

            if (Number.isNaN(measurementDate.getTime())) {
                console.error("❌ Invalid created_at in message:", raw);
                return;
            }

            const { sunPhase, solarAngle } = getSunContext(
                measurementDate,
                SENSOR_LAT,
                SENSOR_LNG
            );

            const { status, recommendation } = evaluateLux(
                Number(lux),
                sunPhase,
                solarAngle
            );

            await pgClient.query(
                `INSERT INTO measurements
          (device_id, lux, sun_phase, solar_angle, status, recommendation, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    deviceId,
                    Number(lux),
                    sunPhase,
                    solarAngle,
                    status,
                    recommendation,
                    measurementDate,
                ]
            );

            console.log("✅ Inserted:", {
                deviceId,
                lux: Number(lux),
                sunPhase,
                solarAngle: solarAngle.toFixed(2),
                status,
                recommendation,
                createdAt: measurementDate.toISOString(),
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

// SEND MQTT DATA:
// mosquitto_pub -h localhost -t sensors/device1 -m '{"deviceId":"device1","lux":550}'
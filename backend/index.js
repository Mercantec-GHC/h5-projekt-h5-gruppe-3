import mqtt from "mqtt";
import pg from "pg";
import SunCalc from "suncalc";

const { Client } = pg;

// MQTT broker URL.
// Her forbinder vores ingestion service til MQTT-brokeren.
// Hvis environment variable ikke findes, bruges standard Docker service-navn.
const MQTT_URL = process.env.MQTT_URL || "mqtt://mqtt:1883";

// Topic som servicen subscriber til.
// "sensors/#" betyder: lyt på alle topics under "sensors/".
const MQTT_TOPIC = process.env.MQTT_TOPIC || "sensors/#";

// PostgreSQL connection string.
// Bruges til at forbinde til databasen.
const PG_URL =
    process.env.PG_URL || "postgres://app:apppass@postgres:5432/sensordb";

// Sensorens geografiske placering.
// Bruges af SunCalc til at beregne solvinkel og solfase.
const SENSOR_LAT = Number(process.env.SENSOR_LAT || "56.1629");
const SENSOR_LNG = Number(process.env.SENSOR_LNG || "10.2039");

// Opretter en PostgreSQL client som bruges til inserts i databasen.
const pgClient = new Client({ connectionString: PG_URL });

/**
 * Beregner solkontekst ud fra tidspunkt og placering.
 *
 * Returnerer:
 * - sunPhase: hvilken fase af dagen vi er i (dawn, day, dusk, night)
 * - solarAngle: solens højde over horisonten i grader
 *
 * Hvorfor gør vi dette?
 * Fordi samme lux-værdi ikke betyder det samme om natten og om dagen.
 */
function getSunContext(date, lat, lng) {
    // Henter solens tider for den givne dato og placering.
    // Fx dawn, sunrise, sunset og dusk.
    const times = SunCalc.getTimes(date, lat, lng);

    // Henter solens aktuelle position.
    const position = SunCalc.getPosition(date, lat, lng);

    // SunCalc giver højden i radianer.
    // Her omregner vi til grader, så det er lettere at forstå og bruge.
    const solarAngle = (position.altitude * 180) / Math.PI;

    // Standardværdi: vi antager night indtil andet er bevist.
    let sunPhase = "night";

    // Vurderer hvilken fase af dagen vi er i ud fra tidspunktet.
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

/**
 * Vurderer lux-værdien i kontekst af solfase og solvinkel.
 *
 * Returnerer:
 * - status: fx "too_dark", "ok", "too_bright"
 * - recommendation: en anbefaling til brugeren
 *
 * Idéen er at bruge forskellige grænseværdier afhængigt af om det er:
 * - dag
 * - daggry / skumring
 * - nat
 */
function evaluateLux(lux, sunPhase, solarAngle) {
    let status = "ok";
    let recommendation = "";

    // Hvis det er dag, bruger vi strengere grænser,
    // fordi naturligt dagslys forventes at være højere.
    if (sunPhase === "day") {
        // Hvis solen står højt på himlen, forventer vi mere lys.
        if (solarAngle > 20) {
            if (lux < 500) {
                status = "too_dark";
                recommendation = "Gå ud og få noget dagslys";
            } else if (lux > 10000) {
                status = "too_bright";
                recommendation = "Dæmp lyset";
            }
        } else {
            // Hvis solen står lavere, accepterer vi lavere lux.
            if (lux < 300) {
                status = "too_dark";
                recommendation = "Gå ud og få noget dagslys";
            } else if (lux > 5000) {
                status = "too_bright";
                recommendation = "Dæmp lyset";
            }
        }
    } else if (sunPhase === "dawn" || sunPhase === "dusk") {
        // I overgangsperioder er grænserne mildere.
        if (lux < 100) {
            status = "too_dark";
            recommendation = "Tænd lidt lys";
        } else if (lux > 1000) {
            status = "too_bright";
            recommendation = "Dæmp lyset";
        }
    } else if (sunPhase === "night") {
        // Om natten er høj lux ofte uønsket.
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

/**
 * Starter ingestion servicen.
 *
 * Flow:
 * 1. Forbinder til PostgreSQL
 * 2. Forbinder til MQTT broker
 * 3. Subscriber til topic
 * 4. Modtager beskeder
 * 5. Parser og validerer data
 * 6. Beregner solkontekst og status
 * 7. Gemmer resultatet i databasen
 */
async function start() {
    // Forbind til PostgreSQL først.
    await pgClient.connect();
    console.log("✅ Connected to Postgres");

    // Opret forbindelse til MQTT-brokeren.
    const client = mqtt.connect(MQTT_URL);

    // Når MQTT forbindelsen er klar, subscriber vi til topic'et.
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

    // Denne callback køres hver gang der kommer en MQTT-besked.
    client.on("message", async (topic, payload) => {
        const raw = payload.toString();

        try {
            // Payload forventes at være JSON.
            const msg = JSON.parse(raw);

            // Forsøger at finde deviceId:
            // 1. direkte i beskeden
            // 2. udledt fra topic
            // 3. fallback = "unknown"
            const deviceId = msg.deviceId || topic.split("/")[1] || "unknown";

            // Henter lux-værdien fra beskeden.
            const lux = msg.lux ?? null;

            // Stop hvis lux mangler eller ikke kan tolkes som et tal.
            if (lux === null || Number.isNaN(Number(lux))) {
                console.error("❌ Missing or invalid lux value in message:", raw);
                return;
            }

            // Hvis beskeden indeholder created_at, bruger vi den.
            // Ellers bruger vi serverens nuværende tidspunkt.
            const measurementDate = msg.created_at
                ? new Date(msg.created_at)
                : new Date();

            // Stop hvis created_at ikke er en gyldig dato.
            if (Number.isNaN(measurementDate.getTime())) {
                console.error("❌ Invalid created_at in message:", raw);
                return;
            }

            // Beregn solfase og solvinkel på tidspunktet for målingen.
            const { sunPhase, solarAngle } = getSunContext(
                measurementDate,
                SENSOR_LAT,
                SENSOR_LNG
            );

            // Vurder målingen i kontekst af solfase og solvinkel.
            const { status, recommendation } = evaluateLux(
                Number(lux),
                sunPhase,
                solarAngle
            );

            // Gem den behandlede måling i databasen.
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

            // Logger hvad der blev gemt, så vi kan debugge nemt.
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
            // Fejl kan fx være:
            // - ugyldig JSON
            // - database insert fejl
            console.error("❌ Bad message or insert failed:", raw, e.message);
        }
    });
}

// Starter servicen.
// Hvis noget går galt i opstarten, logger vi fejlen og afslutter processen.
start().catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
});
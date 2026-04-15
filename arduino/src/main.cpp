// Wifi pakke til arduino
#include <WiFiNINA.h>
// MQTT pakke til arduino
#include <PubSubClient.h>
// Adgang til sensorer
#include <Arduino_MKRIoTCarrier.h>
// Netværkstid
#include <WiFiUdp.h>
// Henter tid fra internettet
#include <NTPClient.h>
// Settings (WIFI, MQTT, Device ID)
#include "config.h"

// OBJECTS ( Initialisering af objekter til sensorer, wifi, mqtt, ntp osv. )
WiFiClient wifiClient;
PubSubClient client(wifiClient);
MKRIoTCarrier carrier;

// Henter tid fra pool.ntp.org, ingen offset, opdatering hvert 60 sekund
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000);

// Gemmer sidste lux måling, så man ikke får 0 i lux, hvis der ikke er ny data tilgængelig
float lastLux = 0;

// WIFI - Opretter forbindelse til WiFi, og printer status i serial monitoren. Hvis forbindelsen fejler, prøver den igen hvert 2 sekund.
void connectWiFi() {
    Serial.print("Connecting to WiFi");
    while (WiFi.begin(WIFI_SSID, WIFI_PASSWORD) != WL_CONNECTED) {
        delay(2000);
        Serial.print(".");
    }
    Serial.println(" connected!");
}

// MQTT - Forbinder til MQTT broker, og printer status i serial monitoren. Hvis forbindelsen fejler, prøver den igen hvert 2 sekund.
void connectMQTT() {
    while (!client.connected()) {
        Serial.print("Connecting to MQTT...");
        if (client.connect(DEVICE_ID)) {
            Serial.println(" connected!");
        } else {
            Serial.print(" failed, rc=");
            Serial.print(client.state());
            Serial.println(" retrying...");
            delay(2000);
        }
    }
}

// LUX - Læser lux værdien fra sensoren, og returnerer true hvis der er ny data tilgængelig. Hvis der ikke er ny data, returneres false, og den sidste lux værdi bruges.
bool readLux(float &lux) {
    if (carrier.Light.colorAvailable()) {
        int r, g, b, c;
        carrier.Light.readColor(r, g, b, c);
        lastLux = c;
        lux = lastLux;
        return true;
    }           
    lux = lastLux;
    return false;
}

// 🕒 SIMPEL DANSK TID
String getFormattedTime() {
    timeClient.update();

    unsigned long epoch = timeClient.getEpochTime();

    // Danmark offset (vinter = +1 time)
    epoch += 3600;

    int sec = epoch % 60;
    int min = (epoch / 60) % 60;
    int hour = (epoch / 3600) % 24;

    char buffer[10];
    sprintf(buffer, "%02d:%02d:%02d", hour, min, sec);

    return String(buffer);
}

// SETUP - Starter serial kommunikation, sensorer, wifi, mqtt og ntp klienten.
void setup() {
    Serial.begin(115200);
    delay(3000);

    carrier.begin();

    connectWiFi();

    client.setServer(MQTT_SERVER, MQTT_PORT);

    timeClient.begin();
}

// LOOP - Tjekker om MQTT forbindelsen er aktiv, og prøver at oprette den hvis den ikke er. Læser "lux" værdien, og hvis der er ny data, publiceres den til MQTT broker, og printes i serial monitoren.
void loop() {
    if (!client.connected()) {
        connectMQTT();
    }

    client.loop();

    float lux;
    bool newData = readLux(lux);

    if (newData) {
        String timestamp = getFormattedTime();

        String payload = "{";
        payload += "\"deviceId\":\"" + String(DEVICE_ID) + "\",";
        payload += "\"lux\":" + String(lux) ;
        // payload += "\"timestamp\":\"" + timestamp + "\"";
        payload += "}";
        // Sender payload til MQTT topic "sensors/device1"
        client.publish(MQTT_TOPIC, payload.c_str());

        Serial.println(payload);
    }
// Læsning og publicering sker hvert 200ms (Hvis delay er på 30000ms, sker det hvert 30 sekund) (Hele tiden er 200ms)
    delay(200);
}
// Selvfølgelig er det ikke ægte lux, men en proxy for lysintensiteten, som kan bruges til at se ændringer i lysforholdene.
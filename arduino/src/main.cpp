#include <WiFiNINA.h>
#include <PubSubClient.h>
#include <Arduino_MKRIoTCarrier.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include "config.h"

// OBJECTS
WiFiClient wifiClient;
PubSubClient client(wifiClient);
MKRIoTCarrier carrier;

// NTP
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 0, 60000);

// LUX
float lastLux = 0;

// WIFI
void connectWiFi() {
    Serial.print("Connecting to WiFi");
    while (WiFi.begin(WIFI_SSID, WIFI_PASSWORD) != WL_CONNECTED) {
        delay(2000);
        Serial.print(".");
    }
    Serial.println(" connected!");
}

// MQTT
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

// LUX (ingen 0)
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

// 🕒 SIMPEL DANSK TID (kun korrekt klokkeslæt)
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

// SETUP
void setup() {
    Serial.begin(115200);
    delay(3000);

    carrier.begin();

    connectWiFi();

    client.setServer(MQTT_SERVER, MQTT_PORT);

    timeClient.begin();
}

// LOOP
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

        client.publish("sensors/device1", payload.c_str());

        Serial.println(payload);
    }
// Læsning og publicering sker hvert 200ms (Hvis delay er på 30000ms, sker det hvert 30 sekund) (Hele tiden er 200ms)
    delay(200);
}
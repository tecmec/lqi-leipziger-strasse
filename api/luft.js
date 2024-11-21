const axios = require("axios"); 
const { BskyAgent } = require("@atproto/api");
const { CronJob } = require('cron');
require("dotenv").config();

const UBA_API_URL = "https://umweltbundesamt.api.proxy.bund.dev/api/air_data/v2/airquality/json";
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;
const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD;

const berlinTimeString = new Date().toLocaleString("en-EN", {timeZone: "Europe/Berlin",});
const now = new Date(berlinTimeString);

const yesterday = new Date(now);
yesterday.setDate(now.getDate() - 1);

const currentHour = now.getHours();
const currentDate = now.toISOString().split('T')[0];
const yesterdayDate = yesterday.toISOString().split('T')[0];

const airQualityLimits = {
    PM10: { min: 0, max: 100 },
    CO: { min: 0, max: 50 },
    O3: { min: 0, max: 180 },
    SO2: { min: 0, max: 50 },
    NO2: { min: 0, max: 200 },
    PM2: { min: 0, max: 50 },
};

const components = {
    count: 12,
    indices: [
        "0: Id - string",
        "1: Code - string",
        "2: Symbol - string",
        "3: Unit - string",
        "4: Translated name - string",
        "5: URL - string",
    ],
    PM10: ["1", "PM10", "PM₁₀", "µg/m³", "Feinstaub"],
    CO: ["2", "CO", "CO", "mg/m³", "Kohlenmonoxid"],
    O3: ["3", "O3", "O₃", "µg/m³", "Ozon"],
    SO2: ["4", "SO2", "SO₂", "µg/m³", "Schwefeldioxid"],
    NO2: ["5", "NO2", "NO₂", "µg/m³", "Stickstoffdioxid"],
    PM10PB: ["6", "PM10PB", "Pb", "µg/m³", "Blei im Feinstaub"],
    PM10BAP: ["7", "PM10BAP", "BaP", "ng/m³", "Benzo(a)pyren im Feinstaub"],
    CHB: ["8", "CHB", "C₆H₆", "µg/m³", "Benzol"],
    PM2: ["9", "PM2", "PM₂,₅", "µg/m³", "Feinstaub"],
    PM10AS: ["10", "PM10AS", "As", "ng/m³", "Arsen im Feinstaub"],
    PM10CD: ["11", "PM10CD", "Cd", "ng/m³", "Cadmium im Feinstaub"],
    PM10NI: ["12", "PM10NI", "Ni", "ng/m³", "Nickel im Feinstaub"],
};

async function fetchAirQuality() {
    try {
        const params = {
            station: "1671", // Leipziger Straße
            date_from: yesterdayDate,
            date_to: currentDate,
            time_from: "1",
            time_to: currentHour.toString(),
            lang: "en",
        };
        const response = await axios.get(UBA_API_URL, {params});
        return response.data.data["1671"];
    } catch (error) {
        console.error(
            "Fehler beim Abruf der Luftqualitätsdaten:",
            error.message,
        );
        return null;
    }
}

function calculateScale(value, component) {
    const limits = airQualityLimits[component];

    // Wenn der Wert außerhalb des gültigen Bereichs liegt, wird der Wert auf den entsprechenden Grenzwert gesetzt
    const scaledValue = Math.min(Math.max(value, limits.min), limits.max) * 100;

    // Berechnung der Skala (z.B. für die Darstellung mit Emojis)
    const maxBars = 10;
    const barLength = Math.floor(
        ((scaledValue - limits.min) / (limits.max - limits.min)) * maxBars,
    );
    const emojiBar = "💨".repeat(barLength);
    const emptyEmojiBar = "🌱".repeat(maxBars - barLength);
    return emojiBar + emptyEmojiBar;
}

function getComponentById(id) {
    for (const key in components) {
        if (
            components.hasOwnProperty(key) &&
            key !== "indices" &&
            key !== "count"
        ) {
            // Wenn die ID der ersten Stelle des Arrays entspricht
            if (components[key][0] === id.toString()) {
                return components[key];
            }
        }
    }
    return null;
}

function getStatus(statusId) {
    // Status bestimmen
    let status;
    switch (statusId) {
        case 0:
            status = "🟢 Gut";
            break;
        case 1:
            status = "🟡 Mittelmäßig";
            break;
        case 2:
            status = "🔴 Schlecht (😷)";
            break;
        default:
            status = "⚫ Kritisch (😷)";
    }
    return status;
}

function generateAscii(latestQualityData) {
    let output = ``;
    let itsDangerousOutside = false;

    const timestamp = new Date(latestQualityData[0]).toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
    output += `Luftqualität: Leipziger Straße, Chemnitz (DESN083)\n`;
    output += timestamp + " Uhr\n\n";

    for (let i = 0; i < latestQualityData.length; i++) {
        if (i > 2) {
            const component = getComponentById(latestQualityData[i][0]);
            const status = getStatus(Number(latestQualityData[i][2]));

            itsDangerousOutside = status > 1 ? false : true;

            const wert = parseFloat(latestQualityData[i][3]);
            if (isNaN(wert)) {
                continue;
            }

            const massEinheit = component[3];
            const langBezeichnung = component[4];
            const kurzBezeichnung = component[2];

            // Berechnung der Skala für den aktuellen Schadstoff
            const scaledValue = calculateScale(wert, component[1]);

            output += `${scaledValue} ${wert} `;
            output += `${massEinheit} (${kurzBezeichnung}/${langBezeichnung})\n`;

            output += `Gesamtstatus (LQI): ${status}\n\n`;
        }
    }

    return {
        status: itsDangerousOutside,
        output,
    };
}

async function postToBluesky(content) {
    const agent = new BskyAgent({ service: "https://bsky.social" });
    try {
        await agent.login({
            identifier: BLUESKY_HANDLE,
            password: BLUESKY_PASSWORD,
        });
        await agent.post({ text: content });
        console.log("Post erfolgreich erstellt!");
    } catch (error) {
        console.error("Fehler beim Posten auf Bluesky:", error.message);
    }
}

export async function main() {
    console.log(1)
    const airQualityData = await fetchAirQuality();
    console.log(airQualityData);
    if (!airQualityData) {
        console.error("Keine gültigen Daten gefunden.");
        return;
    }

    console.log(2)

    const airQualityDataCollection = Object.keys(airQualityData);
    const latestTimestamp =
        airQualityDataCollection[airQualityDataCollection.length - 1];
    const latestQualityData = airQualityData[latestTimestamp];
    const asciiChart = generateAscii(latestQualityData);

    console.log(asciiChart["output"]);

    console.log(3)
    if (asciiChart["status"] === true) {
       await postToBluesky(asciiChart.output);
    }
}

/*main().catch((error) => {
    console.error("Ein unerwarteter Fehler ist aufgetreten:", error.message);
});*/

// Run this on a cron job
/*const scheduleExpressionMinute = '* * * * *'; // Run once every minute for testing
const scheduleExpressionTenMinutesAfterFullHour = '10 * * * *'; // Run once ten minutes after every full hour in prod

const job = new CronJob(scheduleExpressionTenMinutesAfterFullHour, main); // change to scheduleExpressionMinute for testing

job.start();*/

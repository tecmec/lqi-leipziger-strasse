// api/cron.js
export default function handler(req, res) {
    // Dein Skript, das zyklisch ausgeführt werden soll
    console.log("Das Skript wird ausgeführt.");

    // Antwort zurückgeben
    res.status(200).json({ 
        message: "Skript ausgeführt",
        time: new Date().toISOString(),
    });
}

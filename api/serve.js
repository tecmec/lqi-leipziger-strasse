const { main } = require('./luft.js');

export function GET(req, res) {

    const url = new URL(req.url); 
    const params = Object.fromEntries(url.searchParams); 
    const runCode = JSON.stringify(params).includes('getLQI');

    if (runCode) {
        main()
            .then(() => {
                console.log("Hauptfunktion erfolgreich ausgeführt.");
            })
            .catch((error) => {
                console.error("Fehler beim Ausführen:", error.message);
            });
    }

    const data = {
        success: runCode,
        message: "Programm executed!",
        device: process.env.VERCEL_REGION,
        timestamp: new Date().toISOString(),
    };
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

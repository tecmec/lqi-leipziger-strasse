// prevent caching
export const dynamic = 'force-dynamic';

// api/cron.js
/*export default function handler(req, res) {

    

    // Dein Skript, das zyklisch ausgeführt werden soll
    console.log("Das Skript wird ausgeführt.");

    // Antwort zurückgeben
    res.status(200).json({ 
        message: "Skript ausgeführt",
        time: new Date().toISOString(),
    });
}*/

export function GET(request) {
    return new Response(`Hello from ${process.env.VERCEL_REGION}`);
  }

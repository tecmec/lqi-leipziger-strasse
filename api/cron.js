import { main } from '../lqi.js';

export default async function handler(req, res) {
    try {
        // Hauptfunktion ausführen
        await main();

        // Erfolgsmeldung zurückgeben
        res.status(200).end('Cron job executed successfully!');
    } catch (error) {
        console.error("Ein unerwarteter Fehler ist aufgetreten:", error.message);

        // Fehlerstatus zurückgeben
        res.status(500).end('An error occurred during the cron job execution.');
    }
}

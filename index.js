export default function handler(req, res) {
    // Set the content type to JSON
    res.setHeader("Content-Type", "application/json");

    // Return a basic JSON response
    res.status(200).json({
        message: "Luftqualität Chemnitz App",
        status: "running"
    });
}
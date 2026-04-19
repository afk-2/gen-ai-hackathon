export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const { input } = req.body;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              role:"user",
              parts: [
                {
                  text: "Summarize this:\n" + input
                }
              ]
            }
          ]
        })
      }
    );

    const text = await response.text();
    console.log("RAW RESPONSE:", text);

    res.status(200).json({
      raw: text
    });

  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
}
console.log("KEY:", process.env.OPENROUTER_API_KEY);
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  const { input } = req.body;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: "Summarize this:\n" + input
          }
        ]
      })
    });

    const text = await response.text();
    console.log("RAW RESPONSE:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(200).json({ output: "Invalid JSON" });
    }

    res.status(200).json({
      output:
        data?.choices?.[0]?.message?.content ||
        JSON.stringify(data)
    });

  } catch (error) {
    res.status(500).json({ error: "Something went wrong" });
  }
}
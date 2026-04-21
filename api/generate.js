export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { question, chunks, mode, jobDescription } = req.body;
  // mode: "qa" | "extract" | "summary" | "jobfit"

  if (!chunks || chunks.length === 0) {
    return res.status(400).json({ error: "No resume content received." });
  }

  const context = chunks.join("\n\n---\n\n");

  const systemPrompt = `You are a resume analysis assistant. You ONLY answer based on the resume content provided.
Never use outside knowledge or make assumptions beyond what is written.
If the information is not present in the resume, say exactly: "This is not stated in the resume."
Always cite a short quote from the resume that supports your answer.`;

  let userPrompt;

  if (mode === "extract") {
    userPrompt = `Parse this resume and return ONLY valid JSON with no extra text, no markdown, no backticks:
{
  "name": "",
  "contact": {
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": ""
  },
  "summary": "",
  "skills": [],
  "experience": [
    {
      "role": "",
      "company": "",
      "duration": "",
      "highlights": []
    }
  ],
  "education": [
    {
      "degree": "",
      "institution": "",
      "year": ""
    }
  ],
  "certifications": [],
  "red_flags": [],
  "strengths": []
}

Resume:
${context}`;

  } else if (mode === "summary") {
    userPrompt = `Summarise this candidate based solely on the resume. Return ONLY valid JSON with no extra text, no markdown, no backticks:
{
  "candidate_name": "",
  "one_line_profile": "",
  "years_of_experience": "",
  "core_expertise": [],
  "notable_achievements": [],
  "career_trajectory": "",
  "gaps_or_concerns": [],
  "overall_impression": ""
}

Resume:
${context}`;

  } else if (mode === "jobfit") {
    if (!jobDescription || !jobDescription.trim()) {
      return res.status(400).json({ error: "Job description is required for Job Fit Scoring." });
    }

    userPrompt = `You are evaluating a candidate's resume against a job description.
Score the fit from 0 to 100 based strictly on evidence in the resume.

Return ONLY valid JSON with no extra text, no markdown, no backticks:
{
  "fit_score": 0,
  "verdict": "Strong Fit | Moderate Fit | Weak Fit",
  "matched_requirements": [],
  "missing_requirements": [],
  "transferable_skills": [],
  "hiring_recommendation": "",
  "key_quote_from_resume": ""
}

Resume:
${context}

Job Description:
${jobDescription}`;

  } else {
    // default: grounded Q&A
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required for Q&A mode." });
    }

    userPrompt = `Resume content:
${context}

Question: ${question}

Answer based only on the resume. If the answer is not in the resume, say: "This is not stated in the resume."
End your answer with:
QUOTE: "<exact short quote from the resume that supports this answer>"`;
  }

  // ── Try Gemini first ──────────────────────────────────────────────
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini ${geminiRes.status}: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const output = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!output) throw new Error("Gemini returned empty response");

    console.log({ mode, provider: "gemini", chunks: chunks.length, timestamp: new Date().toISOString() });
    return res.status(200).json({ output, provider: "gemini" });

  } catch (geminiErr) {
    console.warn("Gemini failed, falling back to Groq:", geminiErr.message);
  }

  // ── Fallback: Groq ────────────────────────────────────────────────
  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      throw new Error(`Groq ${groqRes.status}: ${errText}`);
    }

    const groqData = await groqRes.json();
    const output = groqData.choices?.[0]?.message?.content;

    if (!output) throw new Error("Groq returned empty response");

    console.log({ mode, provider: "groq", chunks: chunks.length, timestamp: new Date().toISOString() });
    return res.status(200).json({ output, provider: "groq" });

  } catch (groqErr) {
    console.error("Both providers failed:", groqErr.message);
    return res.status(500).json({ error: "Both AI providers failed. Please try again." });
  }
}
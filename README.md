# ResumeIQ — AI-Powered Resume Analyzer

> Upload a resume. Ask questions. Extract structured data. Score job fit.
> All answers are grounded strictly in the document — the model will not speculate beyond what is written.

**Live demo:** `https://gen-ai-hackathon-seven.vercel.app/`

---

## What It Does

ResumeIQ is a document intelligence tool for resume analysis. Upload a resume (PDF, TXT, or MD) and run four types of AI analysis:

| Mode | Description |
|---|---|
| **Q&A** | Ask any question about the candidate — answer includes a direct quote from the resume as evidence |
| **Extract** | Parse the resume into structured fields: name, contact, skills, experience, education, strengths, red flags |
| **Summary** | Generate a structured candidate profile covering trajectory, achievements, expertise, and concerns |
| **Job Fit** | Paste a job description and receive a 0–100 fit score with matched/missing requirements and a hiring recommendation |

---

## Course Concepts Demonstrated

| Concept | Implementation |
|---|---|
| **RAG** | Document is chunked into 500-word windows with overlap; top-6 chunks retrieved per query using keyword scoring before being passed to the model |
| **Prompt constraints** | System prompt explicitly restricts the model to the uploaded document only |
| **Guardrails** | Out-of-scope answers are detected and flagged with a visible warning tag in the UI |
| **Structured JSON outputs** | Extract, Summary, and Job Fit modes return structured JSON rendered as readable labelled sections |
| **Grounding** | Every Q&A answer includes a `QUOTE:` field — a direct excerpt from the resume |
| **Observability** | Each API call logs mode, provider, chunk count, and timestamp to Vercel function logs |
| **Dual AI fallback** | Primary: Gemini 2.5 Flash → Fallback: Groq LLaMA 3.3 70B. Auto-triggered on failure, provider shown in UI |
| **Deployment** | Deployed on Vercel, publicly accessible, secrets stored as environment variables |

---

## Architecture

```
User uploads resume
        │
        ▼
pdf.js extracts text (client-side)
        │
        ▼
chunkText() — 500-word chunks, 60-word overlap
        │
        ▼
retrieveChunks() — keyword-scored top-6 per query
        │
        ▼
POST /api/generate
{ question, chunks, mode, jobDescription }
        │
        ▼
Gemini 2.5 Flash ──success──► response
        │ failure
        ▼
Groq LLaMA 3.3 70B ──success──► response
        │ failure
        ▼
      500 error
        │
        ▼
Render in browser by mode:
  Q&A     → answer + evidence quote
  Extract → labelled rows + chips
  Summary → labelled rows + chips
  Job Fit → score ring + detail breakdown
```

---

## How to Test

1. Open the live demo link above
2. Upload a resume — `.pdf`, `.txt`, or `.md`
3. Try each mode:

- **Q&A** — ask something specific, e.g. "What programming languages does this candidate know?" Confirm the answer includes a quoted excerpt
- **Q&A guardrail** — ask something not in the resume, e.g. "What is their salary expectation?" Confirm the orange guardrail warning appears
- **Extract** — confirm name, skills, experience, and red flags render as readable sections
- **Summary** — confirm a structured candidate profile is generated
- **Job Fit** — paste any job description and confirm a colour-coded score ring appears

---

## Scope Decisions

| Decision | Reason |
|---|---|
| No database | Chunks are held in browser memory — sufficient for a single-session demo |
| Client-side chunking and retrieval | Keeps the system fast with no additional backend dependencies |
| Keyword retrieval over embeddings | Appropriate for short resume documents (1–2 pages) |
| Scanned PDF limitation | pdf.js extracts text layer only — scanned PDFs trigger a clear warning |

---

## Tech Stack

- **Frontend** — Vanilla HTML, CSS, JavaScript
- **PDF parsing** — pdf.js 3.11 (CDN, client-side)
- **Primary AI** — Gemini 2.5 Flash
- **Fallback AI** — LLaMA 3.3 70B via Groq
- **Backend** — Vercel Serverless Functions (Node.js)
- **Deployment** — Vercel

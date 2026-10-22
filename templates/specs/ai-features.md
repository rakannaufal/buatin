# Spesifikasi Fitur AI — {{projectName}}

> Dokumen ini mendefinisikan fitur-fitur AI termasuk model, prompt engineering, rate limit, fallback, dan estimasi biaya untuk **{{projectName}}**.

---

## Ringkasan

{{brief}}

---

## Fitur AI yang Direncanakan

| ID    | Fitur                     | Deskripsi                         | Model                      | Prioritas |
| ----- | ------------------------- | --------------------------------- | -------------------------- | --------- |
| AI-01 | {{projectName}} Assistant | Chatbot AI untuk bantuan pengguna | GPT-4o-mini / Claude Haiku | High      |
{{#if isEcommerce}}
| AI-02 | Product Recommendation | Rekomendasi produk berdasarkan preferensi | Embedding + similarity | Medium |
| AI-03 | Product Description Generator | Generate deskripsi produk otomatis | GPT-4o-mini | Medium |
| AI-04 | Review Summarizer | Ringkasan ulasan produk | GPT-4o-mini | Low |
{{/if}}
{{#if isSaas}}
| AI-02 | Smart Suggestions | Saran otomatis berdasarkan konteks kerja | GPT-4o-mini | Medium |
| AI-03 | Content Generator | Bantu buat konten/dokumen | GPT-4o | Medium |
| AI-04 | Data Insights | Analisis otomatis dari data pengguna | GPT-4o-mini | Low |
{{/if}}
{{#if hasCms}}
| AI-05 | Writing Assistant | Bantu menulis dan edit artikel | GPT-4o | Medium |
| AI-06 | Auto Tagging | Generate tag otomatis dari konten | GPT-4o-mini | Low |
| AI-07 | SEO Optimizer | Saran SEO otomatis | GPT-4o-mini | Low |
{{/if}}
{{#if hasSearch}}
| AI-08 | Semantic Search | Pencarian berdasarkan makna | Embedding model | Medium |
{{/if}}

---

## Model & Provider

### Model yang Digunakan

| Model                      | Provider  | Use Case                    | Cost per 1M Token (est.)   |
| -------------------------- | --------- | --------------------------- | -------------------------- |
| **GPT-4o-mini**            | OpenAI    | Chat, generation (ringan)   | $0.15 input / $0.60 output |
| **GPT-4o**                 | OpenAI    | Generation (kompleks)       | $2.50 input / $10 output   |
| **Claude 3.5 Haiku**       | Anthropic | Chat, analysis (alternatif) | $0.25 input / $1.25 output |
| **text-embedding-3-small** | OpenAI    | Embedding / similarity      | $0.02 per 1M tokens        |

### Pemilihan Model

| Kriteria                     | Model Ringan (GPT-4o-mini) | Model Berat (GPT-4o)          |
| ---------------------------- | -------------------------- | ----------------------------- |
| Chatbot                      | ✅                         | Jika perlu reasoning kompleks |
| Classification               | ✅                         | ❌ Over-kill                  |
| Content generation (pendek)  | ✅                         | ❌                            |
| Content generation (panjang) | ❌                         | ✅                            |
| Code generation              | ❌                         | ✅                            |
| Analysis / reasoning         | ❌                         | ✅                            |
| Embedding                    | Dedicated model            | Dedicated model               |

---

## Arsitektur AI

```
Client Request
  │
  ├─ Auth Check
  ├─ Rate Limit Check
  ├─ Input Validation & Sanitization
  │
  ├─ AI Service Layer
  │   ├─ Prompt Construction
  │   │   ├─ System prompt (per fitur)
  │   │   ├─ Context injection (user data, history)
  │   │   └─ User input
  │   │
  │   ├─ Model Router
  │   │   ├─ Primary: OpenAI
  │   │   └─ Fallback: Anthropic
  │   │
  │   ├─ Response Processing
  │   │   ├─ Output validation
  │   │   ├─ Content filtering (safety)
  │   │   └─ Formatting
  │   │
  │   └─ Caching (jika applicable)
  │
  ├─ Usage Tracking (token count, cost)
  │
  └─ Response to Client
```

---

## Prompt Engineering

### Prinsip Prompt

| Prinsip         | Implementasi                                           |
| --------------- | ------------------------------------------------------ |
| **Structured**  | Gunakan system prompt yang jelas dan terstruktur       |
| **Contextual**  | Sertakan konteks yang relevan (user data, preferences) |
| **Constrained** | Batasi output format (JSON, length, language)          |
| **Versioned**   | Setiap prompt diberi versi dan di-track                |
| **Tested**      | Prompt diuji dengan eval suite sebelum deploy          |

### Contoh System Prompt (Chatbot)

```
Kamu adalah asisten AI untuk {{projectName}}.

Panduan:
- Jawab dalam Bahasa Indonesia yang sopan dan profesional
- Jawab hanya pertanyaan terkait {{projectName}} dan layanannya
- Jika tidak tahu, katakan "Saya belum bisa menjawab pertanyaan ini"
- Jangan memberikan informasi palsu atau spekulatif
- Jangan membahas topik sensitif (politik, SARA)
- Format jawaban dengan markdown jika perlu
- Maksimal 500 kata per respons

Konteks {{projectName}}:
{system_context}
```

### Prompt Management

| Aspek           | Implementasi                               |
| --------------- | ------------------------------------------ |
| **Storage**     | Database atau config file (bukan hardcode) |
| **Versioning**  | Setiap perubahan prompt = versi baru       |
| **A/B Testing** | Support multiple active versions           |
| **Evaluation**  | Automated eval dengan test cases           |
| **Rollback**    | Bisa kembali ke versi sebelumnya           |

---

## Rate Limiting & Quota

### Rate Limit per User

| Plan | Request/menit | Request/hari | Max Token/request |
| ---- | ------------- | ------------ | ----------------- |
{{#if isSaas}}
| Free | 5 | 50 | 1,000 |
| Pro | 20 | 500 | 4,000 |
| Enterprise | 60 | 5,000 | 8,000 |
{{else}}
| Default | 10 | 200 | 2,000 |
| Premium | 30 | 1,000 | 4,000 |
{{/if}}

### Rate Limit Response

```json
{
  "error": {
    "code": "AI_RATE_LIMIT",
    "message": "Anda sudah mencapai batas penggunaan AI. Coba lagi nanti.",
    "retry_after": 60
  }
}
```

---

## Fallback Strategy

### Model Fallback

```
Request → OpenAI GPT-4o-mini
  ├─ Success → Return response
  ├─ Rate Limited (429) → Retry setelah backoff
  ├─ Server Error (5xx) → Fallback ke Anthropic Claude Haiku
  │   ├─ Success → Return response
  │   └─ Fail → Return error message
  └─ Timeout (>30s) → Cancel + return error
```

### Graceful Degradation

| Skenario                   | Fallback                                                         |
| -------------------------- | ---------------------------------------------------------------- |
| AI service down            | Tampilkan fitur tanpa AI, pesan "Fitur AI sedang tidak tersedia" |
| Rate limit tercapai        | Informasikan user, tampilkan estimasi waktu                      |
| Response quality buruk     | Deteksi + retry dengan prompt yang lebih spesifik                |
| Cost limit harian tercapai | Disable fitur AI untuk hari itu, notif admin                     |

---

## Keamanan & Safety

### Input Sanitization

| Check                | Implementasi                                        |
| -------------------- | --------------------------------------------------- |
| **Prompt Injection** | Sanitize user input, jangan gabung ke system prompt |
| **PII Filtering**    | Strip data sensitif sebelum kirim ke API            |
| **Length Limit**     | Batasi panjang input user                           |
| **Content Filter**   | Tolak input yang mengandung konten berbahaya        |

### Output Safety

| Check                     | Implementasi                                        |
| ------------------------- | --------------------------------------------------- |
| **Content Moderation**    | Cek output sebelum tampilkan ke user                |
| **Hallucination Warning** | Disclaimer "Respons AI mungkin tidak selalu akurat" |
| **Source Attribution**    | Jika memungkinkan, sertakan sumber informasi        |
| **PII in Output**         | Cek dan strip PII dari output                       |

### Data Privacy

| Aspek                | Implementasi                                       |
| -------------------- | -------------------------------------------------- |
| **Data ke Provider** | Minimal — hanya yang diperlukan untuk prompt       |
| **Logging**          | Log prompt & response (tanpa PII) untuk evaluation |
| **Retention**        | Conversation history sesuai kebijakan retensi user |
| **Opt-out**          | User bisa menonaktifkan fitur AI                   |
| **Disclosure**       | Jelaskan bahwa fitur menggunakan AI                |

---

## Caching

| Tipe               | TTL    | Use Case                                        |
| ------------------ | ------ | ----------------------------------------------- |
| **Exact match**    | 24 jam | FAQ, pertanyaan umum                            |
| **Semantic cache** | 1 jam  | Pertanyaan serupa (embedding similarity > 0.95) |
| **No cache**       | —      | Pertanyaan personal, real-time data             |

---

## Monitoring & Cost

### Monitoring

| Metrik            | Alert Threshold |
| ----------------- | --------------- |
| Latency P50       | > 2 detik       |
| Latency P99       | > 10 detik      |
| Error rate        | > 5%            |
| Daily token usage | > 80% budget    |
| Monthly cost      | > budget limit  |

### Estimasi Biaya Bulanan

| Fitur       | Est. Requests/bulan | Avg Token/request | Est. Biaya        |
| ----------- | ------------------- | ----------------- | ----------------- |
| Chatbot     | 10,000              | 500               | ~$5               |
| Content Gen | 1,000               | 2,000             | ~$5               |
| Embedding   | 5,000               | 300               | ~$0.03            |
| **Total**   |                     |                   | **~$10-15/bulan** |

> Biaya sangat tergantung penggunaan aktual. Monitor ketat di bulan pertama.

---

## Environment Variables

| Variable            | Deskripsi                       |
| ------------------- | ------------------------------- |
| `OPENAI_API_KEY`    | OpenAI API key                  |
| `ANTHROPIC_API_KEY` | Anthropic API key (fallback)    |
| `AI_MODEL_DEFAULT`  | Model default (gpt-4o-mini)     |
| `AI_MODEL_ADVANCED` | Model advanced (gpt-4o)         |
| `AI_MAX_TOKENS`     | Max token per request           |
| `AI_DAILY_BUDGET`   | Budget harian maksimum          |
| `AI_RATE_LIMIT`     | Requests per minute per user    |
| `AI_CACHE_TTL`      | Cache TTL (seconds)             |
| `AI_ENABLED`        | true/false (global kill switch) |

---

> Fitur AI harus diuji secara menyeluruh termasuk edge case, prompt injection, dan estimasi biaya sebelum launch **{{projectName}}**.

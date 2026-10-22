# Rencana: Template Engine Pengganti AI Generator

## Ringkasan

Mengganti AI-generated Markdown menjadi template-filled Markdown. Brief user +
preferensi + referensi diisi ke template terstruktur secara deterministik, tanpa
panggilan LLM. Output tetap 42 dokumen Markdown + manifest ZIP yang dibaca
agent AI untuk membangun website.

## Arsitektur baru

```
Brief + Preferences + References + Plan
    ↓
Template Engine (src/domain/template-engine.ts)
    ↓ resolveVariables() → flat key-value dari brief/preferences/context
    ↓ renderTemplate() → Handlebars-like: {{var}}, {{#if}}, {{#each}}, {{#unless}}
    ↓ applyCustomization() → append konfigurasi (sudah ada)
    ↓ lintOutput() → validasi (sudah ada)
    ↓
42 Markdown files + manifest (sinkron, <1 detik)
```

## Perubahan komponen

### 1. Template files (templates/specs/*.md) — REWRITE

Template lama = instruksi untuk AI ("Jelaskan masalah...", "Buat tabel REQ-xx...").
Template baru = dokumen Markdown lengkap dengan placeholder variabel.

Contoh `templates/specs/brief.md` baru:

```markdown
# Brief — {{projectName}}

## Ringkasan dan tujuan

{{brief}}

## Tipe website

{{webTypeLabel}} — {{webTypeDescription}}

## Ruang lingkup dan batasan

- **Perangkat:** Desktop, tablet, mobile (responsive)
- **Bahasa:** {{language}}
- **Kompleksitas:** {{complexity}}
{{#if assumptions.length}}

### Asumsi

{{#each assumptions}}
- A-{{@index1}}: {{this}}
{{/each}}
{{/if}}

## Referensi dan sumber

{{#if references.length}}
| File | Peran | Catatan | Sumber |
| ---- | ----- | ------- | ------ |
{{#each references}}
| {{name}} | {{role}} | {{note}} | {{sourceUrl}} |
{{/each}}
{{#else}}
Tidak ada referensi yang dilampirkan.
{{/if}}
```

### 2. Template Engine baru (src/domain/template-engine.ts) — CREATE

Engine ringan tanpa dependency eksternal:

- `{{variableName}}` — string replacement dengan HTML escape
- `{{variableName | fallback "teks default"}}` — fallback jika kosong
- `{{#if condition}}...{{else}}...{{/if}}` — conditional blocks
- `{{#unless condition}}...{{/unless}}` — negative conditional
- `{{#each array}}...{{/each}}` — loop dengan {{this}}, {{@index}}, {{@index1}}
- `{{{raw}}}` — tanpa escaping (untuk Markdown content)

Tidak pakai Handlebars/Mustache library → zero dependency, full control,
<500 baris kode.

### 3. Variable Resolver (src/domain/template-variables.ts) — CREATE

Mengubah brief + preferences + plan + references + skills menjadi flat object:

```typescript
interface TemplateVariables {
  // Brief
  projectName: string;
  projectSlug: string;
  brief: string; // raw brief text
  webType: WebType;
  webTypeLabel: string;
  webTypeDescription: string;
  complexity: string;
  summary: string;

  // Plan
  selectedFiles: PlannedFile[];
  assumptions: string[];
  risks: string[];
  missingInfo: { question: string; impact: string }[];

  // Preferences — Technology
  technologyMode: string;
  technology: Record<string, string>;
  lockedTechnology: string[];
  additionalTechnology: string;
  renderingStrategy: string;

  // Preferences — Design
  colorMode: string;
  palette: { name: string; hex: string }[];
  primaryColor: string;
  secondaryColor: string;
  styleMode: string;
  style: StyleValues;
  lockedStyle: string[];

  // Typography shortcuts
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  containerWidth: number;
  spacing: number;
  // ... semua style values jadi top-level

  // Skills
  skills: SkillSnapshot[];
  skillsForDocument: SkillSnapshot[]; // filtered per doc

  // References
  references: ReferenceSnapshot[];
  hasReferences: boolean;

  // Web type booleans untuk conditional
  isLanding: boolean;
  isCompany: boolean;
  isPortfolio: boolean;
  isBlog: boolean;
  isEcommerce: boolean;
  isSaas: boolean;
  isInternal: boolean;
  isBooking: boolean;
  isCustom: boolean;

  // Feature booleans (dari selected files)
  hasAuth: boolean;
  hasPayments: boolean;
  hasSearch: boolean;
  hasAdmin: boolean;
  hasCms: boolean;
  hasUploads: boolean;
  hasNotifications: boolean;
  hasRealtime: boolean;
  hasBackgroundJobs: boolean;
  hasAnalytics: boolean;
  hasI18n: boolean;
  hasAiFeatures: boolean;
  hasMultitenancy: boolean;
  hasPwaOffline: boolean;
  hasMigration: boolean;
  hasOperations: boolean;
  hasPrivacy: boolean;
  hasDataModel: boolean;
  hasApi: boolean;
  hasIntegrations: boolean;
}
```

### 4. Generator baru (src/domain/template-generator.ts) — CREATE

Fungsi sinkron yang menggantikan seluruh alur AI:

```typescript
export function generateFromTemplates(
  snapshot: TemplateSnapshot,
): GeneratedOutput {
  const variables = resolveVariables(snapshot);

  const files: OutputFile[] = [];
  for (const selected of snapshot.plan.selected) {
    const template = snapshot.templates[selected.id];
    const docVars = {
      ...variables,
      skillsForDocument: variables.skills.filter((s) =>
        s.documents.includes(selected.id),
      ),
    };
    let content = renderTemplate(template, docVars);
    content = applyCustomization(content, selected.id, snapshot.projectContext);

    // Append document list untuk index
    if (selected.id === "index") {
      content +=
        "\n## Dokumen dalam paket\n\n" +
        snapshot.plan.selected
          .map(
            (f) =>
              `- [${f.path}](${f.id === "agents" ? "../AGENTS.md" : f.path.replace("specs/", "")}): ${f.reason}`,
          )
          .join("\n") +
        "\n";
    }

    // Append read order untuk agents
    if (selected.id === "agents") {
      content +=
        "\n## Urutan baca\n\n" +
        snapshot.plan.selected
          .filter((f) => f.id !== "agents")
          .map((f) => `- [${f.path}](${f.path})`)
          .join("\n") +
        "\n";
    }

    files.push({
      id: selected.id,
      path: selected.path,
      content,
      finishReason: "complete",
    });
  }

  const issues = lintOutput(files, []);
  // Tidak perlu repair pass — template tidak menghasilkan lint issues

  return { files, issues };
}
```

### 5. Worker generator (src/worker/generator.ts) — SIMPLIFY

Generator menjadi jauh lebih sederhana:

- Tidak perlu LLM calls
- Tidak perlu retry/continuation
- Tidak perlu budget tracking
- Tidak perlu heartbeat polling untuk AI timeout
- Tetap perlu: lease, fencing, cancellation check, lint, manifest

Tapi karena generasi sekarang <1 detik, bisa dipertimbangkan:
**Opsi A:** Tetap via worker queue (konsisten, resume masih works)
**Opsi B:** Sinkron di API route (lebih cepat UX, simpler)

Rekomendasi: **Opsi A dulu** — minimal perubahan arsitektur, worker tetap
handle reference processing, maintenance, dll. Tapi generasi per-file tidak
perlu LLM call lagi.

### 6. Planner — SIMPLIFY

Planner juga bisa jadi deterministik:

- `defaultPlanner()` sudah ada dan bekerja tanpa AI
- Brief trigger detection sudah ada di `resolvePlan()`
- Yang AI lakukan: project_name, slug, summary, complexity, features_detected

Perubahan:

- `project_name` → dari field nama proyek (sudah wajib diisi)
- `project_slug` → dari slugify(project_name)
- `summary` → brief.slice(0, 300)
- `complexity` → heuristik dari jumlah fitur terdeteksi
- `features_detected` → dari trigger matching (sudah ada)
- `missing_info` → checklist per web type
- `assumptions/risks` → template per web type

Planner tetap via worker (karena ada rate limit dan queue), tapi tidak
panggil LLM.

### 7. File yang dihapus/tidak dipakai

- `prompts/generate-file.system.md` — tidak diperlukan
- `prompts/planner.system.md` — tidak diperlukan
- `src/server/llm.ts` — `callLlm()` tidak dipanggil lagi untuk generate/plan
  - TETAP dipertahankan untuk: vision analysis (optional), AI check di settings
  - Atau tandai sebagai deprecated dan hapus bertahap
- `src/server/ai-budget.ts` — reservasi AI tidak diperlukan untuk template

### 8. Schema/migration perubahan

Tidak perlu migration baru. Field yang ada tetap kompatibel:

- `JobFile.modelUsed` → null (no model)
- `JobFile.tokensIn/tokensOut` → null
- `JobFile.finishReason` → "complete"
- `Job.llmRequestCount` → 0
- `AiUsage` → tidak ada record baru untuk template generation
- `Snapshot.config` → tetap ada tapi `mock: true` equivalent

### 9. Dampak pada billing/quotas

Kuota generasi TETAP berlaku — user masih bayar untuk:

- Jumlah generasi per minggu
- Retensi hasil
- Fitur premium (revisi, regenerasi, preset, template custom)

Yang berubah: tidak ada biaya AI per generasi bagi operator.
Pricing bisa lebih murah karena margin lebih besar.

### 10. Backward compatibility

- Job lama yang sudah di-generate AI tetap bisa dibaca/download
- Snapshot lama tetap valid
- Resume job lama yang sudah ada → tetap works (file succeeded tetap)
- Template baru menghasilkan output format yang sama

## Urutan implementasi

### Fase 1: Template Engine + Variables (tidak ada perubahan behavior)

1. `src/domain/template-engine.ts` — engine render
2. `src/domain/template-variables.ts` — variable resolver
3. Unit test untuk engine dan variables
4. `src/domain/template-generator.ts` — generator fungsi

### Fase 2: Rewrite semua 42 template

1. Satu per satu, mulai dari floor files (brief, prd, architecture, design...)
2. Setiap template diisi lengkap dengan conditional sections per web type
3. Verifikasi output: lint pass, traceability pass, format correct

### Fase 3: Switch generator

1. Worker `generateJob()` panggil `generateFromTemplates()` bukan `callLlm()`
2. Worker `processPlan()` pakai `deterministicPlanner()` bukan `callLlm()`
3. Hapus budget/reservation tracking dari generate path
4. Update snapshot creation — tidak perlu llmConfig untuk generate

### Fase 4: Cleanup

1. Tandai LLM-related code sebagai optional/deprecated
2. Update README, PRODUCTION_READINESS, docs
3. Hapus/simplify env vars yang tidak diperlukan
4. Update tests

## Risiko

1. **Kualitas output** — template harus sangat bagus. Ini investasi waktu
   terbesar. Output harus sekurang-kurangnya setara AI untuk kasus umum.

2. **Flexibility hilang** — AI bisa "improvisasi" untuk brief unik. Template
   tidak bisa. Mitigasi: conditional sections yang cukup granular, dan field
   free-text dari brief yang dimasukkan verbatim.

3. **Traceability** — REQ-xx, AC-xx, TEST-xx, T-xx harus generated secara
   konsisten antar dokumen. Engine perlu counter global yang dibagi antar
   dokumen. Ini lebih reliable dari AI yang kadang skip atau duplicate.

4. **Backward compat** — job lama AI-generated harus tetap bisa dibaca.
   Tidak ada migration data yang diperlukan.

## Estimasi

- Fase 1 (engine): 1-2 hari
- Fase 2 (42 template): 3-5 hari (paling besar)
- Fase 3 (switch): 1 hari
- Fase 4 (cleanup): 1 hari
- Total: ~7-9 hari kerja

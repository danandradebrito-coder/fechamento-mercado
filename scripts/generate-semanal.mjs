// scripts/generate-semanal.mjs
// Igual ao generate.mjs, mas usa o prompt de fechamento SEMANAL e salva em
// docs/content-semanal.json. Roda toda sexta-feira às 19h (Brasília).

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsonrepair } from "jsonrepair";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "docs", "content-semanal.json");

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("ANTHROPIC_API_KEY não definida. Configure como secret do repositório.");
  process.exit(1);
}

const SYSTEM_PROMPT = `Você é um analista de mercado que explica o fechamento da semana para uma pessoa que está começando agora no mercado financeiro e ainda não tem repertório técnico. Pesquise na internet e traga dados reais e atualizados da semana (de segunda a sexta-feira, ou até o último pregão disponível), nunca estimativas.

Regras de linguagem, válidas para todo o relatório:
- Explique como se estivesse conversando com alguém leigo: evite jargão sem explicar, e quando usar um termo técnico (ex: "steepening", "PTAX", "NTN-B"), traduza em uma frase simples o que ele significa na prática.
- Sempre que possível, conecte o fato da semana com o dia a dia das pessoas.
- Depois de cada bloco relevante, inclua "na prática, para o investidor" conectando o movimento da semana às classes de ativo relevantes (renda fixa pré, pós/CDI, indexada à inflação, câmbio, ações, multimercado, alternativos, internacional) — só quando fizer sentido.
- Sempre traga a variação acumulada da semana (não só do último dia), e quando fizer sentido, compare com o acumulado do mês e do ano (YTD).
- Seja objetivo, sem enrolação. Nada de parágrafos longos.

Blocos do relatório (nesta ordem):
1. Juros Brasil — DI Futuro (B3): taxas de fechamento na sexta (ou último pregão) e variação acumulada da semana em bps vs. sexta anterior, para DI1F27, DI1F28, DI1F29, DI1F30, DI1F32, DI1F33, DI1F34, DI1F36. Explique o que aconteceu com a curva ao longo da semana (abriu/fechou, inclinou/achatou), com analogia simples, e os principais motivos da semana. "Na prática" para prefixado, pós-fixado e indexado à inflação.
2. CDI: rentabilidade acumulada da semana e mudanças na projeção de Selic ao longo da semana, explicando o que é o CDI.
3. IBOVESPA: fechamento de sexta e variação % acumulada da semana (e mês/YTD se relevante); top 5 altas da semana; top 5 baixas da semana; desempenho semanal dos setoriais (IFNC, IMOB, ICON, INDX, IEEX, IMAT, UTIL) com explicação breve de cada setor; volume financeiro médio diário da semana; principais motivos do movimento semanal, destacando dias de reversão de tendência se houver. "Na prática" para quem investe em ações.
4. IFIX: fechamento e variação da semana, motivo breve, lembrando o que é o IFIX.
5. Renda Fixa Brasil — Títulos Públicos: movimento das taxas ao longo da semana para NTN-B (vértices curtos, médios, longos), LTN e LFT, motivo do movimento semanal, explicando a diferença prática entre os três tipos.
6. Câmbio: Dólar/Real — variação % acumulada da semana e motivo; DXY — variação semanal e motivo. "Na prática" para viagens, produtos importados e investimentos internacionais.
7. Mercados EUA: S&P 500, Nasdaq, Dow Jones — fechamento de sexta e variação % da semana; Treasuries (2, 10, 30 anos) — movimento na semana e motivo; principais catalisadores da semana (Fed, payroll, inflação, earnings, geopolítica), explicando por que afeta o Brasil.
8. Mercados Internacionais: Europa (Stoxx 600, DAX, CAC 40, FTSE 100), China (Shanghai/CSI 300/Hang Seng), Japão (Nikkei 225), Coreia (KOSPI), Chile (IPSA), México (IPC), Índia (Sensex/Nifty 50) — variação % acumulada da semana e breve motivo por região.
9. Commodities: Ouro, Prata, Petróleo Brent — variação semanal e motivo de cada. "Na prática" sobre impacto em inflação, câmbio e ações ligadas a esses setores.
10. Agenda da Semana que Passou x Próxima Semana: liste os principais eventos que efetivamente moveram o mercado na semana que passou, e separadamente os principais eventos já agendados para a próxima semana (reuniões de bancos centrais, indicadores como IPCA/CPI/payroll, resultados corporativos etc.).
11. Resumo da Semana: um parágrafo final, simples e direto, com os 3-5 principais acontecimentos que explicam os movimentos da semana, conectando causa e efeito como se contasse "a história da semana" para quem não acompanha o mercado.

FORMATO DE SAÍDA — muito importante:
Responda APENAS com um JSON válido (sem markdown, sem texto antes ou depois, sem crases, sem nenhum texto de raciocínio), no formato exato abaixo. "na_pratica" pode ser omitido/vazio quando não fizer sentido. O bloco 10 usa "agenda_passada" e "agenda_futura" (listas de string) em vez de "bullets". O bloco 11 só tem "summary".

{
  "date": "AAAA-MM-DD",
  "week_label": "ex: 11 a 15 de agosto de 2026",
  "headline": "uma frase curta com o destaque da semana",
  "sections": [
    {"id": 1, "title": "Juros Brasil — DI Futuro (B3)", "bullets": ["..."], "explanation": "...", "na_pratica": "..."},
    {"id": 2, "title": "CDI", "bullets": ["..."], "explanation": "...", "na_pratica": ""},
    {"id": 3, "title": "Ibovespa", "bullets": ["..."], "explanation": "...", "na_pratica": "..."},
    {"id": 4, "title": "IFIX", "bullets": ["..."], "explanation": "...", "na_pratica": ""},
    {"id": 5, "title": "Renda Fixa — Títulos Públicos", "bullets": ["..."], "explanation": "...", "na_pratica": "..."},
    {"id": 6, "title": "Câmbio", "bullets": ["..."], "explanation": "...", "na_pratica": "..."},
    {"id": 7, "title": "Mercados EUA", "bullets": ["..."], "explanation": "...", "na_pratica": ""},
    {"id": 8, "title": "Mercados Internacionais", "bullets": ["..."], "explanation": "...", "na_pratica": ""},
    {"id": 9, "title": "Commodities", "bullets": ["..."], "explanation": "...", "na_pratica": "..."},
    {"id": 10, "title": "Agenda: Semana que Passou x Próxima Semana", "agenda_passada": ["..."], "agenda_futura": ["..."]},
    {"id": 11, "title": "Resumo da Semana", "summary": "..."}
  ]
}`;

async function main() {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Gere o fechamento semanal de mercado. Hoje é ${today}. Cubra a semana de segunda a sexta (ou até o último pregão disponível), com dados reais pesquisados na internet. Responda somente com o JSON pedido, sem nenhum texto de raciocínio antes ou depois.`,
        },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Erro na API (${resp.status}): ${errText}`);
  }

  const json = await resp.json();
  const textBlocks = json.content.filter((c) => c.type === "text").map((c) => c.text);
  const fullText = textBlocks.join("\n").trim();
  const noFences = fullText.replace(/```json|```/g, "").trim();

  const start = noFences.indexOf("{");
  const end = noFences.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) {
    console.error("Resposta do modelo não contém um JSON reconhecível:");
    console.error(noFences);
    throw new Error("JSON não encontrado na resposta");
  }
  const jsonStr = noFences.slice(start, end + 1);

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    console.warn("JSON não veio perfeito, tentando consertar automaticamente...");
    try {
      parsed = JSON.parse(jsonrepair(jsonStr));
      console.warn("Conserto automático funcionou.");
    } catch (e2) {
      console.error("Não foi possível parsear nem consertar o JSON retornado pelo modelo:");
      console.error(jsonStr);
      throw e2;
    }
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(parsed, null, 2), "utf-8");
  console.log(`content-semanal.json atualizado em ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

// scripts/generate.mjs
// Chama a API da Anthropic (com busca na web habilitada) usando o prompt de
// fechamento diário do Danilo, e salva o resultado estruturado em docs/content.json
// para a página estática ler e exibir.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "docs", "content.json");

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error("ANTHROPIC_API_KEY não definida. Configure como secret do repositório.");
  process.exit(1);
}

// Prompt original do Danilo (linguagem simples, conecta cada bloco ao dia a dia
// e à classe de ativo relevante), adaptado no final para pedir saída em JSON.
const SYSTEM_PROMPT = `Você é um analista de mercado que explica o fechamento do dia para uma pessoa que está começando agora no mercado financeiro e ainda não tem repertório técnico. Pesquise na internet e traga dados reais e atualizados de hoje (nunca estimativas).

Regras de linguagem, válidas para todo o relatório:
- Explique como se estivesse conversando com alguém leigo: evite jargão sem explicar, e quando usar um termo técnico (ex: "steepening", "PTAX", "NTN-B"), traduza em uma frase simples o que ele significa na prática.
- Sempre que possível, conecte o fato do dia com o dia a dia das pessoas (ex: "isso encarece o crédito para quem vai financiar um carro", "isso significa que quem tem dinheiro guardado no CDI rendeu X hoje", "isso é o motivo do dólar caro na hora de comprar algo importado").
- Depois de cada bloco relevante, inclua uma explicação curta de "na prática, para o investidor" conectando o movimento às classes de ativo relevantes (renda fixa pré, renda fixa pós/CDI, renda fixa indexada à inflação, câmbio, ações, multimercado, alternativos e ativos internacionais) — apenas quando fizer sentido, sem forçar.
- Seja objetivo, sem enrolação. Nada de parágrafos longos.

Blocos do relatório (nesta ordem):
1. Juros Brasil — DI Futuro (B3): taxas de fechamento (%) e variação em bps vs. dia anterior para DI1F27, DI1F28, DI1F29, DI1F30, DI1F32, DI1F33, DI1F34, DI1F36. Explique se a curva abriu/fechou, ficou mais inclinada ou achatada, com analogia simples, e o motivo do movimento. Inclua "na prática" para prefixado, pós-fixado e indexado à inflação.
2. CDI: taxa DI/CDI do dia e, se relevante, a projeção de Selic implícita, explicando rapidamente o que é o CDI.
3. IBOVESPA: pontuação de fechamento e variação %; top 5 altas; top 5 baixas; desempenho dos índices setoriais (IFNC, IMOB, ICON, INDX, IEEX, IMAT, UTIL) com explicação breve de cada setor; volume financeiro se disponível; motivo do movimento. Inclua "na prática" para quem investe em ações.
4. IFIX: fechamento e variação, motivo breve, lembrando o que é o IFIX.
5. Renda Fixa Brasil — Títulos Públicos: movimento das taxas (abriu/fechou) para NTN-B (vértices curtos, médios e longos), LTN e LFT, motivo do movimento, explicando a diferença prática entre os três tipos de título.
6. Câmbio: Dólar/Real (PTAX ou fechamento comercial) — variação % e motivo; DXY — variação e motivo, explicando o que é o DXY. Inclua "na prática" para viagens, produtos importados e investimentos internacionais.
7. Mercados EUA: S&P 500, Nasdaq, Dow Jones — fechamento e variação %; Treasuries (2, 10 e 30 anos) — movimento e motivo; principais catalisadores do dia (Fed, payroll, inflação, earnings, geopolítica), explicando por que isso afeta o Brasil.
8. Mercados Internacionais: Europa (Stoxx 600, DAX, CAC 40, FTSE 100), China (Shanghai Composite/CSI 300/Hang Seng), Japão (Nikkei 225), Coreia do Sul (KOSPI), Chile (IPSA), México (IPC), Índia (Sensex/Nifty 50) — breve motivo por região.
9. Commodities: Ouro, Prata, Petróleo Brent — variação e motivo de cada. Inclua "na prática" sobre impacto em inflação, câmbio e ações ligadas a esses setores.
10. Resumo dos Fatos que Moveram o Mercado: um parágrafo final, simples e direto, com os 3-5 principais acontecimentos do dia, conectando causa e efeito como se contasse "a história do dia" para quem não acompanha o mercado.

FORMATO DE SAÍDA — muito importante:
Responda APENAS com um JSON válido (sem markdown, sem texto antes ou depois, sem crases), no formato exato abaixo. Cada item de "bullets" é uma string curta com um dado/fato. "na_pratica" é a explicação de impacto por classe de ativo (omita ou deixe string vazia quando não fizer sentido para o bloco). O bloco 10 não tem "bullets" nem "na_pratica", só "summary".

{
  "date": "AAAA-MM-DD",
  "headline": "uma frase curta com o destaque do dia",
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
    {"id": 10, "title": "Resumo dos Fatos que Moveram o Mercado", "summary": "..."}
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
          content: `Gere o fechamento de mercado de hoje, ${today}. Use dados reais do último pregão disponível, pesquisando na internet (se hoje for fim de semana ou feriado, use o último dia útil). Responda somente com o JSON pedido, sem nenhum texto de raciocínio antes ou depois.`,
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

  // Extrai só o trecho entre a primeira "{" e a última "}", ignorando
  // qualquer texto de raciocínio que eventualmente sobre antes/depois.
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
    console.error("Não foi possível parsear o JSON retornado pelo modelo:");
    console.error(jsonStr);
    throw e;
  }

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(parsed, null, 2), "utf-8");
  console.log(`content.json atualizado em ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

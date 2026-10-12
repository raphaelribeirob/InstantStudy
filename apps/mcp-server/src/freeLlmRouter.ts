/**
 * Free-first LLM router for InstantStudy's text-only study features.
 *
 * The Awesome Free LLM APIs repositories are directories, not upstream gateways.
 * We use three pinned, OpenAI-compatible provider endpoints directly.
 * Do not let untrusted requests select a URL, key, model or provider.
 */
export type TextProvider = "groq" | "openrouter" | "gemini" | "openai";
export type TextCompletion = { text: string; provider: TextProvider };

type ProviderConfig = {
  provider: TextProvider;
  url: string;
  key: string;
  model: string;
};
type CompletionInput = {
  system: string;
  user: string;
  maxTokens: number;
  /** Validate free-tier replies before accepting them or falling through. */
  accept?: (text: string) => boolean;
};
const FREE_PROVIDERS = ["groq", "openrouter", "gemini"] as const;
const SPECS: Record<TextProvider, { url: string; key: string; model: string }> = {
  groq: {
    url: "https://api.groq.com/openai/v1/chat/completions",
    key: "GROQ_API_KEY",
    model: "openai/gpt-oss-20b",
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    key: "OPENROUTER_API_KEY",
    model: "openai/gpt-oss-20b:free",
  },
  gemini: {
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    key: "GEMINI_API_KEY",
    model: "gemini-2.5-flash",
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    key: "OPENAI_API_KEY",
    model: "gpt-4o-mini",
  },
};

function configuredProvider(provider: TextProvider): ProviderConfig | null {
  const info = SPECS[provider];
  const key = process.env[info.key]?.trim();
  if (!key || key.length < 10) return null;
  const modelEnv = ({
    groq: "INSTANTSTUDY_GROQ_MODEL",
    openrouter: "INSTANTSTUDY_OPENROUTER_MODEL",
    gemini: "INSTANTSTUDY_GEMINI_MODEL",
    openai: "INSTANTSTUDY_PAID_TEXT_MODEL",
  } as const)[provider];
  const model = process.env[modelEnv]?.trim() || info.model;
  // The OpenRouter route must never silently select a paid model.
  if (provider === "openrouter" && !model.endsWith(":free")) return null;
  if (!/^[a-zA-Z0-9_.:/-]{2,110}$/.test(model)) return null;
  return { provider, url: info.url, key, model };
}

export function freeTextProvidersConfigured(): TextProvider[] {
  return FREE_PROVIDERS.filter((name) => Boolean(configuredProvider(name)));
}

export function textProviderOrder(): TextProvider[] {
  const freeAllowed = process.env.INSTANTSTUDY_FREE_LLM_ENABLED === "true";
  const paidAllowed = process.env.INSTANTSTUDY_ALLOW_PAID_LLM_FALLBACK === "true";
  const preferred = (process.env.INSTANTSTUDY_FREE_LLM_ORDER || "groq,openrouter,gemini")
    .split(",").map(value => value.trim().toLowerCase())
    .filter((name): name is typeof FREE_PROVIDERS[number] =>
      FREE_PROVIDERS.includes(name as typeof FREE_PROVIDERS[number]));
  const unique = [...new Set(preferred)];
  const free = freeAllowed ? unique.filter(name => configuredProvider(name)) : [];
  // Paid text inference is opt-in. Having OPENAI_API_KEY for voice alone
  // must NEVER cause an unexpected charge for study text.
  return [...free, ...(paidAllowed && configuredProvider("openai") ? ["openai" as const] : [])];
}

async function callProvider(
  config: ProviderConfig,
  input: CompletionInput,
): Promise<string | null> {
  const timeoutMs = Math.max(1500, Math.min(12000,
    Number.parseInt(process.env.INSTANTSTUDY_FREE_LLM_TIMEOUT_MS || "9000", 10) || 9000));
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${config.key}`,
      "content-type": "application/json",
      ...(config.provider === "openrouter"
        ? { "X-Title": "InstantStudy Orbital Learning" }
        : {}),
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: input.system.slice(0, 4000) },
        { role: "user", content: input.user.slice(0, 19000) },
      ],
      temperature: 0.1,
      max_tokens: Math.max(100, Math.min(3000, input.maxTokens)),
      stream: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) return null;
  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  };
  const output = data.choices?.[0]?.message?.content;
  const text = typeof output === "string" ? output
    : Array.isArray(output) ? output.filter(part => part.type === "text")
      .map(part => part.text || "").join("") : "";
  return text && text.length < 40000 ? text.trim() : null;
}

/**
 * No unbounded retries, arbitrary routing URLs or automatic paid inference.
 * The caller must validate pedagogical/JSON quality and provide a deterministic
 * fallback if all available providers fail.
 */
export async function completeStudyText(input: CompletionInput): Promise<TextCompletion | null> {
  const ordered = textProviderOrder();
  const maxFree = Math.max(1, Math.min(3,
    Number.parseInt(process.env.INSTANTSTUDY_FREE_LLM_MAX_ATTEMPTS || "2", 10) || 2));
  let attemptedFree = 0;
  for (const provider of ordered) {
    if (provider !== "openai" && attemptedFree++ >= maxFree) continue;
    const conf = configuredProvider(provider);
    if (!conf) continue;
    try {
      const text = await callProvider(conf, input);
      if (text && (!input.accept || input.accept(text))) {
        return { text, provider };
      }
    } catch {
      // Provider error, quota exhaustion or network outage: try the next
      // explicitly configured provider; never leak private source text in logs.
    }
  }
  return null;
}

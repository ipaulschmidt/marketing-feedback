// Server-only helper for Lovable AI Gateway calls (Responses API, streamed).
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

export type InputPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string }
  | { type: "input_file"; filename: string; file_data: string };

export type InputMessage = { role: "user" | "system" | "developer"; content: InputPart[] };

function friendlyError(status: number, body: string): Error {
  if (status === 402 || status === 403) {
    return new Error(
      "The AI service is unavailable right now (usage limit or access restriction). Try again once it is restored.",
    );
  }
  if (status === 429) {
    return new Error("The AI service is busy. Wait a moment and try again.");
  }
  console.error(`[ai] gateway ${status}: ${body}`);
  return new Error("The AI service could not complete this request. Please try again.");
}

export async function aiJson<T>(options: {
  instructions: string;
  messages: InputMessage[];
  schemaName: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured for this app yet.");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      instructions: options.instructions,
      input: options.messages,
      reasoning: { effort: options.effort ?? "medium" },
      text: {
        format: {
          type: "json_schema",
          name: options.schemaName,
          strict: true,
          schema: options.schema,
        },
      },
    }),
  });

  if (!res.ok || !res.body) {
    throw friendlyError(res.status, await res.text().catch(() => ""));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        } else if (event.type === "response.completed" && event.response?.output_text) {
          if (!text) text = event.response.output_text;
        }
      } catch {
        // ignore keep-alive / partial frames
      }
    }
  }

  if (!text.trim()) {
    throw new Error("The AI returned an empty response. Please try again.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1)) as T;
    throw new Error("The AI response could not be read. Please try again.");
  }
}

export const str = { type: "string" } as const;
export const strArray = { type: "array", items: { type: "string" } } as const;

import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { buildInstructions } from "@/lib/prompt";
import { parseSession } from "@/lib/session";

export const maxDuration = 30;

export async function POST(req: Request) {
  const hasGatewayAuth =
    Boolean(process.env.AI_GATEWAY_API_KEY) || Boolean(process.env.VERCEL_OIDC_TOKEN);
  if (!hasGatewayAuth) {
    return Response.json(
      {
        error:
          "Add AI_GATEWAY_API_KEY to .env.local, then restart the dev server.",
      },
      { status: 500 },
    );
  }

  const body = await req.json();
  const session = parseSession(body);
  const messages = body.messages as UIMessage[] | undefined;

  if (!session || !Array.isArray(messages)) {
    return Response.json(
      { error: "Start a session from the home screen first." },
      { status: 400 },
    );
  }

  const result = streamText({
    model: "google/gemini-2.5-flash-lite",
    instructions: buildInstructions(session),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: (error) => {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("credit card")) {
          return "Vercel AI Gateway needs a credit card on file before it will answer. Add one in your Vercel AI settings, then try the call again.";
        }
        if (message.includes("Free tier") || message.includes("do not have access")) {
          return "This Vercel plan cannot use that model. The coach is set to a model the free tier allows. Refresh and try the call again.";
        }
        return "The coach could not answer. Check the AI Gateway key and try again.";
      },
    }),
  });
}

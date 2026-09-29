import Anthropic from "@anthropic-ai/sdk";
import { extractProgress, PlannerError } from "./planner";
import type { StreamEvent } from "./types";

type Helpers = {
  send: (e: StreamEvent) => void;
  /** Returns an onText callback that reports progress, tagged with dayIndex when given. */
  progress: (dayIndex?: number) => (t: string) => void;
};

/**
 * Runs `work` and streams its progress to the browser as NDJSON events.
 * Progress only emits when newly-found places or days appear.
 */
export function ndjsonResponse(work: (helpers: Helpers) => Promise<void>) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      let closed = false;
      // Parallel workers may still finish after an error closed the stream.
      const send = (e: StreamEvent) => {
        if (!closed) controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      };
      const progress = (dayIndex?: number) => {
        let lastKey = "";
        return (t: string) => {
          const p = extractProgress(t);
          const key = `${p.places.length}:${p.days}`;
          if (key !== lastKey) {
            lastKey = key;
            send({ type: "progress", ...p, dayIndex });
          }
        };
      };
      try {
        await work({ send, progress });
      } catch (err) {
        console.error(err);
        let message = "Something went wrong while planning. Please try again.";
        if (err instanceof PlannerError) message = err.message;
        else if (err instanceof Anthropic.AuthenticationError)
          message = "The Anthropic API key is missing or invalid. Check ANTHROPIC_API_KEY in .env.local.";
        else if (err instanceof Anthropic.RateLimitError)
          message = "Too many requests right now. Wait a moment and try again.";
        else if (err instanceof Anthropic.APIConnectionError)
          message = "Couldn't reach the planner. Check your internet connection and try again.";
        else if (err instanceof Anthropic.APIError) message = `Planner API error (${err.status}). Please try again.`;
        // Remaining SDK errors are client-side setup problems, almost always missing credentials.
        else if (err instanceof Anthropic.AnthropicError)
          message = "No Anthropic API key found. Add ANTHROPIC_API_KEY to .env.local and restart the server.";
        send({ type: "error", message });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });
  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

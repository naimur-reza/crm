import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

export function getAiClient(): OpenAI {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is required to use AI features.");
  }

  if (!client) {
    client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }

  return client;
}

export function getAiModel(): string {
  return process.env.AI_MODEL || "llama3-70b-8192";
}

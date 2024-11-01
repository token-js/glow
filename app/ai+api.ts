import { OpenAI } from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function getTextStream() {
  return await client.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: "How many r's are there in STaR?" }],
    stream: true,
  });
}

export async function POST(request: Request) {
  const stream = await getTextStream();

  const textStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          controller.enqueue(content);
        }
      } catch (e) {
        controller.error(e);
      } finally {
        controller.close();
      }
    },
  }).pipeThrough(new TextEncoderStream());

  return new Response(textStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
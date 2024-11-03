import { ChatCompletionMessageParam } from "openai/resources";
import { encoding_for_model, TiktokenModel } from "tiktoken";

export const convertSQLToSettings = (data: any[] | null) => {
  const settings = data?.at(0)

  if (!settings) {
    return null
  }

  return {
    id: settings.id,
    name: settings.name,
    gender: settings.gender,
    voice: settings.voice,
    aiName: settings.aiName
  }
}

// Taken from: https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken
export const estimateTokensForOpenAIModel = (
  messages: ChatCompletionMessageParam[],
  model: TiktokenModel
): number => {
  const encoding = encoding_for_model(model);
  const tokensPerMessage = 3;
  const tokensPerName = 1;
  let numTokens = 0;

  for (const message of messages) {
    numTokens += tokensPerMessage;
    for (const [key, value] of Object.entries(message)) {
      numTokens += encoding.encode(value).length;
      if (key === "name") {
        numTokens += tokensPerName;
      }
    }
  }

  numTokens += 3; // Every reply is primed with <|start|>assistant<|message|>
  return numTokens;
};

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
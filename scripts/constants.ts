import { TODOStatus } from "./types";

export const MODEL_NAME = "gpt-4o-mini-2024-07-18"

// TODO(docs): The `fineTuningMaxTokens` and `baseCostPerMillionTokens` can change over time. Link
// to the OpenAI docs that show the current values.
export const MODEL_FINE_TUNING_INFO: Record<string, {
  baseCostPerMillionTokens: number;
  fineTuningMaxTokens: number;
}> = {
  "gpt-4o-mini-2024-07-18": {
    baseCostPerMillionTokens: 0.9,
    fineTuningMaxTokens: 65536
  }
};

export const CONTEXT_WINDOWS: Record<string, number> = {"gpt-4o-mini-2024-07-18": 128000, "inflection_3_pi": 8000}

export const ESTIMATED_TOKENS_PER_MESSAGE = 100

// TODO(later): rename
// TODO(docs):
export const todoStatusPriorityMap: Record<TODOStatus, number> = {
  [TODOStatus.CensoredProfanity]: 1,
  [TODOStatus.WrongTranscription]: 2,
  [TODOStatus.NewConversations]: 3,
  [TODOStatus.NegativeUserResponses]: 4,
  [TODOStatus.RepeatedStatements]: 5,
  [TODOStatus.Hallucinations]: 6,
  [TODOStatus.Done]: 7
};

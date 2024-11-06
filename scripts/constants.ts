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
  // TODO(docs): group 1
  // [TODOStatus.CensoredProfanity]: 1, // TODO(later): undo
  // TODO(docs): group 2. put steps that are more likely to result in a weight of 0 earlier as an optimization.
  // if a message is given a weight of 0, we skip it on subsequent steps that determine the weight, leading to 
  // cost and speed savings during subsequent cleaning steps.
  [TODOStatus.NegativeUserResponses]: 2,
  [TODOStatus.RepeatedStatements]: 3,
  [TODOStatus.Hallucinations]: 4,
  // TODO(docs): done
  [TODOStatus.Done]: 5
};

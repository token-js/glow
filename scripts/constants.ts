// The `fineTuningMaxTokens` and `baseCostPerMillionTokens` can change over time. See here for their
// current values:
// https://platform.openai.com/docs/guides/fine-tuning/fine-tuning-integrations#token-limits
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

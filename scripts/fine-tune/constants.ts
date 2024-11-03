export const MODEL_NAME = "gpt-4o-mini-2024-07-18"

export const MODEL_FINE_TUNING_INFO: Record<string, {
  baseCostPerMillionTokens: number;
  fineTuningMaxTokens: number;
}> = {
  "gpt-4o-mini-2024-07-18": {
    baseCostPerMillionTokens: 0.9,
    fineTuningMaxTokens: 65536
  }
};
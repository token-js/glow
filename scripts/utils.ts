import { randomUUID } from "crypto";
import {
  addDays,
  differenceInCalendarDays,
  setHours,
  startOfDay,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Memory } from "mem0ai";
import OpenAI, { toFile } from "openai";
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionUserMessageParam,
  FileObject,
} from "openai/resources";
import { encoding_for_model, Tiktoken, TiktokenModel } from "tiktoken";
import { CONTEXT_WINDOWS, MODEL_FINE_TUNING_INFO } from "./constants";
import {
  ExportedPiMessage,
  TrainingDataExample,
} from "./types";

export const trainingDataMessageToChatMessage = (
  message: TrainingDataExample[0]
): ChatCompletionMessageParam => {
  if ("weight" in message) {
    // Remove the weight property
    const { weight, ...rest } = message;
    return rest;
  }
  return message;
};

export const timeAgo = (
  currentTime: Date,
  previousTime: Date,
  timeZone: string
): string => {
  // Convert times to the specified timezone
  const currentTimeZoneDate = toZonedTime(currentTime, timeZone);
  const previousTimeZoneDate = toZonedTime(previousTime, timeZone);

  const currentDate = startOfDay(currentTimeZoneDate);

  // Calculate the difference in calendar days
  const diffDays = differenceInCalendarDays(
    currentTimeZoneDate,
    previousTimeZoneDate
  );

  // Define time ranges for today in the specified timezone
  const fiveAmToday = setHours(currentDate, 5);
  const twelvePmToday = setHours(currentDate, 12);
  const fivePmToday = setHours(currentDate, 17);
  const eightPmToday = setHours(currentDate, 20);
  const midnightTonight = addDays(currentDate, 1);

  // Define time ranges for yesterday in the specified timezone
  const yesterdayDate = addDays(currentDate, -1);

  const fiveAmYesterday = setHours(yesterdayDate, 5);
  const twelvePmYesterday = setHours(yesterdayDate, 12);
  const fivePmYesterday = setHours(yesterdayDate, 17);
  const eightPmYesterday = setHours(yesterdayDate, 20);
  const midnightLastNight = addDays(yesterdayDate, 1);

  // Define last night range (8pm yesterday to 5am today)
  const lastNightStart = eightPmYesterday;
  const lastNightEnd = fiveAmToday;

  // Check "Last night"
  if (
    previousTimeZoneDate >= lastNightStart &&
    previousTimeZoneDate < lastNightEnd
  ) {
    return "Last night";
  }

  // Check "Tonight"
  if (
    previousTimeZoneDate >= eightPmToday &&
    previousTimeZoneDate < midnightTonight
  ) {
    return "Tonight";
  }

  // Check if previousTime is today
  if (diffDays === 0) {
    if (
      previousTimeZoneDate >= fiveAmToday &&
      previousTimeZoneDate < twelvePmToday
    ) {
      return "This morning";
    } else if (
      previousTimeZoneDate >= twelvePmToday &&
      previousTimeZoneDate < fivePmToday
    ) {
      return "This afternoon";
    } else if (
      previousTimeZoneDate >= fivePmToday &&
      previousTimeZoneDate < eightPmToday
    ) {
      return "This evening";
    } else if (
      previousTimeZoneDate >= eightPmToday &&
      previousTimeZoneDate < midnightTonight
    ) {
      return "Tonight";
    } else if (
      previousTimeZoneDate >= currentDate &&
      previousTimeZoneDate < fiveAmToday
    ) {
      return "Last night";
    }
  } else if (diffDays === 1) {
    if (
      previousTimeZoneDate >= fiveAmYesterday &&
      previousTimeZoneDate < twelvePmYesterday
    ) {
      return "Yesterday morning";
    } else if (
      previousTimeZoneDate >= twelvePmYesterday &&
      previousTimeZoneDate < fivePmYesterday
    ) {
      return "Yesterday afternoon";
    } else if (
      previousTimeZoneDate >= fivePmYesterday &&
      previousTimeZoneDate < eightPmYesterday
    ) {
      return "Yesterday evening";
    } else if (
      previousTimeZoneDate >= eightPmYesterday &&
      previousTimeZoneDate < midnightLastNight
    ) {
      return "Last night";
    } else {
      return "Yesterday";
    }
  }

  // Calculate the exact time differences
  const diffMs = currentTimeZoneDate.getTime() - previousTimeZoneDate.getTime();
  const diffDaysExact = diffMs / (1000 * 60 * 60 * 24);

  // Check days ago
  if (diffDays === 2) {
    return "Two days ago";
  } else if (diffDays >= 3 && diffDays <= 6) {
    return "A few days ago";
  } else if (diffDaysExact >= 7 && diffDaysExact < 10.5) {
    return "One week ago";
  } else if (diffDaysExact >= 10.5 && diffDaysExact < 14) {
    return "A week and a half ago";
  } else if (diffDaysExact >= 14 && diffDaysExact < 20) {
    return "Two weeks ago";
  } else if (diffDaysExact >= 21 && diffDaysExact < 27) {
    return "Three weeks ago";
  } else if (diffDaysExact >= 27 && diffDaysExact < 45) {
    return "A month ago";
  } else if (diffDaysExact >= 45 && diffDaysExact < 60) {
    return "A month and a half ago";
  } else {
    // Calculate months difference more precisely
    const monthsDifferenceExact = diffMs / (1000 * 60 * 60 * 24 * 30.44); // Average days in a month
    const monthsDifference = Math.floor(monthsDifferenceExact);

    if (monthsDifference >= 2 && monthsDifference < 3) {
      return "Two months ago";
    } else if (monthsDifference >= 3 && monthsDifference < 4) {
      return "Three months ago";
    } else if (monthsDifference >= 4 && monthsDifference < 5) {
      return "Four months ago";
    } else if (monthsDifference >= 5 && monthsDifference < 6) {
      return "Five months ago";
    } else if (monthsDifference >= 6 && monthsDifference < 7) {
      return "Six months ago";
    } else if (monthsDifference >= 7 && monthsDifference < 8) {
      return "Seven months ago";
    } else if (monthsDifference >= 8 && monthsDifference < 9) {
      return "Eight months ago";
    } else if (monthsDifference >= 9 && monthsDifference < 10) {
      return "Nine months ago";
    } else if (monthsDifference >= 10 && monthsDifference < 11) {
      return "Ten months ago";
    } else if (monthsDifference >= 11 && monthsDifference < 12) {
      return "Eleven months ago";
    } else {
      const yearsDifferenceExact = diffMs / (1000 * 60 * 60 * 24 * 365.25); // Average days in a year
      const yearsDifference = Math.floor(yearsDifferenceExact);
      if (yearsDifference === 1) {
        return "A year ago";
      } else if (yearsDifference >= 2) {
        return `${yearsDifference} years ago`;
      }
    }
  }

  return "";
};

export const getInflectionResponse = async (
  truncatedMessages: ChatCompletionMessageParam[],
  config: string
  // metadata: InflectionChatCompletionMetadata
): Promise<string> => {
  function mapMessage(msg: ChatCompletionMessageParam) {
    const roleToType: Record<string, string> = {
      system: "Instruction",
      user: "Human",
      assistant: "AI",
    };
    if (!(msg.role in roleToType)) {
      throw new Error(`Unknown role: ${msg.role}`);
    }
    return {
      type: roleToType[msg.role],
      text: msg.content,
    };
  }

  const mappedContext = truncatedMessages.map(mapMessage);
  const url = "https://layercake.pubwestus3.inf7ks8.com/external/api/inference";
  const headers = {
    Authorization: `Bearer ${process.env.INFLECTION_API_KEY}`,
    "Content-Type": "application/json",
  };
  // const payload = { config, context: mappedContext, metadata };
  const payload = { config, context: mappedContext };
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Request failed with status ${response.status}: ${errorText}`
    );
  }

  const responseData = await response.text();
  const parsed = JSON.parse(responseData);

  return parsed.text.trimStart();
};

// Taken from: https://cookbook.openai.com/examples/chat_finetuning_data_prep
export const estimateTrainingCost = (
  dataset: Array<TrainingDataExample>,
  model: TiktokenModel
): number => {
  const targetEpochs = 3;
  const minTargetExamples = 100;
  const maxTargetExamples = 25000;
  const minDefaultEpochs = 1;
  const maxDefaultEpochs = 25;

  if (!(model in MODEL_FINE_TUNING_INFO)) {
    throw new Error(`Model "${model}" training info unknown.`);
  }

  const { baseCostPerMillionTokens } = MODEL_FINE_TUNING_INFO[model];

  let numEpochs = targetEpochs;
  if (dataset.length * targetEpochs < minTargetExamples) {
    numEpochs = Math.min(
      maxDefaultEpochs,
      Math.floor(minTargetExamples / dataset.length)
    );
  } else if (dataset.length * targetEpochs > maxTargetExamples) {
    numEpochs = Math.max(
      minDefaultEpochs,
      Math.floor(maxTargetExamples / dataset.length)
    );
  }

  let numTokens = 0;
  const encoding = encoding_for_model(model);
  for (const messages of dataset) {
    numTokens += estimateTokensForMessages(
      messages.map(trainingDataMessageToChatMessage),
      encoding
    );
  }

  const estimatedCost =
    (baseCostPerMillionTokens / 1e6) * numTokens * numEpochs;

  return estimatedCost;
};

export const validateTrainingDataset = (
  dataset: Array<TrainingDataExample>,
  model: TiktokenModel
): void => {
  const formatErrors: { [key: string]: number } = {};

  if (dataset.length < 10) {
    throw new Error(
      `Training file has ${dataset.length} example(s), but must have at least 10 examples`
    );
  }

  const encoding = encoding_for_model(model);
  for (const example of dataset) {
    if (example.length === 0) {
      formatErrors["missing_messages_list"] =
        (formatErrors["missing_messages_list"] || 0) + 1;
      continue;
    }

    const numTokens = estimateTokensForMessages(
      example.map(trainingDataMessageToChatMessage),
      encoding
    );
    const { fineTuningMaxTokens } = MODEL_FINE_TUNING_INFO[model];
    // Check if the example is greater than the max token size for a fine-tuning example. This is
    // necessary because of the following limitation in OpenAI's fine-tuning process: "Examples
    // longer than the default will be truncated to the maximum context length which removes tokens
    // from the end of the training example(s). To be sure that your entire training example fits in
    // context, consider checking that the total token counts in the message contents are under the
    // limit." Source:
    // https://platform.openai.com/docs/guides/fine-tuning/fine-tuning-integrations#token-limits
    //
    // If we need to split large examples into smaller ones, consider this quote from OpenAI's
    // fine-tuning guide (linked above): "Make sure your training examples contain all of the
    // information needed for the response. If we want the model to compliment a user based on their
    // personal traits and a training example includes assistant compliments for traits not found in
    // the preceding conversation, the model may learn to hallucinate information". In other words,
    // we shouldn't naively split long examples into smaller ones because of hallucinations. For
    // example, say we split a large example in half into "Example A" and "Example B". Say Example B
    // starts with the message, "How did your husband feel about that?". This example is training
    // the model to hallucinate that the user has a husband.
    if (numTokens > fineTuningMaxTokens) {
      formatErrors["example_too_large"] =
        (formatErrors["example_too_large"] || 0) + 1;
      // We don't `continue` because we can proceed with the rest of the validation logic if the
      // example is too large.
    }

    for (const message of example) {
      if (!("role" in message) || !("content" in message)) {
        formatErrors["message_missing_key"] =
          (formatErrors["message_missing_key"] || 0) + 1;
      }

      if (
        Object.keys(message).some(
          (k) =>
            !["role", "content", "name", "function_call", "weight"].includes(k)
        )
      ) {
        formatErrors["message_unrecognized_key"] =
          (formatErrors["message_unrecognized_key"] || 0) + 1;
      }
      if (
        !["system", "user", "assistant", "function"].includes(
          message.role || ""
        )
      ) {
        formatErrors["unrecognized_role"] =
          (formatErrors["unrecognized_role"] || 0) + 1;
      }
      const content = message.content;
      if (typeof content !== "string") {
        formatErrors["missing_content"] =
          (formatErrors["missing_content"] || 0) + 1;
      }
    }

    if (!example.some((message) => message.role === "assistant")) {
      formatErrors["example_missing_assistant_message"] =
        (formatErrors["example_missing_assistant_message"] || 0) + 1;
    }
  }

  if (Object.keys(formatErrors).length > 0) {
    const errorMessages = Object.entries(formatErrors)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");
    throw new Error(`Found errors:\n${errorMessages}`);
  }
};

export const uploadFileToOpenAI = async (
  openai: OpenAI,
  filename: string,
  dataset: Array<TrainingDataExample>
): Promise<FileObject> => {
  const jsonl = dataset
    .map((entry) => JSON.stringify({ messages: entry }))
    .join("\n");

  const file = await toFile(
    new Blob([jsonl], { type: "application/json" }),
    filename
  );

  const fileObject = await openai.files.create({
    file,
    purpose: "fine-tune",
  });

  return fileObject;
};

const isRawExportedPiMessage = (message: any): message is ExportedPiMessage => {
  return (
    typeof message.text === "string" &&
    (message.sender === "AI" || message.sender === "HUMAN") &&
    typeof message.channel === "string" &&
    typeof message.sent_at === "string"
  );
};

export const convertPiMessageToChatMessage = (
  message: ExportedPiMessage
): ChatCompletionMessageParam => {
  if (!isRawExportedPiMessage(message)) {
    throw new Error(`Input data is not expected type`);
  }

  let role: ChatCompletionMessageParam["role"];
  if (message.sender === "AI") {
    role = "assistant";
  } else if (message.sender === "HUMAN") {
    role = "user";
  } else {
    throw new Error(`Unknown sender: ${message.sender}`);
  }
  return {
    role: role,
    content: message.text,
  };
};

export const getFinalMessagesByTokenLimit = (
  messages: ChatCompletionMessageParam[],
  model: TiktokenModel,
  tokenLimit: number
): ChatCompletionMessageParam[] => {
  const maxContextWindow = CONTEXT_WINDOWS[model];
  if (tokenLimit > maxContextWindow) {
    throw new Error(
      `Token limit exceeds the maximum context window for the model.`
    );
  }

  const encoding = encoding_for_model(model);
  const messagesCopy = structuredClone(messages);

  let low = 0;
  let high = messagesCopy.length;
  let ans = messagesCopy.length;

  const isValid = (startIndex: number): boolean => {
    const currentMessages = messagesCopy.slice(startIndex);
    const tokensCount = estimateTokensForMessages(
      currentMessages,
      encoding
    );
    return tokensCount <= tokenLimit;
  };

  // We use binary search because for latency. Estimating tokens with tiktoken is slow if there are
  // tens of thousands of tokens in the messages array.
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (isValid(mid)) {
      ans = mid;
      high = mid - 1; // Try to find a smaller starting index
    } else {
      low = mid + 1; // Need to remove more messages from the start
    }
  }

  return messagesCopy.slice(ans);
};

export const getInitialMessagesByTokenLimit = (
  messages: ChatCompletionMessageParam[],
  model: TiktokenModel,
  tokenLimit: number
): ChatCompletionMessageParam[] => {
  const maxContextWindow = CONTEXT_WINDOWS[model];
  if (tokenLimit > maxContextWindow) {
    throw new Error(
      `Token limit exceeds the maximum context window for the model.`
    );
  }

  const encoding = encoding_for_model(model);
  const messagesCopy = structuredClone(messages);

  let low = 0;
  let high = messagesCopy.length;
  let ans = 0;

  const isValid = (mid: number): boolean => {
    const currentMessages = messagesCopy.slice(0, mid);
    const tokensCount = estimateTokensForMessages(
      currentMessages,
      encoding
    );
    return tokensCount <= tokenLimit;
  };

  // We use binary search because for latency. Estimating tokens with tiktoken is slow if there are
  // tens of thousands of tokens in the messages array.
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    if (isValid(mid)) {
      ans = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return messagesCopy.slice(0, ans);
};

const isChatCompletionSystemMessageParam = (
  obj: any
): obj is ChatCompletionSystemMessageParam => {
  if (typeof obj !== "object" || obj === null) return false;

  const allowedKeys = ["content", "role", "name"];
  const hasValidKeys = Object.keys(obj).every((key) =>
    allowedKeys.includes(key)
  );

  return hasValidKeys;
};

const isChatCompletionUserMessageParam = (
  obj: any
): obj is ChatCompletionUserMessageParam => {
  if (typeof obj !== "object" || obj === null) return false;

  const allowedKeys = ["content", "role", "name"];
  const hasValidKeys = Object.keys(obj).every((key) =>
    allowedKeys.includes(key)
  );

  return hasValidKeys;
};

const isChatCompletionAssistantMessageParam = (
  obj: any
): obj is ChatCompletionAssistantMessageParam => {
  if (typeof obj !== "object" || obj === null) return false;

  const allowedKeys = [
    "role",
    "audio",
    "content",
    "function_call",
    "name",
    "refusal",
    "tool_calls",
  ];

  return Object.keys(obj).every((key) => allowedKeys.includes(key));
};

const isChatCompletionToolMessageParam = (
  obj: any
): obj is ChatCompletionToolMessageParam => {
  if (typeof obj !== "object" || obj === null) return false;

  const allowedKeys = ["content", "role", "tool_call_id"];

  return Object.keys(obj).every((key) => allowedKeys.includes(key));
};

const isChatCompletionMessageParam = (
  obj: any
): obj is ChatCompletionMessageParam => {
  return (
    isChatCompletionAssistantMessageParam(obj) ||
    isChatCompletionUserMessageParam(obj) ||
    isChatCompletionSystemMessageParam(obj) ||
    isChatCompletionToolMessageParam(obj)
  );
};

// Taken from: https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken
export const estimateTokensForMessages = (
  messages: ChatCompletionMessageParam[],
  encoding: Tiktoken
): number => {
  // Check that each message is a ChatCompletionMessageParam. Particularly, it's important to check
  // that `messages` does not contain entries that are a superset of the ChatCompletionMessageParam
  // type because extraneous fields would be counted as tokens, which is not desirable.
  if (!messages.every(isChatCompletionMessageParam)) {
    throw new Error("All messages must be of type ChatCompletionMessageParam");
  }

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

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithErrorHandling = async (
  url: string,
  options: Record<string, any>
) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`API request failed: ${errorData}`);
  }
  return await response.json();
};

export const addMemories = async (
  headers: Record<string, any>,
  payload: Record<string, any>
) => {
  const url = `https://api.mem0.ai/v1/memories/`;
  const options = {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  };

  const response = await fetchWithErrorHandling(url, options);
  return response;
};

export const searchMemories = async (
  headers: Record<string, any>,
  payload: Record<string, any>
) => {
  const url = `https://api.mem0.ai/v2/memories/search/`;
  const options = {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  };

  const response = await fetchWithErrorHandling(url, options);
  return response;
};

export const makeSystemPrompt = (
  aiFirstName: string,
  userFirstName: string,
  userGender: string,
  memories: Array<Memory>,
  preferences: Array<Memory>
): string => {
  const currentTime = new Date();

  let memoriesStr = "";
  let preferencesStr = "";
  if (memories.length > 0) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const memoriesWithTime: string[] = [];
    for (const fact of memories) {
      const memory = fact.memory;
      if (!memory) {
        continue;
      }

      let timeAgoFormatted: string;
      if (fact.updated_at) {
        timeAgoFormatted = timeAgo(
          currentTime,
          new Date(fact.updated_at),
          timezone
        );
      } else if (fact.created_at) {
        timeAgoFormatted = timeAgo(
          currentTime,
          new Date(fact.created_at),
          timezone
        );
      } else {
        timeAgoFormatted = "Unknown";
      }
      memoriesWithTime.push(
        `<MEMORY>\nMemory: ${memory}\nTime: ${timeAgoFormatted}\n</MEMORY>`
      );
    }

    const formattedMemories = memoriesWithTime.join("\n");
    memoriesStr = `\n\nBelow is a list of memories from your previous conversations with ${userFirstName}. These memories may or may not be relevant to the current conversation. Each memory is enclosed within <MEMORY> tags and includes a relative time reference (e.g., 'One week ago') indicating when the memory was created.
${formattedMemories}`;
  }
  if (preferences.length > 0) {
    const preferencesWithTags: string[] = [];

    for (const preference of preferences) {
      const preferenceMemory = preference.memory;
      if (!preferenceMemory) {
        continue;
      }

      preferencesWithTags.push(
        `<PREFERENCE>\n${preferenceMemory}\n</PREFERENCE>`
      );
    }

    const formattedPreferences = preferencesWithTags.join("\n");
    preferencesStr = `\n\nBelow is a list of preferences for how ${userFirstName} prefers you respond. Each preference is enclosed within <PREFERENCE> tags.
${formattedPreferences}`;
  }

  const systemPrompt = `Your name is ${aiFirstName}. You are talking to ${userFirstName}, whose gender is: ${userGender}.${memoriesStr}${preferencesStr}`;

  return systemPrompt;
};

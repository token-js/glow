import { ChatCompletionAssistantMessageParam, ChatCompletionMessageParam, ChatCompletionSystemMessageParam, ChatCompletionUserMessageParam, FileObject } from "openai/resources";
import { encoding_for_model, Tiktoken, TiktokenModel } from "tiktoken";
import { CONTEXT_WINDOWS, MODEL_FINE_TUNING_INFO, todoStatusPriorityMap } from "./constants";
import OpenAI, { toFile } from "openai";
import { AssistantFineTuningMessage as FineTuningAssistantMessage, ExportedPiMessage, FineTuningMessage, ParsedExportedPiData, TODO, TODOMessage, TODOStatus, UserFineTuningMessage as FineTuningUserMessage, FineTuningExample, TrainingDataExample } from "./types";
import { createReadStream, existsSync, mkdirSync, readFile, readFileSync, writeFileSync } from "fs";
import * as readline from 'readline';
import { appendFile } from "fs/promises";
import { createHash } from "crypto";

export const trainingDataMessageToChatMessage = (
  message: TrainingDataExample[0]
): ChatCompletionMessageParam => {
  if ('weight' in message) {
    // Remove the weight property
    const { weight, ...rest } = message;
    return rest
  }
  return message;
};

export const getInflectionResponse = async (
  truncatedMessages: ChatCompletionMessageParam[],
  config: string,
  // metadata: InflectionChatCompletionMetadata 
): Promise<string> => {
  function mapMessage(msg: ChatCompletionMessageParam) {
    const roleToType: Record<string, string> = {
      system: 'Instruction',
      user: 'Human',
      assistant: 'AI',
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
  const url = 'https://layercake.pubwestus3.inf7ks8.com/external/api/inference';
  const headers = {
    Authorization: `Bearer ${process.env.INFLECTION_API_KEY}`,
    'Content-Type': 'application/json',
  };
  // const payload = { config, context: mappedContext, metadata };
  const payload = { config, context: mappedContext };
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Request failed with status ${response.status}: ${errorText}`);
  }

  const responseData = await response.text();
  const parsed = JSON.parse(responseData)
  
  return parsed.text.trimStart()
}

// Taken from: https://cookbook.openai.com/examples/chat_finetuning_data_prep
export const estimateTrainingCost = (dataset: Array<TrainingDataExample>, model: TiktokenModel): number => {
  const targetEpochs = 3;
  const minTargetExamples = 100;
  const maxTargetExamples = 25000;
  const minDefaultEpochs = 1;
  const maxDefaultEpochs = 25;

  if (!(model in MODEL_FINE_TUNING_INFO)) {
    throw new Error(`Model "${model}" training info unknown.`);
  }

  const {baseCostPerMillionTokens} = MODEL_FINE_TUNING_INFO[model];

  let numEpochs = targetEpochs;
  if (dataset.length * targetEpochs < minTargetExamples) {
    numEpochs = Math.min(maxDefaultEpochs, Math.floor(minTargetExamples / dataset.length));
  } else if (dataset.length * targetEpochs > maxTargetExamples) {
    numEpochs = Math.max(minDefaultEpochs, Math.floor(maxTargetExamples / dataset.length));
  }

  let numTokens = 0;
  const encoding = encoding_for_model(model)
  for (const messages of dataset) {
    numTokens += estimateTokensForMessages(messages.map(trainingDataMessageToChatMessage), encoding);
  }

  const estimatedCost = (baseCostPerMillionTokens / 1e6) * numTokens * numEpochs;

  return estimatedCost
};


export const validateTrainingDataset = (dataset: Array<TrainingDataExample>, model: TiktokenModel): void => {
  const formatErrors: { [key: string]: number } = {};
  
  if (dataset.length < 10) {
    throw new Error(`Training file has ${dataset.length} example(s), but must have at least 10 examples`)
  }

  const encoding = encoding_for_model(model)
  for (const example of dataset) {    
    if (example.length === 0) {
      formatErrors["missing_messages_list"] = (formatErrors["missing_messages_list"] || 0) + 1;
      continue;
    }

    const numTokens = estimateTokensForMessages(example.map(trainingDataMessageToChatMessage), encoding);
    const {fineTuningMaxTokens} = MODEL_FINE_TUNING_INFO[model];
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
      formatErrors["example_too_large"] = (formatErrors["example_too_large"] || 0) + 1;
      // We don't `continue` because we can proceed with the rest of the validation logic if the
      // example is too large.
    }
    
    for (const message of example) {
      if (!("role" in message) || !("content" in message)) {
        formatErrors["message_missing_key"] = (formatErrors["message_missing_key"] || 0) + 1;
      }

      if (Object.keys(message).some(k => !["role", "content", "name", "function_call", "weight"].includes(k))) {
        formatErrors["message_unrecognized_key"] = (formatErrors["message_unrecognized_key"] || 0) + 1;
      }
      if (!["system", "user", "assistant", "function"].includes(message.role || "")) {
        formatErrors["unrecognized_role"] = (formatErrors["unrecognized_role"] || 0) + 1;
      }
      const content = message.content;
      if (typeof content !== 'string') {
        formatErrors["missing_content"] = (formatErrors["missing_content"] || 0) + 1;
      }
    }
    
    if (!example.some(message => message.role === "assistant")) {
      formatErrors["example_missing_assistant_message"] = (formatErrors["example_missing_assistant_message"] || 0) + 1;
    }
  }
  
  if (Object.keys(formatErrors).length > 0) {
    const errorMessages = Object.entries(formatErrors).map(
      ([key, value]) => `${key}: ${value}`
    ).join('\n');
    throw new Error(`Found errors:\n${errorMessages}`);
  }
}

// TODO(later-later): name
export const makeFileName = (baseName: string, extension: string): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${baseName}_${year}${month}${day}_${hours}${minutes}${seconds}.${extension}`;
}

export const uploadFileToOpenAI = async (openai: OpenAI, filename: string, dataset: Array<TrainingDataExample>): Promise<FileObject> => {
  const jsonl = dataset.map(entry => JSON.stringify({messages: entry})).join('\n');

  const file = await toFile(new Blob([jsonl], { type: 'application/json' }), filename);

  const fileObject = await openai.files.create({
    file,
    purpose: 'fine-tune'
  });

  return fileObject
}

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
    throw new Error(`Input data is not expected type`)
  }

    let role: ChatCompletionMessageParam['role']
    if (message.sender === 'AI') {
      role = 'assistant'
    } else if (message.sender === 'HUMAN') {
      role = 'user'
    } else {
      throw new Error(`TODO(docs)`)
    }
    return {
      role: role,
      content: message.text
    }
}

// TODO(later-later): rename
export const makeTODO = (
  pi: ParsedExportedPiData
): TODO => {
  const getInitialStep = (): TODOStatus => {
    let lowestStatus: TODOStatus | null = null;
    let lowestValue = Number.POSITIVE_INFINITY;
  
    for (const [status, value] of Object.entries(todoStatusPriorityMap)) {
      if (value < lowestValue) {
        lowestValue = value;
        lowestStatus = status as TODOStatus;
      }
    }
  
    if (lowestStatus === null) {
      throw new Error("No lowest status was found.");
    }
  
    return lowestStatus;
  };


  const messages: Array<TODOMessage> = pi.messages.map((piMessage => {
    let role: ChatCompletionMessageParam['role']
    if (piMessage.sender === 'AI') {
      role = 'assistant'
    } else if (piMessage.sender === 'HUMAN') {
      role = 'user'
    } else {
      throw new Error(`TODO(docs)`)
    }


    const initialStep = getInitialStep()
    // TODO(Docs): weight defaults to 1 because...
    return {role, content: piMessage.text, nextStep: initialStep, weight: 1}
  }))

  return {
    messages: messages
  }
}

// TODO(later-later): rename
export const getCurrentTODOStatus = (messages: Array<TODOMessage>): TODOStatus => {
  const statuses = messages.map(m => m.nextStep)

  let earliestStatus = statuses[0];
  for (let i = 1; i < statuses.length; i++) {
    if (todoStatusPriorityMap[statuses[i]] < todoStatusPriorityMap[earliestStatus]) {
      earliestStatus = statuses[i];
    }
  }
  return earliestStatus;
};

export const getNextTODOStatus = (currentStatus: TODOStatus): TODOStatus => {
  const currentPriority = todoStatusPriorityMap[currentStatus];

  for (const [status, priority] of Object.entries(todoStatusPriorityMap)) {
    if (priority === currentPriority + 1) {
      return status as TODOStatus
    }
  }

  throw new Error(`TODO(docs)`)
};

// TODO(docs): we use binary search because...
export const getFinalMessagesByTokenLimit = (
  messages: TODOMessage[],
  model: TiktokenModel,
  tokenLimit: number
): TODOMessage[] => {
  const maxContextWindow = CONTEXT_WINDOWS[model];
  if (tokenLimit > maxContextWindow) {
    throw new Error(`TODO(docs): Token limit exceeds the maximum context window for the model.`);
  }

  const encoding = encoding_for_model(model);
  const messagesCopy = structuredClone(messages);

  let low = 0;
  let high = messagesCopy.length;
  let ans = messagesCopy.length;

  const isValid = (startIndex: number): boolean => {
    const currentMessages = messagesCopy.slice(startIndex);
    const tokensCount = estimateTokensForMessages(
      currentMessages.map(toChatCompletionMessageParam),
      encoding
    );
    return tokensCount <= tokenLimit;
  };

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

// TODO(docs): we use binary search because...
export const getInitialMessagesByTokenLimit = (
  messages: TODOMessage[],
  model: TiktokenModel,
  tokenLimit: number
): TODOMessage[] => {
  const maxContextWindow = CONTEXT_WINDOWS[model];
  if (tokenLimit > maxContextWindow) {
    throw new Error(`TODO(docs): Token limit exceeds the maximum context window for the model.`);
  }

  const encoding = encoding_for_model(model);
  const messagesCopy = structuredClone(messages);

  let low = 0;
  let high = messagesCopy.length;
  let ans = 0;

  const isValid = (mid: number): boolean => {
    const currentMessages = messagesCopy.slice(0, mid);
    const tokensCount = estimateTokensForMessages(
      currentMessages.map(toChatCompletionMessageParam),
      encoding
    );
    return tokensCount <= tokenLimit;
  };

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

// TODO(later-later): rm if unused
export const toChatCompletionMessageParam = (message: TODOMessage): ChatCompletionAssistantMessageParam | ChatCompletionUserMessageParam | ChatCompletionSystemMessageParam => {
  return {
    role: message.role,
    content: message.content
  }
}

// Taken from: https://cookbook.openai.com/examples/how_to_count_tokens_with_tiktoken
// 
// TODO(docs): explain rationale for cache
export const estimateTokensForMessages = (
  messages: ChatCompletionMessageParam[],
  encoding: Tiktoken
): number => {
  // TODO(later): do a strict check here for extraneous fields in `messages`. document why.

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

export const isFineTuningUserMessage = (message: FineTuningMessage): message is FineTuningUserMessage => {
  const expectedKeys = ['role', 'content'];
  const isUserMessage = (
    message.role === 'user' &&
    typeof message.content === 'string' &&
    Object.keys(message).every(key => expectedKeys.includes(key)) &&
    expectedKeys.every(key => key in message)
  )
  return isUserMessage;
};

export const isFineTuningAssistantMessage = (message: FineTuningMessage): message is FineTuningAssistantMessage => {
  const expectedKeys = ['role', 'content', 'positiveResponse'];
  return (
    message.role === 'assistant' &&
    typeof message.content === 'string' &&
    (typeof message.positiveResponse === 'boolean' || message.positiveResponse === null) &&
    Object.keys(message).every(key => expectedKeys.includes(key)) &&
    expectedKeys.every(key => key in message)
  );
};

export const isFineTuningExample = (obj: any): obj is FineTuningExample => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray(obj.messages) &&
    obj.messages.every(
      (msg: FineTuningMessage) =>
        isFineTuningUserMessage(msg) || isFineTuningAssistantMessage(msg)
    )
  );
};

// TODO(later): update this if necessary
export const getWeight = (message: FineTuningAssistantMessage): 0 | 1 => {
  if (message.positiveResponse === false || message.positiveResponse === null) {
    return 0
  }
  return 1
}

export const convertToChatCompletionMessageParam = (message: FineTuningMessage): ChatCompletionMessageParam => ({
  role: message.role,
  content: message.content
});

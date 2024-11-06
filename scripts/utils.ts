import { ChatCompletionAssistantMessageParam, ChatCompletionMessageParam, ChatCompletionSystemMessageParam, ChatCompletionUserMessageParam, FileObject } from "openai/resources";
import { TiktokenModel } from "tiktoken";
import { CONTEXT_WINDOWS, MODEL_FINE_TUNING_INFO, todoStatusPriorityMap } from "./constants";
import OpenAI, { toFile } from "openai";
import { ExportedPiMessage, ParsedExportedPiData, TODO, TODOMessage, TODOStatus, TrainingDataset } from "./types";
import { createReadStream, readFile, readFileSync, writeFileSync } from "fs";
import * as readline from 'readline';
import { estimateTokensForOpenAIModel } from "../lib/utils";
import { appendFile } from "fs/promises";

export const getInflectionResponse = async (
  truncatedMessages: ChatCompletionMessageParam[],
  config: string,
  // TODO(later-later): use metadata?
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
  const payload = { config, context: mappedContext };
  // TODO(later-later): use metadata?
  // const payload = { config, context: mappedContext, metadata };
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
export const estimateTrainingCost = (dataset: TrainingDataset, model: TiktokenModel): number => {
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
  for (const { messages } of dataset) {
    numTokens += estimateTokensForOpenAIModel(messages, model);
  }

  const estimatedCost = (baseCostPerMillionTokens / 1e6) * numTokens * numEpochs;

  return estimatedCost
};


export const validateTrainingDataset = (dataset: TrainingDataset, model: TiktokenModel): void => {
  const formatErrors: { [key: string]: number } = {};
  
  if (dataset.length < 10) {
    throw new Error(`Training file has ${dataset.length} example(s), but must have at least 10 examples`)
  }

  for (const ex of dataset) {
    if (typeof ex !== 'object' || Array.isArray(ex)) {
      formatErrors["data_type"] = (formatErrors["data_type"] || 0) + 1;
      continue;
    }
    
    const messages = ex.messages;
    if (!messages) {
      formatErrors["missing_messages_list"] = (formatErrors["missing_messages_list"] || 0) + 1;
      continue;
    }

    const numTokens = estimateTokensForOpenAIModel(messages, model);
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
    
    for (const message of messages) {
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
    
    if (!messages.some(message => message.role === "assistant")) {
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

export const uploadFileToOpenAI = async (openai: OpenAI, filename: string, dataset: TrainingDataset): Promise<FileObject> => {
  const jsonl = dataset.map(entry => JSON.stringify(entry)).join('\n');

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

export const convertToChatCompletionMessageParams = (
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

export const readJsonLinesFile = (filePath: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const jsonObjects: any[] = [];
    const rl = readline.createInterface({
      input: createReadStream(filePath),
      crlfDelay: Infinity
    });

    rl.on('line', line => {
      try {
        if (line.trim()) {
          const jsonObject = JSON.parse(line);
          jsonObjects.push(jsonObject);
        }
      } catch (error) {
        rl.close(); // Stop processing further lines
        reject(error);
      }
    });

    rl.on('close', () => resolve(jsonObjects));
    rl.on('error', reject);
  });
};


export const countJsonLines = async (filePath: string): Promise<number> => {
  const fileStream = createReadStream(filePath);
  const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
  });

  let count = 0;

  for await (const line of rl) {
      try {
          const parsedLine = JSON.parse(line);
          if (typeof parsedLine === 'object' && parsedLine !== null) {
              count++;
          }
      } catch (error) {
          // If JSON.parse fails, it's not a valid JSON object; ignore this line
      }
  }

  return count;
};

// TODO(later-later): rename
export const makeTODO = (
  pi: ParsedExportedPiData
): TODO => {
  const getInitialStatus = (): TODOStatus => {
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


    const initialStatus = getInitialStatus()
    return {role, content: piMessage.text, status: initialStatus}
  }))

  return {
    id: pi.id,
    messages: messages
  }
}

export const appendJsonObjectToJsonl = async (filePath: string, jsonObject: Record<string, any>): Promise<void> => {
  const jsonString = JSON.stringify(jsonObject);
  await appendFile(filePath, `${jsonString}\n`, 'utf8');
};

// TODO(later-later): rename
export const getCurrentTODOStatus = (messages: Array<TODOMessage>): TODOStatus => {
  const statuses = messages.map(m => m.status)

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

export const getFinalMessagesByTokenLimit = (
  conversation: ChatCompletionMessageParam[],
  model: TiktokenModel,
  tokenLimit: number
): ChatCompletionMessageParam[] => {
  const maxContextWindow = CONTEXT_WINDOWS[model]
  if (tokenLimit > maxContextWindow) {
    throw new Error(`TODO(docs)`)
  }

  const conversationCopy = structuredClone(conversation)
  let tokensCount = estimateTokensForOpenAIModel(conversationCopy, model);
  while (tokensCount > tokenLimit) {
    conversationCopy.shift(); // Removes the first element
    tokensCount = estimateTokensForOpenAIModel(conversationCopy, model);
  }

  return conversationCopy;
};

export const getInitialMessagesByTokenLimit = (
  conversation: ChatCompletionMessageParam[],
  model: TiktokenModel,
  tokenLimit: number
): ChatCompletionMessageParam[] => {
  const maxContextWindow = CONTEXT_WINDOWS[model];
  if (tokenLimit > maxContextWindow) {
    throw new Error(`TODO(docs)`);
  }

  const conversationCopy = structuredClone(conversation);
  let tokensCount = estimateTokensForOpenAIModel(conversationCopy, model);
  while (tokensCount > tokenLimit) {
    conversationCopy.pop(); // Removes the last element
    tokensCount = estimateTokensForOpenAIModel(conversationCopy, model);
  }

  return conversationCopy;
};

export const toChatCompletionMessageParam = (message: TODOMessage): ChatCompletionAssistantMessageParam | ChatCompletionUserMessageParam | ChatCompletionSystemMessageParam => {
  return {
    role: message.role,
    content: message.content
  }
}

export const replaceJsonLineAt = async (
  fileName: string,
  lineIndex: number,
  content: Record<string, any>
): Promise<void> => {
  const rl = readline.createInterface({
    input: createReadStream(fileName),
    crlfDelay: Infinity
  });

  let currentLineIndex = 0;
  const updatedLines: string[] = [];
  let lineReplaced = false;
  const newContent = JSON.stringify(content);

  for await (const line of rl) {
    if (currentLineIndex === lineIndex) {
      updatedLines.push(newContent);
      lineReplaced = true;
    } else {
      updatedLines.push(line);
    }
    currentLineIndex++;
  }

  rl.close();

  if (!lineReplaced) {
    throw new Error(`Invalid lineIndex: ${lineIndex}`);
  }

  // Write the updated lines back to the same file
  writeFileSync(fileName, updatedLines.join('\n'), 'utf-8');
};
import { ChatCompletionMessageParam } from "openai/resources";
import { ExportedPiMessage, ParsedExportedPiData, TODO, TODOMessage, TODOStatus } from "../types";
import { getCurrentTODOStatus, getNextTODOStatus, makeTODO, toChatCompletionMessageParam, getFinalMessagesByTokenLimit, getInitialMessagesByTokenLimit } from "../utils"
import { encoding_for_model, TiktokenModel } from "tiktoken";
import { ESTIMATED_TOKENS_PER_MESSAGE } from "../constants";
import OpenAI from "openai";
import { existsSync, readFileSync, writeFileSync } from "fs";

const cleanDataFilePath = process.env.CLEAN_DATA_FILE_PATH;
const piDataFilePath = process.env.PI_DATA_FILE_PATH
if (!cleanDataFilePath || !piDataFilePath) {
  throw new Error(`TODO(docs)`)
}

// TODO(later): consider using gpt 4o mini for speed and cost for the cleaning methods that don't
// require a large amount of context or intelligence.

// TODO(later): create a bash script that orchestrates the entire flow

const cleanCensoredProfanity = async (messages: Array<TODOMessage>): Promise<Array<TODOMessage>> => {
  const openai = new OpenAI();

  const model: TiktokenModel = 'gpt-4o-mini-2024-07-18'
  const contextSize = 10 * ESTIMATED_TOKENS_PER_MESSAGE
  
  const messagesCopy = structuredClone(messages)
  for (let i = 0; i < messagesCopy.length; i++) {
    const message = messagesCopy[i]
    if (message.status !== TODOStatus.CensoredProfanity) {
      continue
    }

    // TODO(docs): we only care about modifying assistant messages because...
    if (message.role !== 'assistant') {
      continue
    }

    const messagesBefore = messagesCopy.slice(0, i)
    const messagesAfter = messagesCopy.slice(i + 1)
    const truncatedMessagesBefore = getFinalMessagesByTokenLimit(messagesBefore, model, contextSize)
    const truncatedMessagesAfter = getInitialMessagesByTokenLimit(messagesAfter, model, contextSize)

    const systemPrompt = `You are an AI assistant whose goal is to replace censored profanity in only the next message sent by the ${message.role} role, which we'll call the "target message". You must respond with the exact same target message, except you must replace each instance of profanity in this message with the underlying word or phrase. Your response must NOT modify any other part of the target message for any reason. Asterisks are used to censor the profanity. Use the context of the conversation and the number of asterisks to determine the correct word or phrase to replace the asterisks. If you aren't sure what the correct word or phrase is, use your best guess.

  You must respond with a JSON that has two fields: Your reasoning for replacing the asterisks with the chosen words, and the new target message.

  Examples are below, delimited by <example> tags. The :
  <example>
  Input messages:
    User: Hey, what's up?
    Assistant: Not much.
    Target Message (user): Son of a *****!
    Assistant: What's wrong?
    Message: I stubbed my toe, and it really hurt.
  Your response:
  {
    "reasoning": "The phrase 'son of a bitch' is a common expression used to convey frustration or pain, which aligns with the user's explanation of having stubbed their toe and experiencing hurt. The context provided by the AI's concern indicates the user is expressing strong emotion. There are five asterisks in the target message, and five letters in the word 'bitch'.",
    "targetMessage": "Son of a bitch!"
  }
  </example>

  <example>
  Input messages:
    User: I've had it with my coworker.
    Assistant: What happened?
    Target Message (user): uhh, he called me a ******* ******* in front of everyone!
    Assistant: That's really unprofessional. Are you okay?
    Message: Yes, but it was embarrassing and uncalled for.
  Your response:
  {
    "reasoning": "The words 'fucking asshole' are often used to describe someone who behaves rudely or disrespectfully, especially when they insult someone publicly. The context indicates the user felt embarrassed and upset by the coworker's behavior. There are seven asterisks for the first word and seven for the second, corresponding to the word lengths of 'fucking' and 'asshole'.",
    "targetMessage": "uhh, he called me a fucking asshole in front of everyone!"
  }
  </example>
    `

    const jsonSchema = {
      "name": "profanity_replacement",
      "description": "Replaces censored profanity in a target message with appropriate words based on context.",
      "strict": true,
      "parameters": {
        "type": "object",
        "properties": {
          "reasoning": {
            "type": "string",
            "description": "The rationale that determines the words or phrases replacing the censored profanity."
          },
          "targetMessage": {
            "type": "string",
            "description": "The exact same target message, except with profanity replaced."
          }
        },
        "additionalProperties": false,
        "required": ["reasoning", "targetMessage"]
      }
    }

    const systemMessage: ChatCompletionMessageParam = {role: "system", content: systemPrompt}
    const messages: Array<ChatCompletionMessageParam> = [
      ...truncatedMessagesBefore,
      systemMessage,
      message,
      ...truncatedMessagesAfter
    ]

    const response = await openai.chat.completions.create({
      model,
      messages: messages,
      response_format: { type: "json_schema", json_schema: jsonSchema }
    })

    const content = response.choices[0].message.content
    if (content === null) {
      throw new Error(`Content is null.`)
    }

    const { targetMessage } = JSON.parse(content);

    if (targetMessage.length !== message.content.length) 
      throw new Error(`Mismatch in message length.
Initial message: "${message.content}"
Final message: "${targetMessage}"`);

    for (let j = 0; j < targetMessage.length; j++) {
      if (message.content[j] === '*' && !/[a-zA-Z]/.test(targetMessage[j])) {
        throw new Error(
          `Invalid character replacement for asterisk at index ${j}.
Initial message: "${message.content}"
Final message: "${targetMessage}"`
        );
      }
    }

    message.content = targetMessage;
    message.status = getNextTODOStatus(TODOStatus.CensoredProfanity)

    const newData: TODO = {messages: messagesCopy}
    writeFileSync(cleanDataFilePath, JSON.stringify(newData), 'utf-8')
  }

  return messagesCopy
}

;(async () => {
  const piData: ParsedExportedPiData = JSON.parse(readFileSync(piDataFilePath, 'utf-8'))
  let cleanData: TODO
  if (existsSync(cleanDataFilePath)) {
    cleanData = JSON.parse(readFileSync(cleanDataFilePath, 'utf-8'))
  } else {
    cleanData = makeTODO(piData)
    writeFileSync(cleanDataFilePath, JSON.stringify(cleanData), 'utf-8')
  }

  // TODO(later): each handler should do `structuredClone` on the input `messages`

  let currentStatus = getCurrentTODOStatus(cleanData.messages)
  let currentMessages = cleanData.messages
  while (currentStatus !== TODOStatus.Done) {
    console.log(`Current status: ${currentStatus}`)
    if (currentStatus === TODOStatus.CensoredProfanity) {
      // TODO: Handle CensoredProfanity status
      currentMessages = await cleanCensoredProfanity(currentMessages)
    } else if (currentStatus === TODOStatus.WrongTranscription) {
      // TODO: Handle WrongTranscription status
    } else if (currentStatus === TODOStatus.NewConversations) {
      // TODO: Handle NewConversations status
    } else if (currentStatus === TODOStatus.NegativeUserResponses) {
      // TODO: Handle NegativeUserResponses status
    } else if (currentStatus === TODOStatus.RepeatedStatements) {
      // TODO: Handle RepeatedStatements status
    } else if (currentStatus === TODOStatus.Hallucinations) {
      // TODO: Handle Hallucinations status
    } else {
      throw new Error(`Unknown status: ${currentStatus}`)
    }
    currentStatus = getNextTODOStatus(currentStatus)
  }
})()
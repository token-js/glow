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

// TODO(later-later): create a bash script that orchestrates the entire flow

const cleanCensoredProfanity = async (messages: Array<TODOMessage>, thisStep: TODOStatus): Promise<Array<TODOMessage>> => {
  const openai = new OpenAI();

  const model: TiktokenModel = 'gpt-4o-2024-08-06'
  const contextSize = 10 * ESTIMATED_TOKENS_PER_MESSAGE
  
  const messagesCopy = structuredClone(messages)
  for (let i = 0; i < messagesCopy.length; i++) {
    const message = messagesCopy[i]
    if (message.nextStep !== thisStep) {
      continue
    }
    // TODO(docs)
    if (message.weight === 0) {
      continue
    }

    // TODO(docs): we only care about modifying assistant messages because...
    if (message.role !== 'assistant') {
      continue
    }
    // TODO(docs)
    if (!message.content.includes('*')) {
      continue
    }

    const messagesBefore = messagesCopy.slice(0, i)
    const messagesAfter = messagesCopy.slice(i + 1)
    const truncatedMessagesBefore = getFinalMessagesByTokenLimit(messagesBefore, model, contextSize)
    const truncatedMessagesAfter = getInitialMessagesByTokenLimit(messagesAfter, model, contextSize)

    const mainSystemPrompt = `You are an AI assistant whose goal is to replace censored profanity in the target message identified in an earlier system prompt. Asterisks are used to censor the profanity in the target message. Use the context of the conversation and the number of asterisks to determine the correct word or phrase to replace the asterisks. If you aren't sure what the correct word or phrase is, use your best guess.

Rules:
- You must respond with the exact same target message, except you must replace each instance of profanity in the target message with the underlying word or phrase.
- You must respond with the entire target message; do not remove any text from it, including even sentences that have no relevance to the profanity.
- The profanity must be vulgar, e.g. "fucking", not milder terms like "screwing".

You must respond with a JSON that has the following fields:
- \`reasoning\`: Your reasoning for replacing each asterisk with your chosen word.
- \`targetMessage\`: The new target message with profanity replaced.

Examples are below, delimited by <example> tags:
<example>
Input messages:
  User: Hey, what's up?
  Assistant: Not much.
  Target Message (user): Son of a *****!
  Assistant: What's wrong?
  User: I stubbed my toe, and it really hurt.
Your response:
{
  "reasoning": "The phrase 'son of a bitch' is a common expression used to convey frustration or pain, which aligns with the user's explanation of having stubbed their toe and experiencing hurt. The context provided by the AI's concern indicates the user is expressing strong emotion. There are five asterisks in the target message, and five letters in the word 'bitch'. All of the original text from the target message is included as instructed.",
  "targetMessage": "Son of a bitch!"
}
</example>

<example>
Input messages:
  User: I've had it with my coworker.
  Assistant: What happened?
  Target Message (user): uhh, he called me a ******* ******* in front of everyone! can you believ it?
  Assistant: That's really unprofessional. Are you okay?
  User: Yes, but it was embarrassing and uncalled for.
Your response:
{
  "reasoning": "The words 'fucking asshole' are often used to describe someone who behaves rudely or disrespectfully, especially when they insult someone publicly. The context indicates the user felt embarrassed and upset by the coworker's behavior. There are seven asterisks for the first word and seven for the second, corresponding to the word lengths of 'fucking' and 'asshole'. All of the original text from the target message is included as instructed.",
  "targetMessage": "uhh, he called me a fucking asshole in front of everyone! can you believ it?"
}
</example>
    `

    const jsonSchema = {
      "name": "profanity_replacement",
      "description": "Replaces censored profanity in a target message with appropriate words based on context.",
      "strict": true,
      "schema": {
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

    const formatted: Array<ChatCompletionMessageParam> = [
      ...truncatedMessagesBefore,
      {role: "system", content: `The next message is the target message. Remember its content.`},
      message,
      {role: "system", content: "The target message has ended."},
      ...truncatedMessagesAfter,
      {role: "system", content: mainSystemPrompt},
    ]

    const response = await openai.chat.completions.create({
      model,
      messages: formatted,
      response_format: { type: "json_schema", json_schema: jsonSchema },
      temperature: 0,
      seed: 42
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

    message.nextStep = getNextTODOStatus(thisStep)
    message.content = targetMessage;

    const newData: TODO = {messages: messagesCopy}
    writeFileSync(cleanDataFilePath, JSON.stringify(newData), 'utf-8')
  }

  return messagesCopy
}

// TODO(later): make sure you aren't spending a fortune on gpt 4o.

const cleanNegativeUserResponses = async (messages: Array<TODOMessage>, thisStep: TODOStatus): Promise<Array<TODOMessage>> => {
  const openai = new OpenAI();

  const model: TiktokenModel = 'gpt-4o-2024-08-06'
  // TODO(docs): Just need enough for the LLM judge to understand the current conversation.
  const contextSize = 10 * ESTIMATED_TOKENS_PER_MESSAGE
  
  const messagesCopy = structuredClone(messages)
  for (let i = 0; i < messagesCopy.length; i++) {
    const message = messagesCopy[i]
    if (message.nextStep !== thisStep) {
      continue
    }
    // TODO(docs)
    if (message.weight === 0) {
      continue
    }

    // TODO(docs): we only care about assistant messages because...
    if (message.role !== 'assistant') {
      continue
    }

    const messagesBefore = messagesCopy.slice(0, i)
    const messagesAfter = messagesCopy.slice(i + 1)
    const userResponse = toChatCompletionMessageParam(messagesAfter[0])
    const truncatedMessagesBefore = getFinalMessagesByTokenLimit(messagesBefore, model, contextSize).map(toChatCompletionMessageParam)

    const mainSystemPrompt = `You are an AI assistant whose goal is to classify whether the user responded negatively in response to the target message sent by the assistant, which was identified in an earlier system prompt. Negative responses can manifest as anger, disappointment, annoyance, dissatisfaction, or similar sentiments aimed at the assistant.

Rules:
- You must only consider the user's sentiment in response to the target message; do not consider any other message sent by the assistant. Simply use the surrounding assistant messages for additional context.
- If the user has a mixed reaction to the target message (i.e. a positive and negative response), mark the response as negative because it contains a negative response.
- If the user EVER reacts negatively to the target message, you must mark the response as negative, even if the user later reacts positively to the target message.
- If the user's negative sentiment is directed towards something external and not at the assistant's target message, it should not be classified as a negative response.

You must respond with a JSON that has the following fields:
- \`reasoning\`: A brief explanation detailing why you classified the user's response as negative or not.
- \`isNegative\`: A boolean value that is \`true\` if the user's sentiment towards the assistant is negative in response to the target message, and \`false\` otherwise.

Examples are below, delimited by <example> tags:
<example>
Input messages:
  User: Hey, what's up?
  Target Message (Assistant): Not much, what's shakin' bacon?
  User: That's a really fucking stupid response.
Your response:
{
  "reasoning": "The user's response explicitly criticizes the assistant's message as 'really fucking stupid', indicating negative sentiment.",
  "isNegative": true
}
</example>

<example>
Input messages:
  User: Hey, what's up?
  Target Message (Assistant): Not much, what's shakin bacon?
  User: Haha, that's a funny response! I'm doing well.
Your response:
{
  "reasoning": "The user's response includes laughter and compliments the assistant's message by stating 'that's a funny response' and 'I like it', indicating positive sentiment.",
  "isNegative": false
}
</example>

<example>
Input messages:
  User: I'm trying to decide on a plan. Any thoughts?
  Target Message (Assistant): How about organizing a team brainstorming session?
  User: Oh, that could be a good idea! Let me think about it.
  Assistant: Sure, take your time to consider it.
  User: That's actually a bad idea.
Your response:
{
  "reasoning": "The user initially considers the assistant's suggestion positively by saying 'could be a good idea', but later reacts negatively by calling the idea bad, showing negative sentiment.",
  "isNegative": true
}
</example>

<example>
Input messages:
  User: Can you help me solve this problem?
  Target Message (Assistant): Sure, try searching for tutorials online.
  User: I was hoping for a more specific suggestion.
Your response:
{
  "reasoning": "The user expresses dissatisfaction with the assistant's response and says that they wanted a more specific suggestion, showing negative sentiment.",
  "isNegative": false
}
</example>

<example>
Input messages:
  User: I need help with planning my day.
  Target Message (Assistant): Just create a checklist for the day.
  User: That's not helpful at all.
  Assistant: How about I help you prioritize tasks instead?
  User: Yeah, that sounds like it could work!
Your response:
{
  "reasoning": "The user found the initial suggestion 'not helpful at all', indicating negative sentiment toward the target message. The subsequent change to positive sentiment is due to the following assistant message, which shouldn't be considered.",
  "isNegative": true
}
</example>

<example>
Input messages:
  User: I'm so frustrated with this project.
  Target Message (Assistant): Is there anything I can do to help?
  User: Ugh, this system at work is just broken and driving me insane.
Your response:
{
  "reasoning": "The user is expressing anger about an external factor, specifically the work system, rather than the assistant's message. Thus, the sentiment toward the assistant's message is not negative.",
  "isNegative": false
}
</example>

<example>
Input messages:
  User: Do you have any good book recommendations?
  Target Message (Assistant): You might enjoy 'The Hitchhiker's Guide to the Galaxy'.
  User: By the way, have you seen the new movie that just came out?
Your response:
{
  "reasoning": "The user changes the subject without expressing any sentiment about the assistant's recommendation, indicating no negative sentiment towards the target message.",
  "isNegative": false
}
</example>

<example>
Input messages:
  User: I've been trying to cook more lately.
  Target Message (Assistant): I can provide you with new recipes to try.
  User: Please don't offer to do that. I enjoy discovering them myself.
Your response:
{
  "reasoning": "The user expresses dissatisfaction with the assistant offering recipes and prefers to explore them independently, showing slightly negative sentiment towards the target message.",
  "isNegative": true
}
</example>
`

  const jsonSchema = {
    name: "sentiment_classification",
    description: "Classifies the sentiment of a user's response to a target message as negative or not.",
    strict: true,
    schema: {
      type: "object",
      properties: {
        reasoning: {
          type: "string",
          description: "A brief explanation detailing why the user's response is classified as negative or not."
        },
        isNegative: {
          type: "boolean",
          description: "A boolean value that is \`true\` if the user's sentiment towards the assistant is negative in response to the target message, and \`false\` otherwise."
        }
      },
      additionalProperties: false,
      required: ["reasoning", "isNegative"]
    }
  };

    const formatted: Array<ChatCompletionMessageParam> = [
      ...truncatedMessagesBefore,
      {role: "system", content: `The next message is the target message. Remember its content.`},
      message,
      {role: "system", content: "The target message has ended."},
      [userResponse],
      {role: "system", content: mainSystemPrompt},
    ]

    const response = await openai.chat.completions.create({
      model,
      messages: formatted,
      response_format: { type: "json_schema", json_schema: jsonSchema },
      temperature: 0,
      seed: 42
    })

    const content = response.choices[0].message.content
    if (content === null) {
      throw new Error(`Content is null.`)
    }

    const { isNegative } = JSON.parse(content);

    if (typeof isNegative !== 'boolean') {
      throw new Error(`Unknown type: ${isNegative}`)
    }

    // TODO(later): rm
    console.log(`------------ AI MESSAGE ------------------`)
    console.log(message.content)
    console.log(`------------- OUTCOME -----------------`)
    console.log(`Positive: ${!isNegative}`)
    console.log(`Reasoning: ${JSON.parse(content).reasoning}`)
    console.log(`----------------------------------------------`)

    if (isNegative) {
      message.weight = 0
    }
    message.nextStep = getNextTODOStatus(thisStep)

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

  // TODO(later-later): each handler should do `structuredClone` on the input `messages`

  let currentStatus = getCurrentTODOStatus(cleanData.messages)
  let currentMessages = cleanData.messages
  while (currentStatus !== TODOStatus.Done) {
    console.log(`Current status: ${currentStatus}`)
    if (currentStatus === TODOStatus.CensoredProfanity) {
      // TODO(later): undo
      // currentMessages = await cleanCensoredProfanity(currentMessages)
    } else if (currentStatus === TODOStatus.NegativeUserResponses) {
      currentMessages = await cleanNegativeUserResponses(currentMessages, currentStatus)
    } else if (currentStatus === TODOStatus.RepeatedStatements) {
      // TODO(later): Handle RepeatedStatements status
    } else if (currentStatus === TODOStatus.Hallucinations) {
      // TODO(later): Handle Hallucinations status
    } else {
      throw new Error(`Unknown status: ${currentStatus}`)
    }
    currentStatus = getNextTODOStatus(currentStatus)
  }
})()

// TODO(end): ticket: we should have `truncatedMessagesAfter` for the `NegativeUserResponses` data
// cleaning step, but the LLM wasn't classifying this target message correctly: "Oh, I'm sorry! I
// didn't mean to ignore your question, Roman. Please don't feel bad—I want to make sure we're on
// the same page. What did I miss? I'm here to listen and help you in any way I can." The expected
// outcome is `isNegative:true`. We should include `truncatedMessagesAfter` because subsequent user
// messages may contain important context that determines whether the user reacted negatively.

// TODO: bug: You aren't updating the next step when you `continue`.

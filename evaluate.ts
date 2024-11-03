import { TRAINING_DATASET } from "./input";
import { createInterface } from 'readline';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { MODEL_NAME } from "./constants";
import { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources";
import { sleep } from "./lib/utils";


dotenv.config();

// TODO(later-later): mv all extraneous stuff from this file.

const messages = TRAINING_DATASET[0].messages

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question: string): Promise<string> => {
  return new Promise(resolve => rl.question(question, resolve));
};

interface InflectionChatCompletionMetadata {
  user_firstname: string;
  user_timezone: string;
  user_country: string;
  user_region: string;
  user_city: string;
}

const getInflectionResponse = async (
  truncatedMessages: ChatCompletionMessageParam[],
  config: string,
  // TODO(later): use metadata?
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
  // TODO(later): use metadata?
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

;(async () => {
  const openai = new OpenAI();

  let correctCount = 0;
  let numIterations = 0
  const initialIndex = messages.findIndex(message => message.role === "assistant") + 2;
  for (let i = initialIndex; i < messages.length; i += 2) {
    const contextualMessages = messages.slice(0, i);

    const lastFiveMessages = contextualMessages.slice(-5);
    lastFiveMessages.forEach((msg) => {
      console.log(`${msg.role}: ${msg.content}\n`);
    });

    const [openAIResponse, inflectionResponse] = await Promise.all([
      openai.chat.completions.create({
        model: MODEL_NAME,
        messages: contextualMessages
      }),
      getInflectionResponse(contextualMessages, 'inflection_3_pi')
    ]);
    
    const openaiMessageContent = openAIResponse.choices[0].message.content
    if (typeof openaiMessageContent !== 'string') {
      throw new Error(`OpenAI message content is not a string.`)
    }
    const openaiMessage = openaiMessageContent.replace(/^Charlotte: /, '')
    const options = [openaiMessage, inflectionResponse];
    const shuffledOptions = options.sort(() => Math.random() - 0.5);
    
    console.log('-----------------------------------------------')
    shuffledOptions.forEach((option, index) => {
      console.log(`Option ${index + 1}: ${option}\n`);
      console.log('-----------------------------------------------')
    });

    const userChoice = await askQuestion("Which one is the real assistant message? Enter 1 or 2: ");

    if (shuffledOptions[parseInt(userChoice) - 1] === inflectionResponse) {
      console.log("Correct!");
      correctCount++;
    } else {
      console.log("Incorrect.");
    }

    await sleep(250)

    numIterations += 1

    console.log(`Total Correct: ${correctCount}/${numIterations}\n`);
  }

  rl.close();
})();

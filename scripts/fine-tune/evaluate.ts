import { TRAINING_DATASET } from "./training-data";
import { createInterface } from 'readline';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { MODEL_NAME } from "./constants";
import { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources";
import { sleep } from "../../lib/utils";
import { getInflectionResponse } from "./utils";


dotenv.config();

const messages = TRAINING_DATASET[0].messages

const askQuestion = (question: string): Promise<string> => {
  return new Promise(resolve => rl.question(question, resolve));
};

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// TODO(later-later): mv or rm
interface InflectionChatCompletionMetadata {
  user_firstname: string;
  user_timezone: string;
  user_country: string;
  user_region: string;
  user_city: string;
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

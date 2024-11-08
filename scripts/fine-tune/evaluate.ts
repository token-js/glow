import { TRAINING_DATASET } from "./training-data";
import { createInterface } from 'readline';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { ChatCompletionChunk, ChatCompletionMessageParam, ChatCompletionSystemMessageParam } from "openai/resources";
import { sleep } from "../../lib/utils";
import { getInflectionResponse } from "../utils";


dotenv.config();

// const modelName = "ft:gpt-4o-mini-2024-07-18:personal::AQnLjQty" // 1
// const modelName = "ft:gpt-4o-mini-2024-07-18:personal::AR7zeyp9" // 2
const modelName = "ft:gpt-4o-mini-2024-07-18:glade::ARBGesfJ" // 3

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
  // user_timezone: string;
  // user_country: string;
  // user_region: string;
  // user_city: string;
}

const metadata: InflectionChatCompletionMetadata = {
  user_firstname: "Alice",
};
const systemPrompt = `Your name is Charlotte. You are talking to Alice.`;


;(async () => {
  const openai = new OpenAI();

  let correctCount = 0;
  let numIterations = 0
  // const initialIndex = messages.findIndex(message => message.role === "assistant") + 2;
  const initialIndex = 16;
  let previousOpenAIMessage = null
  for (let i = initialIndex; i < messages.length; i += 2) {
    // const contextualMessages = previousOpenAIMessage ? [...messages.slice(0, i-2), {role: 'assistant', content: previousOpenAIMessage} as ChatCompletionMessageParam, messages[i-1]] : messages.slice(0, i);
    // const previousMessages = messages.slice(0, i);
    const previousMessages = messages.slice(0, 16);
    const systemMessage: ChatCompletionSystemMessageParam = {role: "system", content: systemPrompt}

    const openaiMessages = [
      ...previousMessages,
      systemMessage
    ]

    // const lastFiveMessages = previousMessages.slice(-5);
    // lastFiveMessages.forEach((msg) => {
    //   console.log(`${msg.role}: ${msg.content}\n`);
    // });

    // // Check that the AI doesn't randomly say "Nice to meet you"
    // const attempts = 20;
    // const promises = Array.from({ length: attempts }, async () => {
    //   const response = await openai.chat.completions.create({
    //     model: modelName,
    //     messages: openaiMessages,
    //   });
    //   return response.choices[0].message.content;
    // });
    // const results = await Promise.all(promises)
    // results.forEach(result => {
    //   console.log('-----------------------------------------')
    //   console.log(result)
    // })
    // throw new Error()

    const [openAIResponse, inflectionResponse] = await Promise.all([
      openai.chat.completions.create({
        model: modelName,
        messages: openaiMessages
      }),
      getInflectionResponse(previousMessages, 'inflection_3_pi')
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

    const userChoice = await askQuestion("Which one was sent by Inflection's API? Enter 1 or 2: ");
    const parsedChoice = parseInt(userChoice)

    if (parsedChoice !== 1 && parsedChoice !== 2) {
      console.log("You didn't enter 1 or 2")
    } else if (shuffledOptions[parsedChoice - 1] === inflectionResponse) {
      console.log("Correct!");
      correctCount++;
    } else {
      console.log("Incorrect.");
    }

    await sleep(500)

    numIterations += 1
    previousOpenAIMessage = openaiMessage

    console.log(`Total Correct: ${correctCount}/${numIterations}\n`);
  }

  rl.close();
})();

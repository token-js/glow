import { TRAINING_DATASET } from "./input";
import { createInterface } from 'readline';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import { MODEL_NAME } from "./constants";
import { ChatCompletionMessageParam } from "openai/resources";
import { sleep } from "./lib/utils";

dotenv.config();

const messages = TRAINING_DATASET[0].messages

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (question: string): Promise<string> => {
  return new Promise(resolve => rl.question(question, resolve));
};

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

    const openAIResponse = await openai.chat.completions.create({
      model: MODEL_NAME,
      messages: contextualMessages
    });
    
    const currentAssistantMessage = messages[i].content;
    const openaiMessageContent = openAIResponse.choices[0].message.content
    if (typeof openaiMessageContent !== 'string') {
      throw new Error(`OpenAI message content is not a string.`)
    }
    const openaiMessage = openaiMessageContent.replace(/^Charlotte: /, '')
    const options = [openaiMessage, currentAssistantMessage];
    const shuffledOptions = options.sort(() => Math.random() - 0.5);
    
    console.log('-----------------------------------------------')
    shuffledOptions.forEach((option, index) => {
      console.log(`Option ${index + 1}: ${option}\n`);
      console.log('-----------------------------------------------')
    });

    const userChoice = await askQuestion("Which one is the real assistant message? Enter 1 or 2: ");

    if (shuffledOptions[parseInt(userChoice) - 1] === currentAssistantMessage) {
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


import OpenAI, { toFile } from "openai";
const modelName = "gpt-4o-2024-08-06"
import dotenv from 'dotenv'
import { getInflectionResponse } from './scripts/utils'
import pLimit from 'p-limit'
import { ChatCompletionAssistantMessageParam, ChatCompletionMessageParam, ChatCompletionUserMessageParam } from "openai/resources/index.mjs";
import { readFileSync, writeFileSync } from "fs";

dotenv.config()

;(async () => {
  const openai = new OpenAI()

  const unfiltered: Array<Array<ChatCompletionMessageParam>> = JSON.parse(readFileSync('./synthetic/data.json', 'utf-8'))
  const allUserMessages: Array<string> = JSON.parse(readFileSync('./synthetic/user.json', 'utf-8')).map(m => m.userInitialMessage)
  // const usedUserMessages = unfiltered.flatMap( e => e).filter( m => m.role === 'user').map(m => m.content as string)
  const usedUserMessages: string[] = []

  const nextUserMessages = allUserMessages.filter(userMessage => !usedUserMessages.includes(userMessage))

  const BATCH_SIZE = 5;
  
  let count = 0
  const processBatch = async (batch: string[]) => {
    const tasks = batch.map(async (userMessage) => {
      const messages: Array<ChatCompletionMessageParam> = [
        { role: "assistant", content: "Hey there, great to meet you. I’m Pi, your personal AI.\n\nMy goal is to be useful, friendly and fun. Ask me for advice, for answers, or let’s talk about whatever’s on your mind.\n\nHow's your day going?" },
        { role: "user", content: userMessage }
      ];
      const response = await getInflectionResponse(messages, 'inflection_3_pi');
      count += 1;
  
      if (count % 10 === 0) {
        console.log(`${count + usedUserMessages.length} / ${allUserMessages.length}`);
      }
  
      return [...messages, { role: 'assistant', content: response }];
    });
  
    // Await the current batch of tasks
    return Promise.all(tasks);
  };
  
  const processMessagesInBatches = async () => {
    const responses: Array<Array<any>> = [];
  
    for (let j = 4; j <= 4; j++) {
      console.log('ITERATION ', j)
      for (let i = 0; i < nextUserMessages.length; i += BATCH_SIZE) {
        const batch = nextUserMessages.slice(i, i + BATCH_SIZE);
        let batchResponses: Array<any> = [];
        let success = false;
        
        while (!success) {
          try {
            batchResponses = await processBatch(batch);
            success = true;
          } catch (error: any) {
            if (error.message.includes('status 429')) {
              console.log('Rate limit exceeded. Retrying in 1 minute...');
              await new Promise(resolve => setTimeout(resolve, 60000)); // Sleep for 1 minute
            } else {
              throw error;
            }
          }
        }
        
        responses.push(...batchResponses);
        
        // Write the current batch responses to file
        const write = [...unfiltered, ...responses];
        writeFileSync('synthetic/data.json', JSON.stringify(write, null, 2));
      }
      
    };
    return responses;
  }
  
  const responses = await processMessagesInBatches();
})()

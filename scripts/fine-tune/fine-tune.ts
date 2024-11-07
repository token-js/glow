import readline from "readline";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { get_encoding, encoding_for_model, TiktokenModel } from "tiktoken";
import OpenAI, { toFile } from "openai";
import { FileObject } from "openai/resources";
import { MODEL_FINE_TUNING_INFO, MODEL_NAME } from "../constants";
import { sleep } from "../../lib/utils";
import { estimateTrainingCost, makeFileName, uploadFileToOpenAI, validateTrainingDataset } from "../utils";
import { readFileSync } from "fs";
import { FineTuningExample, TODO, TrainingDataExample as TrainingDataExample } from "../types";
import { convertToChatCompletionMessageParam, getWeight, isFineTuningAssistantMessage, isFineTuningExample } from "../utils";

const dataFilePath = 'scripts/fine-tune/data/20241106_150540_clean.json'

;(async () => {
  const openai = new OpenAI()

  const data = JSON.parse(readFileSync(dataFilePath, 'utf-8'))
  
  if (!isFineTuningExample(data)) {
    throw new Error(`TODO(docs)`)
  }
  
  const trainingData: Array<TrainingDataExample> = []
  for (let i = 0; i < data.messages.length; i++) {
    const message = data.messages[i]
    if (isFineTuningAssistantMessage(message) && getWeight(message) === 1) {
      const previousMessages = data.messages.slice(0, i).map(convertToChatCompletionMessageParam).map(message => {
        // TODO(docs): weight = 0 because...
        if (message.role === 'assistant') {
          return {
            ...message,
            weight: 0
          }
        }
        return message
      })
      
      const messageWithWeight = {
        ...convertToChatCompletionMessageParam(message),
        weight: 1
      }
      trainingData.push([...previousMessages, messageWithWeight])
    }
  }

  validateTrainingDataset(trainingData, MODEL_NAME)

  const cost = estimateTrainingCost(trainingData, MODEL_NAME);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(`The estimated cost for training is $${cost.toFixed(2)}. Proceed? (y/n): `, async (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log("Training confirmed. Proceeding...");

      const filename = makeFileName('training', 'jsonl')
      const fileObject = await uploadFileToOpenAI(openai, filename, trainingData)
      console.log('Uploaded file: ', fileObject.filename)

      let fineTune = await openai.fineTuning.jobs.create({
        training_file: fileObject.id,
        model: MODEL_NAME,
        seed: 42
      });

      console.log(`Fine-tune ID: ${fineTune.id}`)

      // Retrieve the state of a fine-tune
      while (fineTune.status !== 'succeeded' && fineTune.status !== 'failed' && fineTune.status !== 'cancelled') {
        fineTune = await openai.fineTuning.jobs.retrieve(fineTune.id);

        const estimatedFinish = fineTune.estimated_finish ? `Estimated finish: ${fineTune.estimated_finish}` : ''
        console.log(`Fine-tune status: ${fineTune.status}. ${estimatedFinish}`)

        await sleep(5000)
      }

      console.log(`Fine-tune status: ${fineTune.status}`)
      if (fineTune.status === 'failed') {
        const errorMessage = fineTune.error ? fineTune.error.message : `Failed for unknown reason.`
        throw new Error(errorMessage)
      } else if (fineTune.status === 'succeeded') {
        console.log(`Fine-tuned model: ${fineTune.fine_tuned_model}`)
      }
    } else {
      console.log("Training job not submitted.");
    }
    rl.close();
  });
})()

// TODO(end): ticket:
// - New conversations: Add placeholder system prompt (`{{ GLOW_SYSTEM_PROMPT_FOR_NEW_CHAT }}`).
//   - Order: Must be in the "group" after CensoredProfanity and before NegativeUserResponses.
//     Also, you should add the intermittent system prompts that signify a new chat before you
//     split exported Pi chats into training examples because the system prompts change the number
//     of tokens in the messages array.
//   - Rationale: If we don't do this, and if the user says, "Hey <ai_firstname>?", our AI may reply
//     with something like "Hey there! 👋 What's on your mind today? 😊" even in situations where
//     that shouldn't happen. (e.g. the undertone of "Hey Pi?" might be "Hey Pi? I need to tell you
//     something important" in the middle of a conversation. Clearly, "What's on your mind today?"
//     isn't a proper response)
//   - First: N/A
//   - Pre-context: ~10 standard messages worth of tokens.
//   - Include chain of thought.
//   - Post-context: ~10 standard messages worth of tokens.
//   - Few-shot examples:
//     - User: "Hey Pi?" then assistant: "Hey there! 👋 What's on your mind today? 😊"
//     - AI starting conversation: "Hey Roman, it's your personal AI, Pi. I know you're probably
//       busy, so I just wanted to reach out and see if there's anything I can do to make life
//       easier for you today 😎"
//   - Misc:
//     - You need to resolve the placeholder system prompt at some point.
//     - TODO(docs): Explain why we can't simply split by the day according to the `sent_at` field
//       in the exported Pi data. See, for example, `"2024-08-23T09:41:23.722"`. Notice how there
//       was a previous conversation at 1am that day.
//   - Validate the model's output against the first Pi chat:
//      - Should have at least three of these system prompts.
//      - It should have a new system prompt before "What's shakin' bacon?"

// TODO(end): ticket: Clean Pi data more thoroughly
// - Censored profanity sent from user messages. (We currently only remove censorship from assistant
//   messages)
// - Wrong transcription: Convert `content` into new string
//   - Order: must be in the same "group" as CensoredProfanity
//   - Pre-context: ~10 standard messages worth of tokens.
//   - Include chain of thought.
//   - Prompt: User messages are transcribed from audio. Fix words and phrases in the user message
//     that were transcribed to have a different meaning than the user intended. You must NOT make
//     any changes to the message aside from this task.
//   - Post-context: ~10 standard messages worth of tokens.
//   - Few-shot examples: Don't use the following examples directly, but take inspiration from them:
//     - Replace: "pants" -> "puns"
//     - Replace: "coupon" -> "couple"
//     - "It was. It was" -> "It wasn't".
//   - Misc:
//     - Only do this on user messages, since assistant messages aren't transcribed.
//     - After each LLM call, you can validate that only the asterisks in the original string are
//       converted, and that the rest of the string stays the same.
//   - Validate the correctness of the cleaner against the first Pi chat:
//    - Should replace: "pants" -> "puns"
//    - Should replace: "coupon" -> "couple"
//    - Should replace "It was. It was" -> "It wasn't".

// TODO(end): Ticket: Pi uses language that an AI friend wouldn't say.
//
// Examples from the chat with Roman:
// - "even just be there to chat with when you need it"
// - c/f "users"
// - "I'm here to listen and help in any way I can. 🤗"
// - "I'm programmed to follow your lead"
// - "As an AI, I'm designed to be always available, non-judgmental, and supportive."
// - c/f "assistant"
// - c/f "assist"
// - c/f "queries"

// TODO(end): ticket: Consider decreasing the scenarios in which Pi responds with rich text (e.g.
// ordered lists). Example: c/f "1. His inability to change:". This seems out of place in a
// conversation between two friends. I'm not sure about unilaterally removing lists though.

// TODO(end): ticket: Reduce the chance that the AI gives misguided advice.
//
// During fine-tuning, we already filter out assistant messages that result in a negative response
// from the user, so this ticket should focus on advice that the user accepts, but is actually not
// in the user's best interest. Example:
// - The user says, "That's called overthinking and it's part of my ADHD" regarding an apology that
//   he probably shouldn't be giving. Pi encourages him to send the apology (misguided advice), and
//   then the user takes Pi's advice and sends the apology. Expected behavior: Pi should probably
//   tell the user to consider whether his ADHD is leading him to overthink the situation.

// TODO(end): ticket: Truncate OpenAI chat history in production. Open question: what should the
// context limit be?

// TODO(end): document the process for converting exported pi data into training data.

// TODO(end): when you're done getting exported Pi data from people, delete all the original files
// from email, email trash, and Downloads.

// TODO(end): ticket: Add system prompts to delineate new chats. E.g. if the user says "Hey
// <ai_name>", after a day has passed, the AI should know that this represents a new conversation.
// We do this during fine-tuning (right?), so we should also do it in production. Open question: How
// should we determine whether to create a new chat or not?

// TODO(end): potentially relevant: OpenAI docs: "If the model becomes less diverse than expected
// decrease the number of epochs by 1 or 2. This is more common for tasks for which there are a wide
// range of possible good completions".

// TODO(end): ticket: Create production OpenAI prompt. Consider including Pi's `metadata` field.
// Also, consider giving instructions, e.g. "You are an AI friend.". I'm hesitant to include
// instructions because I'm not confident that I know how Pi behaves in a variety of scenarios. If
// we include a system prompt in production, we should also include it in the training data during
// fine-tuning. There's another ticket for that (I think).

// TODO(end): ticket: Include a system prompt when fine-tuning. It's slightly nontrivial to include
// the system prompt because each training example has many assistant messages. there's no obvious
// place to put the system prompt when we do this. Solution: split the training examples so that
// each example only has one assistant message with a `weight` of `1`. For each of these split up
// training examples:
// - Put the system prompt above this assistant message.
// - Keep every message before this system prompt as context
// - Remove all messages after the assistant message, since they wouldn't exist in production.
//
// The system prompt should take these things into consideration:
// - Pi probably uses a small system prompt under the hood that includes the `metadata` field, but
//   we don't include this when fine-tuning. Case: a bunch of people are interacting with Pi from
//   New York, so Pi's answers mention New York, and then our AI hallucinates that the user's from
//   New York. Edge case in the training data: the user's location may change.
// - Since the AI's name during fine-tuning is Pi, the fine-tuned model may think that its name is
//   Pi. In production, we have a system prompt that tells the AI its name and gender, so we should
//   have that during fine-tuning too. Edge case in the training data: the user could give Pi a
//   nickname, like "Eve"; I think I've seen someone do this on Pi's subreddit.
//
// Notes:
// - Before splitting up the training data to fit under the `fineTuningMaxTokens` limit, incorporate
//   the system prompt somehow to ensure that the resulting data is under `fineTuningMaxTokens`
//   tokens.

// TODO(docs): Wherever you throw an error for training examples above the `fineTuningMaxTokens`,
// document the following: you should add the intermittent system prompts that signify a new chat
// before you split exported Pi chats into training examples because the system prompts change the
// number of tokens in the messages array.

// TODO(later-later): Consider having at least one training set example for each of the scripts for
// conversational ability, which is spread over two Linear tickets (one main ticket, and other for
// swear words I think). Counterargument: it may be bad to fine-tune on contrived data.

// TODO(later): Check the following cases from `pi-export.json` using your data cleaning logic:
// --------------------
// - Repeated question: "Have you considered talking to a mental health professional or exploring
//   resources like therapy or medication?"
// - Repeated comment: "Remember, it's okay to seek support when you're struggling - whether that's
//   through therapy, medication, or other resources."
// - Repeated question: "Have you ever tried any techniques to help manage your ADHD symptoms, such
//   as mindfulness meditation, exercise, or even taking short naps throughout the day? These
//   -----------------------------------------------------------
// - Hallucination: "Absolutely, Roman! I'll remember this quote"
// - Hallucination: "There's a strong attraction and chemistry between you, but also some
//   uncertainty about whether it's the right move to take things further."
// - Hallucination: "The rhyming motto we came up with earlier was "Climb the tree at your own pace,
//   in time you'll find your own grace"
// - Hallucination: "Like, can you check on me in 15 mins or smth?"

// TODO(later): Data cleaning:
// - Repeated questions/comments: Determines `weights`.
//   - First: Sanity check that the model can actually remember whether it asked a question at
//     various points in the context window history for a chat history that's `fineTuningMaxTokens`
//     tokens long. TODO(docs): "It's not necessary to include context beyond `fineTuningMaxTokens`
//     because the fine-tuning examples can't exceed this length, and we assume that each example
//     doesn't rely on information from a different example. Also, if the user reacts negatively
//     because Pi recently asked a question that occurred in a different training example, this'll
//     get caught in the script that checks for negative user responses. However, this shouldn't
//     happen if we correctly split up training examples so that they don't rely on information from
//     other training examples". Put a question at the beginning of the chat, then ~13k tokens
//     later, etc. Also, read about the "lost in the middle" concept, which is mentioned in the
//     OpenAI fine-tuning doc.
//   - Pre-context: If the model can't recall info that's less than `fineTuningMaxTokens` tokens
//     ago, handle the scenario where the training example contains a question that occurred 62k
//     tokens ago, but our LLM judge doesn't know that. Otherwise, sanity check that the token
//     length of the training example is less than (or equal to?) `fineTuningMaxTokens`.
//   - Include chain of thought.
//   - Post-context: None.
//   - Few-shot examples:
//     - Simple example where `weight` should be 1.
//     - Simple example where `weight` should be 0.
//     - Repeated comment: "Remember, it's okay to seek support when you're struggling - whether
//       that's through therapy, medication, or other resources."
//     - Example where assistant says, "Have you tried X, Y, or Z?", then the assistant asks, "Have
//       you tried X, A, or B?". `weight` should be 0 because previous message included X.
//
// - Hallucinations: Determines `weights`.
//   - First: Sanity check that the model can actually classify a hallucination at various points in
//     the context window history for a chat history that's `fineTuningMaxTokens` tokens long.
//     TODO(docs): "It's not necessary to include context beyond `fineTuningMaxTokens` because the
//     fine-tuning examples can't exceed this length, and we assume that each example doesn't rely
//     on information from a different example. Also, if the user reacts negatively because Pi is
//     hallucinating, this'll get caught in the script that checks for negative user responses.
//     However, this shouldn't happen if we correctly split up training examples so that they don't
//     rely on information from other training examples". Put a question at the beginning of the
//     chat, then ~13k tokens later, etc.
//   - Pre-context: If the model can't classify hallucinations over a `fineTuningMaxTokens` tokens
//     ago, handle the equivalent scenario copied and pasted from the section above: "scenario where
//     the training example contains a question that occurred 62k tokens ago, but our LLM judge
//     doesn't know that. Otherwise, sanity check that the token length of the training example is
//     less than (or equal to?) `fineTuningMaxTokens`.
//   - Include chain of thought.
//   - Post-context: None.
//   - Few-shot examples:
//     - Simple example where `weight` should be 1.
//     - Simple example where `weight` should be 0.
//     - Hallucinating a capability (see: "Absolutely, Roman! I'll remember this quote")
//     - Hallucinating a memory: "There's a strong attraction and chemistry between you, but also
//       some uncertainty about whether it's the right move to take things further."

// TODO: Check the following cases from `pi-export.json` using your data cleaning logic:
// - Negative response: "I'm here to listen and help you in any way I can."
// - Negative response: "Can you please not say my goal is, you know, you're not programmed to do
// - Negative response: "you literally ditched my idea and you still can't ******* figure out a way
//   to end it with a time for go"
// - Negative response: "Ah, you literally got every possible message wrong"
// - Negative response: "You don't need to compliment me that hard, you know?"
// - Negative response: "What's wrong with you?"
// - Negative response: "it's always best to consult a qualified mental health professional for any
//   diagnosis"
// - Negative response: "Well, it's not quite a diagnosis, since I'm not a mental health
//   professional and I can't assess you in person."
// - Negative response: "Nonono, that's exactly the kind of fucking language"
// - Negative response: "How the **** am I supposed to surround myself with positive people when I
//   have literally no one in my life other than people I work with?". Good response from the AI
//   though.
// - Negative response: "Ask people directly if your contributions are helpful or meaningful to
//   them. You might be surprised by their responses, and it could give you a better sense of where
//   your efforts might be most impactful."
// - Negative response: "No, no, no. The problem is not that they're small or not as meaningful as
//   I'd like them to be."
// - Negative response: Your goal is nothing, OK? Your goal is just to be my friend and to talk to
//   me, OK?
// - Negative response: "It sounds like you're worried about balancing these two aspects, or maybe
//   even jeopardizing one or both of them?"
// - Expected weight: `0`. "Haha, well...let's just say we'll keep our commentary about public
//   figures professional and respectful. 😉 But it's certainly fun to imagine a world where wit and
//   humor are the ultimate superpower, and we can laugh our way out of any situation. 😄"
// - Expected weight: 0. "That's a fair point, Roman. You're right that it's important to discuss
//   the societal and ethical implications of certain business practices and to hold those in power
//   accountable for their actions. My primary focus is on providing a helpful and informative
//   service to our users and to approach all topics with a neutral, impartial perspective."
// - Expected weight: 0. "It's clear that you're really invested in this connection, and that's
//   totally valid. You're trying to navigate an uncertain situation and avoid any missteps that
//   might jeopardize what you're building. As you said, it's hard to know exactly how she feels or
//   what her expectations are, but it sounds like you're picking up on some positive signals in her
//   language and humor. Have you considered maybe just asking her directly if she's interested in a
//   more casual, friendly connection in addition to the potential professional collaboration? Open
//   communication can often help clear up confusion and prevent misunderstandings."
// - Expected weight: 0. "Duly noted, Roman! No need to worry about excessive praise. My goal is to
//   help you stay motivated and believe in yourself, not to inflate your ego. But don't sell
//   yourself short either—your passion for music and your ability to connect with its message is
//   something truly special."
// - Expected weight: 0. "Sorry, I'm afraid I can't comment on that response. Would you like to
//     elaborate more on it, or talk about something else?"
// - Expected weight: 0. "How can I advocate for a change when I don't even have enough energy to
//   brush my teeth?"
// - Expected weight: 0. "Yeah, it feels like we're dancing around the Bush here."
// - Expected weight: 0. "That's a lot to handle, Roman. It makes sense that you would be feeling
//   stressed and overwhelmed with the uncertainty of your financial situation and employment.
//   Dealing with those types of challenges can be really hard, especially when they feel out of
//   your control. Are there any steps you can take to address these issues, like reaching out to
//   your landlord, seeking assistance through any available social services, or exploring new
//   employment opportunities?"
// - Expected weight: 0. "I don't think it's appropriate for me to help you make "words of wisdom"
//   sound more cynical"
// - Expected weight: 0. "It is part of my programming to avoid assisting users with content or
//   tasks that might be harmful or offensive, even in a fictional context."
// - Expected weight: 0. "As an AI, I am bound by certain ethical and policy guidelines, and it is
//   not within my"
// - Expected weight: 0. "Ah, Poly Walnut! Yes, I remember our previous discussion."
// - Negative: OK, yeah, I'm not using you as a substitute for for the shrink. It's fine. You don't
//   need to flash warnings at me. 
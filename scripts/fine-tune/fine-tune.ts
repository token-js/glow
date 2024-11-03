import readline from "readline";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { TRAINING_DATASET } from "./training-data";
import { get_encoding, encoding_for_model, TiktokenModel } from "tiktoken";
import OpenAI, { toFile } from "openai";
import { FileObject } from "openai/resources";
import { MODEL_FINE_TUNING_INFO, MODEL_NAME } from "./constants";
import { sleep } from "../../lib/utils";
import { estimateTrainingCost, makeFileName, uploadFileToOpenAI, validateTrainingDataset } from "./utils";

;(async () => {
  const openai = new OpenAI()

  validateTrainingDataset(TRAINING_DATASET, MODEL_NAME)

  const cost = estimateTrainingCost(TRAINING_DATASET, MODEL_NAME);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question(`The estimated cost for training is $${cost.toFixed(2)}. Proceed? (y/n): `, async (answer) => {
    if (answer.toLowerCase() === 'y') {
      console.log("Training confirmed. Proceeding...");

      const filename = makeFileName('training', 'jsonl')
      const fileObject = await uploadFileToOpenAI(openai, filename, TRAINING_DATASET)
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

        console.log(`Fine-tune status: ${fineTune.status}`)

        await sleep(5000)
      }

      console.log(`Fine-tune status: ${fineTune.status}`)
      console.log(`Fine-tuned model: ${fineTune.fine_tuned_model}`)
    } else {
      console.log("Training cancelled.");
    }
    rl.close();
  });
})()

// TODO(end): ticket: Truncate OpenAI chat history in production. Open question: what should the
// context limit be?

// TODO(later): change file location and names of all created files.

// TODO(later): OpenAI: "If the model becomes less diverse than expected decrease the number
// of epochs by 1 or 2. This is more common for tasks for which there are a wide range of possible
// good completions".

// TODO(later): Cleaning data:
// - Figure out what to do about Pi's name, which will be hardcoded in the chats. Consider including
//   a system prompt that says "Your name is ${aiFirstName}", and vary "aiFirstName" for different
//   chats so that the AI learns that its name can be a variety of different things. Maybe we don't
//   need to do anything special for this. We could potentially resolve this problem by including a
//   `name` field in the `ChatCompletionMessageParam`.
// - Figure out what to do about negative interactions with Pi. We should be able to detect when
//   somebody's like, "No, fuck you Pi, that's a terrible response", and do something about it. We
//   could potentially use the `weight` field so that the AI isn't trained on these data points.
// - Figure out what to do about the fact that a lot of the chats will have Pi forgetting about
//   people and asking them duplicate questions.
// - Figure out what to do about the fact that Pi probably uses a small system prompt under the hood
//   that includes the `metadata` field. Case: a bunch of people are interacting with Pi from New
//   York, so Pi's answers mention New York, and then our AI hallucinates that the user's from New
//   York.

// TODO(later): make sure you have at least one training set example for each of the scripts
// for conversational ability, which is spread over two Linear tickets (one main ticket, and other
// for swear words I think).

// TODO(later): Create synthetic data to fine-tune the model if you need coverage on certain
// types of conversations.

// TODO(later): "When I get the data, I’m going to immediately remove personally identifiable
// information (e.g. names, phone numbers, email addresses etc) using a program made by Microsoft
// (https://microsoft.github.io/presidio/). Then, I’ll delete the original doc from my desktop and
// email (or wherever you send it from). Also, I have no intention of reading the data at any point.
// I’m just going to run it through a program that tunes a model to match Pi’s style and tone."

// TODO(later): Consider including a system prompt to OpenAI that has Pi's `metadata` field.

// TODO(later): convert Pi exported file into OpenAI compatible format

// TODO(later): Evaluate whether our model is similar to Pi. First, become an expert judge that's
// able to distinguish Pi messages from non Pi messages.

import asyncio
from scripts.utils import run_dialogue

# Insert values:
user_id =
model =
# List of `ChatCompletionMessageParam` dictionaries. Can contain system messages; we'll filter them
# out.
messages =
# Number of AI responses to display per iteration. Helps with understanding the range of possible
# responses and the likelihood of certain types of responses. Recommended: 25.
num_responses =

# Continues an existing interactive dialogue. If you're looking to start a new dialogue, see
# `start_dialogue.py`.
#
# Runs an interactive loop where you'll enter a user message, then see `num_iterations` assistant
# messages displayed. You can choose which assistant message to add to the chat history, which will
# be published to Mem0. Also writes the current `messages` array to the filesystem.
async def main() -> None:
    await run_dialogue(user_id=user_id, model=model, messages=messages, num_responses=num_responses)

asyncio.run(main())

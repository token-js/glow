import asyncio
import uuid

from scripts.utils import run_dialogue
from server.api.constants import LLM

# Insert values:
model = 
# Number of AI responses to display per iteration. Helps with understanding the range of possible
# responses and the likelihood of certain types of responses. Recommended: 25.
num_responses =

# Start a new interactive dialogue. If you're looking to continue an existing interactive dialogue,
# see `continue_dialogue.py`.
#
# Runs an interactive loop where you'll enter a user message, then see `num_iterations` assistant
# messages displayed. You can choose which assistant message to add to the chat history, which will
# be published to Mem0. Also writes the current `messages` array to the filesystem.
async def main() -> None:
    user_id = str(uuid.uuid4())
    await run_dialogue(user_id=user_id, model=model, messages=[], num_responses=num_responses)

asyncio.run(main())
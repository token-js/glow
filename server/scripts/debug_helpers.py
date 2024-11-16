import uuid


# Useful for streaming a single response from the conversational LLM instead of calling an LLM
# directly.
def stream_given_text(text: str, iterations: int):
    text = text.encode("utf-16", "surrogatepass").decode("utf-16")  # Normalize surrogates

    # Stream each word or space
    words = text.split(" ")
    for _ in range(iterations): # Number of times to repeat the text
        for word in words:
            yield MockLLMResponseChunk(content=word + " ")  # Add space back after each word


class MockChoiceDelta:
    def __init__(self, content=None, role=None):
        self.content = content
        self.function_call = None
        self.refusal = None
        self.role = role
        self.tool_calls = None


class MockChoice:
    def __init__(self, content=None, role=None, finish_reason=None, index=0):
        self.delta = MockChoiceDelta(content=content, role=role)
        self.finish_reason = finish_reason
        self.index = index
        self.logprobs = None


class MockLLMResponseChunk:
    def __init__(self, content=None, role=None, finish_reason=None):
        self.id = f"chatcmpl-{uuid.uuid4().hex}"
        self.object = "chat.completion.chunk"
        self.created = 1704067200
        self.model = "gpt-4o-mini-2024-07-18"
        self.choices = [MockChoice(content=content, role=role, finish_reason=finish_reason)]
        self.service_tier = None
        self.system_fingerprint = "fp_9b78b61c52"
        self.usage = None

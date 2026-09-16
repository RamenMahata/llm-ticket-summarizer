const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export async function sendMessage(message, onDelta) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: message,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "The request could not be completed.");
  }

  if (!response.body) {
    throw new Error("The response did not include a stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullResponse = "";
  let completed = false;

  const processEvent = (event) => {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (!data) {
      return;
    }

    if (data === "[DONE]") {
      completed = true;
      return;
    }

    let payload;
    try {
      payload = JSON.parse(data);
    } catch (_error) {
      throw new Error("The response stream was invalid.");
    }

    const delta = payload?.choices?.[0]?.delta?.content;
    if (typeof delta !== "string") {
      throw new Error("The response stream was invalid.");
    }

    fullResponse += delta;
    onDelta?.(delta);
  };

  while (!completed) {
    const {value, done} = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), {stream: !done});

    const events = buffer.split(/\r?\n\r?\n/);
    buffer = events.pop();
    events.forEach(processEvent);

    if (done) {
      break;
    }
  }

  if (!completed) {
    buffer += decoder.decode();
    if (buffer.trim()) {
      processEvent(buffer);
    }
  }

  if (!completed) {
    throw new Error("The response stream ended unexpectedly.");
  }

  await reader.cancel();
  return fullResponse;
}

export async function getHistory() {
  const response = await fetch(`${API_BASE_URL}/api/history`);

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "History could not be loaded.");
  }

  return response.json();
}

export async function clearHistory() {
  const response = await fetch(`${API_BASE_URL}/api/history`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "The request could not be completed.");
  }
}
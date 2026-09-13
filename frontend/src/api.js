const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

async function readResponse(response) {
  const body = await response.text();

  if (!response.ok) {
    throw new Error(body || "The request could not be completed.");
  }

  return body;
}

export async function sendMessage(message) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: message,
  });

  return readResponse(response);
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

  await readResponse(response);
}
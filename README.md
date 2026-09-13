# LLM Ticket Summarizer

A backend application that uses an LLM to summarize customer support tickets into concise summaries.

The project demonstrates how to integrate an external LLM API into a Node.js/Express application while keeping the API layer, LLM service layer, configuration, and tests separated.

## What it does

The application provides an HTTP API that accepts a customer support ticket and sends it to a Gemini LLM for summarization.

### Flow

```text
Client / Postman
       ↓
POST /api/summarize
       ↓
Express API
       ↓
Input Validation
       ↓
Summarize Service
       ↓
Gemini API
       ↓
Generated Summary
       ↓
HTTP Response
```

The application also handles:

* Empty ticket requests
* LLM/service failures
* Empty responses from the LLM
* Environment-based API configuration
* Automated API and service-level testing

---

## Architecture

The application is organized into separate layers.

```text
                 ┌─────────────────────┐
                 │   Client / Postman  │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │      app.js         │
                 │    API Layer        │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ summarizeService.js│
                 │    Service Layer    │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │     Gemini API      │
                 │        LLM          │
                 └─────────────────────┘
```

### API Layer

`backend/src/app.js`

Responsible for:

* Creating the Express application
* Parsing incoming text requests
* Validating ticket content
* Calling the summarization service
* Returning HTTP responses
* Handling service errors

### Service Layer

`backend/src/summarizeService.js`

Responsible for:

* Configuring the Gemini model
* Constructing the summarization prompt
* Calling the Gemini API
* Extracting the generated response
* Handling empty LLM responses

### Server Layer

`backend/src/server.js`

Responsible for:

* Loading environment variables
* Creating the summarization service
* Injecting the service into the application
* Starting the HTTP server

---

## Tech Stack

* **Node.js**
* **Express.js**
* **Google Gemini API**
* **JavaScript (ES Modules)**
* **dotenv**
* **Node.js Test Runner**
* **Supertest**
* **Git + GitHub**
* **Postman** for API testing

---

## Project Structure

```text
llm-ticket-summarizer/
│
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   └── summarizeService.js
│   ├── test/
│   │   ├── app.test.js
│   │   └── summarizeService.test.js
│   ├── package.json
│   └── package-lock.json
│   └── .env
├── frontend/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── api.js
│       ├── App.jsx
│       ├── main.jsx
│       └── styles.css
│
├── .gitignore
└── README.md
```

> `.env` is excluded from Git through `.gitignore` and should never be committed because it contains the API key.

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/llm-ticket-summarizer.git
```

### 2. Enter the project directory

```bash
cd llm-ticket-summarizer
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Configure the backend environment

Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_api_key_here
```

Replace `your_api_key_here` with your Gemini API key.

---

## Environment Variables

The application requires the following environment variable:

| Variable         | Description                                      |
| ---------------- | ------------------------------------------------ |
| `GEMINI_API_KEY` | API key used to authenticate with the Gemini API |
| `PORT`           | Optional port for the Express server             |

Example:

```env
GEMINI_API_KEY=your_api_key_here
PORT=8080
```

Never commit `.env` to GitHub.

The `.gitignore` file contains:

```text
node_modules/
.env
```

---

## Running the application

Start the backend from the `backend/` directory:

```bash
cd backend
npm run dev
```

The backend starts on the configured port, or `http://localhost:8080` by default.

In a second terminal, install and start the React frontend from the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

The frontend is a chat client for the multi-turn support conversation. It uses `http://localhost:8080` as its default API URL. To use another backend URL, create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:8080
```

The conversation history is held in backend memory. It is shared by clients connected to the same running server and is cleared whenever the backend restarts.

Assistant responses are rendered as safe GitHub-Flavored Markdown in the chat. Headings, lists, tables, links, blockquotes, inline code, and fenced code blocks are supported. User messages remain plain text, and raw HTML from assistant responses is not rendered.

To create a production frontend build:

```bash
cd frontend
npm run build
npm run preview
```

---

## Testing

The project uses the Node.js built-in test runner and Supertest.

Run the backend tests from the `backend/` directory:

```bash
cd backend
npm test
```

The test suite verifies:

* Successful ticket summarization
* Empty ticket validation
* LLM/service failure handling
* Correct Gemini model and prompt construction
* Empty Gemini response handling

Expected result:

```text
tests 5
pass 5
fail 0
```

The LLM API itself is not called during service tests. A fake Gemini client is used so that tests remain fast, deterministic, and independent of the external API.

---

## API Endpoint

### `POST /api/summarize`

Accepts a customer support ticket as plain text and returns an LLM-generated summary.

### Request

**URL:**

```text
POST http://localhost:8080/api/summarize
```

**Content-Type:**

```text
text/plain
```

**Body:**

```text
The checkout page returns a 500 error whenever customers try to complete their purchase. The issue started after the latest deployment and is currently preventing customers from completing orders.
```

### Response

**Status:**

```text
200 OK
```

**Content-Type:**

```text
text/plain
```

---

## Example Request

Using `curl`:

```bash
curl -X POST http://localhost:8080/api/summarize \
  -H "Content-Type: text/plain" \
  -d "The checkout page returns a 500 error whenever customers try to complete their purchase. The issue started after the latest deployment and is currently preventing customers from completing orders."
```

You can also send the same request using Postman.

---

## Example Response

```text
Checkout is failing with a server error.
The issue is preventing customers from completing purchases.
```

The exact wording of the generated summary may vary because it is produced by the LLM.

---

## Error Handling

### Empty ticket

If the request body is empty or contains only whitespace:

```text
HTTP 400
```

Response:

```text
Ticket content is required.
```

### LLM/service failure

If the summarization service fails:

```text
HTTP 500
```

Response:

```text
An error occurred while summarizing the ticket.
```

Internal errors are logged by the server while a controlled message is returned to the client.

---

## Key Engineering Concepts Demonstrated

This project demonstrates several practical software engineering concepts:

* REST API development
* Express middleware
* Input validation
* Service-layer separation
* Dependency injection
* External API integration
* Environment variable configuration
* Error handling
* Unit testing
* API testing
* Mock/fake dependencies
* LLM integration
* Git and GitHub workflow

The project is intentionally small so that the complete request flow from HTTP request to LLM response can be understood and implemented independently.

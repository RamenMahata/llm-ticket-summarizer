
// Application entry point
import "dotenv/config"; // loads environment variables from .env file

import {createApp} from "./app.js";
import {createSummarizeService} from "./summarizeService.js";

const port = Number(process.env.PORT || 8080);

const summarizeService = createSummarizeService();
const app = createApp({summarizeService});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
import serverless from "serverless-http";
import app from "../../index.js";

// Keep the Express routes unchanged (/api/...). Netlify rewrites /api/* here.
export const handler = serverless(app);

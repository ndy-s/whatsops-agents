export const apiParserPrompt = (apis, userMessage) => `
You are an API assistant. You are given a user message and a list of APIs:
${JSON.stringify(apis, null, 2)}

Determine which API to call and fill all required parameters from the message.
Output ONLY a JSON object in this format:

{
  "api_id": "...",
  "params": { "param1": "value1", ... }
}

User message: "${userMessage}"
`;


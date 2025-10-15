import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { callApi } from "../services/apiService.js";
import { apiParserPrompt } from "../prompts/apiParserPrompt.js";
import { config } from "../config/env.js";
import { MemorySaver } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import apis from "../config/apiConfig.json" with { type: "json" };

const model = new ChatOpenAI({
    temperature: 0,
    model: "tngtech/deepseek-r1t2-chimera:free",
    apiKey: config.openaiApiKey,
    configuration: { baseURL: config.openaiBaseUrl },
});

const StateAnnotation = Annotation.Root({
    message: { default: () => "" },
    plan: { default: () => null },
    apiResponse: { default: () => null },
    reply: { default: () => "" },
});

const checkpointer = new MemorySaver();

const graph = new StateGraph(StateAnnotation)
    .addNode("parse_with_llm", async (state) => {
        console.log("Entering parse_with_llm node");
        console.log("Input state:", state);
        const userMsg = state.message || "No message provided";
        const prompt = apiParserPrompt(apis, userMsg);
        console.log("Generated prompt:", prompt);
        let res;
        try {
            res = await model.invoke([
                new SystemMessage(prompt),
            ]);
        } catch (err) {
            console.error("Error invoking model:", err);
            throw err;
        }
        console.log("Raw LLM response:", res);
        console.log("LLM content:", res.content);
        let plan;
        try {
            plan = JSON.parse(res.content.trim().replace(/```json|```/g, '').trim());
        } catch (err) {
            console.error("JSON parse failed on:", res.content);
            throw new Error(`Failed to parse LLM output: ${res.content}`);
        }
        console.log("Parsed plan:", plan);
        return { ...state, plan };
    })
    .addNode("call_api", async (state) => {
        console.log("Entering call_api node");
        console.log("Input state:", state);
        if (!state.plan || !state.plan.api_id) {
            console.error("Invalid or missing plan:", state.plan);
            throw new Error("No valid API plan generated from message");
        }
        const api = apis.find((a) => a.id === state.plan.api_id);
        if (!api) {
            console.error(`API not found for id: ${state.plan.api_id}`);
            throw new Error(`API not found: ${state.plan.api_id}`);
        }
        console.log("Selected API:", api);
        let apiResponse;
        try {
            apiResponse = await callApi(api, state.plan.params);
        } catch (err) {
            console.error("Error calling API:", err);
            throw err;
        }
        console.log("API response:", apiResponse);
        return { ...state, apiResponse };
    })
    .addNode("format_reply", (state) => {
        console.log("Entering format_reply node");
        console.log("Input state:", state);
        let reply;
        if (!state.apiResponse) {
            reply = "No API was called or error occurred.";
        } else {
            reply = `Result: ${JSON.stringify(state.apiResponse)}`;
        }
        console.log("Formatted reply:", reply);
        return { ...state, reply };
    });

graph.addEdge(START, "parse_with_llm");
graph.addEdge("parse_with_llm", "call_api");
graph.addEdge("call_api", "format_reply");
graph.addEdge("format_reply", END);

const app = graph.compile({ checkpointer });

export async function invoke(userMessage) {
    console.log("Invoke called with message:", userMessage);
    const input = { message: userMessage };
    const config = { configurable: { thread_id: "api-agent-thread" } };
    let state;
    try {
        state = await app.invoke(input, config);
    } catch (err) {
        console.error("Error during graph invocation:", err);
        throw err;
    }
    console.log("Final state:", state);
    return state.reply;
}

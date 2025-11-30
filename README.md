# WhatsApp Multi-Agent Ops

<p>
  <img src="https://github.com/ndy-s/wa-multi-agent-ops/blob/main/assets/icon.png" alt="Puppet Browser Logo" width="150" height="150" style="vertical-align: middle; margin-right: 15px;">
  <blockquote style="display: inline; font-size: 1.2em; margin: 0;">
    "Multi-agent WhatsApp automation for API and SQL operations."
  </blockquote>
</p>

## About This Project

This project started as a small personal experiment. I wanted to see how far I could push agentic AI to automate the repetitive tasks I deal with every day. What began as something simple slowly grew as I added more agent strategies, more controls, and more automation paths. At some point it became much bigger than I expected, and I'm still surprised by how much it can already do.

It's not perfect, but I keep refining it piece by piece, adjusting its behavior, polishing how the Agents respond, and improving whatever feels clunky or unnatural. It's a slow build, but a fun one.

### The Core Idea

The idea behind this project is very simple. I wanted a system that interacts the same way people normally talk. When a manager or coworker asks for something, they don't follow a rigid format. They just say what they want, and you understand.

I wanted to replicate that feeling.

Instead of opening a SQL editor, writing queries, or switching tools, you can simply talk to it the way you talk to a human.

<table align="center">
  <tr>
    <td align="center">
      <img src="https://github.com/ndy-s/wa-multi-agent-ops/blob/main/assets/api-agent-demo.gif" width="230" style="border-radius:8px;">
      <div style="margin-top:4px;"><strong>API Agent Demo</strong></div>
    </td>
    <td align="center">
      <img src="https://github.com/ndy-s/wa-multi-agent-ops/blob/main/assets/sql-agent-demo.gif" width="230" style="border-radius:8px;">
      <div style="margin-top:4px;"><strong>SQL Agent Demo</strong></div>
    </td>
  </tr>
</table>

You can say something like:

> “Hey @Bot, show me today's transactions with the highest amounts.”

Or even something operational like:

> “Hey @Bot, create a loan account for UAT testing with a random user. Any balance is fine, just make sure the account is active.”

The Agents take over from there. They generate the SQL or make the API calls, retrieve the data, validate the response, and return everything back to you. There are no extra steps and no friction. It's just a natural conversation that gets work done.

### Why It's Cheap to Run?

Another thing that makes this project easy to maintain is that it relies completely on free AI models. I currently use Google's free [Gemini model](https://ai.google.dev/gemini-api) and several free models available on OpenRouter, especially the free [DeepSeek model](https://openrouter.ai/tngtech/tng-r1t-chimera:free). For embeddings, the system uses the free [MiniLM model](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) from Hugging Face, which is lightweight and fast for vector-based tasks.

Since everything runs on free tiers, there are no costs to worry about.

Free models do come with trade-offs such as slower responses, occasional delays, and API usage limits. For personal use, these drawbacks are still acceptable and the system runs well enough for daily tasks.

If you ever want to scale it further or make it more powerful, switching to a paid state-of-the-art model will immediately give you faster responses, better accuracy, and a noticeably smoother experience.

## Quick Setup

Getting everything running is simple. Here’s the full workflow.

### Clone Repository & Copy Environment File

Before running anything, copy the example environment file:

```bash
git clone https://github.com/ndy-s/wa-multi-agent-ops.git
cd wa-multi-agent-ops
cp .env-example .env
npm install
```

### Start the Server

```bash
npm run start
```

This will automatically launch the Dashboard. Open your browser and visit:

```
http://localhost:55555
```

On first startup, the system will automatically seed all required Agents, registry data, and base knowledge, so you can start immediately without manual seeding. The default dashboard login uses the username `admin` with the password `password`. You can change these values in the `.env` file and rerun the application.

### Configure Your Agents

Inside the dashboard, open the Agents Configuration menu and fill in all required fields:

* **Base API URL**: This is used by the API Agent to call external services. A default value is already provided, so you do not need to change this unless you want to test with your own custom API endpoint.
* **SQL Settings**: Currently, the SQL Agent only supports Oracle. You need to provide the username, password, and connection string. For example, your connection string could be `192.168.1.10:1521/ORCL` or `localhost/XEPDB1`, depending on your Oracle setup. Once entered, the SQL Agent can connect to the database and execute queries.
* **LLM API keys**: Add keys for any models you want the bot to use, such as Gemini, DeepSeek, OpenRouter, or OpenAI. You can enter more than one API key by putting each key on a separate row. The system uses these keys to load-balance requests.
* **Model Priority**: Enter the order in which the models should be used. Each model name should be placed on its own row. This priority list determines which model is tried first. The system uses a [round-robin](https://en.wikipedia.org/wiki/Round-robin_scheduling) strategy internally to distribute tasks and provide fallback if a model is slow or unavailable.
* **Whitelist input**: Enter phone numbers or group IDs that the bot is allowed to respond to. You can leave this empty at first. After linking your WhatsApp account, if a message comes from a chat not in the whitelist, the bot will log the user or group ID in the console. You can then copy the ID and add it to the whitelist so the bot will start responding in that chat. This makes it easy to manage authorized chats dynamically.

After clicking Save Configuration, the system will check whether configuration data already exists, store and apply the settings, and automatically start the WhatsApp bot.

If you need to modify the registry, return to the main dashboard page and open the Agents Knowledge Base section. This includes items such as Agent prompts and knowledge base definitions like API lists, database schema, and available SQL commands. Everything is automatically seeded on first run, so you do not need to change anything unless you want to extend or customize the system.

### Connect Your WhatsApp Account

When the bot starts, a QR code will appear in your console. Open WhatsApp on your phone, go to Linked Devices, and scan the QR code. Once linked, the bot is active and ready to respond to messages according to the whitelist.

## Under the Hood

When I started building this agent-based application, the first thing on my mind was cost. It is a critical factor because no matter how cool a project is, if it is expensive to run, it will not scale and it is likely it will never get used. I wanted to avoid that trap, so cost became a key design consideration from day one.

For the AI itself, I experiment with both free and paid models. On the free side, I use Google Gemini-2.5-Flash and OpenRouter's DeepSeek-R1T2-Chimera models. Paid options include the GPT-4.1 models for faster and more powerful responses. For embeddings, I rely on the free all-MiniLM-L6-v2 model or text-embedding-3-small embeddings, depending on the task. In practice, the free models are already good enough for most of the tasks in this project.

For easier integration with multiple LLM APIs, I rely on [LangChain](https://www.langchain.com/). Each model has its own characteristics and ways of interacting. LangChain helps standardize the process and allows me to work with different models using a consistent approach.

This setup is flexible. You can switch between models to find what works best for your needs. Adding a completely new model is also possible. It requires only minor code adjustments and is not difficult.

### The Agents

At the core of this project are the Agents. Each one has a specific role, a clear responsibility, and a simple way of interacting with the rest of the system. I designed them this way so the whole application feels modular and easy to reason about. Instead of building one large and complicated model that tries to do everything, the system is split into smaller parts that each handle a single task well.

The main Agents in this system are the API Agent and the SQL Agent. Both of them rely on a registry system so the AI always knows what tools are available, how they work, and what parameters they require.

#### API Agent

The API Agent is responsible for calling external services. To make this work well, I use an API registry. This registry contains the API name, description, input parameters, output structure, and a short explanation of what each endpoint is actually meant to do.

I wrote it this way because LLMs perform much better when they have clear instructions and a clean list of tools to choose from. If the Agent does not understand the purpose of an endpoint, it will either call the wrong API or guess something random. By keeping everything documented in the registry, the model has a reliable reference and makes fewer mistakes.

Adding a new API is simple. You describe it in the registry, give it a clear purpose, define the required parameters, and the API Agent can start using it immediately. Most of the time, I find that good descriptions matter more than complex prompts. The Agent becomes more predictable and much easier to debug.

To complete the setup, you also need to configure the base API URL and any required headers in the dashboard under Agents Configuration. This lets the API Agent know where your service is hosted and what authentication or custom headers it needs to include with each request.

#### SQL Agent

The SQL Agent is a bit more interesting because it needs to be both powerful and safe. I use a hybrid approach for this Agent, built around two different registries. The first one is the schema registry. This registry contains the database schema and describes what tables exist, what columns they have, and how those tables relate to each other. With this information, the model can generate queries on the fly, but only for reading data. Any SQL generated from the schema is strictly read-only.

The second registry is the SQL registry. This one contains a collection of predefined queries that I have written myself. These queries can perform updates, inserts, deletions, or other actions that modify data. The SQL Agent is allowed to run these predefined queries, but it is not allowed to generate destructive queries on its own.

I designed it this way because letting the model freely write update or delete statements is a recipe for hallucinations and unpredictable behavior. By limiting generated SQL to select queries and handling all data-changing operations through predefined statements, the system stays flexible without becoming dangerous.

#### Routing & Classifier Agent

Messages from the user are routed to these Agents by a Classifier Agent, which predicts the intent behind the text. To reduce cost and avoid unnecessary model calls, I also support keyword-based routing. Certain words can immediately send a message to the correct Agent without going through the classifier. These keywords can be configured in the dashboard. The defaults are simple: typing `api` routes to the API Agent, and `sql` routes to the SQL Agent.

### The Bot

On top of these Agents sits the WhatsApp bot, which acts as the main entry point for users. I chose WhatsApp for this project because it is the messaging app I use the most, both personally and for work. The system can actually run on any messaging platform, but for this implementation I decided to focus on WhatsApp because it is simply the most practical choice for me.

The bot itself is built using [Baileys](https://github.com/WhiskeySockets/Baileys), a powerful library for building WhatsApp clients. It handles message sending, receiving, reactions, typing indicators, and everything required to simulate a real WhatsApp user. Baileys makes the integration smooth and reliable, which is why I picked it.

The flow is simple. The user sends a message, and the bot forwards it to the appropriate Agent. The Agent then responds, asks for clarification if needed, or sends a confirmation request. To approve an action, the user can react with a thumbs-up emoji. This keeps a human in the loop, which I believe is still important with the current capability of LLMs so that accidental or risky actions can be avoided.

I also designed the Agent responses to feel more human. Instead of sending one long message like most LLM bots, the Agent replies in smaller chunks, usually one or two sentences at a time. I added a typing indicator and WPM-based typing speed to make the conversation feel more natural. These are small adjustments, but they make a noticeable difference and prevent the bot from feeling too rigid.

## Limitations

The Agents require clear and specific instructions to perform correctly. Vague or ambiguous prompts can lead to wrong API calls or incomplete SQL. Free models may occasionally misinterpret uncommon terms, internal system names, or domain-specific jargon, even with the registry in place. Ambiguous requests can trigger follow-up questions from the Agent, adding extra steps before execution. Additionally, SQL queries generated from the schema are strictly read-only, and all data-changing actions must be defined in the predefined SQL registry.

## License

MIT

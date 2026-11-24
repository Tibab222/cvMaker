# Using CV Maker from Claude (MCP)

CV Maker exposes its data and features as MCP tools, so Claude can read your profile, pipeline and offers, and write drafts back into the app.

Everything runs on your computer: a small bridge (`dist-mcp/cvmaker-mcp.mjs`) started by Claude talks to CV Maker on `127.0.0.1`. The data a tool returns is sent to Anthropic as part of your conversation with Claude, like any text you would paste. Contact details and the photo are never returned.

## Setup

1. Build the bridge (Node 20+):

   ```
   npm run build:mcp
   ```

2. Open CV Maker once: it writes `mcp.json` (local server address, token, tool list) in its user data folder (`%APPDATA%\cv-maker` on Windows).

3. Add the server to your MCP client.

   **Claude Code**

   ```
   claude mcp add cvmaker -- node D:/path/to/cvMaker/dist-mcp/cvmaker-mcp.mjs
   ```

   **Claude Desktop**: in `claude_desktop_config.json` (Settings → Developer → Edit config):

   ```json
   {
     "mcpServers": {
       "cvmaker": {
         "command": "node",
         "args": ["C:/path/to/cvMaker/dist-mcp/cvmaker-mcp.mjs"]
       }
     }
   }
   ```

   Then restart Claude Desktop.

CV Maker must be open, with a profile loaded, for the tools to work.

## Ready-made tasks

CV Maker also offers prompts: tasks Claude runs step by step with the tools, asking before it changes anything.

| Prompt | What it does |
| --- | --- |
| `tailor_resume` | Analyzes an offer (`o42`, `a1b2c3d` or pasted text) and drafts a tailored resume in AI Review |
| `prepare_interview` | Brief, likely questions, answers from your profile and a mock interview for one application |
| `weekly_review` | What moved in the pipeline, follow-ups due, best new offers, next week's actions |
| `find_jobs` | Ranks the offers found (and new ones, if Claude can search the web) and queues your picks |
| `career_advice` | An honest read of your profile and results, with next steps |

In Claude Code they are slash commands: `/mcp__cvmaker__tailor_resume o42`. In Claude Desktop, pick them from the `+` menu, under CV Maker.

## How it works

- `electron/mcp/`: tools, the `/api/mcp/*` routes and the connection file. `core/deps.ts` is all the tools can use from the app, and `wiring.ts` is the only file that knows the app's services.
- `mcp-bridge/`: the stdio bridge, without dependencies.
- The routes refuse any request coming from a browser (an `Origin` header, or a `Host` other than the loopback address) and any request without the token from `mcp.json`.
- Set `CVMAKER_MCP_FILE` to point the bridge to another `mcp.json`.

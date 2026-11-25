# Using CV Maker from Claude (MCP)

CV Maker exposes its data and features as MCP tools, so Claude can read your profile, pipeline and offers, and write drafts back into the app.

Everything runs on your computer: a small bridge (`dist-mcp/cvmaker-mcp.mjs`) started by Claude talks to CV Maker on `127.0.0.1`. The data a tool returns is sent to Anthropic as part of your conversation with Claude, like any text you would paste. Contact details and the photo are never returned.

## Setup

`npm run dev`, `npm run make` and the other build scripts also build the bridge, and the installer ships it. At launch, CV Maker copies it to `<user data>/mcp/cvmaker-mcp.mjs`, a path that stays the same across updates, and writes `mcp.json` (local server address, token, tool list) next to it. The user data folder is `%APPDATA%\cv-maker` on Windows.

Then, in **Settings → Claude**:

- **Connect to Claude Desktop** adds CV Maker to Claude Desktop's settings file (a copy of the original is kept as `claude_desktop_config.json.before-cvmaker`). Quit Claude Desktop completely and open it again.
- For **Claude Code**, copy the command shown and run it once.

With Node.js 20 or later installed, Claude runs the bridge with it. Otherwise it starts CV Maker itself with `--mcp-stdio`: no window, only the bridge to the open app (about 4 s to start and more memory, but nothing to install). The `RunAsNode` fuse stays off.

CV Maker must be open, with a profile loaded, for the tools to work.

## What assistants can use

The same page has a switch for each kind of data, to read and to write, and an **Allow everything** switch. A part turned off is removed from the tool list (the bridge tells Claude within seconds) and refused if called anyway. The browser extension's routes are not affected.

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

- `electron/mcp/`: tools, the `/api/mcp/*` routes and the connection file. `core/deps.ts` is all the tools can use from the app, and `wiring.ts` is the only file that knows the app's services. `settings.ts` holds the permissions and the Claude Desktop connection.
- `mcp-bridge/`: the stdio bridge, without dependencies (`bridge.ts`, run by Node through `cvmaker-mcp.ts` or by the app through `electron/mcp/stdio.ts`).
- The routes refuse any request coming from a browser (an `Origin` header, or a `Host` other than the loopback address) and any request without the token from `mcp.json`.
- Set `CVMAKER_MCP_FILE` to point the bridge to another `mcp.json`.

import { defaultConnectionFile, runBridge } from './bridge';

runBridge(process.env.CVMAKER_MCP_FILE ?? defaultConnectionFile());

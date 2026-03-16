import { streamText } from "ai";
import { getConfiguredModel } from "./config";
import type { Provider } from "./provider";

interface SchemeGenerationInput {
  planName: string;
  planDescription: string;
  projectName: string;
  targetRepoPath: string;
  provider?: Provider;
  model?: string;
}

export function generateSchemeStream(input: SchemeGenerationInput) {
  const model = getConfiguredModel(input.provider, input.model);

  const prompt = `<IMPORTANT>
You are being called as an API endpoint. You MUST follow these rules:
1. Do NOT use any tools or try to read files
2. Do NOT ask questions or request permissions
3. Do NOT say "let me check" or "I need access"
4. Start your output DIRECTLY with "## Overview"
5. Output ONLY Markdown content, no conversation
</IMPORTANT>

Generate a detailed technical scheme for this project plan.
Base your scheme on the description. Make reasonable assumptions if details are missing.
Write in the same language as the description.

Project: ${input.projectName}
Repository: ${input.targetRepoPath}
Plan: ${input.planName}

Description:
${input.planDescription || "No description provided."}

---
Output the scheme now:

## Overview
Brief summary of the approach

## Technical Details
Files to modify, functions, data structures, APIs, with code examples

## Key Decisions
Architectural decisions and trade-offs

## Risks & Mitigations
Potential issues and solutions

## Estimated Effort
Breakdown by component`;

  return streamText({
    model,
    prompt,
  });
}

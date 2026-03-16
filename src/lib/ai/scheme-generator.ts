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

  const prompt = `You need to generate a technical scheme for a project plan.

First, explore the project code to understand the codebase:
1. Use Bash to run: ls ${input.targetRepoPath} and find ${input.targetRepoPath} -maxdepth 2 -name "*.go" -o -name "*.ts" -o -name "*.py" -o -name "*.java" | head -30
2. Read key files like README, main entry points, and files related to the plan
3. Then generate a detailed technical scheme based on what you learned

Project: ${input.projectName}
Repository: ${input.targetRepoPath}
Plan: ${input.planName}

Description:
${input.planDescription || "No description provided."}

After reading the code, output a Markdown technical scheme with:
## Overview
## Technical Details (with specific file paths and code from the actual codebase)
## Key Decisions
## Risks & Mitigations
## Estimated Effort

Write in the same language as the description.`;

  return streamText({
    model,
    prompt,
  });
}

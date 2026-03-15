import { streamText } from "ai";
import { getModelId, type Provider } from "./provider";

interface SchemeGenerationInput {
  planName: string;
  planDescription: string;
  projectName: string;
  targetRepoPath: string;
  provider: Provider;
  model?: string;
}

export function generateSchemeStream(input: SchemeGenerationInput) {
  const modelId = getModelId(input.provider, input.model);

  const systemPrompt = `You are a senior software architect. Your task is to generate a detailed technical scheme (plan/proposal) for a software development task.

Output your response in Markdown format with clear sections:
- ## Overview: Brief summary of the approach
- ## Technical Details: Specific implementation approach, technologies, patterns
- ## Key Decisions: Important architectural decisions and trade-offs
- ## Risks & Mitigations: Potential risks and how to mitigate them
- ## Estimated Effort: Rough breakdown of effort

Be specific, actionable, and practical. Reference the target repository path when relevant.`;

  const userPrompt = `Project: ${input.projectName}
Repository: ${input.targetRepoPath}
Plan: ${input.planName}
Description: ${input.planDescription || "No description provided."}

Generate a detailed technical scheme for this plan.`;

  return streamText({
    model: modelId,
    system: systemPrompt,
    prompt: userPrompt,
  });
}

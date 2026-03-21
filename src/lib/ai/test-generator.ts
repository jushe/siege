import { generateTextAuto } from "./generate";
import type { Provider } from "./provider";

interface TaskContext {
  scheduleItemId: string;
  order: number;
  title: string;
  description: string;
  files: Array<{ filePath: string; contentAfter: string }>;
}

interface TestGenerationInput {
  planName: string;
  tasks: TaskContext[];
  targetRepoPath: string;
  provider: Provider;
  model?: string;
  sessionId?: string;
}

interface GeneratedTestCase {
  scheduleItemId: string;
  name: string;
  description: string;
  type: "unit" | "integration" | "e2e";
  generatedCode: string;
  filePath: string;
}

export async function generateTests(
  input: TestGenerationInput
): Promise<GeneratedTestCase[]> {
  const hasChinese = /[\u4e00-\u9fff]/.test(input.planName + input.tasks.map(t => t.title).join(""));
  const lang = hasChinese
    ? "用中文写测试描述。"
    : "Write test descriptions in English.";

  const tasksSummary = input.tasks.map((task) => {
    const fileList = task.files.map((f) => {
      // Show first 100 lines of each file for context
      const lines = f.contentAfter.split("\n");
      const preview = lines.slice(0, 100).join("\n");
      return `#### ${f.filePath}\n\`\`\`\n${preview}${lines.length > 100 ? "\n... (truncated)" : ""}\n\`\`\``;
    }).join("\n\n");
    return `### Task #${task.order}: ${task.title} (scheduleItemId: "${task.scheduleItemId}")\n${task.description || ""}\n\nFiles changed:\n${fileList}`;
  }).join("\n\n---\n\n");

  const result = await generateTextAuto({
    provider: input.provider,
    model: input.model,
    sessionId: input.sessionId,
    system: `You are a senior test engineer. Generate test cases for ACTUAL CODE CHANGES, not just proposals.

${lang}

You will receive completed tasks with their actual source code. Generate focused tests that validate the real implementation.

Rules:
- Each test case MUST include "scheduleItemId" matching the task it tests
- Write tests that can actually compile and run against the provided code
- Focus on: correctness, edge cases, error handling
- Use the project's existing test framework if detectable from file paths
- Generate 2-4 test cases per task (not more)

Output a JSON array of test case objects:
- scheduleItemId: the task ID this test is for (string, MUST match one of the provided IDs)
- name: test function name (string)
- description: what this test validates (string)
- type: "unit" | "integration" | "e2e" (string)
- generatedCode: full test code as a string (string)
- filePath: suggested file path relative to project root (string)

Output ONLY the JSON array, no other text.`,
    prompt: `Project: ${input.targetRepoPath}\nPlan: ${input.planName}\n\n${tasksSummary}\n\nGenerate test cases for these completed tasks based on the actual code.`,
  });

  try {
    const jsonStr = result.text.startsWith("[") ? result.text : result.text.match(/\[[\s\S]*\]/)?.[0];
    if (!jsonStr) throw new Error("No JSON array found in response");
    return JSON.parse(jsonStr);
  } catch {
    throw new Error("Failed to parse test cases from AI response");
  }
}

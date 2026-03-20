import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3002";

async function waitForContent(page: import("@playwright/test").Page) {
  for (let i = 0; i < 30; i++) {
    const len = await page.evaluate(() => document.body.innerText.length);
    if (len > 50) break;
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(300);
}

test.describe("Siege E2E Smoke Tests", () => {
  test("home page loads with project list", async ({ page }) => {
    await page.goto(`${BASE}/zh`);
    await waitForContent(page);
    await expect(page.getByRole("heading", { name: "项目" })).toBeVisible();
    await expect(page.getByText("torque").first()).toBeVisible();
  });

  test("settings page loads with AI providers", async ({ page }) => {
    await page.goto(`${BASE}/zh/settings`);
    await waitForContent(page);
    await expect(page.getByRole("heading", { name: "设置", exact: true })).toBeVisible();
    await expect(page.getByText("Claude Code").first()).toBeVisible();
    await expect(page.getByText("Anthropic (Claude)").first()).toBeVisible();
  });

  test("settings page shows per-step AI config section", async ({ page }) => {
    await page.goto(`${BASE}/zh/settings`);
    await waitForContent(page);
    await expect(page.getByText("各步骤 AI 配置")).toBeVisible();
    await expect(page.getByText("方案生成")).toBeVisible();
    await expect(page.getByText("代码审查")).toBeVisible();
    await expect(page.getByText("任务执行")).toBeVisible();
  });

  test("settings page shows import sources section", async ({ page }) => {
    await page.goto(`${BASE}/zh/settings`);
    await waitForContent(page);
    await expect(page.getByRole("heading", { name: "导入来源" })).toBeVisible();
  });

  test("project detail page loads with plan list", async ({ page }) => {
    await page.goto(`${BASE}/zh`);
    await waitForContent(page);
    await page.getByText("torque").first().click();
    await waitForContent(page);
    await expect(page.getByRole("heading", { name: "计划" })).toBeVisible();
  });

  test("import dialog opens with sidebar sources", async ({ page }) => {
    await page.goto(`${BASE}/zh`);
    await waitForContent(page);
    await page.getByText("torque").first().click();
    await waitForContent(page);

    await page.getByRole("button", { name: "导入" }).click();
    await page.waitForTimeout(1000);

    // Sidebar buttons with source names
    await expect(page.getByRole("button", { name: "Markdown" })).toBeVisible();
    await expect(page.getByRole("button", { name: "GitHub" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Notion" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Jira" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confluence" })).toBeVisible();
    await expect(page.getByRole("button", { name: "飞书" })).toBeVisible();
    await expect(page.getByRole("button", { name: "MCP" })).toBeVisible();
  });

  test("import dialog shows quick setup when clicking unconfigured source", async ({ page }) => {
    await page.goto(`${BASE}/zh`);
    await waitForContent(page);
    await page.getByText("torque").first().click();
    await waitForContent(page);

    await page.getByRole("button", { name: "导入" }).click();
    await page.waitForTimeout(1000);

    // Click on Jira
    await page.getByRole("button", { name: "Jira" }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText("Base URL")).toBeVisible();
  });

  test("plan detail page loads with scheme accordion", async ({ page }) => {
    await page.goto(`${BASE}/zh/projects/7dc717ac-a5b5-4add-8bd5-51a8c0053148/plans/1ea25117-88ed-4cb5-8d0a-bb98fbb33078`);
    await waitForContent(page);
    await expect(page.getByRole("button", { name: "方案", exact: true })).toBeVisible();
    // Should have accordion sections
    const sections = page.locator(".border.rounded-lg.divide-y button").first();
    await expect(sections).toBeVisible();
  });

  test("EN locale works", async ({ page }) => {
    await page.goto(`${BASE}/en`);
    await waitForContent(page);
    await expect(page.getByText("Projects").first()).toBeVisible();
  });

  test("EN settings shows per-step config", async ({ page }) => {
    await page.goto(`${BASE}/en/settings`);
    await waitForContent(page);
    await expect(page.getByText("Per-Step AI Configuration")).toBeVisible();
    await expect(page.getByText("Scheme Generation")).toBeVisible();
    await expect(page.getByText("Code Review")).toBeVisible();
  });
});

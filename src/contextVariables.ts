import type { ContextVariableDefinition } from "./types";

function toDisplayString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function runScriptWithContext(script: string, context: Record<string, string>): string {
  const code = script.trim();
  if (!code) {
    return "";
  }

  const runtimeContext = { ...context };

  try {
    const executor = new Function("context", `"use strict";\n${code}`) as (ctx: Record<string, string>) => unknown;
    const result = executor(runtimeContext);
    if (result !== undefined) {
      return toDisplayString(result);
    }
  } catch {
    // Try expression mode below.
  }

  try {
    const expressionExecutor = new Function("context", `"use strict";\nreturn (${code});`) as (
      ctx: Record<string, string>
    ) => unknown;
    return toDisplayString(expressionExecutor(runtimeContext));
  } catch {
    return "";
  }
}

export function evaluateContextVariableValue(
  variable: Pick<ContextVariableDefinition, "valueSource" | "staticValue" | "scriptContent">,
  context: Record<string, string>
): string {
  if (variable.valueSource === "SCRIPT") {
    return runScriptWithContext(variable.scriptContent ?? "", context);
  }
  return variable.staticValue ?? "";
}

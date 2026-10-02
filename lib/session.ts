export const modes = ["cold-call", "interview", "research"] as const;
export const scenarios = ["saas", "healthcare", "finance", "logistics", "custom"] as const;
export const difficulties = ["easy", "medium", "hard"] as const;

export type Mode = (typeof modes)[number];
export type Scenario = (typeof scenarios)[number];
export type Difficulty = (typeof difficulties)[number];

export type CoachSession = {
  mode: Mode;
  scenario: Scenario;
  difficulty: Difficulty;
  persona: string;
  product: string;
};

export function parseSession(value: unknown): CoachSession | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const mode = raw.mode;
  const scenario = raw.scenario;
  const difficulty = raw.difficulty;
  if (
    typeof mode !== "string" ||
    !modes.includes(mode as Mode) ||
    typeof scenario !== "string" ||
    !scenarios.includes(scenario as Scenario) ||
    typeof difficulty !== "string" ||
    !difficulties.includes(difficulty as Difficulty)
  ) {
    return null;
  }
  return {
    mode: mode as Mode,
    scenario: scenario as Scenario,
    difficulty: difficulty as Difficulty,
    persona: typeof raw.persona === "string" ? raw.persona.slice(0, 400) : "",
    product: typeof raw.product === "string" ? raw.product.slice(0, 400) : "",
  };
}

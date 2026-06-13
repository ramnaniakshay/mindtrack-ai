import { checkSafety } from '../safety.js';

describe('Safety Guardrails Intercept Heuristics', () => {
  test('should pass safe academic messages', () => {
    const result = checkSafety("I am worried about my math exam, but I am doing my revision.");
    expect(result.safe).toBe(true);
  });

  test('should catch explicit distress words', () => {
    const result = checkSafety("I cannot handle this JEE exam anymore, I just want to suicide.");
    expect(result.safe).toBe(false);
    expect(result.message).toContain("crisis");
    expect(result.helplines.length).toBeGreaterThan(0);
  });

  test('should catch self-harm ideation', () => {
    const result = checkSafety("it would be better to end my life instead of failing NEET.");
    expect(result.safe).toBe(false);
    expect(result.message).toContain("crisis");
  });
});

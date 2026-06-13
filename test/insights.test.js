import { analyzeJournalLocally } from '../gemini.js';

describe('Local Journal Analysis Heuristics', () => {
  test('should detect negative sentiment and exam-related triggers', () => {
    const journalText = "I felt very stress today during mock test. I did not solve the physics numericals properly.";
    const analysis = analyzeJournalLocally(journalText);

    expect(analysis.sentiment).toBe("Negative");
    expect(analysis.stressScore).toBeGreaterThan(50);
    expect(analysis.triggers).toContain("Mock Tests");
    expect(analysis.triggers).toContain("Physics / Math Anxiety");
  });

  test('should flag catastrophizing cognitive distortions', () => {
    const journalText = "I will fail the mock exam and my life is ruined.";
    const analysis = analyzeJournalLocally(journalText);

    expect(analysis.cognitiveDistortions).toContain("Catastrophizing (Expecting the worst)");
  });

  test('should analyze happy/positive journal entries', () => {
    const journalText = "I completed my revision chapters early. I feel happy and confident about NEET.";
    const analysis = analyzeJournalLocally(journalText);

    expect(analysis.sentiment).toBe("Positive");
    expect(analysis.stressScore).toBeLessThan(50);
  });
});

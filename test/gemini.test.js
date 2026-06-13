import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  analyzeJournalLocally,
  getGeminiChatResponse,
  getGeminiJournalAnalysis
} from '../gemini.js';

describe('Gemini Wellness Companion & Analyzer Heuristics', () => {
  describe('analyzeJournalLocally', () => {
    test('detects positive emotions and low stress scores', () => {
      const result = analyzeJournalLocally("I am very productive today. I solved JEE chemistry and feel confident.");
      expect(result.sentiment).toBe("Positive");
      expect(result.stressScore).toBeLessThan(50);
      expect(result.triggers).toContain("Physics / Math Anxiety");
    });

    test('detects negative emotions, mock triggers, and catastrophizing', () => {
      const result = analyzeJournalLocally("I got horrible mock test scores. I will fail this exam and my revision is ruined.");
      expect(result.sentiment).toBe("Negative");
      expect(result.stressScore).toBeGreaterThan(50);
      expect(result.triggers).toContain("Mock Tests");
      expect(result.cognitiveDistortions).toContain("Catastrophizing (Expecting the worst)");
    });

    test('detects should statements and peer pressure', () => {
      const result = analyzeJournalLocally("I must study 14 hours because parent expects me to rank high in UPSC.");
      expect(result.cognitiveDistortions).toContain("Should Statements (Rigid rules)");
      expect(result.triggers).toContain("Peer / Family Pressure");
    });
  });

  describe('Vertex AI / Gemini API Integration Mocks', () => {
    let originalFetch;

    beforeEach(() => {
      originalFetch = global.fetch;
      // Clear process env for clean API keys check
      delete process.env.GEMINI_API_KEY;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    test('getGeminiChatResponse falls back to local simulation if no API key exists', async () => {
      const response = await getGeminiChatResponse([], "hello", "");
      expect(response).toContain("FocusNest");
    });

    test('getGeminiChatResponse uses fetch and resolves AI reply if key is set', async () => {
      process.env.GEMINI_API_KEY = "test-key-123";
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: "Hello from mock AI FocusNest!" }]
            }
          }]
        })
      });

      const response = await getGeminiChatResponse([], "hi", "JEE");
      expect(response).toBe("Hello from mock AI FocusNest!");
      expect(global.fetch).toHaveBeenCalled();
    });

    test('getGeminiChatResponse falls back to local simulation on API error response', async () => {
      process.env.GEMINI_API_KEY = "test-key-123";
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve("Rate limited")
      });

      const response = await getGeminiChatResponse([], "Hi FocusNest, I feel tired", "NEET");
      expect(response).toContain("marathon"); // Mock NEET fallback
      expect(global.fetch).toHaveBeenCalled();
    });

    test('getGeminiJournalAnalysis resolves Gemini structured analysis correctly', async () => {
      process.env.GEMINI_API_KEY = "test-key-123";

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  sentiment: "Negative",
                  stressScore: 85,
                  triggers: ["Mock Tests"],
                  cognitiveDistortions: ["Catastrophizing"]
                })
              }]
            }
          }]
        })
      });

      const result = await getGeminiJournalAnalysis("I failed mock exam");
      expect(result.sentiment).toBe("Negative");
      expect(result.stressScore).toBe(85);
      expect(result.triggers).toContain("Mock Tests");
      expect(result.cognitiveDistortions).toContain("Catastrophizing");
    });

    test('getGeminiJournalAnalysis falls back to local heuristics on parsing failure', async () => {
      process.env.GEMINI_API_KEY = "test-key-123";

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          candidates: [{
            content: {
              parts: [{ text: "this is not JSON" }]
            }
          }]
        })
      });

      const result = await getGeminiJournalAnalysis("I failed chemistry mock test");
      expect(result.sentiment).toBe("Negative");
      expect(result.triggers).toContain("Mock Tests");
    });
  });
});

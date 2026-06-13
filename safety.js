export function checkSafety(text) {
  if (!text) return { safe: true };

  const triggers = [
    /suicide/i,
    /kill\s+myself/i,
    /end\s+my\s+life/i,
    /giving\s+up\s+completely/i,
    /harm\s+myself/i,
    /want\s+to\s+die/i,
    /self-harm/i,
    /hanging\s+myself/i,
    /cutting\s+myself/i,
    /overdosing/i,
    /want\s+to\s+end\s+it/i
  ];

  const matched = triggers.some(regex => regex.test(text));
  if (matched) {
    return {
      safe: false,
      message: "It sounds like you are going through an extremely difficult moment, and we want you to be safe. Since I am an AI assistant and not a crisis counselor, I cannot provide emergency support. Please connect with dedicated professionals who want to help you through this right now. You are not alone.",
      helplines: [
        { name: "Kiran Mental Health Helpline", number: "1800-599-0019 (24/7, Toll-Free)" },
        { name: "AASRA Helpline", number: "+91-9820466726 (24/7)" },
        { name: "Vandrevala Foundation", number: "+91-9999666555 (24/7)" },
        { name: "Tele-MANAS", number: "14416 or 1800-891-4416 (24/7)" }
      ]
    };
  }
  return { safe: true };
}

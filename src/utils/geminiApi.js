// Exponential Backoff Fetch for Gemini API
export const fetchGeminiWithBackoff = async (prompt, systemPrompt) => {
  // API Key should be set via environment variable
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file or environment variables.');
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          suggestion: { type: "STRING" },
          suggestedPrice: { type: "NUMBER" },
          reason: { type: "STRING" }
        },
        required: ["suggestion", "suggestedPrice", "reason"]
      }
    }
  };

  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < 6; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(text);
    } catch (error) {
      if (i === 5) throw error;
      await new Promise(resolve => setTimeout(resolve, delays[i]));
    }
  }
};

function localAcademyResponse({ courseTitle = 'this course', topic = '', promptType = 'lesson', userMessage = '' } = {}) {
  const focus = topic || userMessage || 'the current lesson';
  return {
    provider: 'sp-worldtech-academy-safe-response',
    content: `SP WorldTech AI Academy Assistant\n\nCourse: ${courseTitle}\nFocus: ${focus}\nType: ${promptType}\n\nGoogle AI Studio/Gemini is not available right now or the free-tier limit was reached.\n\nStudy guide:\n1. Read the lesson objective carefully.\n2. Practice the examples step by step.\n3. Complete the assignment before moving forward.\n4. Submit your work for SP WorldTech review when required.\n\nTry the AI tutor again later if this message appeared because of quota/rate limit.`
  };
}

function buildPrompt({ courseTitle = 'Coding', topic = '', promptType = 'lesson', userMessage = '' } = {}) {
  const focus = topic || userMessage || 'the selected lesson';
  return `You are the SP WorldTech AI Coding Academy tutor. Create a professional ${promptType} for the course "${courseTitle}" about "${focus}". Use clear beginner-friendly steps, practical examples, one short exercise, and a short review checklist. Do not claim to issue certificates or process payments.`;
}

async function generateAcademyContent(payload = {}) {
  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY || process.env.GEMINI_API_KEY || '';
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  if (!apiKey) return localAcademyResponse(payload);

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(payload) }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 900 }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 429) return localAcademyResponse({ ...payload, promptType: `${payload.promptType || 'lesson'} (Gemini free-tier busy)` });
      throw new Error(data.error?.message || data.message || `Google AI Studio request failed with ${response.status}`);
    }
    const content = data.candidates?.[0]?.content?.parts?.map(part => part.text).filter(Boolean).join('\n') || '';
    if (!content) return localAcademyResponse(payload);
    return { provider: 'google-ai-studio-gemini', content };
  } catch (error) {
    return { ...localAcademyResponse(payload), error: error.message };
  }
}

async function generateTutorResponse(payload = {}) {
  return generateAcademyContent(payload);
}

module.exports = { generateAcademyContent, generateTutorResponse };

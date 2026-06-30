const DEFAULT_COPILOT_URL = 'https://api.openwebninja.com/copilot/copilot';
const DEFAULT_GEMINI_URL = 'https://api.openwebninja.com/gemini/chat';
const DEFAULT_AI_ANSWERS_URL = 'https://api.openwebninja.com/ai-answers/answer';
const DEFAULT_CHATGPT_URL = 'https://api.openwebninja.com/chatgpt/chat';

function getKey() {
  return process.env.OPENWEBNINJA_API_KEY || process.env.OPENWEBNINJA_AI_API_KEY || '';
}

function pickEndpoint(provider = 'copilot') {
  const p = String(provider || '').toLowerCase();
  if (p.includes('answer') || p.includes('multi')) return process.env.OPENWEBNINJA_AI_ANSWERS_URL || process.env.OPENWEBNINJA_AI_URL || DEFAULT_AI_ANSWERS_URL;
  if (p.includes('gemini')) return process.env.OPENWEBNINJA_GEMINI_URL || process.env.OPENWEBNINJA_AI_URL || DEFAULT_GEMINI_URL;
  if (p.includes('chatgpt') || p.includes('gpt')) return process.env.OPENWEBNINJA_CHATGPT_URL || process.env.OPENWEBNINJA_AI_URL || DEFAULT_CHATGPT_URL;
  return process.env.OPENWEBNINJA_COPILOT_URL || process.env.OPENWEBNINJA_AI_URL || DEFAULT_COPILOT_URL;
}

function extractText(data) {
  if (!data) return '';
  if (typeof data === 'string') return data;
  return data.answer || data.reply_text || data.response || data.message || data.text || data.result || data.output || data.content ||
    data.choices?.[0]?.message?.content || data.data?.answer || data.data?.reply_text || data.data?.response || data.data?.message || data.data?.text || data.data?.content || '';
}

function buildProfessionalPrompt({ context = 'general', message = '', user = null, system = '' }) {
  return `${system || 'You are SP WorldTech AI Agent.'}\n\nBrand: SP WorldTech — The World 🌎 Web, Applications & Software Solutions.\nTone: professional, clear, safe, helpful.\nContext: ${context}.\nRules: Do not promise guaranteed jobs, guaranteed payments, banking approval, card/account creation, crypto trades, or withdrawals. Do not claim to be human. For sensitive payment, wallet, withdrawal, bank account, virtual card, KYC, service failure, account blocking, crypto, or complaint issues, recommend escalation to admin/staff support.\nUser: ${user?.fullName || 'SP WorldTech user'}\nQuestion/request: ${message}`;
}

async function callOpenWebNinjaAI({ provider = 'copilot', context = 'general', message = '', user = null, system = '', extra = {} }) {
  const apiKey = getKey();
  if (!apiKey) {
    const err = new Error('SP WorldTech AI assistant is not available yet.');
    err.statusCode = 503;
    throw err;
  }
  if (!message || !String(message).trim()) {
    const err = new Error('Message is required.');
    err.statusCode = 400;
    throw err;
  }
  const endpoint = pickEndpoint(provider);
  const prompt = buildProfessionalPrompt({ context, message, user, system });
  const payload = { prompt, message: prompt, input: prompt, query: prompt, context, provider, ...extra };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'x-api-key': apiKey,
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.message || data.error || data.detail || `SP WorldTech AI request failed with ${response.status}`);
      err.statusCode = response.status;
      throw err;
    }
    const content = extractText(data);
    if (!content) {
      const err = new Error('SP WorldTech AI returned an empty response. Please try again shortly.');
      err.statusCode = 502;
      throw err;
    }
    return { content, provider, endpointUsed: endpoint, raw: data };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { callOpenWebNinjaAI, buildProfessionalPrompt };

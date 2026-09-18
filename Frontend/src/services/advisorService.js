/**
 * GRAMSAARTHI — AI Advisor Service
 *
 * Handles all AI advisor logic.
 * Currently uses mock responses for SIH prototype.
 * TODO: Replace getAIResponse() internals with LLM API call.
 */

import { apiFetch, isApiEnabled } from './api.js';

// ── Mock Responses ─────────────────────────────────────────────────────────────
const AI_RESPONSES = {
  dairy: `Based on your location in Khajuri Kalan (Sehore district, MP), **Dairy farming** looks very promising! 🐄

**Key insights:**
- High local milk demand with nearby urban markets
- Moderate competition — only 4–5 active dairy farms within 10km
- NABARD DEDS scheme available: up to ₹7L with 25% subsidy
- Estimated profit: ₹40,000–₹60,000/month after 6 months

With ₹1 lakh margin, you could finance a project of up to ₹10 lakh.`,

  loan: `With a margin capital of **₹1,00,000**, here's your estimated loan capacity:

- **Your Contribution:** ₹1,00,000 (10%)
- **Potential Loan:** ₹9,00,000 (90%)
- **Total Project Size:** ₹10,00,000

**Recommended Scheme:** PM Mudra Yojana – Tarun
- Interest: 7% p.a.
- Tenure: 5 years
- Est. EMI: ₹17,822/month

Would you like me to find matching government schemes?`,

  scheme: `Based on your profile, here are the **best matching schemes:**

**1. PM Mudra Yojana – Tarun** (92% match)
- Loan up to ₹10 lakh, no collateral
- Interest: 7–9% p.a.

**2. NABARD DEDS** (87% match)
- For dairy entrepreneurs
- 25% capital subsidy

**3. Stand-Up India** (71% match)
- If SC/ST or woman entrepreneur

Shall I check your eligibility for PM Mudra Tarun?`,

  default: `Namaste! 🙏 I'm your GRAMSAARTHI AI Business Advisor.

I can help you with:
- Finding the right business for your location
- Calculating loan eligibility
- Government scheme recommendations
- Market analysis for your village
- Generating your project report (DPR)

What would you like to know?`,
};

/**
 * Simple keyword-based mock router.
 * TODO: Replace with LLM API call — send userProfile + question to FastAPI.
 */
function mockGetResponse(question, userProfile = {}) {
  const q = question.toLowerCase();
  const lang = (userProfile?.language || 'en').toLowerCase();

  // Combined Business + Scheme
  if ((q.includes('scheme') || q.includes('yojana') || q.includes('योजना') || q.includes('યોજના')) &&
      (q.includes('dairy') || q.includes('poultry') || q.includes('business') || q.includes('व्यवसाय') || q.includes('ધંધો'))) {
    if (lang === 'hi') {
      return `**डेयरी व ग्रामीण उद्यम हेतु प्रमुख सरकारी योजनाएं:**\n\n1. **KCC (किसान क्रेडिट कार्ड):** 4% रियायती ब्याज दर पर ₹3 लाख तक ऋण।\n2. **राष्ट्रीय पशुधन मिशन (NLM):** 50% तक पूंजीगत सब्सिडी।\n3. **PMEGP:** ग्रामीण क्षेत्र में 25%–35% मार्जिन मनी सब्सिडी।\n4. **मुद्रा योजना (PMMY):** बिना गारंटी ₹20 लाख तक ऋण।`;
    }
    if (lang === 'gu') {
      return `**ડેરી અને ગ્રામીણ વ્યવસાય માટે મુખ્ય સરકારી યોજનાઓ:**\n\n૧. **KCC (કિસાન ક્રેડિટ કાર્ડ):** ૪% વ્યાજે કાર્યકારી મૂડી લોન.\n૨. **NLM:** પશુપાલન માટે ૫૦% સુધી સબસિડી.\n૩. **PMEGP:** ૨૫% થી ૩૫% માર્જિન મની સબસિડી.\n૪. **પીએમ મુદ્રા લોન:** કોઈપણ ગેરંટી વિના ₹૨૦ લાખ સુધી લોન.`;
    }
    return `**Matching Government Schemes for Your Venture:**\n\n1. **Kisan Credit Card (KCC):** Working capital at concessional 4% interest rate.\n2. **National Livestock Mission (NLM):** Up to 50% capital subsidy for animal husbandry & poultry.\n3. **PMEGP:** 25%–35% margin money subsidy for rural enterprises.\n4. **PM Mudra Yojana (PMMY):** Collateral-free loans up to ₹20 Lakh.`;
  }

  // Business recommendation / start
  if (q.includes('what business') || q.includes('which business') || q.includes('start') || q.includes('शुरू') || q.includes('કયો વ્યવસાય')) {
    if (lang === 'hi') {
      return `**आपके क्षेत्र के लिए शीर्ष अनुशंसित व्यवसाय:**\n\n1. **डेयरी फार्मिंग:** निवेश ₹8–12 लाख, मासिक आय ₹40,000–₹60,000।\n2. **आटा व मसाला चक्की:** निवेश ₹1–3 लाख, उच्च दैनिक मांग, मासिक आय ₹20,000–₹40,000।\n3. **पोल्ट्री फार्मिंग:** निवेश ₹5–8 लाख, 6 सप्ताह का तेज चक्र।\n4. **डिजिटल सेवा केंद्र (CSC):** निवेश ₹50,000–₹1.5 लाख।`;
    }
    if (lang === 'gu') {
      return `**તમારા વિસ્તાર માટે શ્રેષ્ઠ વ્યવસાયિક તકો:**\n\n૧. **ડેરી ફાર્મિંગ:** રોકાણ ₹૮–૧૨ લાખ, માસિક નફો ₹૪૦,૦૦૦–₹૬૦,૦૦૦.\n૨. **લોટ-મસાલા ઘંટી:** રોકાણ ₹૧–૩ લાખ, માસિક નફો ₹૨૦,૦૦૦–₹૪૦,૦૦૦.\n૩. **મરઘાં પાલન (Poultry):** રોકાણ ₹૫–૮ લાખ.\n૪. **ડિજિટલ સેવા કેન્દ્ર:** રોકાણ ₹૫૦,૦૦૦–₹૧.૫ લાખ.`;
    }
    return `**Top Recommended Business Opportunities:**\n\n1. **Commercial Dairy Farming:** Setup ₹8–12 Lakh, Monthly profit ₹40,000–₹60,000.\n2. **Flour & Spice Processing Unit:** Setup ₹1–3 Lakh, Steady daily demand, Profit ₹20,000–₹40,000/month.\n3. **Broiler Poultry Farming:** Setup ₹5–8 Lakh, Quick 6-week turnaround cycles.\n4. **Digital CSC Center:** Setup ₹50,000–₹1.5 Lakh, High local utility demand.`;
  }

  // Capital / budget based queries
  if (q.includes('lakh') || q.includes('2 lakh') || q.includes('capital') || q.includes('cost') || q.includes('लाख') || q.includes('મૂડી')) {
    return `**Business Ideas for ₹1–3 Lakh Capital:**\n\n- **Food Processing / Flour Mill:** Fast payback, daily cashflow\n- **Retail Kirana Store:** Steady village consumer base\n- **Digital Service Center (CSC):** Low overhead, steady commission\n- **Tailoring & Garment Unit:** High margin seasonal demand\n\n💡 You can multiply your working capital with Mudra Shishu/Kishore loans!`;
  }

  // Profitability
  if (q.includes('profit') || q.includes('कमाई') || q.includes('मुनाफा') || q.includes('નફો')) {
    return `**Most Profitable Rural Ventures:**\n\n1. **Dairy Farming:** ₹40,000–₹60,000/month\n2. **Rural Transport / Loader:** ₹35,000–₹55,000/month\n3. **Broiler Poultry:** ₹30,000–₹45,000/month\n4. **Food & Spice Processing:** ₹20,000–₹40,000/month`;
  }

  // Specific businesses
  if (q.includes('dairy') || q.includes('milk') || q.includes('cow') || q.includes('गाय') || q.includes('दूध') || q.includes('ડેરી'))
    return AI_RESPONSES.dairy;
  if (q.includes('poultry') || q.includes('chicken') || q.includes('मुर्गी') || q.includes('મરઘાં'))
    return `**Poultry Farming Opportunity:**\n\n- Investment: ₹5–8 Lakh (Shed, feeders, initial chicks, feed)\n- Est. Profit: ₹30,000–₹45,000 per 6-week batch\n- Demand: High local meat and egg consumption\n- Schemes: NLM provides up to 50% capital subsidy!`;
  if (q.includes('loan') || q.includes('borrow') || q.includes('money') || q.includes('₹') || q.includes('ऋण') || q.includes('લોન'))
    return AI_RESPONSES.loan;
  if (q.includes('scheme') || q.includes('government') || q.includes('mudra') || q.includes('योजना') || q.includes('યોજના'))
    return AI_RESPONSES.scheme;

  return AI_RESPONSES.default;
}

/**
 * Ask the AI Advisor a question.
 * @param {string} question - User's question
 * @param {object} userProfile - User profile from AppContext (real data, not {})
 * @param {Array}  conversationHistory - Previous messages [{role, text}, ...] for multi-turn context
 * @param {object} [schemeContext] - Active government scheme context if inquiring about a specific scheme
 * @returns {Promise<string>} AI response text
 */
export async function askAIAdvisor(question, userProfile = {}, conversationHistory = [], schemeContext = null) {
  if (isApiEnabled) {
    // Send real profile + active scheme context + conversation history to FastAPI → Gemini
    const data = await apiFetch('/api/advisor/ask', {
      method: 'POST',
      body: JSON.stringify({
        question,
        user_profile: userProfile,
        scheme_context: schemeContext,
        conversation_history: conversationHistory,
      }),
    });
    if (data && typeof data === 'object') {
      return {
        response: data.response || '',
        missing_fields: data.missing_fields || [],
        updated_profile_fields: data.updated_profile_fields || null,
        completion_percentage: data.completion_percentage ?? null,
        ml_used: !!data.ml_used,
        gemini_used: !!data.gemini_used,
        scheme_used: !!data.scheme_used,
        context_summary: data.context_summary || null,
      };
    }
    return {
      response: mockGetResponse(question, userProfile),
      missing_fields: [],
      updated_profile_fields: null,
      completion_percentage: null,
      context_summary: null,
    };
  }
  // Mock: simulate network delay
  await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
  return {
    response: mockGetResponse(question, userProfile),
    missing_fields: [],
    updated_profile_fields: null,
    completion_percentage: null,
    context_summary: null,
  };
}

/**
 * Ask AI Advisor via dedicated voice endpoint /api/advisor/voice.
 *
 * @param {string} transcript - Speech-to-text transcribed query text
 * @param {object} userProfile - User profile from AppContext
 * @param {Array}  conversationHistory - Previous messages [{role, text}, ...]
 * @param {object} [schemeContext] - Active government scheme context
 * @returns {Promise<object>} AI response structure
 */
export async function askAIAdvisorVoice(transcript, userProfile = {}, conversationHistory = [], schemeContext = null) {
  if (isApiEnabled) {
    const data = await apiFetch('/api/advisor/voice', {
      method: 'POST',
      body: JSON.stringify({
        transcript,
        user_profile: userProfile,
        scheme_context: schemeContext,
        conversation_history: conversationHistory,
      }),
    });
    if (data && typeof data === 'object') {
      return {
        response: data.response || '',
        missing_fields: data.missing_fields || [],
        updated_profile_fields: data.updated_profile_fields || null,
        completion_percentage: data.completion_percentage ?? null,
        ml_used: !!data.ml_used,
        gemini_used: !!data.gemini_used,
        scheme_used: !!data.scheme_used,
        context_summary: data.context_summary || null,
      };
    }
    return {
      response: mockGetResponse(transcript, userProfile),
      missing_fields: [],
      updated_profile_fields: null,
      completion_percentage: null,
      context_summary: null,
    };
  }
  return askAIAdvisor(transcript, userProfile, conversationHistory, schemeContext);
}

/**
 * Get the default greeting message when AI Advisor opens.
 */
export function getDefaultGreeting(user) {
  return AI_RESPONSES.default;
}

/**
 * Safe markdown-to-text parser.
 * Converts **bold**, - bullet lines, and newlines into structured React-renderable segments.
 * Does NOT use dangerouslySetInnerHTML.
 *
 * @param {string} text - Raw response text
 * @returns {Array<{type: 'text'|'bold'|'bullet'|'break', content: string}>}
 */
export function parseMarkdownSafe(text) {
  const segments = [];
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.trim() === '') {
      segments.push({ type: 'break' });
      continue;
    }

    const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
    const content = isBullet ? line.trim().replace(/^[-•]\s*/, '') : line;

    // Parse inline bold: **text**
    const parts = content.split(/(\*\*.*?\*\*)/g);
    const inlineParts = parts.map(p => {
      if (p.startsWith('**') && p.endsWith('**')) {
        return { type: 'bold', content: p.slice(2, -2) };
      }
      return { type: 'text', content: p };
    });

    if (isBullet) {
      segments.push({ type: 'bullet', parts: inlineParts });
    } else {
      segments.push({ type: 'line', parts: inlineParts });
    }
  }
  return segments;
}

export const AI_SUGGESTIONS = [
  'Which business is best for my village?',
  'Am I eligible for a bank loan?',
  'What are the risks and mitigations for my venture?',
  'Give me an executive summary of my project',
  'What is my next recommended roadmap step?',
  'Which government scheme suits my profile?',
];

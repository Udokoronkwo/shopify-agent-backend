// Shopify AI Agent Backend v4 - Full POD Pipeline
// Trend → Design → Printify → Shopify → TikTok

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk').default;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CONFIG ==========
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'ud-9851336705.myshopify.com';
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const SHOPIFY_SCOPES = 'read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,read_customers,write_customers';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

let SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || null;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ========== TIKTOK CONFIG ==========
const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET;
let TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN || null;
let TIKTOK_OPEN_ID = null;

// ========== TIKTOK LOGIN FLOW ==========
app.get('/connect-tiktok', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Connect TikTok - UD Store Agent</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:system-ui,sans-serif;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;}
    .card{background:#111;border:1px solid #333;border-radius:16px;padding:40px;max-width:480px;text-align:center;}
    .logo{width:80px;height:80px;background:#96bf48;border-radius:20px;display:flex;align-items:center;justify-content:center;font-weight:800;color:#000;font-size:36px;margin:0 auto 20px;}
    h1{font-size:24px;margin-bottom:8px;}
    p{color:#888;line-height:1.6;margin-bottom:24px;}
    .btn{display:inline-block;background:linear-gradient(45deg,#FF0050,#00F2EA);color:#fff;padding:14px 28px;border-radius:30px;text-decoration:none;font-weight:700;font-size:16px;}
    .status{margin-top:20px;padding:12px;border-radius:8px;font-size:13px;}
    .status.connected{background:#0a3a0a;color:#7ed957;border:1px solid #2a6a2a;}
    .status.disconnected{background:#3a1a1a;color:#f09595;border:1px solid #6a2a2a;}
  </style></head>
  <body><div class="card">
    <div class="logo">U</div>
    <h1>UD Store Agent</h1>
    <p>Connect your TikTok Business account to enable AI-powered video posting for your store.</p>
    <a href="/auth/tiktok" class="btn">🎵 Connect TikTok</a>
    <div class="status ${TIKTOK_ACCESS_TOKEN ? 'connected' : 'disconnected'}">
      ${TIKTOK_ACCESS_TOKEN ? '✅ TikTok account connected' : '⚠️ Not connected yet'}
    </div>
  </div></body></html>`);
});

app.get('/auth/tiktok', (req, res) => {
  const csrfState = Math.random().toString(36).substring(2);
  const redirectUri = `${APP_URL}/auth/tiktok/callback`;
  const scope = 'user.info.basic,video.publish,video.upload';
  const authUrl = `https://www.tiktok.com/v2/auth/authorize?` +
    `client_key=${TIKTOK_CLIENT_KEY}&` +
    `scope=${encodeURIComponent(scope)}&` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${csrfState}`;
  res.redirect(authUrl);
});

app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  if (error) {
    return res.send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#1a0a0a;color:#f09595;">
      <h1>❌ TikTok Auth Failed</h1>
      <p>${error}: ${error_description || ''}</p>
      <a href="/connect-tiktok" style="color:#fff;">← Try again</a>
    </body></html>`);
  }
  if (!code) return res.status(400).send('Missing authorization code');
  try {
    const tokenResponse = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${APP_URL}/auth/tiktok/callback`
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    TIKTOK_ACCESS_TOKEN = tokenResponse.data.access_token;
    TIKTOK_OPEN_ID = tokenResponse.data.open_id;
    console.log('✅ TikTok connected! Open ID:', TIKTOK_OPEN_ID);
    res.send(`<!DOCTYPE html><html><head><title>TikTok Connected!</title>
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{font-family:system-ui,sans-serif;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;}
      .card{background:#0a3a0a;border:1px solid #2a6a2a;border-radius:16px;padding:40px;max-width:520px;text-align:center;}
      h1{color:#7ed957;font-size:32px;margin-bottom:8px;}
      .check{font-size:60px;margin-bottom:16px;}
      p{color:#c8e8c0;line-height:1.6;}
      code{display:block;background:#000;padding:12px;margin:16px 0;border-radius:8px;font-size:11px;word-break:break-all;color:#7ed957;}
      .btn{display:inline-block;background:#96bf48;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:16px;}
    </style></head>
    <body><div class="card">
      <div class="check">✅</div>
      <h1>TikTok Connected!</h1>
      <p>Your UD Store Agent is now linked to your TikTok Business account.</p>
      <p>Open ID:</p>
      <code>${TIKTOK_OPEN_ID}</code>
      <p>Save this token in Railway as <strong>TIKTOK_ACCESS_TOKEN</strong>:</p>
      <code>${TIKTOK_ACCESS_TOKEN}</code>
      <a href="/connect-tiktok" class="btn">← Back to Dashboard</a>
    </div></body></html>`);
  } catch (err) {
    console.error('TikTok OAuth error:', err.response?.data || err.message);
    res.status(500).send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#1a0a0a;color:#f09595;">
      <h1>❌ Token Exchange Failed</h1>
      <pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>
    </body></html>`);
  }
});

app.get('/api/tiktok/status', (req, res) => {
  res.json({ connected: !!TIKTOK_ACCESS_TOKEN, open_id: TIKTOK_OPEN_ID });
});

// ========== LEGAL PAGES ==========
app.get('/terms', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Terms of Service - UD Store</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.6;">
  <h1>Terms of Service</h1>
  <p><strong>UD Store</strong> ("we", "our", "us") operates this AI agent service. By using our service, you agree to these terms.</p>
  <h2>1. Service</h2>
  <p>This service is an AI-powered agent that assists with managing the UD Store Shopify store and posting marketing content.</p>
  <h2>2. Acceptable Use</h2>
  <p>You agree to use this service lawfully and not engage in fraudulent or harmful activity.</p>
  <h2>3. Limitation of Liability</h2>
  <p>This service is provided "as is" without warranties. We are not liable for any damages from your use of the service.</p>
  <h2>4. Contact</h2>
  <p>Email: okoronkwoudochukwu742@gmail.com</p>
  <p><em>Last updated: ${new Date().toLocaleDateString()}</em></p>
  </body></html>`);
});

app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Privacy Policy - UD Store</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.6;">
  <h1>Privacy Policy</h1>
  <p><strong>UD Store</strong> respects your privacy. This policy explains how we handle data.</p>
  <h2>1. Data We Collect</h2>
  <p>We collect Shopify store data (products, orders) and TikTok content metadata only for the purpose of managing your store.</p>
  <h2>2. How We Use It</h2>
  <p>Data is used solely to power the AI agent's features. We do not sell or share your data.</p>
  <h2>3. Storage</h2>
  <p>Data is stored securely on Railway and Anthropic infrastructure.</p>
  <h2>4. Your Rights</h2>
  <p>You can request data deletion at any time by contacting us.</p>
  <h2>5. Contact</h2>
  <p>Email: okoronkwoudochukwu742@gmail.com</p>
  <p><em>Last updated: ${new Date().toLocaleDateString()}</em></p>
  </body></html>`);
});

// ========== TIKTOK URL VERIFICATION ==========
app.get('/tiktokCiTHepTjzowws82Q55YMYSvJscv4JfET.txt', (req, res) => {
  res.type('text/plain');
  res.send('tiktok-developers-site-verification=CiTHepTjzowws82Q55YMYSvJscv4JfET');
});

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    version: 'v4 - Full POD Pipeline',
    store: SHOPIFY_STORE,
    shopify_connected: !!SHOPIFY_ACCESS_TOKEN,
    claude_connected: !!ANTHROPIC_API_KEY,
    openai_connected: !!OPENAI_API_KEY,
    printify_connected: !!PRINTIFY_API_KEY,
    printify_shop_id: PRINTIFY_SHOP_ID || null,
    tiktok_connected: !!TIKTOK_ACCESS_TOKEN,
    capabilities: {
      trend_discovery: !!ANTHROPIC_API_KEY,
      product_ideation: !!ANTHROPIC_API_KEY,
      design_generation: !!OPENAI_API_KEY,
      photo_generation: !!OPENAI_API_KEY,
      printify_upload: !!PRINTIFY_API_KEY,
      printify_create_product: !!(PRINTIFY_API_KEY && PRINTIFY_SHOP_ID),
      printify_publish: !!(PRINTIFY_API_KEY && PRINTIFY_SHOP_ID),
      shopify_publish: !!SHOPIFY_ACCESS_TOKEN,
      tiktok_post: !!TIKTOK_ACCESS_TOKEN,
    },
    message: 'UD Store Agent v4 - Full POD Pipeline'
  });
});

// ========== SHOPIFY OAUTH ==========
app.get('/auth/shopify', (req, res) => {
  const redirectUri = `${APP_URL}/auth/callback`;
  res.redirect(`https://${SHOPIFY_STORE}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${SHOPIFY_SCOPES}&redirect_uri=${redirectUri}`);
});

app.get('/auth/callback', async (req, res) => {
  const { code, shop } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    const r = await axios.post(`https://${shop || SHOPIFY_STORE}/admin/oauth/access_token`,
      { client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, code });
    SHOPIFY_ACCESS_TOKEN = r.data.access_token;
    res.send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#0a150a;color:#96bf48;">
      <h1>✅ Shopify Connected!</h1>
      <p>Save in Railway as SHOPIFY_ACCESS_TOKEN:</p>
      <code style="background:#1a2e1a;padding:12px;display:block;margin:20px;border-radius:8px;word-break:break-all;">${SHOPIFY_ACCESS_TOKEN}</code>
    </body></html>`);
  } catch (err) {
    res.status(500).send('OAuth failed: ' + (err.response?.data?.error_description || err.message));
  }
});

// ========== HELPERS ==========
async function shopifyRequest(endpoint, method = 'GET', data = null) {
  if (!SHOPIFY_ACCESS_TOKEN) throw new Error('Shopify not connected');
  const config = {
    method, url: `https://${SHOPIFY_STORE}/admin/api/2024-10/${endpoint}`,
    headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN, 'Content-Type': 'application/json' },
  };
  if (data) config.data = data;
  return (await axios(config)).data;
}

async function printifyRequest(endpoint, method = 'GET', data = null) {
  if (!PRINTIFY_API_KEY) throw new Error('Printify not connected');
  const config = {
    method, url: `https://api.printify.com/v1/${endpoint}`,
    headers: { 'Authorization': `Bearer ${PRINTIFY_API_KEY}`, 'Content-Type': 'application/json' },
  };
  if (data) config.data = data;
  return (await axios(config)).data;
}

function getClaude() {
  if (!ANTHROPIC_API_KEY) throw new Error('Anthropic not configured');
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

function extractJSON(text) {
  if (!text) return null;
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch (e) {}
  }
  const matches = [...text.matchAll(/\{[\s\S]*?\}/g)];
  if (matches.length > 0) {
    const sorted = matches.map(m => m[0]).sort((a, b) => b.length - a.length);
    for (const candidate of sorted) {
      try { return JSON.parse(candidate); } catch (e) {}
    }
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)); } catch (e) {}
  }
  return null;
}

function getAllText(content) {
  if (!Array.isArray(content)) return '';
  return content.filter(c => c.type === 'text').map(c => c.text).join('\n');
}

// ========== SHOPIFY DATA ENDPOINTS ==========
app.get('/api/products', async (req, res) => {
  try { res.json(await shopifyRequest('products.json?limit=50')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/orders', async (req, res) => {
  try { res.json(await shopifyRequest('orders.json?status=any&limit=50')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/customers', async (req, res) => {
  try { res.json(await shopifyRequest('customers.json?limit=50')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== TREND DISCOVERY ==========
app.post('/api/trends/discover', async (req, res) => {
  try {
    const { count = 5, focus = 'all niches' } = req.body;
    const claude = getClaude();
    const r = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2500,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `You are a trend research bot. Use web search to find the TOP ${count} TRENDING product opportunities in ${focus} that someone could sell online TODAY.

Search the web for:
- TikTok viral trends and hashtags
- Google Trends rising searches
- Etsy bestsellers (last 30 days)
- Amazon Movers & Shakers
- Reddit communities discussing buying decisions
- Pop culture moments / news driving demand

After researching, you MUST respond with ONLY a single JSON object — no preamble, no explanation, no markdown formatting, no code fences. Just raw JSON starting with { and ending with }.

The JSON structure MUST be:
{
  "trends": [
    {
      "name": "Trend name",
      "category": "Sports OR Fashion OR Tech OR Beauty OR Home OR Pop Culture OR Hobbies",
      "why_hot": "1-2 sentences why it is trending RIGHT NOW",
      "demand_level": "Exploding OR High OR Rising",
      "competition": "Low OR Medium OR High",
      "best_fulfillment": "Print-on-Demand OR Dropshipping OR Digital OR Wholesale OR Affiliate",
      "fulfillment_reason": "Why this method is best for this trend",
      "product_examples": ["product 1", "product 2", "product 3"],
      "target_audience": "demographic + interests",
      "estimated_margin": "Low OR Medium OR High",
      "urgency": "Buy NOW OR Plan Soon OR Long-term"
    }
  ]
}

CRITICAL: Output ONLY the JSON object. Nothing else.`
      }]
    });
    const fullText = getAllText(r.content);
    const data = extractJSON(fullText);
    if (!data || !data.trends) {
      console.error('Trend parse failed. Response:', fullText.substring(0, 500));
      return res.json({ trends: [], error: 'Could not parse trends', debug: fullText.substring(0, 300) });
    }
    res.json(data);
  } catch (err) {
    console.error('Trend error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== PRODUCT IDEATION ==========
app.post('/api/trends/ideate', async (req, res) => {
  try {
    const { trend, fulfillmentMethod = 'Print-on-Demand' } = req.body;
    if (!trend) return res.status(400).json({ error: 'trend required' });
    const trendDesc = typeof trend === 'object' ? `${trend.name}. ${trend.why_hot || ''}. Audience: ${trend.target_audience || 'general'}.` : trend;
    const claude = getClaude();
    const r = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2500,
      messages: [{
        role: 'user',
        content: `Trend: ${trendDesc}
Fulfillment: ${fulfillmentMethod}

Generate exactly 3 product concepts. Reply with ONLY raw JSON (no markdown, no commentary, no code fences):

{"concepts":[{"title":"product title under 60 chars","description_html":"<p>compelling Shopify product description</p>","tagline":"catchy one-liner","tags":["tag1","tag2","tag3","tag4","tag5"],"price_usd":29.99,"compare_at_price":39.99,"design_prompt":"detailed prompt for AI image gen describing the GRAPHIC to print on the shirt - visual elements only, no model/setting","tiktok_hook":"3-second hook","tiktok_caption":"full caption with emojis","tiktok_hashtags":"#a #b #c","tiktok_video_idea":"video concept","fulfillment_steps":["step 1","step 2","step 3"]}]}

Output ONLY the JSON object. Start with { and end with }.`
      }]
    });
    const fullText = getAllText(r.content);
    const data = extractJSON(fullText);
    if (!data || !data.concepts || data.concepts.length === 0) {
      console.error('Ideate parse failed. Response:', fullText.substring(0, 500));
      return res.json({ concepts: [], error: 'Could not parse', debug: fullText.substring(0, 300) });
    }
    res.json(data);
  } catch (e) {
    console.error('Ideate error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ========== FULFILLMENT ROUTER ==========
app.post('/api/fulfillment/route', async (req, res) => {
  try {
    const { concept } = req.body;
    if (!concept) return res.status(400).json({ error: 'concept required' });
    const method = concept.fulfillment_method || 'Print-on-Demand';
    const result = { method, concept, actions: [] };
    if (method === 'Print-on-Demand' && PRINTIFY_API_KEY) {
      result.actions.push({ type: 'auto', label: 'Run full pipeline (design + Printify + Shopify)', endpoint: '/api/pipeline/full-create' });
    } else if (method === 'Digital') {
      result.actions.push({ type: 'manual', label: 'Create your digital file' });
      result.actions.push({ type: 'auto', label: 'Create Shopify product', endpoint: '/api/shopify/publish' });
    } else if (method === 'Dropshipping') {
      result.actions.push({ type: 'manual', label: `Search supplier sites with: ${concept.title}` });
      result.actions.push({ type: 'auto', label: 'Create Shopify product listing', endpoint: '/api/shopify/publish' });
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== SHOPIFY PUBLISH (DIRECT) ==========
app.post('/api/shopify/publish', async (req, res) => {
  try {
    const { title, description_html, body_html, vendor = 'UD Store', product_type, tags, price, compare_at_price, status = 'draft', is_digital = false } = req.body;
    const variant = { 
      price: String(price || '29.99'),
      inventory_quantity: is_digital ? 999 : 100,
      requires_shipping: !is_digital,
      taxable: true,
    };
    if (compare_at_price) variant.compare_at_price = String(compare_at_price);
    const product = {
      product: {
        title,
        body_html: description_html || body_html || '',
        vendor,
        product_type: product_type || (is_digital ? 'Digital' : 'Apparel'),
        tags: Array.isArray(tags) ? tags.join(', ') : (tags || ''),
        status,
        variants: [variant]
      }
    };
    res.json(await shopifyRequest('products.json', 'POST', product));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== UNIFIED CHAT ==========
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, includeStoreData = true } = req.body;
    const claude = getClaude();
    let system = `You are an expert AI agent managing the Shopify store "UD" (${SHOPIFY_STORE}) for owner Udo.
You can find trending products and create products via Print-on-Demand (Printify), Digital, or Dropshipping.
Be concise. Use markdown tables. Bold key facts.`;
    if (includeStoreData && SHOPIFY_ACCESS_TOKEN) {
      try {
        const [products, orders] = await Promise.all([
          shopifyRequest('products.json?limit=10'),
          shopifyRequest('orders.json?status=any&limit=10'),
        ]);
        system += `\n\nLIVE STORE:\nProducts: ${JSON.stringify(products.products.map(p => ({ title: p.title, status: p.status, price: p.variants[0]?.price })))}
Orders: ${JSON.stringify(orders.orders.map(o => ({ name: o.name, total: o.total_price })))}`;
      } catch (e) {}
    }
    const r = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system, messages,
    });
    res.json({ reply: r.content[0].text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ========== AI IMAGE GENERATION ==========
// ============================================================

// Generate a CLEAN DESIGN graphic suitable for printing on apparel
app.post('/api/images/design', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const { prompt, style = 'vector', size = '1024x1024', quality = 'hd' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    let designPrompt;
    if (style === 'vector') {
      designPrompt = `Bold vector graphic design: ${prompt}. Clean flat design with thick outlines, vibrant solid colors, centered composition, simple but striking, suitable for screen printing on a t-shirt. Pure white background, no shadows, no gradients on background, illustration style only. The design should be the entire focus, occupying about 70 percent of the frame.`;
    } else if (style === 'typography') {
      designPrompt = `Bold typography t-shirt design: ${prompt}. Strong custom lettering with decorative elements, high contrast, centered composition, vintage or modern aesthetic. Pure white background, design only, no models, no clothing, no setting.`;
    } else if (style === 'illustration') {
      designPrompt = `Detailed illustration for t-shirt printing: ${prompt}. Highly detailed artwork, rich colors, centered composition. Pure white background, no models, no clothing, no setting - just the design artwork itself.`;
    } else if (style === 'cultural') {
      designPrompt = `Bold African cultural art design: ${prompt}. Inspired by traditional Ankara and Kente patterns, rich earth tones with gold accents, geometric and tribal motifs, celebratory and proud. Pure white background, vector style, centered composition, design only - no models, no clothing.`;
    } else {
      designPrompt = `Clean t-shirt design: ${prompt}. Bold colors, centered composition, suitable for printing. Pure white background, design only - no models, no clothing, no setting.`;
    }

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'dall-e-3', prompt: designPrompt, n: 1, size, quality }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('OpenAI design error:', data);
      return res.status(r.status).json({ error: data.error?.message || 'OpenAI request failed' });
    }
    res.json({
      success: true,
      url: data.data[0].url,
      revised_prompt: data.data[0].revised_prompt,
      style_used: style,
      note: 'This is a DESIGN graphic. Upload to Printify to put it on real products.',
    });
  } catch (e) {
    console.error('Design generation error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Generate a marketing/lifestyle photo (NOT for printing)
app.post('/api/images/photo', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const { prompt, size = '1024x1024', quality = 'standard' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const enhancedPrompt = `Professional product photography: ${prompt}. High-quality studio lighting, clean background, commercial advertising style, sharp focus, vibrant colors, photorealistic.`;
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'dall-e-3', prompt: enhancedPrompt, n: 1, size, quality }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'OpenAI request failed' });
    res.json({ success: true, url: data.data[0].url, revised_prompt: data.data[0].revised_prompt });
  } catch (e) {
    console.error('Photo generation error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Legacy endpoint (kept for backwards compatibility)
app.post('/api/images/generate', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const { prompt, size = '1024x1024', quality = 'standard', n = 1 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const enhancedPrompt = `Professional product photography: ${prompt}. High-quality studio lighting, clean background, commercial advertising style, sharp focus, vibrant colors, photorealistic, suitable for e-commerce and social media marketing.`;
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'dall-e-3', prompt: enhancedPrompt, n: Math.min(n, 1), size, quality }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || 'OpenAI request failed' });
    res.json({
      success: true,
      images: data.data.map(img => ({ url: img.url, revised_prompt: img.revised_prompt })),
      count: data.data.length,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ========== PRINTIFY POD PIPELINE ==========
// ============================================================

app.get('/api/printify/shops', async (req, res) => {
  try { res.json(await printifyRequest('shops.json')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/printify/products', async (req, res) => {
  try {
    const shopId = req.query.shop_id || PRINTIFY_SHOP_ID;
    if (!shopId) return res.status(400).json({ error: 'PRINTIFY_SHOP_ID not set' });
    res.json(await printifyRequest(`shops/${shopId}/products.json`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/printify/products/:productId', async (req, res) => {
  try {
    if (!PRINTIFY_SHOP_ID) return res.status(400).json({ error: 'PRINTIFY_SHOP_ID not set' });
    const { productId } = req.params;
    res.json(await printifyRequest(`shops/${PRINTIFY_SHOP_ID}/products/${productId}.json`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/printify/blueprints', async (req, res) => {
  try {
    const blueprints = await printifyRequest('catalog/blueprints.json');
    const popular = blueprints.filter(b => {
      const t = (b.title || '').toLowerCase();
      return t.includes('cotton') || t.includes('hoodie') || t.includes('sweat') || t.includes('tee') || t.includes('shirt');
    }).slice(0, 20).map(b => ({
      id: b.id, title: b.title, brand: b.brand, model: b.model,
      images: b.images?.slice(0, 1) || [],
    }));
    res.json({ blueprints: popular });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/printify/blueprints/:blueprintId/providers', async (req, res) => {
  try {
    const { blueprintId } = req.params;
    const providers = await printifyRequest(`catalog/blueprints/${blueprintId}/print_providers.json`);
    res.json({ providers });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/printify/blueprints/:blueprintId/providers/:providerId/variants', async (req, res) => {
  try {
    const { blueprintId, providerId } = req.params;
    res.json(await printifyRequest(`catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Upload an image to Printify (from a public URL like DALL-E)
app.post('/api/printify/upload-from-url', async (req, res) => {
  try {
    const { url, file_name = 'design.png' } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    const result = await printifyRequest('uploads/images.json', 'POST', { file_name, url });
    res.json({ success: true, image: result });
  } catch (e) {
    console.error('Printify upload error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// Original upload-image endpoint (kept for compat)
app.post('/api/printify/upload-image', async (req, res) => {
  try { res.json(await printifyRequest('uploads/images.json', 'POST', req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// QUICK CREATE: Create Printify product with smart defaults from a design URL
app.post('/api/printify/quick-create', async (req, res) => {
  try {
    if (!PRINTIFY_SHOP_ID) return res.status(400).json({ error: 'PRINTIFY_SHOP_ID not set' });
    const {
      title, description = '', design_url,
      blueprint_search = 'cotton tee',
      max_variants = 8, price_usd = 29.99,
    } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!design_url) return res.status(400).json({ error: 'design_url is required' });

    console.log('🎨 Quick-create starting:', title);

    // 1. Find blueprint
    const blueprints = await printifyRequest('catalog/blueprints.json');
    const search = blueprint_search.toLowerCase();
    let blueprint = blueprints.find(b => {
      const t = (b.title || '').toLowerCase();
      return t.includes(search) && t.includes('unisex');
    }) || blueprints.find(b => (b.title || '').toLowerCase().includes(search));
    if (!blueprint) return res.status(404).json({ error: `No blueprint found for: ${blueprint_search}` });
    console.log('✅ Blueprint:', blueprint.id, blueprint.title);

    // 2. Get providers
    const providers = await printifyRequest(`catalog/blueprints/${blueprint.id}/print_providers.json`);
    if (!providers?.length) return res.status(404).json({ error: 'No print providers' });
    const provider = providers[0];
    console.log('✅ Provider:', provider.id, provider.title);

    // 3. Get variants
    const variantsData = await printifyRequest(`catalog/blueprints/${blueprint.id}/print_providers/${provider.id}/variants.json`);
    if (!variantsData.variants?.length) return res.status(404).json({ error: 'No variants' });
    const selectedVariants = variantsData.variants.slice(0, max_variants);
    const priceCents = Math.round(price_usd * 100);
    console.log('✅ Variants:', selectedVariants.length);

    // 4. Upload design to Printify
    const uploadResult = await printifyRequest('uploads/images.json', 'POST', {
      file_name: 'design.png', url: design_url,
    });
    console.log('✅ Image uploaded:', uploadResult.id);

    // 5. Create product
    const productPayload = {
      title, description,
      blueprint_id: blueprint.id,
      print_provider_id: provider.id,
      variants: selectedVariants.map(v => ({ id: v.id, price: priceCents, is_enabled: true })),
      print_areas: [{
        variant_ids: selectedVariants.map(v => v.id),
        placeholders: [{
          position: 'front',
          images: [{ id: uploadResult.id, x: 0.5, y: 0.5, scale: 1.0, angle: 0 }],
        }],
      }],
    };
    const product = await printifyRequest(`shops/${PRINTIFY_SHOP_ID}/products.json`, 'POST', productPayload);
    console.log('✅ Printify product created:', product.id);

    res.json({
      success: true,
      product: {
        id: product.id, title: product.title,
        blueprint_id: blueprint.id,
        blueprint_title: blueprint.title,
        provider_title: provider.title,
        variants_count: selectedVariants.length,
        mockup_images: product.images?.map(i => i.src) || [],
      },
      message: 'Product created in Printify! Use /api/printify/publish/:productId to push to Shopify.',
    });
  } catch (e) {
    console.error('Quick-create error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message, details: e.response?.data });
  }
});

// Publish a Printify product to Shopify
app.post('/api/printify/publish/:productId', async (req, res) => {
  try {
    if (!PRINTIFY_SHOP_ID) return res.status(400).json({ error: 'PRINTIFY_SHOP_ID not set' });
    const { productId } = req.params;
    const result = await printifyRequest(
      `shops/${PRINTIFY_SHOP_ID}/products/${productId}/publish.json`,
      'POST',
      { title: true, description: true, images: true, variants: true, tags: true }
    );
    res.json({ success: true, result, message: 'Published to Shopify!' });
  } catch (e) {
    console.error('Publish error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ============================================================
// ========== MEGA PIPELINE: DESIGN → PRINTIFY → SHOPIFY ==========
// ============================================================
app.post('/api/pipeline/full-create', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(400).json({ error: 'OPENAI_API_KEY not set' });
    if (!PRINTIFY_API_KEY) return res.status(400).json({ error: 'PRINTIFY_API_KEY not set' });
    if (!PRINTIFY_SHOP_ID) return res.status(400).json({ error: 'PRINTIFY_SHOP_ID not set' });

    const {
      title, description = '', design_prompt,
      design_style = 'vector',
      blueprint_search = 'cotton tee',
      price_usd = 29.99,
      auto_publish = false,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!design_prompt) return res.status(400).json({ error: 'design_prompt is required' });

    const log = [];

    // Step 1: Generate design
    log.push('Generating AI design...');
    let stylePrompt;
    if (design_style === 'cultural') {
      stylePrompt = `Bold African cultural art design: ${design_prompt}. Inspired by traditional Ankara and Kente patterns, rich earth tones with gold accents, geometric and tribal motifs. Pure white background, vector style, centered composition, design only - no models, no clothing.`;
    } else if (design_style === 'typography') {
      stylePrompt = `Bold typography t-shirt design: ${design_prompt}. Strong custom lettering, high contrast, centered composition. Pure white background, design only, no models.`;
    } else {
      stylePrompt = `Bold vector graphic design: ${design_prompt}. Clean flat design with thick outlines, vibrant solid colors, centered composition. Pure white background, no shadows, design only.`;
    }

    const dalleR = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'dall-e-3', prompt: stylePrompt, n: 1, size: '1024x1024', quality: 'hd' }),
    });
    const dalleData = await dalleR.json();
    if (!dalleR.ok) return res.status(500).json({ error: 'Design generation failed', details: dalleData });
    const designUrl = dalleData.data[0].url;
    log.push('✅ Design generated');

    // Step 2: Find blueprint
    log.push('Finding suitable product blueprint...');
    const blueprints = await printifyRequest('catalog/blueprints.json');
    const search = blueprint_search.toLowerCase();
    let blueprint = blueprints.find(b => {
      const t = (b.title || '').toLowerCase();
      return t.includes(search) && t.includes('unisex');
    }) || blueprints.find(b => (b.title || '').toLowerCase().includes(search));
    if (!blueprint) return res.status(404).json({ error: `No blueprint found for: ${blueprint_search}`, log });
    log.push(`✅ Blueprint: ${blueprint.title}`);

    // Step 3: Get provider
    const providers = await printifyRequest(`catalog/blueprints/${blueprint.id}/print_providers.json`);
    if (!providers?.length) return res.status(404).json({ error: 'No providers', log });
    const provider = providers[0];
    log.push(`✅ Provider: ${provider.title}`);

    // Step 4: Get variants
    const variantsData = await printifyRequest(`catalog/blueprints/${blueprint.id}/print_providers/${provider.id}/variants.json`);
    if (!variantsData.variants?.length) return res.status(404).json({ error: 'No variants', log });
    const selectedVariants = variantsData.variants.slice(0, 8);
    const priceCents = Math.round(price_usd * 100);
    log.push(`✅ ${selectedVariants.length} variants selected`);

    // Step 5: Upload design to Printify
    log.push('Uploading design to Printify...');
    const uploadResult = await printifyRequest('uploads/images.json', 'POST', {
      file_name: 'design.png', url: designUrl,
    });
    log.push('✅ Design uploaded to Printify');

    // Step 6: Create Printify product
    log.push('Creating Printify product (with mockups)...');
    const productPayload = {
      title, description,
      blueprint_id: blueprint.id,
      print_provider_id: provider.id,
      variants: selectedVariants.map(v => ({ id: v.id, price: priceCents, is_enabled: true })),
      print_areas: [{
        variant_ids: selectedVariants.map(v => v.id),
        placeholders: [{
          position: 'front',
          images: [{ id: uploadResult.id, x: 0.5, y: 0.5, scale: 1.0, angle: 0 }],
        }],
      }],
    };
    const product = await printifyRequest(`shops/${PRINTIFY_SHOP_ID}/products.json`, 'POST', productPayload);
    log.push(`✅ Product created (Printify id: ${product.id})`);

    // Step 7: Optional auto-publish
    let publishResult = null;
    if (auto_publish) {
      log.push('Publishing to Shopify...');
      publishResult = await printifyRequest(
        `shops/${PRINTIFY_SHOP_ID}/products/${product.id}/publish.json`,
        'POST',
        { title: true, description: true, images: true, variants: true, tags: true }
      );
      log.push('✅ Published to Shopify');
    }

    res.json({
      success: true,
      log,
      design: { url: designUrl, prompt: dalleData.data[0].revised_prompt },
      product: {
        printify_id: product.id,
        title: product.title,
        mockup_images: product.images?.map(i => i.src) || [],
        blueprint: blueprint.title,
        provider: provider.title,
      },
      publishing: auto_publish ? publishResult : 'skipped',
    });
  } catch (e) {
    console.error('Pipeline error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message, details: e.response?.data });
  }
});

// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 UD Store Agent v4 (Full POD Pipeline) on port ${PORT}`);
  console.log(`📍 Store: ${SHOPIFY_STORE}`);
  console.log(`🔑 Shopify: ${!!SHOPIFY_ACCESS_TOKEN} | Claude: ${!!ANTHROPIC_API_KEY} | OpenAI: ${!!OPENAI_API_KEY} | Printify: ${!!PRINTIFY_API_KEY} (shop: ${PRINTIFY_SHOP_ID || 'none'}) | TikTok: ${!!TIKTOK_ACCESS_TOKEN}`);
});

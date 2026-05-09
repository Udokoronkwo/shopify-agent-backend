// Shopify AI Agent Backend v5 - 3-Pillar Empire
// Pillar 1: Wall Art (POD)
// Pillar 2: Digital Products
// Pillar 3: Trending Dropshipping

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
    `client_key=${TIKTOK_CLIENT_KEY}&scope=${encodeURIComponent(scope)}&` +
    `response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${csrfState}`;
  res.redirect(authUrl);
});

app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, error, error_description } = req.query;
  if (error) {
    return res.send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#1a0a0a;color:#f09595;">
      <h1>❌ TikTok Auth Failed</h1><p>${error}: ${error_description || ''}</p>
      <a href="/connect-tiktok" style="color:#fff;">← Try again</a>
    </body></html>`);
  }
  if (!code) return res.status(400).send('Missing authorization code');
  try {
    const tokenResponse = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY, client_secret: TIKTOK_CLIENT_SECRET,
        code: code, grant_type: 'authorization_code',
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
      <div class="check">✅</div><h1>TikTok Connected!</h1>
      <p>Your UD Store Agent is now linked to your TikTok Business account.</p>
      <p>Open ID:</p><code>${TIKTOK_OPEN_ID}</code>
      <p>Save this token in Railway as <strong>TIKTOK_ACCESS_TOKEN</strong>:</p>
      <code>${TIKTOK_ACCESS_TOKEN}</code>
      <a href="/connect-tiktok" class="btn">← Back to Dashboard</a>
    </div></body></html>`);
  } catch (err) {
    console.error('TikTok OAuth error:', err.response?.data || err.message);
    res.status(500).send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#1a0a0a;color:#f09595;">
      <h1>❌ Token Exchange Failed</h1><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>
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
  <h2>1. Service</h2><p>This service is an AI-powered agent that assists with managing the UD Store Shopify store and posting marketing content.</p>
  <h2>2. Acceptable Use</h2><p>You agree to use this service lawfully and not engage in fraudulent or harmful activity.</p>
  <h2>3. Limitation of Liability</h2><p>This service is provided "as is" without warranties. We are not liable for any damages from your use of the service.</p>
  <h2>4. Contact</h2><p>Email: okoronkwoudochukwu742@gmail.com</p>
  <p><em>Last updated: ${new Date().toLocaleDateString()}</em></p>
  </body></html>`);
});

app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Privacy Policy - UD Store</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="font-family:sans-serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.6;">
  <h1>Privacy Policy</h1>
  <p><strong>UD Store</strong> respects your privacy. This policy explains how we handle data.</p>
  <h2>1. Data We Collect</h2><p>We collect Shopify store data (products, orders) and TikTok content metadata only for the purpose of managing your store.</p>
  <h2>2. How We Use It</h2><p>Data is used solely to power the AI agent's features. We do not sell or share your data.</p>
  <h2>3. Storage</h2><p>Data is stored securely on Railway and Anthropic infrastructure.</p>
  <h2>4. Your Rights</h2><p>You can request data deletion at any time by contacting us.</p>
  <h2>5. Contact</h2><p>Email: okoronkwoudochukwu742@gmail.com</p>
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
    version: 'v5 - 3-Pillar Empire',
    store: SHOPIFY_STORE,
    pillars: {
      wall_art: !!(OPENAI_API_KEY && PRINTIFY_API_KEY && PRINTIFY_SHOP_ID),
      digital_products: !!(OPENAI_API_KEY && SHOPIFY_ACCESS_TOKEN),
      dropshipping: !!(ANTHROPIC_API_KEY && SHOPIFY_ACCESS_TOKEN),
      apparel_pod: !!(OPENAI_API_KEY && PRINTIFY_API_KEY && PRINTIFY_SHOP_ID),
    },
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
      art_generation: !!OPENAI_API_KEY,
      printify_create_apparel: !!(PRINTIFY_API_KEY && PRINTIFY_SHOP_ID),
      printify_create_wall_art: !!(PRINTIFY_API_KEY && PRINTIFY_SHOP_ID),
      digital_pack_create: !!(OPENAI_API_KEY && SHOPIFY_ACCESS_TOKEN),
      dropship_listing_create: !!SHOPIFY_ACCESS_TOKEN,
      shopify_publish: !!SHOPIFY_ACCESS_TOKEN,
      tiktok_post: !!TIKTOK_ACCESS_TOKEN,
    },
    message: 'UD Store Agent v5 - 3-Pillar Empire (Wall Art + Digital + Dropshipping)'
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

// Helper: Generate a single DALL-E image
async function generateDalleImage(prompt, options = {}) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  const { size = '1024x1024', quality = 'standard' } = options;
  const r = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size, quality }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || 'OpenAI request failed');
  return { url: data.data[0].url, revised_prompt: data.data[0].revised_prompt };
}

// Helper: Find a Printify blueprint by search keywords
async function findBlueprint(searchTerms) {
  const blueprints = await printifyRequest('catalog/blueprints.json');
  const terms = (Array.isArray(searchTerms) ? searchTerms : [searchTerms]).map(t => t.toLowerCase());
  let best = null;
  for (const b of blueprints) {
    const title = (b.title || '').toLowerCase();
    if (terms.every(t => title.includes(t))) {
      best = b;
      break;
    }
  }
  if (!best) {
    for (const b of blueprints) {
      const title = (b.title || '').toLowerCase();
      if (terms.some(t => title.includes(t))) {
        best = b;
        break;
      }
    }
  }
  return best;
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

// ========== UNIFIED DASHBOARD ==========
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const summary = { timestamp: new Date().toISOString() };
    if (SHOPIFY_ACCESS_TOKEN) {
      try {
        const [products, orders] = await Promise.all([
          shopifyRequest('products.json?limit=50'),
          shopifyRequest('orders.json?status=any&limit=50'),
        ]);
        summary.shopify = {
          product_count: products.products?.length || 0,
          order_count: orders.orders?.length || 0,
          total_sales: orders.orders?.reduce((s, o) => s + parseFloat(o.total_price || 0), 0) || 0,
          recent_products: products.products?.slice(0, 5).map(p => ({ title: p.title, status: p.status, price: p.variants?.[0]?.price })),
        };
      } catch (e) { summary.shopify = { error: e.message }; }
    }
    if (PRINTIFY_API_KEY && PRINTIFY_SHOP_ID) {
      try {
        const printifyProducts = await printifyRequest(`shops/${PRINTIFY_SHOP_ID}/products.json`);
        summary.printify = {
          product_count: printifyProducts.data?.length || 0,
        };
      } catch (e) { summary.printify = { error: e.message }; }
    }
    res.json(summary);
  } catch (e) { res.status(500).json({ error: e.message }); }
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

Structure:
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
      "supplier_search_terms": "specific keywords to search on AliExpress/CJ Dropshipping",
      "target_audience": "demographic + interests",
      "estimated_margin": "Low OR Medium OR High",
      "urgency": "Buy NOW OR Plan Soon OR Long-term"
    }
  ]
}

Output ONLY the JSON object. Nothing else.`
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

Generate exactly 3 product concepts. Reply with ONLY raw JSON:

{"concepts":[{"title":"product title under 60 chars","description_html":"<p>compelling Shopify product description</p>","tagline":"catchy one-liner","tags":["tag1","tag2","tag3","tag4","tag5"],"price_usd":29.99,"compare_at_price":39.99,"design_prompt":"detailed visual prompt for the design - no text, no models, just artwork","supplier_search":"keywords for finding suppliers","tiktok_hook":"3-second hook","tiktok_caption":"full caption with emojis","tiktok_hashtags":"#a #b #c","tiktok_video_idea":"video concept","fulfillment_steps":["step 1","step 2","step 3"]}]}

Output ONLY the JSON object.`
      }]
    });
    const fullText = getAllText(r.content);
    const data = extractJSON(fullText);
    if (!data || !data.concepts || data.concepts.length === 0) {
      return res.json({ concepts: [], error: 'Could not parse', debug: fullText.substring(0, 300) });
    }
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ========== SHOPIFY PUBLISH (DIRECT) ==========
app.post('/api/shopify/publish', async (req, res) => {
  try {
    const { title, description_html, body_html, vendor = 'UD Store', product_type, tags, price, compare_at_price, status = 'draft', is_digital = false, image_urls = [] } = req.body;
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
        variants: [variant],
        images: image_urls.map(url => ({ src: url })),
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
    let system = `You are an expert AI agent managing the Shopify store "UD Store" (${SHOPIFY_STORE}) for owner Udo.
The store has 3 pillars: Wall Art (POD), Digital Products (templates/wallpapers), and Trending Dropshipping.
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

// Generate art for wall art (rich, detailed, painterly)
app.post('/api/images/art', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const { prompt, size = '1024x1024', quality = 'hd' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const artPrompt = `Museum-quality fine art: ${prompt}. Rich detail, vibrant colors, dramatic composition, masterpiece quality, suitable for a large wall art print, gallery-worthy artwork, intricate details that reward close inspection, premium aesthetic.`;
    const result = await generateDalleImage(artPrompt, { size, quality });
    res.json({ success: true, url: result.url, revised_prompt: result.revised_prompt, type: 'wall_art' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Generate clean design for apparel (text-light, vector style)
app.post('/api/images/design', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const { prompt, style = 'vector', size = '1024x1024', quality = 'hd' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    let designPrompt;
    if (style === 'cultural') {
      designPrompt = `Bold African cultural art design: ${prompt}. Inspired by Ankara and Kente patterns, rich earth tones with gold accents, geometric and tribal motifs. Pure white background, vector style, centered composition, NO TEXT NO WORDS NO LETTERS, design only - no models, no clothing.`;
    } else if (style === 'typography') {
      designPrompt = `Bold typography design: ${prompt}. Strong custom lettering, high contrast, centered composition. Pure white background, design only.`;
    } else {
      designPrompt = `Bold vector graphic design: ${prompt}. Clean flat design with thick outlines, vibrant solid colors, centered composition, NO TEXT NO WORDS NO LETTERS. Pure white background.`;
    }
    const result = await generateDalleImage(designPrompt, { size, quality });
    res.json({ success: true, url: result.url, revised_prompt: result.revised_prompt, style_used: style });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Generate marketing photo
app.post('/api/images/photo', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const { prompt, size = '1024x1024', quality = 'standard' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const photoPrompt = `Professional product photography: ${prompt}. High-quality studio lighting, clean background, commercial style, sharp focus, photorealistic.`;
    const result = await generateDalleImage(photoPrompt, { size, quality });
    res.json({ success: true, url: result.url, revised_prompt: result.revised_prompt });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Legacy image generation
app.post('/api/images/generate', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });
    const { prompt, size = '1024x1024', quality = 'standard' } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const enhancedPrompt = `Professional product photography: ${prompt}.`;
    const result = await generateDalleImage(enhancedPrompt, { size, quality });
    res.json({ success: true, images: [result], count: 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ========== PRINTIFY DATA ENDPOINTS ==========
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
    res.json(await printifyRequest(`shops/${PRINTIFY_SHOP_ID}/products/${req.params.productId}.json`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Search blueprints by category
app.get('/api/printify/blueprints', async (req, res) => {
  try {
    const { category = 'all' } = req.query;
    const blueprints = await printifyRequest('catalog/blueprints.json');
    let filtered = blueprints;
    if (category === 'apparel') {
      filtered = blueprints.filter(b => {
        const t = (b.title || '').toLowerCase();
        return t.includes('cotton') || t.includes('hoodie') || t.includes('sweat') || t.includes('tee');
      });
    } else if (category === 'wall_art') {
      filtered = blueprints.filter(b => {
        const t = (b.title || '').toLowerCase();
        return t.includes('poster') || t.includes('canvas') || t.includes('print') || t.includes('frame');
      });
    } else if (category === 'accessories') {
      filtered = blueprints.filter(b => {
        const t = (b.title || '').toLowerCase();
        return t.includes('mug') || t.includes('bag') || t.includes('tote') || t.includes('case') || t.includes('sticker');
      });
    }
    res.json({
      category,
      count: filtered.length,
      blueprints: filtered.slice(0, 30).map(b => ({
        id: b.id, title: b.title, brand: b.brand, model: b.model,
        images: b.images?.slice(0, 1) || [],
      })),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/printify/blueprints/:blueprintId/providers', async (req, res) => {
  try {
    res.json({ providers: await printifyRequest(`catalog/blueprints/${req.params.blueprintId}/print_providers.json`) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/printify/blueprints/:blueprintId/providers/:providerId/variants', async (req, res) => {
  try {
    const { blueprintId, providerId } = req.params;
    res.json(await printifyRequest(`catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/printify/upload-from-url', async (req, res) => {
  try {
    const { url, file_name = 'design.png' } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });
    res.json({ success: true, image: await printifyRequest('uploads/images.json', 'POST', { file_name, url }) });
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

app.post('/api/printify/upload-image', async (req, res) => {
  try { res.json(await printifyRequest('uploads/images.json', 'POST', req.body)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

// Publish a Printify product to Shopify
app.post('/api/printify/publish/:productId', async (req, res) => {
  try {
    if (!PRINTIFY_SHOP_ID) return res.status(400).json({ error: 'PRINTIFY_SHOP_ID not set' });
    const result = await printifyRequest(
      `shops/${PRINTIFY_SHOP_ID}/products/${req.params.productId}/publish.json`,
      'POST',
      { title: true, description: true, images: true, variants: true, tags: true }
    );
    res.json({ success: true, result, message: 'Published to Shopify!' });
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// Delete a Printify product
app.delete('/api/printify/products/:productId', async (req, res) => {
  try {
    if (!PRINTIFY_SHOP_ID) return res.status(400).json({ error: 'PRINTIFY_SHOP_ID not set' });
    await printifyRequest(`shops/${PRINTIFY_SHOP_ID}/products/${req.params.productId}.json`, 'DELETE');
    res.json({ success: true, message: 'Product deleted' });
  } catch (e) {
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ============================================================
// ========== 🏛️ PILLAR 1: APPAREL POD (LEGACY) ==========
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
      price_usd = 29.99, auto_publish = false,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!design_prompt) return res.status(400).json({ error: 'design_prompt is required' });

    const log = [];
    log.push('Generating AI design...');
    let stylePrompt;
    if (design_style === 'cultural') {
      stylePrompt = `Bold African cultural art design: ${design_prompt}. Inspired by Ankara and Kente patterns, rich earth tones with gold accents. Pure white background, vector style, centered composition, NO TEXT NO WORDS, design only.`;
    } else {
      stylePrompt = `Bold vector graphic design: ${design_prompt}. Clean flat design with thick outlines, vibrant colors, NO TEXT NO WORDS. Pure white background.`;
    }
    const designResult = await generateDalleImage(stylePrompt, { size: '1024x1024', quality: 'hd' });
    log.push('✅ Design generated');

    const blueprint = await findBlueprint([blueprint_search.toLowerCase(), 'unisex']) || await findBlueprint(blueprint_search.toLowerCase());
    if (!blueprint) return res.status(404).json({ error: `No blueprint found for: ${blueprint_search}`, log });
    log.push(`✅ Blueprint: ${blueprint.title}`);

    const providers = await printifyRequest(`catalog/blueprints/${blueprint.id}/print_providers.json`);
    if (!providers?.length) return res.status(404).json({ error: 'No providers', log });
    const provider = providers[0];
    log.push(`✅ Provider: ${provider.title}`);

    const variantsData = await printifyRequest(`catalog/blueprints/${blueprint.id}/print_providers/${provider.id}/variants.json`);
    if (!variantsData.variants?.length) return res.status(404).json({ error: 'No variants', log });
    const selectedVariants = variantsData.variants.slice(0, 8);
    const priceCents = Math.round(price_usd * 100);
    log.push(`✅ ${selectedVariants.length} variants selected`);

    const uploadResult = await printifyRequest('uploads/images.json', 'POST', { file_name: 'design.png', url: designResult.url });
    log.push('✅ Design uploaded to Printify');

    const productPayload = {
      title, description,
      blueprint_id: blueprint.id,
      print_provider_id: provider.id,
      variants: selectedVariants.map(v => ({ id: v.id, price: priceCents, is_enabled: true })),
      print_areas: [{
        variant_ids: selectedVariants.map(v => v.id),
        placeholders: [{ position: 'front', images: [{ id: uploadResult.id, x: 0.5, y: 0.5, scale: 1.0, angle: 0 }] }],
      }],
    };
    const product = await printifyRequest(`shops/${PRINTIFY_SHOP_ID}/products.json`, 'POST', productPayload);
    log.push(`✅ Product created (Printify id: ${product.id})`);

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
      success: true, log,
      design: { url: designResult.url, prompt: designResult.revised_prompt },
      product: {
        printify_id: product.id, title: product.title,
        mockup_images: product.images?.map(i => i.src) || [],
        blueprint: blueprint.title, provider: provider.title,
      },
      publishing: auto_publish ? publishResult : 'skipped',
    });
  } catch (e) {
    console.error('Apparel pipeline error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message, details: e.response?.data });
  }
});

// ============================================================
// ========== 🏛️ PILLAR 2: WALL ART PIPELINE ==========
// ============================================================
app.post('/api/pipeline/create-wall-art', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(400).json({ error: 'OPENAI_API_KEY not set' });
    if (!PRINTIFY_API_KEY) return res.status(400).json({ error: 'PRINTIFY_API_KEY not set' });
    if (!PRINTIFY_SHOP_ID) return res.status(400).json({ error: 'PRINTIFY_SHOP_ID not set' });

    const {
      title, description = '', art_prompt,
      art_style = 'fine_art', // fine_art, vintage, modern, cultural, minimalist
      product_type = 'poster', // poster, canvas, framed
      price_usd = 39.99, auto_publish = false,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!art_prompt) return res.status(400).json({ error: 'art_prompt is required' });

    const log = [];

    // Step 1: Generate ART (richer prompts for wall art)
    log.push(`Generating ${art_style} art...`);
    let stylePrompt;
    if (art_style === 'fine_art') {
      stylePrompt = `Museum-quality fine art piece: ${art_prompt}. Rich detail, dramatic composition, vibrant colors, gallery-worthy artwork, intricate textures, premium aesthetic, suitable for a large wall print.`;
    } else if (art_style === 'vintage') {
      stylePrompt = `Vintage poster art: ${art_prompt}. Retro color palette, classic illustration style, slightly distressed texture, timeless aesthetic, suitable for a high-quality wall print.`;
    } else if (art_style === 'modern') {
      stylePrompt = `Modern contemporary art: ${art_prompt}. Bold geometric shapes, striking color combinations, abstract elements, gallery-style aesthetic, premium wall art.`;
    } else if (art_style === 'cultural') {
      stylePrompt = `Cultural heritage art: ${art_prompt}. Inspired by traditional African Ankara and Kente patterns, rich earth tones with gold accents, intricate tribal motifs, museum-quality detail, suitable for a large wall print.`;
    } else if (art_style === 'minimalist') {
      stylePrompt = `Minimalist wall art: ${art_prompt}. Clean lines, limited color palette, refined composition, modern aesthetic, suitable for a sophisticated wall print.`;
    } else {
      stylePrompt = `High-quality wall art: ${art_prompt}. Premium aesthetic, suitable for a large print.`;
    }

    const artResult = await generateDalleImage(stylePrompt, { size: '1024x1024', quality: 'hd' });
    log.push('✅ Art generated');

    // Step 2: Find appropriate blueprint
    log.push(`Finding ${product_type} blueprint...`);
    let blueprint;
    if (product_type === 'canvas') {
      blueprint = await findBlueprint(['canvas']);
    } else if (product_type === 'framed') {
      blueprint = await findBlueprint(['framed', 'poster']);
    } else {
      blueprint = await findBlueprint(['poster']);
    }
    if (!blueprint) return res.status(404).json({ error: `No ${product_type} blueprint found`, log });
    log.push(`✅ Blueprint: ${blueprint.title}`);

    // Step 3: Get provider
    const providers = await printifyRequest(`catalog/blueprints/${blueprint.id}/print_providers.json`);
    if (!providers?.length) return res.status(404).json({ error: 'No providers', log });
    const provider = providers[0];
    log.push(`✅ Provider: ${provider.title}`);

    // Step 4: Get variants (all sizes available for art)
    const variantsData = await printifyRequest(`catalog/blueprints/${blueprint.id}/print_providers/${provider.id}/variants.json`);
    if (!variantsData.variants?.length) return res.status(404).json({ error: 'No variants', log });
    const selectedVariants = variantsData.variants.slice(0, 6); // typically 4-6 sizes for posters
    const priceCents = Math.round(price_usd * 100);
    log.push(`✅ ${selectedVariants.length} sizes selected`);

    // Step 5: Upload art to Printify
    const uploadResult = await printifyRequest('uploads/images.json', 'POST', {
      file_name: 'wall-art.png', url: artResult.url,
    });
    log.push('✅ Art uploaded to Printify');

    // Step 6: Create product
    const productPayload = {
      title, description,
      blueprint_id: blueprint.id,
      print_provider_id: provider.id,
      variants: selectedVariants.map(v => ({ id: v.id, price: priceCents, is_enabled: true })),
      print_areas: [{
        variant_ids: selectedVariants.map(v => v.id),
        placeholders: [{ position: 'front', images: [{ id: uploadResult.id, x: 0.5, y: 0.5, scale: 1.0, angle: 0 }] }],
      }],
    };
    const product = await printifyRequest(`shops/${PRINTIFY_SHOP_ID}/products.json`, 'POST', productPayload);
    log.push(`✅ Wall art product created (id: ${product.id})`);

    let publishResult = null;
    if (auto_publish) {
      publishResult = await printifyRequest(
        `shops/${PRINTIFY_SHOP_ID}/products/${product.id}/publish.json`,
        'POST', { title: true, description: true, images: true, variants: true, tags: true }
      );
      log.push('✅ Published to Shopify');
    }

    res.json({
      success: true, log, pillar: 'wall_art',
      art: { url: artResult.url, prompt: artResult.revised_prompt },
      product: {
        printify_id: product.id, title: product.title,
        mockup_images: product.images?.map(i => i.src) || [],
        blueprint: blueprint.title, provider: provider.title,
        product_type, price_usd,
      },
      publishing: auto_publish ? publishResult : 'skipped',
    });
  } catch (e) {
    console.error('Wall art pipeline error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message, details: e.response?.data });
  }
});

// ============================================================
// ========== 🏛️ PILLAR 3: DIGITAL PRODUCTS PIPELINE ==========
// ============================================================
app.post('/api/pipeline/create-digital-pack', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) return res.status(400).json({ error: 'OPENAI_API_KEY not set' });
    if (!SHOPIFY_ACCESS_TOKEN) return res.status(400).json({ error: 'SHOPIFY_ACCESS_TOKEN not set' });

    const {
      title, description = '', pack_theme,
      pack_size = 4, // how many designs in the pack
      pack_style = 'wallpaper', // wallpaper, pattern, social_template
      price_usd = 14.99,
      auto_publish_to_shopify = true,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!pack_theme) return res.status(400).json({ error: 'pack_theme is required' });

    const log = [];
    const designs = [];

    // Step 1: Generate variations of the theme
    log.push(`Generating ${pack_size} digital ${pack_style} designs for "${pack_theme}"...`);
    const variations = [
      `${pack_theme}, vibrant color palette, bold composition`,
      `${pack_theme}, monochromatic style, sophisticated aesthetic`,
      `${pack_theme}, minimalist version, clean and simple`,
      `${pack_theme}, detailed intricate version, ornate elements`,
      `${pack_theme}, abstract artistic interpretation`,
      `${pack_theme}, retro vintage style`,
      `${pack_theme}, modern contemporary style`,
      `${pack_theme}, dark moody version`,
      `${pack_theme}, light airy version`,
      `${pack_theme}, geometric pattern version`,
    ].slice(0, Math.min(pack_size, 10));

    let imageSize = '1024x1024';
    if (pack_style === 'wallpaper') imageSize = '1024x1792'; // phone wallpaper aspect ratio
    else if (pack_style === 'desktop_wallpaper') imageSize = '1792x1024';

    for (let i = 0; i < variations.length; i++) {
      try {
        let stylePrompt;
        if (pack_style === 'wallpaper' || pack_style === 'desktop_wallpaper') {
          stylePrompt = `Premium phone/desktop wallpaper: ${variations[i]}. High-resolution aesthetic background, beautifully composed, vibrant or moody depending on style, suitable as a screen background. NO TEXT NO WORDS.`;
        } else if (pack_style === 'pattern') {
          stylePrompt = `Seamless repeating pattern design: ${variations[i]}. Tileable pattern, professional textile design quality, suitable for fabric/wallpaper/digital use. NO TEXT.`;
        } else if (pack_style === 'social_template') {
          stylePrompt = `Social media post template background: ${variations[i]}. Clean composition with space for text overlay (don't add text yourself), professional Instagram/TikTok aesthetic. NO TEXT NO WORDS.`;
        } else {
          stylePrompt = `Premium digital art: ${variations[i]}. High-quality artwork.`;
        }
        const result = await generateDalleImage(stylePrompt, { size: imageSize, quality: 'standard' });
        designs.push({ variation: i + 1, url: result.url, prompt: variations[i] });
        log.push(`✅ Design ${i + 1} generated`);
      } catch (e) {
        log.push(`⚠️ Design ${i + 1} failed: ${e.message}`);
      }
    }

    if (designs.length === 0) {
      return res.status(500).json({ error: 'No designs generated successfully', log });
    }

    log.push(`Generated ${designs.length}/${pack_size} designs`);

    // Step 2: Create Shopify product (digital)
    let shopifyProduct = null;
    if (auto_publish_to_shopify) {
      log.push('Creating Shopify digital product...');
      const variant = {
        price: String(price_usd),
        inventory_quantity: 9999,
        requires_shipping: false,
        taxable: true,
      };
      const productPayload = {
        product: {
          title,
          body_html: description || `<p>Digital download pack containing ${designs.length} ${pack_style} designs themed around "${pack_theme}".</p><p>Instant download after purchase. High-resolution files.</p>`,
          vendor: 'UD Store',
          product_type: 'Digital Download',
          tags: `digital, downloadable, ${pack_style}, ${pack_theme}`,
          status: 'draft',
          variants: [variant],
          images: designs.map(d => ({ src: d.url })),
        }
      };
      shopifyProduct = await shopifyRequest('products.json', 'POST', productPayload);
      log.push(`✅ Shopify product created: ${shopifyProduct.product.id}`);
      log.push('⚠️ NOTE: Install Shopify Digital Downloads app to enable file delivery');
    }

    res.json({
      success: true, log, pillar: 'digital_products',
      pack: {
        title, theme: pack_theme, style: pack_style, count: designs.length,
        designs: designs.map(d => ({ url: d.url, variation: d.variation })),
      },
      shopify_product: shopifyProduct?.product || null,
      next_steps: [
        '1. Download all design URLs and package into a ZIP file',
        '2. Install the FREE "Shopify Digital Downloads" app from Shopify App Store',
        '3. Attach the ZIP to your Shopify product variant',
        '4. Customers will receive a download link after purchase',
      ],
    });
  } catch (e) {
    console.error('Digital pack pipeline error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ============================================================
// ========== 🏛️ PILLAR 3: TRENDING DROPSHIP PIPELINE ==========
// ============================================================
app.post('/api/pipeline/create-dropship-listing', async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) return res.status(400).json({ error: 'ANTHROPIC_API_KEY not set' });
    if (!SHOPIFY_ACCESS_TOKEN) return res.status(400).json({ error: 'SHOPIFY_ACCESS_TOKEN not set' });
    if (!OPENAI_API_KEY) return res.status(400).json({ error: 'OPENAI_API_KEY not set' });

    const {
      product_idea, // what to dropship
      target_audience = 'general',
      markup_multiplier = 2.5, // markup over supplier cost
      auto_publish = false,
    } = req.body;

    if (!product_idea) return res.status(400).json({ error: 'product_idea is required' });

    const log = [];

    // Step 1: Use Claude to research the product and generate listing copy
    log.push('Researching product and generating listing...');
    const claude = getClaude();
    const research = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `I want to dropship this product: "${product_idea}" targeting ${target_audience}.

Generate a complete Shopify product listing. Reply with ONLY raw JSON:

{
  "title": "compelling product title under 70 chars",
  "description_html": "<p>compelling Shopify description with bullet points using <ul><li> tags. Include benefits, features, and a urgency push.</p>",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "estimated_supplier_cost_usd": 12.50,
  "suggested_retail_price_usd": 29.99,
  "supplier_search_terms": "exact keywords to search on AliExpress / CJ Dropshipping",
  "supplier_recommendations": ["AliExpress", "CJ Dropshipping", "Spocket"],
  "image_prompt": "DALL-E prompt to generate a placeholder product photo",
  "tiktok_hook": "viral 3-second hook",
  "tiktok_caption": "full TikTok caption with emojis and CTA",
  "tiktok_hashtags": "#hashtag1 #hashtag2 #hashtag3"
}

Output ONLY the JSON object.`
      }]
    });

    const researchText = getAllText(research.content);
    const data = extractJSON(researchText);
    if (!data) {
      return res.status(500).json({ error: 'Could not parse research response', debug: researchText.substring(0, 300) });
    }
    log.push('✅ Listing copy generated');

    // Calculate retail price using markup if not provided
    const retailPrice = data.suggested_retail_price_usd || (data.estimated_supplier_cost_usd * markup_multiplier);

    // Step 2: Generate placeholder product image
    log.push('Generating placeholder product image...');
    const photoPrompt = `Professional product photography: ${data.image_prompt || product_idea}. Studio lighting, white background, sharp focus, commercial quality.`;
    const imageResult = await generateDalleImage(photoPrompt, { size: '1024x1024', quality: 'standard' });
    log.push('✅ Image generated');

    // Step 3: Create Shopify product as draft
    log.push('Creating Shopify draft listing...');
    const variant = {
      price: String(retailPrice.toFixed(2)),
      compare_at_price: String((retailPrice * 1.3).toFixed(2)),
      inventory_quantity: 100,
      inventory_management: null, // dropship - don't track inventory
      requires_shipping: true,
      taxable: true,
    };

    const productPayload = {
      product: {
        title: data.title,
        body_html: `${data.description_html}\n\n<hr><p><strong>📦 Sourcing Notes (delete before publishing):</strong></p>
        <ul>
          <li><strong>Supplier search:</strong> ${data.supplier_search_terms}</li>
          <li><strong>Estimated cost:</strong> $${data.estimated_supplier_cost_usd}</li>
          <li><strong>Suggested retail:</strong> $${retailPrice}</li>
          <li><strong>Recommended suppliers:</strong> ${(data.supplier_recommendations || []).join(', ')}</li>
        </ul>`,
        vendor: 'UD Store',
        product_type: 'Dropship',
        tags: (data.tags || []).join(', '),
        status: auto_publish ? 'active' : 'draft',
        variants: [variant],
        images: [{ src: imageResult.url }],
      }
    };

    const shopifyProduct = await shopifyRequest('products.json', 'POST', productPayload);
    log.push(`✅ Shopify draft created: ${shopifyProduct.product.id}`);

    res.json({
      success: true, log, pillar: 'dropshipping',
      listing: {
        shopify_product_id: shopifyProduct.product.id,
        title: data.title,
        retail_price: retailPrice,
        estimated_supplier_cost: data.estimated_supplier_cost_usd,
        estimated_profit: (retailPrice - data.estimated_supplier_cost_usd).toFixed(2),
        margin_percent: (((retailPrice - data.estimated_supplier_cost_usd) / retailPrice) * 100).toFixed(1) + '%',
        image_url: imageResult.url,
      },
      sourcing: {
        search_terms: data.supplier_search_terms,
        recommended_suppliers: data.supplier_recommendations,
        next_action: 'Find this product on AliExpress/CJ Dropshipping, install DSers app to auto-fulfill orders',
      },
      marketing: {
        tiktok_hook: data.tiktok_hook,
        tiktok_caption: data.tiktok_caption,
        tiktok_hashtags: data.tiktok_hashtags,
      },
    });
  } catch (e) {
    console.error('Dropship pipeline error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ============================================================
app.listen(PORT, () => {
  console.log(`🚀 UD Store Agent v5 (3-Pillar Empire) on port ${PORT}`);
  console.log(`📍 Store: ${SHOPIFY_STORE}`);
  console.log(`🔑 Shopify: ${!!SHOPIFY_ACCESS_TOKEN} | Claude: ${!!ANTHROPIC_API_KEY} | OpenAI: ${!!OPENAI_API_KEY} | Printify: ${!!PRINTIFY_API_KEY} (shop: ${PRINTIFY_SHOP_ID || 'none'}) | TikTok: ${!!TIKTOK_ACCESS_TOKEN}`);
  console.log(`🏛️ Pillars: Wall Art ✓ Digital ✓ Dropshipping ✓ Apparel ✓`);
});

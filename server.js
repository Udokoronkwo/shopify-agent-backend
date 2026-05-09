// Shopify AI Agent Backend v3 - Smart Fulfillment Router
// Trend → Analyze → Auto-pick fulfillment (Printify | Dropship | Digital | Wholesale | Affiliate)

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
// Simple page where user clicks "Connect TikTok"
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

// Step 1: Redirect to TikTok for authorization
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

// Step 2: Handle callback from TikTok
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

// TikTok status endpoint
app.get('/api/tiktok/status', (req, res) => {
  res.json({
    connected: !!TIKTOK_ACCESS_TOKEN,
    open_id: TIKTOK_OPEN_ID
  });
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
    store: SHOPIFY_STORE,
    shopify_connected: !!SHOPIFY_ACCESS_TOKEN,
    claude_connected: !!ANTHROPIC_API_KEY,
    openai_connected: !!OPENAI_API_KEY,
    printify_connected: !!PRINTIFY_API_KEY,
    tiktok_connected: !!TIKTOK_ACCESS_TOKEN,
    capabilities: {
      trend_discovery: !!ANTHROPIC_API_KEY,
      product_ideation: !!ANTHROPIC_API_KEY,
      image_generation: !!OPENAI_API_KEY,
      printify_create: !!PRINTIFY_API_KEY,
      shopify_publish: !!SHOPIFY_ACCESS_TOKEN,
      tiktok_ad_copy: !!ANTHROPIC_API_KEY,
      tiktok_post: !!TIKTOK_ACCESS_TOKEN,
    },
    message: 'Shopify Agent v3 - Smart Fulfillment Router'
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
  
  // Try 1: Look for JSON inside ```json ... ``` code blocks
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch (e) {}
  }
  
  // Try 2: Find the largest valid JSON object in the text
  const matches = [...text.matchAll(/\{[\s\S]*?\}/g)];
  if (matches.length > 0) {
    // Sort by length, try largest first
    const sorted = matches.map(m => m[0]).sort((a, b) => b.length - a.length);
    for (const candidate of sorted) {
      try { return JSON.parse(candidate); } catch (e) {}
    }
  }
  
  // Try 3: Find from first { to last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.substring(firstBrace, lastBrace + 1)); } catch (e) {}
  }
  
  return null;
}

// Helper to combine all text blocks from Claude's response
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

// ========== MODULE 1: TREND DISCOVERY ==========
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

Pick the BEST FULFILLMENT METHOD for each trend:
- "Print-on-Demand" - design/slogan/art (tees, mugs, posters)
- "Dropshipping" - physical product available from suppliers
- "Digital" - downloadable (templates, presets, ebooks, wallpapers)
- "Wholesale" - buy bulk and resell
- "Affiliate" - just promote with affiliate links

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

// ========== MODULE 2: PRODUCT IDEATION ==========
app.post('/api/trends/ideate', async (req, res) => {
  try {
    const { trend, fulfillmentMethod = 'Print-on-Demand' } = req.body;
    if (!trend) return res.status(400).json({ error: 'trend required' });
    
    // Extract just essentials to keep token count low
    const trendName = typeof trend === 'string' ? trend : (trend.name || 'unknown');
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

{"concepts":[{"title":"product title under 60 chars","description_html":"<p>compelling Shopify product description</p>","tagline":"catchy one-liner","tags":["tag1","tag2","tag3","tag4","tag5"],"price_usd":29.99,"compare_at_price":39.99,"tiktok_hook":"3-second hook","tiktok_caption":"full caption with emojis","tiktok_hashtags":"#a #b #c","tiktok_video_idea":"video concept","fulfillment_steps":["step 1","step 2","step 3"]}]}

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

// ========== MODULE 3: SMART FULFILLMENT ROUTER ==========
app.post('/api/fulfillment/route', async (req, res) => {
  try {
    const { concept } = req.body;
    if (!concept) return res.status(400).json({ error: 'concept required' });
    
    const method = concept.fulfillment_method || 'Print-on-Demand';
    const result = { method, concept, actions: [] };
    
    if (method === 'Print-on-Demand' && PRINTIFY_API_KEY) {
      result.actions.push({ type: 'manual', label: 'Generate design image (using AI image gen of your choice)' });
      result.actions.push({ type: 'auto', label: 'Upload design to Printify', endpoint: '/api/printify/upload-image' });
      result.actions.push({ type: 'auto', label: 'Create Printify product', endpoint: '/api/printify/create' });
      result.actions.push({ type: 'auto', label: 'Publish to Shopify', endpoint: '/api/shopify/publish' });
    } else if (method === 'Digital') {
      result.actions.push({ type: 'manual', label: 'Create your digital file (PDF, PNG, etc.)' });
      result.actions.push({ type: 'auto', label: 'Create Shopify product as digital download', endpoint: '/api/shopify/publish' });
      result.actions.push({ type: 'manual', label: 'Install Shopify Digital Downloads app to enable file delivery' });
    } else if (method === 'Dropshipping') {
      result.actions.push({ type: 'manual', label: `Search supplier sites with: ${concept.supplier_search_terms || concept.title}` });
      result.actions.push({ type: 'manual', label: 'Connect a dropshipping app: DSers, Spocket, or CJ Dropshipping' });
      result.actions.push({ type: 'auto', label: 'Create Shopify product listing', endpoint: '/api/shopify/publish' });
    } else if (method === 'Wholesale') {
      result.actions.push({ type: 'manual', label: 'Find wholesale supplier (Faire, Alibaba, trade shows)' });
      result.actions.push({ type: 'manual', label: 'Order inventory sample first' });
      result.actions.push({ type: 'auto', label: 'Create Shopify product listing', endpoint: '/api/shopify/publish' });
    } else if (method === 'Affiliate') {
      result.actions.push({ type: 'manual', label: 'Sign up for Amazon Associates / affiliate network' });
      result.actions.push({ type: 'manual', label: 'Create blog post/landing page promoting product' });
    }
    
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== MODULE 4: PRINTIFY ==========
app.get('/api/printify/shops', async (req, res) => {
  try { res.json(await printifyRequest('shops.json')); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/printify/products', async (req, res) => {
  try {
    const shopId = req.query.shop_id || PRINTIFY_SHOP_ID;
    res.json(await printifyRequest(`shops/${shopId}/products.json`));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/printify/upload-image', async (req, res) => {
  try {
    // Expects { file_name, contents } where contents is base64 OR { url } for url upload
    res.json(await printifyRequest('uploads/images.json', 'POST', req.body));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== MODULE 5: SHOPIFY PUBLISH ==========
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
You can help find trending products and create products via multiple fulfillment methods (Print-on-Demand, Dropshipping, Digital, Wholesale, Affiliate).

When users ask about trends or what to sell, suggest they click "Find Trends" which triggers a real web search.
When asked to create a product, walk them through the steps.
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

// ========== MODULE 6: DALL-E IMAGE GENERATION ==========
app.post('/api/images/generate', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not set in Railway' });
    }

    const { prompt, size = '1024x1024', quality = 'standard', n = 1 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    // Enhance the prompt for better product photography
    const enhancedPrompt = `Professional product photography: ${prompt}. High-quality studio lighting, clean background, commercial advertising style, sharp focus, vibrant colors, photorealistic, suitable for e-commerce and social media marketing.`;

    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: Math.min(n, 1), // DALL-E 3 only supports n=1
        size,
        quality,
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      console.error('OpenAI error:', data);
      return res.status(r.status).json({ error: data.error?.message || 'OpenAI request failed' });
    }

    res.json({
      success: true,
      images: data.data.map(img => ({ url: img.url, revised_prompt: img.revised_prompt })),
      count: data.data.length,
    });
  } catch (e) {
    console.error('Image generation error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Generate multiple product images for a slideshow video
app.post('/api/images/generate-batch', async (req, res) => {
  try {
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not set in Railway' });
    }

    const { productName, productDescription, count = 4 } = req.body;
    if (!productName) return res.status(400).json({ error: 'productName is required' });

    // Different angles/styles for variety in the slideshow
    const variations = [
      `${productName} on a person modeling, lifestyle shot, ${productDescription}`,
      `${productName} flat lay on neutral background, ${productDescription}`,
      `${productName} close-up detail shot showing texture and quality, ${productDescription}`,
      `${productName} in an aspirational lifestyle setting, ${productDescription}`,
    ].slice(0, Math.min(count, 4));

    const images = [];
    for (const variation of variations) {
      const enhancedPrompt = `Professional product photography: ${variation}. High-quality studio lighting, sharp focus, vibrant colors, photorealistic, e-commerce ready.`;
      
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        }),
      });

      const data = await r.json();
      if (r.ok && data.data?.[0]) {
        images.push({ url: data.data[0].url, prompt: variation });
      } else {
        console.error('Batch image error for variation:', variation, data);
      }
    }

    res.json({ success: true, images, count: images.length });
  } catch (e) {
    console.error('Batch image generation error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Shopify Agent v3 (Smart Router) on port ${PORT}`);
  console.log(`📍 Store: ${SHOPIFY_STORE}`);
  console.log(`🔑 Shopify: ${!!SHOPIFY_ACCESS_TOKEN} | Claude: ${!!ANTHROPIC_API_KEY} | OpenAI: ${!!OPENAI_API_KEY} | Printify: ${!!PRINTIFY_API_KEY} | TikTok: ${!!TIKTOK_ACCESS_TOKEN}`);
});

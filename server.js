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
const PRINTIFY_API_KEY = process.env.PRINTIFY_API_KEY;
const PRINTIFY_SHOP_ID = process.env.PRINTIFY_SHOP_ID;
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

let SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || null;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ========== HEALTH ==========
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    store: SHOPIFY_STORE,
    shopify_connected: !!SHOPIFY_ACCESS_TOKEN,
    claude_connected: !!ANTHROPIC_API_KEY,
    printify_connected: !!PRINTIFY_API_KEY,
    capabilities: {
      trend_discovery: !!ANTHROPIC_API_KEY,
      product_ideation: !!ANTHROPIC_API_KEY,
      printify_create: !!PRINTIFY_API_KEY,
      shopify_publish: !!SHOPIFY_ACCESS_TOKEN,
      tiktok_ad_copy: !!ANTHROPIC_API_KEY,
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
    const claude = getClaude();
    const r = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Trend: "${typeof trend === 'string' ? trend : JSON.stringify(trend)}"
Fulfillment method: ${fulfillmentMethod}

Generate 3 SPECIFIC product concepts for this trend using ${fulfillmentMethod}. Return JSON:

\`\`\`json
{
  "concepts": [
    {
      "title": "SEO-friendly product title (max 60 chars)",
      "description_html": "<p>Full Shopify HTML description with hooks, benefits, materials, target customer</p>",
      "design_brief": "Visual description if POD (colors, typography, imagery)",
      "supplier_search_terms": "Keywords to search on AliExpress/CJ if dropshipping",
      "digital_format": "PDF/PNG/Video if digital",
      "tagline": "Catchy one-liner",
      "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
      "price_usd": 29.99,
      "compare_at_price": 39.99,
      "tiktok_hook": "First 3-second video hook",
      "tiktok_caption": "Full caption with emojis (max 200 chars)",
      "tiktok_hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5",
      "tiktok_video_idea": "Brief video concept (e.g. 'Show before/after' or 'POV trend')",
      "fulfillment_steps": ["step 1 to actually create this", "step 2", "step 3"]
    }
  ]
}
\`\`\`

Return ONLY the JSON.`
      }]
    });
    const fullText = getAllText(r.content);
    const data = extractJSON(fullText);
    res.json(data || { concepts: [], error: 'Could not parse concepts' });
  } catch (e) { res.status(500).json({ error: e.message }); }
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
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      system, messages,
    });
    res.json({ reply: r.content[0].text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
  console.log(`🚀 Shopify Agent v3 (Smart Router) on port ${PORT}`);
  console.log(`📍 Store: ${SHOPIFY_STORE}`);
  console.log(`🔑 Shopify: ${!!SHOPIFY_ACCESS_TOKEN} | Claude: ${!!ANTHROPIC_API_KEY} | Printify: ${!!PRINTIFY_API_KEY}`);
});

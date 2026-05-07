// Shopify AI Agent Backend v2 - Full Pipeline
// Modules: Trend Discovery → Product Ideas → Printify → Shopify → TikTok Ad Copy

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

// ========== MIDDLEWARE ==========
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    store: SHOPIFY_STORE,
    shopify_connected: !!SHOPIFY_ACCESS_TOKEN,
    claude_connected: !!ANTHROPIC_API_KEY,
    printify_connected: !!PRINTIFY_API_KEY,
    message: 'Shopify Agent Backend v2 is running'
  });
});

// ========== SHOPIFY OAUTH ==========
app.get('/auth/shopify', (req, res) => {
  const redirectUri = `${APP_URL}/auth/callback`;
  const installUrl = `https://${SHOPIFY_STORE}/admin/oauth/authorize?` +
    `client_id=${SHOPIFY_CLIENT_ID}&scope=${SHOPIFY_SCOPES}&redirect_uri=${redirectUri}`;
  res.redirect(installUrl);
});

app.get('/auth/callback', async (req, res) => {
  const { code, shop } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');
  try {
    const tokenResponse = await axios.post(
      `https://${shop || SHOPIFY_STORE}/admin/oauth/access_token`,
      { client_id: SHOPIFY_CLIENT_ID, client_secret: SHOPIFY_CLIENT_SECRET, code }
    );
    SHOPIFY_ACCESS_TOKEN = tokenResponse.data.access_token;
    console.log('✅ Shopify access token obtained!');
    res.send(`<html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#0a150a;color:#96bf48;">
      <h1>✅ Shopify Connected!</h1>
      <p>Save this token in Railway as <strong>SHOPIFY_ACCESS_TOKEN</strong>:</p>
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
    method,
    url: `https://${SHOPIFY_STORE}/admin/api/2024-10/${endpoint}`,
    headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN, 'Content-Type': 'application/json' },
  };
  if (data) config.data = data;
  const r = await axios(config);
  return r.data;
}

async function printifyRequest(endpoint, method = 'GET', data = null) {
  if (!PRINTIFY_API_KEY) throw new Error('Printify not connected');
  const config = {
    method,
    url: `https://api.printify.com/v1/${endpoint}`,
    headers: { 'Authorization': `Bearer ${PRINTIFY_API_KEY}`, 'Content-Type': 'application/json' },
  };
  if (data) config.data = data;
  const r = await axios(config);
  return r.data;
}

function getClaudeClient() {
  if (!ANTHROPIC_API_KEY) throw new Error('Anthropic API key not configured');
  return new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// ========== SHOPIFY ENDPOINTS ==========
app.get('/api/products', async (req, res) => {
  try { res.json(await shopifyRequest('products.json?limit=50')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', async (req, res) => {
  try { res.json(await shopifyRequest(`orders.json?status=any&limit=50`)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/customers', async (req, res) => {
  try { res.json(await shopifyRequest('customers.json?limit=50')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ========== TREND DISCOVERY (Module 1) ==========
app.post('/api/trends/discover', async (req, res) => {
  try {
    const { niche = 'all niches', count = 5 } = req.body;
    const claude = getClaudeClient();
    
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Search the web for the TOP ${count} TRENDING product categories or items RIGHT NOW in ${niche} that would work great for print-on-demand (t-shirts, hoodies, mugs, posters, hats).

Use web search to look up:
- Current TikTok trending hashtags & viral content
- Google Trends rising searches
- Etsy bestsellers right now  
- Amazon Movers & Shakers
- Any hot cultural moments / memes / news driving merch sales

For each trending item, return JSON in this EXACT format:
\`\`\`json
{
  "trends": [
    {
      "name": "Trend name (e.g. 'Pickleball Apparel')",
      "category": "Sports / Pop Culture / Fashion / etc",
      "why_trending": "1-2 sentences why it's hot right now",
      "search_volume": "High / Medium / Rising",
      "competition": "Low / Medium / High",
      "best_products": ["t-shirt", "hoodie", "mug"],
      "target_audience": "Who buys this",
      "design_ideas": ["specific design idea 1", "specific design idea 2"]
    }
  ]
}
\`\`\`

Return ONLY the JSON, no other text.`
      }]
    });
    
    // Extract the JSON from response
    const textBlock = response.content.find(c => c.type === 'text');
    const text = textBlock?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const trends = jsonMatch ? JSON.parse(jsonMatch[0]) : { trends: [] };
    
    res.json(trends);
  } catch (err) {
    console.error('Trend discovery error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== PRODUCT IDEATION (Module 2) ==========
app.post('/api/trends/ideate', async (req, res) => {
  try {
    const { trend, productType = 't-shirt' } = req.body;
    if (!trend) return res.status(400).json({ error: 'trend is required' });
    
    const claude = getClaudeClient();
    const response = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `I want to create a PRINT-ON-DEMAND ${productType} based on this trend: "${trend}"

Generate 3 product concepts. For each, return JSON in this format:

\`\`\`json
{
  "concepts": [
    {
      "title": "Catchy product title (max 60 chars, SEO-friendly)",
      "description": "Compelling product description (150 words) for the Shopify listing - include benefits, materials, who it's for",
      "design_brief": "Detailed visual description of the design (what would be printed on it) - colors, style, composition, any text",
      "tagline": "Short marketing tagline",
      "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
      "price_usd": 29.99,
      "tiktok_hook": "First 3-second TikTok video hook",
      "tiktok_caption": "Full TikTok caption with emojis",
      "tiktok_hashtags": "#hashtag1 #hashtag2 #hashtag3"
    }
  ]
}
\`\`\`

Return ONLY the JSON.`
      }]
    });
    
    const text = response.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const concepts = jsonMatch ? JSON.parse(jsonMatch[0]) : { concepts: [] };
    res.json(concepts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PRINTIFY ENDPOINTS (Module 4) ==========
app.get('/api/printify/shops', async (req, res) => {
  try { res.json(await printifyRequest('shops.json')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/printify/products', async (req, res) => {
  try {
    const shopId = req.query.shop_id || PRINTIFY_SHOP_ID;
    res.json(await printifyRequest(`shops/${shopId}/products.json`));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get popular print-on-demand product types (blueprints)
app.get('/api/printify/blueprints', async (req, res) => {
  try { 
    const data = await printifyRequest('catalog/blueprints.json');
    // Return top 20 most common ones
    const popular = data.slice(0, 20).map(b => ({
      id: b.id, title: b.title, brand: b.brand, model: b.model
    }));
    res.json({ blueprints: popular });
  }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// Create a draft product on Printify (requires existing image already uploaded)
// For full automation, image generation would need to be added
app.post('/api/printify/create-draft', async (req, res) => {
  try {
    const shopId = req.query.shop_id || PRINTIFY_SHOP_ID;
    const { title, description, blueprint_id, print_provider_id, image_id, tags } = req.body;
    
    // This is a simplified draft - real implementation needs variants and print areas
    const product = {
      title, description, blueprint_id, print_provider_id, tags,
      variants: req.body.variants || [],
      print_areas: req.body.print_areas || []
    };
    
    res.json(await printifyRequest(`shops/${shopId}/products.json`, 'POST', product));
  } catch (err) {
    res.status(500).json({ error: err.message, hint: 'Image must be uploaded to Printify first' });
  }
});

// ========== SHOPIFY AUTO-PUBLISH (Module 5) ==========
app.post('/api/shopify/publish', async (req, res) => {
  try {
    const { title, body_html, vendor = 'UD Store', product_type, tags, variants } = req.body;
    const product = {
      product: {
        title,
        body_html: body_html || '',
        vendor,
        product_type: product_type || 'Apparel',
        tags: Array.isArray(tags) ? tags.join(', ') : tags,
        status: 'draft', // Start as draft for safety
        variants: variants || [{ price: '29.99', inventory_quantity: 100 }]
      }
    };
    res.json(await shopifyRequest('products.json', 'POST', product));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== UNIFIED CHAT (uses store data + AI) ==========
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, includeStoreData = true } = req.body;
    const claude = getClaudeClient();
    
    let systemPrompt = `You are an AI agent managing the Shopify store "UD" (${SHOPIFY_STORE}) for owner Udo.
You have FULL ACCESS to: Shopify products/orders/customers, Printify catalog, web search for trends.

CAPABILITIES YOU CAN OFFER:
- Find trending products to sell (call /api/trends/discover)
- Generate product concepts from trends
- Create products on Printify and publish to Shopify
- Generate TikTok ad copy

When the user asks about trends/what to sell, suggest they use the "Find Trends" button which triggers a real web search.
Be concise. Use markdown tables for data. Bold key facts with **text**.`;

    if (includeStoreData && SHOPIFY_ACCESS_TOKEN) {
      try {
        const [products, orders] = await Promise.all([
          shopifyRequest('products.json?limit=10'),
          shopifyRequest('orders.json?status=any&limit=10'),
        ]);
        systemPrompt += `\n\nLIVE PRODUCTS:\n${JSON.stringify(products.products.map(p => ({
          title: p.title, status: p.status, price: p.variants[0]?.price, stock: p.variants[0]?.inventory_quantity
        })))}\n\nRECENT ORDERS:\n${JSON.stringify(orders.orders.map(o => ({
          name: o.name, total: o.total_price, status: o.fulfillment_status || 'unfulfilled'
        })))}`;
      } catch (e) { console.log('Store data fetch failed:', e.message); }
    }

    const response = await claude.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    });
    res.json({ reply: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`🚀 Shopify Agent Backend v2 running on port ${PORT}`);
  console.log(`📍 Store: ${SHOPIFY_STORE}`);
  console.log(`🔑 Shopify: ${!!SHOPIFY_ACCESS_TOKEN} | Claude: ${!!ANTHROPIC_API_KEY} | Printify: ${!!PRINTIFY_API_KEY}`);
});

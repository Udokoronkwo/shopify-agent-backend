// Shopify AI Agent Backend
// Built for Udo's UD Store (ud-9851336705.myshopify.com)

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
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// In-memory token storage (in production, use a database)
let SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || null;

// ========== MIDDLEWARE ==========
app.use(cors({ origin: '*' }));
app.use(express.json());

// ========== HEALTH CHECK ==========
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    store: SHOPIFY_STORE,
    connected: !!SHOPIFY_ACCESS_TOKEN,
    message: 'Shopify Agent Backend is running'
  });
});

// ========== SHOPIFY OAUTH ==========
// Step 1: Redirect user to Shopify for authorization
app.get('/auth/shopify', (req, res) => {
  const redirectUri = `${APP_URL}/auth/callback`;
  const installUrl = `https://${SHOPIFY_STORE}/admin/oauth/authorize?` +
    `client_id=${SHOPIFY_CLIENT_ID}&` +
    `scope=${SHOPIFY_SCOPES}&` +
    `redirect_uri=${redirectUri}`;
  res.redirect(installUrl);
});

// Step 2: Handle Shopify callback and exchange code for token
app.get('/auth/callback', async (req, res) => {
  const { code, shop } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');

  try {
    const tokenResponse = await axios.post(
      `https://${shop || SHOPIFY_STORE}/admin/oauth/access_token`,
      {
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code: code,
      }
    );

    SHOPIFY_ACCESS_TOKEN = tokenResponse.data.access_token;
    console.log('✅ Shopify access token obtained!');
    
    res.send(`
      <html><body style="font-family:sans-serif;padding:40px;text-align:center;background:#0a150a;color:#96bf48;">
        <h1>✅ Shopify Connected!</h1>
        <p>Your access token has been saved.</p>
        <p style="color:#3a6a3a;">Token: ${SHOPIFY_ACCESS_TOKEN.substring(0, 12)}...</p>
        <p><strong>IMPORTANT:</strong> Copy this full token and save it as SHOPIFY_ACCESS_TOKEN in Railway environment variables to persist it:</p>
        <code style="background:#1a2e1a;padding:12px;display:block;margin:20px;border-radius:8px;word-break:break-all;">${SHOPIFY_ACCESS_TOKEN}</code>
        <p>You can close this tab now.</p>
      </body></html>
    `);
  } catch (err) {
    console.error('OAuth error:', err.response?.data || err.message);
    res.status(500).send('OAuth failed: ' + (err.response?.data?.error_description || err.message));
  }
});

// ========== SHOPIFY API HELPERS ==========
async function shopifyRequest(endpoint, method = 'GET', data = null) {
  if (!SHOPIFY_ACCESS_TOKEN) {
    throw new Error('Not authenticated. Visit /auth/shopify to connect your store.');
  }

  const config = {
    method,
    url: `https://${SHOPIFY_STORE}/admin/api/2024-10/${endpoint}`,
    headers: {
      'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
  };
  if (data) config.data = data;

  const response = await axios(config);
  return response.data;
}

// ========== PRODUCT ENDPOINTS ==========
app.get('/api/products', async (req, res) => {
  try {
    const data = await shopifyRequest('products.json?limit=50');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const data = await shopifyRequest(`products/${req.params.id}.json`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const data = await shopifyRequest(`products/${req.params.id}.json`, 'PUT', { product: req.body });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== ORDER ENDPOINTS ==========
app.get('/api/orders', async (req, res) => {
  try {
    const status = req.query.status || 'any';
    const data = await shopifyRequest(`orders.json?status=${status}&limit=50`);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders/:id/fulfill', async (req, res) => {
  try {
    const data = await shopifyRequest(
      `orders/${req.params.id}/fulfillments.json`,
      'POST',
      { fulfillment: { notify_customer: true } }
    );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CUSTOMER ENDPOINTS ==========
app.get('/api/customers', async (req, res) => {
  try {
    const data = await shopifyRequest('customers.json?limit=50');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== INVENTORY ENDPOINTS ==========
app.get('/api/inventory', async (req, res) => {
  try {
    const products = await shopifyRequest('products.json?limit=50');
    const inventory = products.products.map(p => ({
      id: p.id,
      title: p.title,
      variants: p.variants.map(v => ({
        title: v.title,
        sku: v.sku,
        inventory_quantity: v.inventory_quantity,
        price: v.price,
      })),
    }));
    res.json({ inventory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== CLAUDE AI CHAT ==========
app.post('/api/chat', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const { messages, includeStoreData = true } = req.body;
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    let systemPrompt = `You are an AI agent managing the Shopify store "UD" (${SHOPIFY_STORE}) for owner Udo.
You have access to live store data via API. Be concise, use markdown tables for data, bold key facts with **text**.
For TikTok ads, give: hook, caption, hashtags, targeting tips.`;

    // Optionally fetch live store data to include in context
    if (includeStoreData && SHOPIFY_ACCESS_TOKEN) {
      try {
        const [products, orders] = await Promise.all([
          shopifyRequest('products.json?limit=10'),
          shopifyRequest('orders.json?status=any&limit=10'),
        ]);
        systemPrompt += `\n\nCURRENT PRODUCTS:\n${JSON.stringify(products.products.map(p => ({
          title: p.title, status: p.status, price: p.variants[0]?.price, stock: p.variants[0]?.inventory_quantity
        })))}\n\nRECENT ORDERS:\n${JSON.stringify(orders.orders.map(o => ({
          name: o.name, customer: o.customer?.first_name + ' ' + o.customer?.last_name, total: o.total_price, status: o.fulfillment_status || 'unfulfilled'
        })))}`;
      } catch (e) {
        console.log('Could not fetch live data:', e.message);
      }
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    });

    res.json({ reply: response.content[0].text });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== TIKTOK ENDPOINTS (placeholder for now) ==========
app.post('/api/tiktok/draft', (req, res) => {
  // TikTok requires Marketing API approval which takes 2-4 weeks
  // For now, this returns a draft ad ready to copy/paste
  res.json({
    status: 'draft',
    message: 'TikTok Marketing API requires approval. Use the generated ad copy below to post manually.',
    ad: req.body,
  });
});

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`🚀 Shopify Agent Backend running on port ${PORT}`);
  console.log(`📍 Store: ${SHOPIFY_STORE}`);
  console.log(`🔑 Connected: ${!!SHOPIFY_ACCESS_TOKEN}`);
  console.log(`\n👉 Visit ${APP_URL}/auth/shopify to connect your store`);
});

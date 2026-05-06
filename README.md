# UD Shopify AI Agent — Backend

Backend server that connects the Shopify AI Agent to:
- 🛍️ Shopify Admin API (live store data)
- 🤖 Claude AI (intelligent responses)
- 🎵 TikTok Marketing API (ad management)

## Setup (Railway — no local install needed)

### 1. Get a Claude API Key
- Go to https://console.anthropic.com
- Sign up / log in
- Go to **API Keys** → **Create Key**
- Copy the key (starts with `sk-ant-...`)

### 2. Push this code to GitHub
- Create a new repo on github.com
- Upload all these files (drag and drop in the GitHub web UI works)
- ⚠️ Never commit a `.env` file with real values!

### 3. Deploy to Railway
- Go to https://railway.app
- Sign up with GitHub
- Click **New Project** → **Deploy from GitHub repo**
- Select this repo
- Railway will automatically detect Node.js and deploy

### 4. Set Environment Variables in Railway
- Go to your project → **Variables** tab
- Add these (get values from your own Shopify Dev Dashboard and Anthropic Console):
  - `SHOPIFY_STORE` (e.g. your-store.myshopify.com)
  - `SHOPIFY_CLIENT_ID`
  - `SHOPIFY_CLIENT_SECRET`
  - `ANTHROPIC_API_KEY`
  - `APP_URL` (your Railway public URL)

### 5. Update Shopify App Callback URL
- Go to https://dev.shopify.com → your app → Versions → Create new version
- Set **App URL** to your Railway URL
- Add **Allowed redirection URL**: `{your-railway-url}/auth/callback`
- Click **Release**

### 6. Connect Your Store
- Visit `{your-railway-url}/auth/shopify` in browser
- Approve the install
- Copy the displayed access token
- Add it to Railway as `SHOPIFY_ACCESS_TOKEN`
- Restart Railway deployment

### 7. Done!
Your backend is live. Now use the agent widget that calls `{your-railway-url}/api/chat`.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/auth/shopify` | GET | Start OAuth flow |
| `/auth/callback` | GET | OAuth callback |
| `/api/products` | GET | List products |
| `/api/products/:id` | GET/PUT | Get/update product |
| `/api/orders` | GET | List orders |
| `/api/orders/:id/fulfill` | POST | Fulfill order |
| `/api/customers` | GET | List customers |
| `/api/inventory` | GET | Inventory levels |
| `/api/chat` | POST | Chat with Claude AI |

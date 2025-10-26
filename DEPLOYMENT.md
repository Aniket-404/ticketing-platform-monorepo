# Deployment Guide for Render

This guide will help you deploy the Ticketing Platform to Render.

## Prerequisites

- A Render account (https://render.com)
- Your code pushed to a GitHub repository
- pnpm installed on your local machine for testing

## Quick Deploy

### Option 1: Using render.yaml (Recommended)

1. **Connect your GitHub repository to Render**
   - Go to https://dashboard.render.com
   - Click "New" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect the `render.yaml` file

2. **Configure Environment Variables**
   The following variables will be auto-configured from `render.yaml`:
   - `NODE_ENV=production`
   - `PORT=4000` (API)
   - `DATABASE_URL` (auto-generated from PostgreSQL service)
   - `NEXT_PUBLIC_API_URL` (update with your actual API URL after deployment)
   - Pricing weights (PRICING_WEIGHT_DEMAND, PRICING_WEIGHT_TIME, PRICING_WEIGHT_INVENTORY)

3. **Deploy**
   - Click "Apply" to create all services
   - Wait for the build to complete (~5-10 minutes)

### Option 2: Manual Setup

#### Step 1: Create PostgreSQL Database

1. Go to Render Dashboard → New → PostgreSQL
2. Configure:
   - Name: `ticketing-db`
   - Database: `ticketing_platform`
   - User: `ticketing_user`
   - Region: Oregon (or your preferred region)
   - Plan: Free
3. Click "Create Database"
4. Copy the **Internal Database URL** for later use

#### Step 2: Deploy Backend API

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `ticketing-api`
   - **Runtime**: Node
   - **Region**: Oregon (same as database)
   - **Branch**: `deploy`
   - **Root Directory**: (leave empty)
   - **Build Command**: `pnpm install && pnpm --filter api build`
   - **Start Command**: `cd apps/api && node dist/index.js`
   - **Plan**: Free

4. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=<paste your database internal URL>
   PRICING_WEIGHT_DEMAND=0.3
   PRICING_WEIGHT_TIME=0.2
   PRICING_WEIGHT_INVENTORY=0.5
   ```

5. Click "Create Web Service"
6. Wait for deployment to complete
7. Copy your API URL (e.g., `https://ticketing-api.onrender.com`)

#### Step 3: Deploy Frontend

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository (same repo)
3. Configure:
   - **Name**: `ticketing-web`
   - **Runtime**: Node
   - **Region**: Oregon
   - **Branch**: `deploy`
   - **Root Directory**: (leave empty)
   - **Build Command**: `pnpm install && pnpm --filter web build`
   - **Start Command**: `cd apps/web && pnpm start`
   - **Plan**: Free

4. Add Environment Variables:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_API_URL=<paste your API URL from Step 2>
   ```

5. Click "Create Web Service"
6. Wait for deployment to complete

#### Step 4: Run Database Migrations

After the API is deployed, you need to run migrations:

1. Go to your API service in Render Dashboard
2. Click "Shell" tab to open a console
3. Run:
   ```bash
   cd packages/database
   pnpm db:migrate
   pnpm db:seed
   ```

Or run migrations locally:
```bash
DATABASE_URL=<your-render-database-url> pnpm --filter @repo/database db:migrate
DATABASE_URL=<your-render-database-url> pnpm --filter @repo/database db:seed
```

## Post-Deployment

### Test Your Deployment

1. **Test API Health**
   ```bash
   curl https://ticketing-api.onrender.com/health
   ```
   Should return: `{"status":"ok","message":"API server is running",...}`

2. **Visit Frontend**
   Open your frontend URL in a browser (e.g., `https://ticketing-web.onrender.com`)

3. **Test Booking Flow**
   - Navigate to Events page
   - Select an event
   - Try booking tickets
   - Verify everything works

### Update API URL in Frontend

If you deployed manually, make sure to update the `NEXT_PUBLIC_API_URL` in your frontend service to point to your actual API URL.

## Important Notes

⚠️ **Free Tier Limitations:**
- Services spin down after 15 minutes of inactivity
- First request after spin-down will be slow (cold start ~30 seconds)
- Database has 1GB storage limit
- 750 hours/month free

📝 **Environment Variables:**
- Never commit `.env` files with real credentials
- Use Render's environment variable settings
- Database URL is automatically injected by Render

🔄 **Auto-Deploy:**
- Render can auto-deploy on git push to your deploy branch
- Enable this in your service settings

## Troubleshooting

### Build Fails

**Error**: `pnpm: command not found`
- Render uses npm by default. The build commands install pnpm first.

**Error**: Cannot find module
- Make sure workspace dependencies are properly configured
- Check that `pnpm install` runs from the root directory

### Database Connection Issues

**Error**: Connection timeout
- Make sure you're using the **Internal Database URL** for the API
- Verify both API and database are in the same region

### API Not Responding

1. Check logs in Render Dashboard
2. Verify PORT environment variable is set to 4000
3. Test health endpoint: `/health`

### Frontend Can't Connect to API

1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Make sure API service is running
3. Check CORS settings in the API

## Cost Optimization

For production use beyond free tier:

1. **Upgrade to Paid Plans** ($7-25/month per service)
   - No cold starts
   - More resources
   - Better performance

2. **Use Render's CDN** for static assets

3. **Enable Caching** for API responses

## Support

- Render Docs: https://render.com/docs
- Support: https://render.com/support

---

**Happy Deploying! 🚀**

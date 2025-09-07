# Cloudflare Workers Deployment Script
# This deploys your proxy with built-in ISP bypass to Cloudflare's global network

# Install Wrangler CLI if not already installed
if (!(Get-Command wrangler -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Wrangler CLI..." -ForegroundColor Green
    npm install -g wrangler
}

# Set Cloudflare environment variables
$env:NITRO_PRESET = "cloudflare-pages"

Write-Host "🌐 Building Simple Proxy for Cloudflare Workers with ISP Bypass..." -ForegroundColor Cyan

# Build for Cloudflare
pnpm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build successful!" -ForegroundColor Green
    
    Write-Host "🚀 Deploying to Cloudflare Workers..." -ForegroundColor Cyan
    
    # Deploy to Cloudflare Workers
    # Note: You'll need to configure your Cloudflare account first with:
    # wrangler login
    # wrangler pages project create simple-proxy-bypass
    
    wrangler pages deploy .output/public --project-name=simple-proxy-bypass --compatibility-date=2023-05-18
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🎉 Deployment successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your proxy is now running on Cloudflare's global network with built-in ISP bypass!" -ForegroundColor Yellow
        Write-Host "This will bypass ISP blocking for:" -ForegroundColor White
        Write-Host "  ✅ TMDB API calls" -ForegroundColor Green
        Write-Host "  ✅ M3U8 playlist requests" -ForegroundColor Green
        Write-Host "  ✅ TS video segment requests" -ForegroundColor Green
        Write-Host "  ✅ All proxy requests route through Cloudflare's edge network" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Update your player backend config to use the Cloudflare URL" -ForegroundColor White
        Write-Host "2. Set your TMDB_API_KEY environment variable in Cloudflare dashboard" -ForegroundColor White
        Write-Host "3. Test video playback - ISP blocks should be completely bypassed!" -ForegroundColor White
    } else {
        Write-Host "❌ Deployment failed" -ForegroundColor Red
        Write-Host "Make sure you've configured Wrangler with: wrangler login" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Build failed" -ForegroundColor Red
}

Write-Host ""
Write-Host "Manual deployment commands:" -ForegroundColor Gray
Write-Host "wrangler login" -ForegroundColor DarkGray
Write-Host "wrangler pages project create simple-proxy-bypass" -ForegroundColor DarkGray
Write-Host "wrangler pages deploy .output/public --project-name=simple-proxy-bypass" -ForegroundColor DarkGray

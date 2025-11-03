# GitHub Pages 自動部署腳本
# MP4 to MP3 Splitter

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MP4 to MP3 Splitter - 部署腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$repoName = "mp4-to-mp3-splitter"
$currentDir = Get-Location

# 檢查是否在正確的目錄
if (-not (Test-Path "package.json")) {
    Write-Host "錯誤: 請在專案根目錄執行此腳本" -ForegroundColor Red
    exit 1
}

Write-Host "[1/5] 檢查 Git 狀態..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    Write-Host "初始化 Git 儲存庫..." -ForegroundColor Green
    git init
}

# 檢查是否有未提交的變更
$status = git status --porcelain
if ($status) {
    Write-Host "發現未提交的變更，正在添加..." -ForegroundColor Yellow
    git add .
    git commit -m "Update: Prepare for deployment"
}

# 添加 DEPLOY.md 和 deploy.ps1 到 Git
git add DEPLOY.md DEPLOY_INSTRUCTIONS.md deploy.ps1 -ErrorAction SilentlyContinue
git commit -m "Add deployment scripts" -ErrorAction SilentlyContinue

Write-Host "[2/5] 檢查分支..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "切換到 main 分支..." -ForegroundColor Yellow
    git branch -M main
}

Write-Host "[3/5] 檢查遠端儲存庫..." -ForegroundColor Yellow
$remoteUrl = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "需要設定 GitHub 遠端儲存庫" -ForegroundColor Yellow
    Write-Host ""
    $githubUsername = Read-Host "請輸入您的 GitHub 用戶名"
    
    if ($githubUsername) {
        $remoteUrl = "https://github.com/$githubUsername/$repoName.git"
        Write-Host "添加遠端儲存庫: $remoteUrl" -ForegroundColor Green
        git remote add origin $remoteUrl
        
        Write-Host ""
        Write-Host "⚠️  請先在 GitHub 上建立儲存庫: $repoName" -ForegroundColor Yellow
        Write-Host "   網址: https://github.com/new" -ForegroundColor Cyan
        Write-Host ""
        $continue = Read-Host "已在 GitHub 建立儲存庫？(Y/N)"
        
        if ($continue -ne "Y" -and $continue -ne "y") {
            Write-Host "部署已取消" -ForegroundColor Red
            exit 0
        }
    } else {
        Write-Host "錯誤: 未輸入用戶名" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "遠端儲存庫已設定: $remoteUrl" -ForegroundColor Green
}

Write-Host "[4/5] 推送到 GitHub..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "[5/5] 完成！" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  部署完成！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($remoteUrl) {
        $repoUrl = $remoteUrl -replace '\.git$', ''
        Write-Host "下一步:" -ForegroundColor Yellow
        Write-Host "1. 前往: $repoUrl/settings/pages" -ForegroundColor Cyan
        Write-Host "2. 設定 GitHub Pages:" -ForegroundColor Yellow
        Write-Host "   - Source: Deploy from a branch" -ForegroundColor White
        Write-Host "   - Branch: main" -ForegroundColor White
        Write-Host "   - Folder: / (root)" -ForegroundColor White
        Write-Host "3. 點擊 Save" -ForegroundColor White
        Write-Host ""
        Write-Host "部署完成後，訪問:" -ForegroundColor Yellow
        $username = ($remoteUrl -split '/')[-2]
        Write-Host "   https://$username.github.io/$repoName/" -ForegroundColor Cyan
    }
} else {
    Write-Host "推送失敗，請檢查錯誤訊息" -ForegroundColor Red
}


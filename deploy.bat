@echo off
chcp 65001 >nul
echo ========================================
echo   MP4 to MP3 Splitter - 部署腳本
echo ========================================
echo.

cd /d "%~dp0"

echo [1/5] 檢查 Git 狀態...
if not exist ".git" (
    echo 初始化 Git 儲存庫...
    git init
)

echo.
echo [2/5] 添加檔案...
git add .

echo [3/5] 提交變更...
git commit -m "Initial commit: MP4 to MP3 Splitter" 2>nul

echo [4/5] 設定分支...
git branch -M main

echo.
echo [5/5] 準備推送到 GitHub...
echo.
echo 請先執行以下步驟:
echo 1. 前往 https://github.com/new
echo 2. 建立新儲存庫，名稱: mp4-to-mp3-splitter
echo 3. 不要勾選 "Initialize this repository with a README"
echo 4. 點擊 "Create repository"
echo.
set /p github_user="請輸入您的 GitHub 用戶名: "

if "%github_user%"=="" (
    echo 錯誤: 未輸入用戶名
    pause
    exit /b 1
)

echo.
echo 設定遠端儲存庫...
git remote remove origin 2>nul
git remote add origin https://github.com/%github_user%/mp4-to-mp3-splitter.git

echo.
echo 推送到 GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   推送成功！
    echo ========================================
    echo.
    echo 下一步:
    echo 1. 前往: https://github.com/%github_user%/mp4-to-mp3-splitter/settings/pages
    echo 2. 設定 GitHub Pages:
    echo    - Source: Deploy from a branch
    echo    - Branch: main
    echo    - Folder: / (root)
    echo 3. 點擊 Save
    echo.
    echo 部署完成後訪問:
    echo    https://%github_user%.github.io/mp4-to-mp3-splitter/
) else (
    echo.
    echo 推送失敗，請檢查:
    echo 1. GitHub 儲存庫是否已建立
    echo 2. 網路連線是否正常
    echo 3. Git 憑證是否正確設定
)

echo.
pause


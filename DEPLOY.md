# GitHub Pages 部署說明

## 專案已準備就緒！

專案已重新命名為：**mp4-to-mp3-splitter**

## 部署步驟

### 1. 在 GitHub 上建立新儲存庫

1. 前往 https://github.com/new
2. 儲存庫名稱：`mp4-to-mp3-splitter`
3. 選擇 Public 或 Private
4. **不要**勾選 "Initialize this repository with a README"
5. 點擊 "Create repository"

### 2. 推送到 GitHub

在專案目錄中執行：

```bash
cd c:\Users\atax1\Downloads\轉mp3\mp4-to-mp3-splitter

# 添加遠端儲存庫（替換 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/mp4-to-mp3-splitter.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

### 3. 啟用 GitHub Pages

1. 前往儲存庫的 **Settings**
2. 選擇左側的 **Pages**
3. 設定：
   - **Source**: Deploy from a branch
   - **Branch**: main
   - **Folder**: / (root)
4. 點擊 **Save**

### 4. 等待部署完成

- 通常 1-2 分鐘內完成
- 訪問：`https://YOUR_USERNAME.github.io/mp4-to-mp3-splitter/`

## 自動部署

如果已設定 `.github/workflows/deploy.yml`，之後每次推送到 main 分支會自動部署。


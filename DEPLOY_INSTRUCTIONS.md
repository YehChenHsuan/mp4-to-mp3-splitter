# 🚀 GitHub Pages 部署說明

## 專案名稱
**mp4-to-mp3-splitter**

## 快速部署步驟

### 方式 1: 使用自動部署腳本（推薦）

```powershell
cd c:\Users\atax1\Downloads\轉mp3\MP4_to_3_Split_30min
.\deploy.ps1
```

腳本會自動：
1. ✅ 檢查 Git 狀態
2. ✅ 提交變更
3. ✅ 設定遠端儲存庫
4. ✅ 推送到 GitHub

### 方式 2: 手動部署

#### 步驟 1: 在 GitHub 建立儲存庫

1. 前往 https://github.com/new
2. **Repository name**: `mp4-to-mp3-splitter`
3. 選擇 **Public** 或 **Private**
4. **不要**勾選 "Initialize this repository with a README"
5. 點擊 **Create repository**

#### 步驟 2: 推送到 GitHub

```bash
cd c:\Users\atax1\Downloads\轉mp3\MP4_to_3_Split_30min

# 設定遠端儲存庫（替換 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/mp4-to-mp3-splitter.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

#### 步驟 3: 啟用 GitHub Pages

1. 前往儲存庫：`https://github.com/YOUR_USERNAME/mp4-to-mp3-splitter`
2. 點擊 **Settings** 標籤
3. 選擇左側選單的 **Pages**
4. 設定：
   - **Source**: Deploy from a branch
   - **Branch**: main
   - **Folder**: / (root)
5. 點擊 **Save**

#### 步驟 4: 等待部署

- 通常 1-2 分鐘內完成
- 訪問：`https://YOUR_USERNAME.github.io/mp4-to-mp3-splitter/`

## 自動部署（已設定）

專案已包含 `.github/workflows/deploy.yml`，之後每次推送到 main 分支會自動部署。

## 驗證部署

部署完成後測試：
- ✅ 頁面正常載入
- ✅ 選擇 MP4 檔案
- ✅ FFmpeg 正常載入（不會有 CORS 錯誤）
- ✅ 轉換和分割功能正常

---

**注意**: GitHub Pages 使用 HTTPS，不會有本地測試時的 CORS 問題！


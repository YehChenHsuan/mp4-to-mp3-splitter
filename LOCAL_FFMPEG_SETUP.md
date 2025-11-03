# 本地化 FFmpeg 檔案以解決 GitHub Pages CORS 問題

## 問題說明

FFmpeg.wasm 在 GitHub Pages 上遇到 Worker CORS 問題，即使使用 blob URL 也無法解決，因為 FFmpeg 類的內部實現會自動嘗試從特定路徑載入 worker.js。

## 解決方案：將 FFmpeg 檔案本地化

### 步驟 1: 下載必要的檔案

在專案中建立 `ffmpeg/` 目錄，並下載以下檔案：

1. **從 CDN 下載檔案**：
   - `ffmpeg-core.js` (約 8-10 MB)
   - `ffmpeg-core.wasm` (約 25-30 MB)  
   - `worker.js` (如果需要的話，約 50-100 KB)

### 步驟 2: 下載腳本

您可以手動下載或使用以下 PowerShell 腳本：

```powershell
# 建立目錄
New-Item -ItemType Directory -Path "ffmpeg" -Force

# 下載檔案
$baseUrl = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"
Invoke-WebRequest -Uri "$baseUrl/ffmpeg-core.js" -OutFile "ffmpeg/ffmpeg-core.js"
Invoke-WebRequest -Uri "$baseUrl/ffmpeg-core.wasm" -OutFile "ffmpeg/ffmpeg-core.wasm"

# 下載 worker (如果需要)
$workerUrl = "https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/worker.js"
Invoke-WebRequest -Uri $workerUrl -OutFile "ffmpeg/worker.js"
```

### 步驟 3: 修改 app.js

修改 `loadFFmpeg()` 方法，使用本地檔案而非 CDN：

```javascript
const loadOptions = {
    coreURL: './ffmpeg/ffmpeg-core.js',
    wasmURL: './ffmpeg/ffmpeg-core.wasm',
    workerURL: './ffmpeg/worker.js' // 如果需要
};
```

## 替代方案：使用其他託管服務

如果 GitHub Pages 的限制太多，可以考慮：

1. **Netlify** - 支援自訂 HTTP 標頭
2. **Vercel** - 更好的 Worker 支援
3. **Cloudflare Pages** - 對 WASM 支援良好


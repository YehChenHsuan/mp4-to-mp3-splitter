// -*- coding: utf-8 -*-
// 動態載入 FFmpeg 模組
let FFmpeg, fetchFile, toBlobURL;

async function loadFFmpegModules() {
    if (FFmpeg) return; // 已載入
    
    const cdnPaths = [
        {
            name: 'unpkg ESM (index.js)',
            ffmpeg: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js',
            util: 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js'
        },
        {
            name: 'jsdelivr ESM (index.js)',
            ffmpeg: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js',
            util: 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js'
        },
        {
            name: 'unpkg UMD',
            ffmpeg: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js',
            util: 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/util.js'
        }
    ];
    
    for (const cdn of cdnPaths) {
        try {
            console.log(`嘗試從 ${cdn.name} 載入 FFmpeg...`);
            
            const ffmpegModule = await import(cdn.ffmpeg);
            const utilModule = await import(cdn.util);
            
            // 嘗試不同的導出名稱
            FFmpeg = ffmpegModule.FFmpeg || ffmpegModule.default?.FFmpeg || ffmpegModule.default;
            fetchFile = utilModule.fetchFile || utilModule.default?.fetchFile;
            toBlobURL = utilModule.toBlobURL || utilModule.default?.toBlobURL;
            
            if (FFmpeg && fetchFile && toBlobURL) {
                console.log(`✓ FFmpeg 模組已從 ${cdn.name} 成功載入`);
                return;
            } else {
                console.warn(`${cdn.name}: 模組載入但缺少必要的匯出`);
            }
        } catch (error) {
            console.warn(`${cdn.name} 載入失敗:`, error.message);
            continue;
        }
    }
    
    throw new Error('無法從任何 CDN 載入 FFmpeg 模組。請檢查網路連線。');
}

class MP4Converter {
    constructor() {
        this.ffmpeg = null;
        this.ffmpegLoaded = false;
        this.currentFile = null;
        this.outputFiles = [];
        this.isProcessing = false;
        this.blobURLs = []; // 追蹤所有建立的 blob URLs 以便清理

        this.initElements();
        this.setupEventListeners();
        // 非同步初始化 FFmpeg，不阻塞主要功能
        this.initFFmpeg().catch(err => {
            console.warn('FFmpeg initialization deferred:', err);
        });
    }

    async initFFmpeg() {
        try {
            // 非同步載入，不阻塞初始化
            await loadFFmpegModules();
            if (FFmpeg) {
                // 在 HTTP localhost 環境下禁用 worker 以避免 CORS 問題
                const isLocalhost = window.location.protocol === 'http:' && 
                                    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                
                if (isLocalhost) {
                    console.log('檢測到 HTTP localhost，將使用主線程模式以避免 CORS 問題');
                    // FFmpeg 會自動在主線程運行，不需要特別設定
                }
                
                // 創建 FFmpeg 實例，使用單線程模式（不提供 worker 選項）
                this.ffmpeg = new FFmpeg({
                    // 明確禁用 Worker，強制使用主線程模式
                    // 不設置任何 Worker 相關選項
                });
                this.setupFFmpegLogging();
                console.log('FFmpeg instance created');
            } else {
                console.warn('FFmpeg class not available, will load on demand');
            }
        } catch (error) {
            console.warn('Failed to initialize FFmpeg (will load on demand):', error);
            // 不拋出錯誤，允許應用程式繼續運作
        }
    }

    setupFFmpegLogging() {
        if (this.ffmpeg) {
            this.ffmpeg.on('log', ({ message }) => {
                console.log(message);
            });
        }
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.infoSection = document.getElementById('infoSection');
        this.progressSection = document.getElementById('progressSection');
        this.resultsSection = document.getElementById('resultsSection');
        this.actionsSection = document.getElementById('actionsSection');
        
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.audioDuration = document.getElementById('audioDuration');
        this.expectedParts = document.getElementById('expectedParts');

        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.progressStatus = document.getElementById('progressStatus');

        this.resultsList = document.getElementById('resultsList');
        this.processBtn = document.getElementById('processBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.downloadAllBtn = document.getElementById('downloadAllBtn');

        // 設定選項
        this.segmentLengthSelect = document.getElementById('segmentLength');
        this.audioBitrateSelect = document.getElementById('audioBitrate');
    }

    setupEventListeners() {
        // 檔案選擇按鈕
        const selectFileBtn = document.getElementById('selectFileBtn');
        if (selectFileBtn) {
            selectFileBtn.addEventListener('click', () => {
                this.fileInput.click();
            });
        }

        // 檔案選擇
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // 拖放功能
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('video/') || file.name.endsWith('.mp4')) {
                    this.handleFileSelect(file);
                } else {
                    alert('請選擇 MP4 檔案！');
                }
            }
        });

        this.uploadArea.addEventListener('click', () => {
            this.fileInput.click();
        });

        // 處理按鈕
        this.processBtn.addEventListener('click', () => {
            this.processFile();
        });

        // 重置按鈕
        this.resetBtn.addEventListener('click', () => {
            this.reset();
        });

        // 下載全部按鈕
        this.downloadAllBtn.addEventListener('click', () => {
            this.downloadAll();
        });

        // 設定選項變更時更新預計分割檔數
        this.segmentLengthSelect.addEventListener('change', () => {
            this.updateExpectedParts();
        });

        // FFmpeg 進度監聽（已在 initFFmpeg 中設定）
    }

    updateExpectedParts() {
        // 如果有音訊時長資訊，更新預計分割檔數
        const durationText = this.audioDuration.textContent;
        if (durationText && durationText !== '計算中...' && durationText !== '處理時計算') {
            // 從 HTML5 Video API 取得的時長資訊重新計算
            if (this.currentFile && this.currentFile._duration) {
                const segmentLength = parseInt(this.segmentLengthSelect.value);
                const parts = Math.ceil(this.currentFile._duration / segmentLength);
                this.expectedParts.textContent = `${parts} 個檔案`;
            }
        }
    }

    async loadFFmpeg() {
        if (this.ffmpegLoaded && this.ffmpeg) return;

        // 確保模組已載入
        if (!FFmpeg || !toBlobURL) {
            console.log('Loading FFmpeg modules...');
            await loadFFmpegModules();
        }

        if (!this.ffmpeg) {
            await this.initFFmpeg();
        }

        if (!this.ffmpeg) {
            throw new Error('FFmpeg instance not available');
        }

        if (this.progressSection.style.display !== 'none') {
            this.progressStatus.textContent = '正在載入 FFmpeg.wasm...';
        }

        try {
            console.log('開始載入 FFmpeg core (單線程版本，無需 Worker)...');

            // 使用單線程版本的 core 完全避免 Worker CORS 問題
            const baseURL = 'https://unpkg.com/@ffmpeg/core-st@0.12.6/dist/esm';

            console.log('正在下載 FFmpeg core 檔案（單線程版本）...');
            const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
            const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

            // 追蹤 blob URLs 以便清理
            this.blobURLs.push(coreURL, wasmURL);

            console.log('✓ FFmpeg core 檔案已轉換為 blob URLs');
            console.log('正在初始化 FFmpeg（單線程模式）...');

            // 載入 FFmpeg（單線程版本，不使用 Worker）
            await this.ffmpeg.load({
                coreURL: coreURL,
                wasmURL: wasmURL
            });

            this.ffmpegLoaded = true;
            console.log('✓ FFmpeg 已成功載入（單線程模式）');

        } catch (error) {
            console.error('Failed to load FFmpeg:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack
            });
            alert('載入 FFmpeg 失敗：' + error.message + '\n\n請檢查網路連線後重新整理頁面');
            throw error;
        }
    }


    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours} 小時 ${minutes} 分鐘 ${secs} 秒`;
        } else if (minutes > 0) {
            return `${minutes} 分鐘 ${secs} 秒`;
        } else {
            return `${secs} 秒`;
        }
    }

    async handleFileSelect(file) {
        console.log('handleFileSelect called with file:', file?.name);
        
        if (!file) {
            console.error('No file provided');
            return;
        }
        
        // 安全驗證：檔案類型檢查
        const allowedTypes = ['video/mp4', 'video/x-m4v'];
        const allowedExtensions = ['.mp4', '.m4v'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        
        if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            alert('請選擇 MP4 格式的影片檔案！');
            return;
        }
        
        // 安全驗證：檔案大小檢查（建議不超過 2GB，硬限制 4GB）
        const hardLimit = 4 * 1024 * 1024 * 1024; // 4GB 絕對上限
        const recommendedLimit = 2 * 1024 * 1024 * 1024; // 2GB 建議上限

        if (file.size > hardLimit) {
            alert(`檔案大小為 ${this.formatFileSize(file.size)}，超過 4GB 硬限制。\n\n這會導致瀏覽器崩潰。請使用較小的檔案。`);
            this.fileInput.value = ''; // 清除檔案選擇
            return;
        }

        if (file.size > recommendedLimit) {
            const proceed = confirm(
                `⚠️ 警告：檔案大小為 ${this.formatFileSize(file.size)}，超過建議的 2GB 上限。\n\n` +
                `處理大型檔案可能會：\n` +
                `• 導致瀏覽器變慢或無回應\n` +
                `• 佔用大量記憶體\n` +
                `• 處理時間很長\n\n` +
                `是否仍要繼續？`
            );
            if (!proceed) {
                this.fileInput.value = ''; // 清除檔案選擇
                return;
            }
        }
        
        // 安全驗證：檔案名稱清理（防止 XSS）
        const sanitizedFileName = file.name.replace(/[<>:"/\\|?*]/g, '_');

        this.currentFile = file;
        
        try {
            // 顯示檔案資訊（使用清理後的檔名）
            this.fileName.textContent = sanitizedFileName;
            this.fileSize.textContent = this.formatFileSize(file.size);
            this.audioDuration.textContent = '計算中...';
            this.expectedParts.textContent = '計算中...';
            
            this.infoSection.style.display = 'block';
            this.actionsSection.style.display = 'block';
            this.processBtn.disabled = false;
            
            console.log('File info displayed successfully');
        } catch (error) {
            console.error('Error displaying file info:', error);
            alert('顯示檔案資訊時發生錯誤');
        }

        // 預載入 FFmpeg（非同步，不阻塞 UI）
        this.loadFFmpeg().catch(err => {
            console.warn('FFmpeg preload failed, will load on process:', err);
        });

        // 取得音訊長度（使用 HTML Audio API）
        try {
            const blob = new Blob([file], { type: file.type });
            const url = URL.createObjectURL(blob);
            const video = document.createElement('video');
            
            video.addEventListener('loadedmetadata', () => {
                const duration = video.duration;
                URL.revokeObjectURL(url);

                if (duration && !isNaN(duration) && duration > 0) {
                    // 儲存音訊時長供後續使用
                    this.currentFile._duration = duration;
                    this.audioDuration.textContent = this.formatDuration(duration);

                    // 使用使用者選擇的分割時長計算預計檔數
                    const segmentLength = parseInt(this.segmentLengthSelect.value);
                    const parts = Math.ceil(duration / segmentLength);
                    this.expectedParts.textContent = `${parts} 個檔案`;
                } else {
                    this.audioDuration.textContent = '處理時計算';
                    this.expectedParts.textContent = '處理時計算';
                }
            });
            
            video.addEventListener('error', () => {
                URL.revokeObjectURL(url);
                this.audioDuration.textContent = '處理時計算';
                this.expectedParts.textContent = '處理時計算';
            });
            
            video.src = url;
            video.load();
        } catch (error) {
            console.error('Error getting duration:', error);
            this.audioDuration.textContent = '處理時計算';
            this.expectedParts.textContent = '處理時計算';
        }
    }

    // 注意：音訊時長已透過 HTML5 Video API 在 handleFileSelect 中計算
    // 不需要額外的 getAudioDuration 方法

    updateProgress(percent, status) {
        this.progressFill.style.width = `${percent}%`;
        this.progressText.textContent = `${Math.round(percent)}%`;
        this.progressStatus.textContent = status;
    }

    async processFile() {
        if (!this.currentFile || this.isProcessing) return;

        this.isProcessing = true;
        this.processBtn.disabled = true;
        this.progressSection.style.display = 'block';
        this.resultsSection.style.display = 'none';
        this.outputFiles = [];

        try {
            // 確保 FFmpeg 已載入
            if (!this.ffmpegLoaded) {
                await this.loadFFmpeg();
            }

            // 寫入輸入檔案
            await this.ffmpeg.writeFile('input.mp4', await fetchFile(this.currentFile));

            // 步驟 1: 轉換為 MP3 (0-40%)
            this.updateProgress(0, '正在轉換 MP4 為 MP3...');

            // 使用使用者選擇的音訊品質
            const bitrate = this.audioBitrateSelect.value + 'k';

            await this.ffmpeg.exec([
                '-i', 'input.mp4',
                '-vn',  // 不包含視訊
                '-acodec', 'libmp3lame',  // MP3 編碼器
                '-ab', bitrate,  // 音訊位元率（使用者選擇）
                '-ar', '44100',  // 採樣率
                'output.mp3'
            ]);

            console.log(`使用音訊品質: ${bitrate}`);

            this.updateProgress(40, 'MP3 轉換完成，正在分割...');

            // 步驟 2: 讀取 MP3 並取得音訊長度
            const mp3Data = await this.ffmpeg.readFile('output.mp3');
            const mp3Blob = new Blob([mp3Data], { type: 'audio/mpeg' });
            const duration = await this.getAudioDurationFromBlob(mp3Blob);

            // 使用使用者選擇的分割時長（bitrate 已在上方宣告）
            const segmentLength = parseInt(this.segmentLengthSelect.value);

            if (!duration || isNaN(duration) || duration <= 0) {
                // 如果無法取得長度，使用固定分割
                console.log('無法取得音訊長度，使用固定時間分割');
                await this.splitMP3ByTime(segmentLength, bitrate);
            } else {
                // 步驟 3: 分割 MP3 (40-100%)
                console.log(`音訊長度: ${duration} 秒，分割時長: ${segmentLength} 秒`);
                await this.splitMP3(duration, segmentLength, bitrate);
            }

            // 顯示結果
            this.showResults();

        } catch (error) {
            console.error('Processing error:', error);
            alert(`處理失敗: ${error.message}`);
            this.updateProgress(0, '處理失敗');
        } finally {
            this.isProcessing = false;
            this.processBtn.disabled = false;
            this.resetBtn.style.display = 'block';
            
            // 清理暫存檔案
            try {
                await this.ffmpeg.deleteFile('input.mp4');
                await this.ffmpeg.deleteFile('output.mp3');
            } catch (e) {
                console.warn('Failed to cleanup:', e);
            }
        }
    }

    async getAudioDurationFromBlob(blob) {
        // 建立音訊元素來取得長度
        return new Promise((resolve) => {
            const audio = new Audio();
            const url = URL.createObjectURL(blob);
            
            const cleanup = () => {
                URL.revokeObjectURL(url);
                audio.removeEventListener('loadedmetadata', onLoaded);
                audio.removeEventListener('error', onError);
            };
            
            const onLoaded = () => {
                cleanup();
                resolve(audio.duration);
            };
            
            const onError = () => {
                cleanup();
                resolve(null);
            };
            
            audio.addEventListener('loadedmetadata', onLoaded);
            audio.addEventListener('error', onError);
            audio.src = url;
        });
    }

    async splitMP3ByTime(segmentLength, bitrate = '192k') {
        // 使用固定時間分割（如果無法取得實際長度）
        let partNumber = 1;
        let startTime = 0;
        let hasContent = true;
        const maxParts = 100; // 安全限制

        while (hasContent && partNumber <= maxParts) {
            const outputFile = `part${partNumber}.mp3`;

            try {
                // 嘗試讀取指定時間段的音訊
                await this.ffmpeg.exec([
                    '-i', 'output.mp3',
                    '-ss', this.formatTime(startTime),
                    '-t', this.formatTime(segmentLength),
                    '-acodec', 'libmp3lame',
                    '-ab', bitrate,
                    '-ar', '44100',
                    outputFile
                ]);

                const data = await this.ffmpeg.readFile(outputFile);
                
                // 檢查檔案大小，如果太小可能沒有內容
                if (data.length < 1000) {
                    hasContent = false;
                    await this.ffmpeg.deleteFile(outputFile);
                    break;
                }

                const blob = new Blob([data], { type: 'audio/mpeg' });
                
                this.outputFiles.push({
                    name: `${this.currentFile.name.replace('.mp4', '')}_part${partNumber}.mp3`,
                    blob: blob,
                    size: blob.size
                });

                const progress = 40 + Math.min((partNumber / maxParts) * 60, 60);
                this.updateProgress(
                    progress,
                    `已生成 ${partNumber} 個分割檔...`
                );

                partNumber++;
                startTime += segmentLength;

            } catch (error) {
                // 可能已經到達檔案結尾
                console.log(`Part ${partNumber} failed (likely end of file):`, error);
                hasContent = false;
                break;
            }
        }

        this.updateProgress(100, '分割完成！');
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    async splitMP3(totalDuration, segmentLength = 1800, bitrate = '192k') {
        const totalParts = Math.ceil(totalDuration / segmentLength);
        let partNumber = 1;

        for (let startTime = 0; startTime < totalDuration; startTime += segmentLength) {
            const duration = Math.min(segmentLength, totalDuration - startTime);
            const outputFile = `part${partNumber}.mp3`;

            await this.ffmpeg.exec([
                '-i', 'output.mp3',
                '-ss', this.formatTime(startTime),
                '-t', this.formatTime(duration),
                '-acodec', 'libmp3lame',
                '-ab', bitrate,
                '-ar', '44100',
                outputFile
            ]);

            const data = await this.ffmpeg.readFile(outputFile);
            const blob = new Blob([data], { type: 'audio/mpeg' });

            this.outputFiles.push({
                name: `${this.currentFile.name.replace('.mp4', '')}_part${partNumber}.mp3`,
                blob: blob,
                size: blob.size
            });

            const progress = 40 + ((partNumber / totalParts) * 60);
            this.updateProgress(
                progress,
                `已生成 ${partNumber}/${totalParts} 個分割檔...`
            );

            partNumber++;
        }

        this.updateProgress(100, '分割完成！');
    }

    showResults() {
        this.resultsSection.style.display = 'block';
        this.resultsList.innerHTML = '';

        this.outputFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'result-item';
            
            item.innerHTML = `
                <div class="result-info">
                    <div class="result-name">${file.name}</div>
                    <div class="result-size">${this.formatFileSize(file.size)}</div>
                </div>
                <button class="btn btn-primary result-download" data-index="${index}">
                    下載
                </button>
            `;

            const downloadBtn = item.querySelector('.result-download');
            downloadBtn.addEventListener('click', () => {
                this.downloadFile(file.blob, file.name);
            });

            this.resultsList.appendChild(item);
        });
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async downloadAll() {
        if (this.outputFiles.length === 0) return;

        // 逐一下載所有檔案（目前不支援 ZIP 打包）
        // 注意：某些瀏覽器可能會阻止多個下載，請允許彈出視窗
        try {
            console.log(`開始下載 ${this.outputFiles.length} 個檔案...`);
            for (let i = 0; i < this.outputFiles.length; i++) {
                const file = this.outputFiles[i];
                console.log(`下載檔案 ${i + 1}/${this.outputFiles.length}: ${file.name}`);
                this.downloadFile(file.blob, file.name);
                // 延遲以避免瀏覽器阻止多個下載
                if (i < this.outputFiles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            }
            alert(`已觸發 ${this.outputFiles.length} 個下載。如果部分檔案未下載，請檢查瀏覽器設定是否允許多個下載。`);
        } catch (error) {
            console.error('Download error:', error);
            alert('下載失敗，請嘗試個別下載');
        }
    }

    reset() {
        // 清理所有 blob URLs 以防止記憶體洩漏
        this.cleanupBlobURLs();

        this.currentFile = null;
        this.outputFiles = [];
        this.isProcessing = false;

        this.infoSection.style.display = 'none';
        this.progressSection.style.display = 'none';
        this.resultsSection.style.display = 'none';
        this.actionsSection.style.display = 'none';
        this.resetBtn.style.display = 'none';

        this.fileInput.value = '';
        this.updateProgress(0, '');
    }

    cleanupBlobURLs() {
        // 清理所有追蹤的 blob URLs
        if (this.blobURLs && this.blobURLs.length > 0) {
            console.log(`清理 ${this.blobURLs.length} 個 blob URLs`);
            this.blobURLs.forEach(url => {
                try {
                    URL.revokeObjectURL(url);
                } catch (e) {
                    console.warn('清理 blob URL 失敗:', e);
                }
            });
            this.blobURLs = [];
        }

        // 清理輸出檔案的 blob URLs
        if (this.outputFiles && this.outputFiles.length > 0) {
            this.outputFiles.forEach(file => {
                if (file.blob) {
                    try {
                        // blob 本身不需要清理，但如果有相關的 URL 需要清理
                        // 這裡保留供未來擴充
                    } catch (e) {
                        console.warn('清理輸出檔案失敗:', e);
                    }
                }
            });
        }
    }
}

// 初始化應用程式
let converterInstance;

function initApp() {
    try {
        console.log('Initializing MP4Converter...');
        console.log('DOM ready state:', document.readyState);
        
        // 檢查必要元素是否存在
        const requiredElements = [
            'uploadArea', 'fileInput', 'infoSection', 'processBtn'
        ];
        const missingElements = requiredElements.filter(id => !document.getElementById(id));
        
        if (missingElements.length > 0) {
            console.error('Missing required elements:', missingElements);
            alert('頁面元素載入不完整，請重新整理頁面');
            return;
        }
        
        converterInstance = new MP4Converter();
        window.converterInstance = converterInstance; // 用於除錯
        console.log('MP4Converter initialized successfully');
        console.log('Converter instance:', converterInstance);

        // 頁面卸載時清理 blob URLs
        window.addEventListener('beforeunload', () => {
            if (converterInstance) {
                converterInstance.cleanupBlobURLs();
            }
        });
    } catch (error) {
        console.error('Failed to initialize MP4Converter:', error);
        console.error('Error stack:', error.stack);
        alert('應用程式初始化失敗: ' + error.message + '\n請查看 Console 了解詳情');
    }
}

// 確保 DOM 載入後初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM 已載入，立即初始化
    // 使用 setTimeout 確保所有腳本都已載入
    setTimeout(initApp, 100);
}


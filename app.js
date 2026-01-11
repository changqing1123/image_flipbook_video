// 全局变量
let uploadedImages = [];
let videoBlob = null;

// DOM元素
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const previewSection = document.getElementById('previewSection');
const imageList = document.getElementById('imageList');
const imageCount = document.getElementById('imageCount');
const clearBtn = document.getElementById('clearBtn');
const settingsSection = document.getElementById('settingsSection');
const actionSection = document.getElementById('actionSection');
const generateBtn = document.getElementById('generateBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const resultSection = document.getElementById('resultSection');
const resultVideo = document.getElementById('resultVideo');
const downloadBtn = document.getElementById('downloadBtn');
const restartBtn = document.getElementById('restartBtn');
const aspectRatioSelect = document.getElementById('aspectRatio');

// 文件上传
fileInput.addEventListener('change', handleFiles);

// 点击上传区域触发文件选择
uploadArea.addEventListener('click', (e) => {
    // 如果点击的不是input本身，触发input点击
    if (e.target !== fileInput) {
        fileInput.click();
    }
});

// 拖拽上传
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    handleFiles({ target: { files } });
});

// 处理文件
function handleFiles(e) {
    console.log('handleFiles called', e); // 调试日志
    const files = Array.from(e.target.files);
    console.log('Files:', files); // 调试日志
    
    files.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                uploadedImages.push({
                    src: event.target.result,
                    file: file
                });
                updatePreview();
            };
            reader.readAsDataURL(file);
        }
    });
}

// 更新预览
function updatePreview() {
    if (uploadedImages.length === 0) {
        previewSection.style.display = 'none';
        settingsSection.style.display = 'none';
        actionSection.style.display = 'none';
        return;
    }
    
    previewSection.style.display = 'block';
    settingsSection.style.display = 'block';
    actionSection.style.display = 'block';
    
    imageCount.textContent = uploadedImages.length;
    imageList.innerHTML = '';
    
    uploadedImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.draggable = true;
        div.dataset.index = index;
        div.innerHTML = `
            <div class="drag-handle">☰</div>
            <img class="preview-img" src="${img.src}" alt="图片${index + 1}">
            <div class="info">
                <div class="index">第 ${index + 1} 页</div>
                <div class="filename">${img.file.name}</div>
            </div>
            <button class="remove-btn" onclick="removeImage(${index})">×</button>
        `;
        
        // 拖拽事件
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragend', handleDragEnd);
        
        imageList.appendChild(div);
    });
}

// 拖拽相关
let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(e.currentTarget.dataset.index);
    e.currentTarget.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    const item = e.currentTarget;
    if (!item.classList.contains('dragging')) {
        item.classList.add('drag-over');
    }
}

function handleDrop(e) {
    e.preventDefault();
    const dropIndex = parseInt(e.currentTarget.dataset.index);
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
        // 交换位置
        const draggedItem = uploadedImages[draggedIndex];
        uploadedImages.splice(draggedIndex, 1);
        uploadedImages.splice(dropIndex, 0, draggedItem);
        updatePreview();
    }
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.image-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    draggedIndex = null;
}

// 删除图片
function removeImage(index) {
    uploadedImages.splice(index, 1);
    updatePreview();
}

// 清空图片
clearBtn.addEventListener('click', () => {
    uploadedImages = [];
    fileInput.value = '';
    updatePreview();
});

// 生成视频
generateBtn.addEventListener('click', async () => {
    if (uploadedImages.length < 2) {
        alert('请至少上传2张图片！');
        return;
    }
    
    // 隐藏其他区域
    document.querySelector('.upload-section').style.display = 'none';
    previewSection.style.display = 'none';
    settingsSection.style.display = 'none';
    actionSection.style.display = 'none';
    resultSection.style.display = 'none';
    
    // 显示进度
    progressSection.style.display = 'block';
    
    try {
        await generateVideo();
    } catch (error) {
        console.error('生成视频失败:', error);
        alert('生成视频失败: ' + error.message);
        progressSection.style.display = 'none';
        actionSection.style.display = 'block';
    }
});

// 生成视频核心函数
async function generateVideo() {
    const duration = parseFloat(document.getElementById('duration').value);
    const transitionDuration = parseFloat(document.getElementById('transitionDuration').value);
    const aspectRatio = document.getElementById('aspectRatio').value;
    const fps = parseInt(document.getElementById('fps').value);
    const transitionType = 'flip'; // 固定使用翻书效果
    
    // 加载第一张图片以获取尺寸
    updateProgress(5, '分析图片尺寸...');
    const firstImage = await loadImage(uploadedImages[0].src);
    
    // 根据比例设置视频尺寸
    let width, height;
    if (aspectRatio === 'auto') {
        // 自动适应：使用第一张图片的原始尺寸
        width = firstImage.width;
        height = firstImage.height;
    } else if (aspectRatio === '3:4') {
        width = 1080;
        height = 1440;
    } else if (aspectRatio === '9:16') {
        width = 1080;
        height = 1920;
    }
    
    // 【调试】打印读取的参数
    console.log('=== 用户设置参数 ===');
    console.log('停留时间:', duration, '秒');
    console.log('翻页时间:', transitionDuration, '秒');
    console.log('视频比例:', aspectRatio);
    console.log('视频尺寸:', width, 'x', height);
    console.log('帧率:', fps, 'FPS');
    console.log('图片数量:', uploadedImages.length);
    
    // 创建canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    // 加载所有图片
    updateProgress(10, '加载图片中...');
    const images = await Promise.all(
        uploadedImages.map(img => loadImage(img.src))
    );
    
    // 预热渲染管线：执行一次完整的翻页动画（不录制）
    if (images.length > 1) {
        updateProgress(15, '预热渲染引擎...');
        // 预热 drawImage 函数
        drawImage(ctx, images[0], width, height);
        drawImage(ctx, images[1], width, height);
        // 预热 drawTransition 函数
        for (let i = 0; i <= 10; i++) {
            const progress = i / 10;
            drawTransition(ctx, images[0], images[1], progress, 'flip', width, height);
        }
        // 清空画布
        ctx.clearRect(0, 0, width, height);
    }
    
    // 创建 MediaRecorder，使用 VP9 编码
    updateProgress(20, '初始化录制器...');
    const stream = canvas.captureStream(fps);
    
    const mimeType = 'video/webm;codecs=vp9';
    const fileExtension = 'webm';
    
    console.log('使用编码格式:', mimeType);
    
    const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 5000000
    });
    
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    
    mediaRecorder.onstop = () => {
        videoBlob = new Blob(chunks, { type: 'video/webm' });
        videoBlob.fileExtension = fileExtension;
        
        const url = URL.createObjectURL(videoBlob);
        resultVideo.src = url;
        
        // 显示结果
        progressSection.style.display = 'none';
        resultSection.style.display = 'block';
    };
    
    mediaRecorder.start();
    
    // 等待 MediaRecorder 完全启动
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // ========== 素材索引管理器 ==========
    let currentIndex = 0;
    const totalImages = images.length;
    
    // 计算帧数
    const displayFrames = Math.floor(duration * fps);
    const transitionFrames = Math.floor(transitionDuration * fps);
    const totalFrames = displayFrames * totalImages + transitionFrames * (totalImages - 1);
    let currentFrame = 0;
    
    console.log(`[时间设置] 停留时间: ${duration}秒 (${displayFrames}帧), 翻页时间: ${transitionDuration}秒 (${transitionFrames}帧), 帧率: ${fps}FPS`);
    console.log(`[总计] ${totalImages}张图片, 总帧数: ${totalFrames}, 预计时长: ${(totalFrames / fps).toFixed(2)}秒`);
    
    const frameInterval = 1000 / fps;
    console.log(`[帧间隔] ${frameInterval.toFixed(2)}毫秒/帧`);
    
    updateProgress(30, '渲染视频中...');
    
    // ========== 视频渲染主循环 ==========
    for (let i = 0; i < totalImages; i++) {
        currentIndex = i;
        const currentImg = images[currentIndex];
        const nextImg = images[currentIndex + 1];
        
        // 阶段1：显示当前图片
        for (let f = 0; f < displayFrames; f++) {
            drawImage(ctx, currentImg, width, height);
            await new Promise(resolve => setTimeout(resolve, frameInterval));
            currentFrame++;
        }
        
        // 阶段2：翻页动画
        if (nextImg) {
            for (let f = 0; f < transitionFrames; f++) {
                // 最后一帧强制 progress = 1，确保显示纯净的下一张图
                const progress = (f === transitionFrames - 1) ? 1 : (transitionFrames > 1 ? f / (transitionFrames - 1) : 1);
                drawTransition(ctx, currentImg, nextImg, progress, transitionType, width, height);
                await new Promise(resolve => setTimeout(resolve, frameInterval));
                currentFrame++;
            }
        }
        
        // 每完成一张图片后更新一次进度
        const overallProgress = 30 + ((i + 1) / totalImages) * 60;
        updateProgress(overallProgress, `已完成 ${i + 1}/${totalImages} 张`);
    }
    
    updateProgress(95, '完成渲染，生成视频文件...');
    console.log('[渲染] 所有素材渲染完成，停止录制');
    mediaRecorder.stop();
}

// 加载图片
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

// 绘制图片（居中适配）
function drawImage(ctx, img, width, height) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    const scale = Math.min(width / img.width, height / img.height);
    const x = (width - img.width * scale) / 2;
    const y = (height - img.height * scale) / 2;
    
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
}

// ========== 3D翻书效果核心函数 ==========
// 【正确逻辑】开始时左边是img1，右边是img2，从右往左翻页

/**
 * 绘制3D翻书过渡动画
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {Image} img1 - 当前页图片（开始时在左边）
 * @param {Image} img2 - 下一页图片（开始时在右边）
 * @param {number} progress - 动画进度 (0-1)
 * @param {string} type - 翻页类型
 * @param {number} width - 画布宽度
 * @param {number} height - 画布高度
 */
function drawTransition(ctx, img1, img2, progress, type, width, height) {
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // 边界处理：开始
    if (progress <= 0) {
        drawImage(ctx, img1, width, height);
        return;
    }
    
    // 边界处理：结束（使用宽松阈值，避免浮点数精度问题）
    if (progress >= 0.99) {
        drawImage(ctx, img2, width, height);
        return;
    }
    
    // 缓动函数
    const easeProgress = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    // 再次检查缓动后的值（双重保险）
    if (easeProgress >= 0.99) {
        drawImage(ctx, img2, width, height);
        return;
    }
    
    // 翻页角度：0° -> 180°
    const angle = easeProgress * Math.PI;
    
    // 计算翻页位置（从右边缘向左移动）
    const flipX = width * (1 - easeProgress);
    
    // 书本厚度
    const bookThickness = Math.min(width, height) * 0.015;
    
    // ========== 正确的分层渲染 ==========
    
    // 【第1层】底层：第一张图（左边）
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, flipX, height);
    ctx.clip();
    drawImage(ctx, img1, width, height);
    ctx.restore();
    
    // 【第2层】底层：第二张图（右边，被逐渐露出）
    ctx.save();
    ctx.beginPath();
    ctx.rect(flipX, 0, width - flipX, height);
    ctx.clip();
    drawImage(ctx, img2, width, height);
    ctx.restore();
    
    // 【第3层】阴影：第二张图上的翻页投影
    ctx.save();
    const shadowWidth = width * 0.3;
    const shadowOpacity = Math.sin(angle) * 0.6;
    const shadowGradient = ctx.createLinearGradient(
        flipX, 0,
        flipX + shadowWidth, 0
    );
    shadowGradient.addColorStop(0, `rgba(0,0,0,${shadowOpacity})`);
    shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGradient;
    ctx.fillRect(flipX, 0, width - flipX, height);
    ctx.restore();
    
    // 【第4层】书本厚度（白色侧边）
    if (angle > 0.1 && angle < Math.PI - 0.1) {
        ctx.save();
        const visibleThickness = bookThickness * Math.abs(Math.sin(angle));
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(flipX - visibleThickness, 0, visibleThickness, height);
        
        // 厚度阴影
        const thicknessGradient = ctx.createLinearGradient(
            flipX - visibleThickness, 0,
            flipX, 0
        );
        thicknessGradient.addColorStop(0, 'rgba(0,0,0,0.05)');
        thicknessGradient.addColorStop(0.5, 'rgba(0,0,0,0.1)');
        thicknessGradient.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = thicknessGradient;
        ctx.fillRect(flipX - visibleThickness, 0, visibleThickness, height);
        ctx.restore();
    }
    
    // 【第5层】翻起的部分：第一张图翻起后的透视效果
    const perspectiveWidth = flipX * Math.abs(Math.cos(angle));
    
    if (perspectiveWidth > 1) {
        ctx.save();
        
        // 裁剪翻起区域
        ctx.beginPath();
        ctx.rect(flipX - perspectiveWidth - bookThickness, 0, perspectiveWidth, height);
        ctx.clip();
        
        // 应用透视变换
        ctx.translate(flipX, 0);
        ctx.scale(-Math.cos(angle), 1);
        ctx.translate(-flipX, 0);
        
        // 判断显示哪一面
        if (angle < Math.PI / 2) {
            // 0°~90°：显示第一张图的正面
            drawImage(ctx, img1, width, height);
        } else {
            // 90°~180°：显示第二张图的背面
            ctx.save();
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            drawImage(ctx, img2, width, height);
            ctx.restore();
        }
        
        // 翻起部分的阴影
        const flipShadowOpacity = Math.abs(Math.sin(angle)) * 0.5;
        const flipGradient = ctx.createLinearGradient(
            flipX, 0,
            0, 0
        );
        flipGradient.addColorStop(0, `rgba(0,0,0,${flipShadowOpacity})`);
        flipGradient.addColorStop(0.7, 'rgba(0,0,0,0.1)');
        flipGradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = flipGradient;
        ctx.fillRect(0, 0, width, height);
        
        ctx.restore();
    }
}

// 更新进度（异步，不阻塞渲染）
function updateProgress(percent, text) {
    requestAnimationFrame(() => {
        progressFill.style.width = percent + '%';
        progressText.textContent = text;
    });
}

// 下载视频
downloadBtn.addEventListener('click', () => {
    if (!videoBlob) return;
    
    const url = URL.createObjectURL(videoBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flipbook_${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
});

// 重新制作
restartBtn.addEventListener('click', () => {
    uploadedImages = [];
    fileInput.value = '';
    videoBlob = null;
    resultSection.style.display = 'none';
    document.querySelector('.upload-section').style.display = 'block';
    updatePreview();
});

// 页面加载完成后检查
window.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成');
    console.log('FFmpegWASM 是否加载:', typeof FFmpegWASM !== 'undefined');
    console.log('FFmpegUtil 是否加载:', typeof FFmpegUtil !== 'undefined');
});

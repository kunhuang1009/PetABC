// 图片懒加载和预加载管理器
class ImageManager {
    constructor() {
        this.observer = null;
        this.preloadedImages = new Set();
        this.lazyImages = new Map();
        this.loadingImages = new Set();
        this.retryCount = new Map();
        this.maxRetries = 3;
        this.loadingQueue = [];
        this.isProcessingQueue = false;
        this.init();
    }

    init() {
        // 检查浏览器支持
        if (!this.checkSupport()) {
            console.warn('浏览器不支持某些现代特性，将使用降级方案');
        }
        
        // 预加载首屏关键图片
        this.preloadCriticalImages();
        
        // 初始化懒加载
        this.initLazyLoading();
        
        // 设置懒加载观察器
        this.setupIntersectionObserver();
        
        // 监听网络状态变化
        this.setupNetworkMonitoring();
    }

    // 检查浏览器支持
    checkSupport() {
        return 'IntersectionObserver' in window && 'Promise' in window;
    }

    // 监听网络状态
    setupNetworkMonitoring() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                console.log('检测到慢速网络，调整加载策略');
                this.adjustForSlowNetwork();
            }
        }
    }

    // 慢速网络优化
    adjustForSlowNetwork() {
        // 减少预加载图片数量
        this.maxRetries = 1;
        // 增加观察器的阈值
        if (this.observer) {
            this.observer.disconnect();
            this.setupIntersectionObserver(true);
        }
    }

    // 预加载首屏关键图片
    preloadCriticalImages() {
        const criticalImages = [
            'images/Group 44.png', // Logo
            'images/001.png', // 主英雄图片
            'images/working file-13 1.png', // 英雄区域装饰
            'images/paw 3.png', // 英雄区域装饰
            'images/working file 2.png', // 英雄区域装饰
            'images/Mask group (4).png', // 关于我们区域图片
            'images/88888.png' // services页面图片
        ];

        criticalImages.forEach(src => {
            if (!this.preloadedImages.has(src)) {
                const img = new Image();
                img.onload = () => {
                    this.preloadedImages.add(src);
                    console.log(`预加载完成: ${src}`);
                };
                img.onerror = () => {
                    console.warn(`预加载失败: ${src}`);
                };
                img.src = src;
            }
        });
    }

    // 初始化懒加载
    initLazyLoading() {
        // 标记需要懒加载的背景图片元素
        const lazyBackgroundElements = [
            // 首页滑动画廊图片
            { selector: '.slider-image', image: 'images/medium-shot-woman-with-chihuahua-dog.jpg' },
            { selector: '.slider-image-one', image: 'images/side-view-young-man-with-dog-against-white-background.jpg' },
            { selector: '.slider-image-two', image: 'images/portrait-woman-with-dog-against-black-background.jpg' },
            { selector: '.slider-image-th', image: 'images/side-view-young-woman-with-dog-against-blue-background.jpg' },
            
            // 特色图标
            { selector: '.feature-icon', image: 'images/tick.png' },
            { selector: '.feature-icon-one', image: 'images/trusted_icon 1.png' },
            { selector: '.feature-icon-two', image: 'images/heart_icon 1.png' },
            
            // 首页拖拽画廊图片
            { selector: '.draggable-image', image: 'images/Group 47.png' },
            { selector: '.draggable-images', image: 'images/veterinarian-stroking-dog.jpg' },
            { selector: '.draggable-images-one', image: 'images/223.jpg' },
            { selector: '.draggable-image-t', image: 'images/Group 48.png' },
            { selector: '.draggable-image-two', image: 'images/Group 49.png' },
            { selector: '.draggable-image-three', image: 'images/adorable-chihuahua-dog-with-female-owner (1).jpg' },
            
            // services页面图片
            { selector: '.service-image[data-service="1"]', image: 'images/pet_icon-05.png' },
            { selector: '.service-image[data-service="2"]', image: 'images/pet_icon-05.png' },
            { selector: '.service-image[data-service="3"]', image: 'images/pet_icon-06.png' },
            { selector: '.check-icon', image: 'images/tick.png' },
            { selector: '.about-image-section', image: 'images/view-cats-dogs-showing-friendship.png' }
        ];

        // 为每个元素添加懒加载属性
        lazyBackgroundElements.forEach(({ selector, image }) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.setAttribute('data-lazy-bg', image);
                element.classList.add('lazy-bg');
                this.lazyImages.set(element, image);
            });
        });

        // 处理img标签的懒加载
        const lazyImgElements = document.querySelectorAll('img[src*="LOVE-"], img[src*="contact-"], img[src*="paw 4"]');
        lazyImgElements.forEach(img => {
            const originalSrc = img.src;
            img.setAttribute('data-lazy-src', originalSrc);
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InRyYW5zcGFyZW50Ii8+PC9zdmc+'; // 透明占位符
            img.classList.add('lazy-img');
        });
    }

    // 设置Intersection Observer
    setupIntersectionObserver(isSlowNetwork = false) {
        const options = {
            root: null,
            rootMargin: isSlowNetwork ? '20px' : '50px',
            threshold: isSlowNetwork ? 0.3 : 0.1
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.queueImageLoad(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, options);

        // 观察所有懒加载元素
        document.querySelectorAll('.lazy-bg, .lazy-img').forEach(element => {
            this.observer.observe(element);
        });
    }

    // 队列化图片加载
    queueImageLoad(element) {
        this.loadingQueue.push(element);
        if (!this.isProcessingQueue) {
            this.processLoadingQueue();
        }
    }

    // 处理加载队列
    async processLoadingQueue() {
        this.isProcessingQueue = true;
        
        while (this.loadingQueue.length > 0) {
            const element = this.loadingQueue.shift();
            await this.loadImageWithRetry(element);
            
            // 添加小延迟以避免阻塞主线程
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        this.isProcessingQueue = false;
    }

    // 带重试机制的图片加载
    async loadImageWithRetry(element) {
        const imageSrc = element.getAttribute('data-lazy-bg') || element.getAttribute('data-lazy-src');
        if (!imageSrc || this.loadingImages.has(imageSrc)) {
            return;
        }

        this.loadingImages.add(imageSrc);
        const retryKey = `${imageSrc}-${element.className}`;
        const currentRetries = this.retryCount.get(retryKey) || 0;

        try {
            await this.loadSingleImage(element, imageSrc);
            this.loadingImages.delete(imageSrc);
            this.retryCount.delete(retryKey);
        } catch (error) {
            this.loadingImages.delete(imageSrc);
            
            if (currentRetries < this.maxRetries) {
                this.retryCount.set(retryKey, currentRetries + 1);
                console.log(`重试加载图片 (${currentRetries + 1}/${this.maxRetries}): ${imageSrc}`);
                
                // 指数退避重试
                const delay = Math.pow(2, currentRetries) * 1000;
                setTimeout(() => {
                    this.loadImageWithRetry(element);
                }, delay);
            } else {
                console.error(`图片加载失败，已达到最大重试次数: ${imageSrc}`);
                this.handleImageError(element, imageSrc);
            }
        }
    }

    // 加载单个图片
    loadSingleImage(element, imageSrc) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            // 添加加载状态
            element.classList.add('loading');
            
            img.onload = () => {
                this.applyImageToElement(element, imageSrc);
                element.classList.remove('loading');
                element.classList.add('loaded', 'fade-in');
                
                // 触发渐进式加载动画
                requestAnimationFrame(() => {
                    element.classList.add('loaded');
                });
                
                resolve();
            };
            
            img.onerror = () => {
                element.classList.remove('loading');
                reject(new Error(`Failed to load image: ${imageSrc}`));
            };
            
            // 设置超时
            setTimeout(() => {
                if (!img.complete) {
                    reject(new Error(`Image load timeout: ${imageSrc}`));
                }
            }, 10000);
            
            img.src = imageSrc;
        });
    }

    // 将图片应用到元素
    applyImageToElement(element, imageSrc) {
        if (element.classList.contains('lazy-bg')) {
            element.style.backgroundImage = `url("${imageSrc}")`;
            element.classList.remove('lazy-bg');
        } else if (element.classList.contains('lazy-img')) {
            element.src = imageSrc;
            element.classList.remove('lazy-img');
        }
    }

    // 处理图片加载错误
    handleImageError(element, imageSrc) {
        element.classList.add('error');
        element.classList.remove('lazy-bg', 'lazy-img', 'loading');
        
        // 可以在这里添加默认图片或错误提示
        if (element.classList.contains('lazy-bg')) {
            element.style.backgroundImage = 'none';
            element.style.backgroundColor = '#f0f0f0';
        }
    }
}

// 导出类以供其他文件使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageManager;
} else {
    window.ImageManager = ImageManager;
}

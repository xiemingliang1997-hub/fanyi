// ==UserScript==
// @name         Tavern AI Mobile Translator
// @namespace    tavern_mobile_translator
// @version      1.2
// @description  手机酒馆AI自动翻译插件 - 支持中英互译
// @author       xiemingliang1997
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

class AITranslator {
    constructor() {
        this.config = {
            autoTranslate: true,
            translateInput: true,
            translateOutput: true,
            targetLang: 'en',
            translationService: 'google',
            showBadge: true
        };
        
        this.init();
        console.log('🎯 翻译插件已加载');
    }

    init() {
        this.injectStyles();
        this.startObserver();
        this.setupInputListener();
    }

    injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .translation-badge {
                background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
                color: white;
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 10px;
                margin-left: 8px;
                display: inline-block;
            }
            .translating {
                opacity: 0.7;
                background: #f0f8ff !important;
            }
        `;
        document.head.appendChild(style);
    }

    startObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    this.processNodes(mutation.addedNodes);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => this.processNodes(document.body.children), 1000);
    }

    setupInputListener() {
        document.addEventListener('click', (e) => {
            if (this.isSendButton(e.target)) {
                setTimeout(() => this.translateInputText(), 100);
            }
        }, true);
    }

    isSendButton(element) {
        const sendTexts = ['发送', 'Send', 'Submit', '→', '📤'];
        return (
            element.tagName === 'BUTTON' &&
            (sendTexts.includes(element.textContent.trim()) ||
             element.getAttribute('aria-label')?.includes('send'))
        );
    }

    processNodes(nodes) {
        nodes.forEach(node => {
            if (node.nodeType === 1) {
                if (this.isMessageNode(node)) {
                    this.translateMessage(node);
                }
                if (node.children) {
                    this.processNodes(node.children);
                }
            }
        });
    }

    isMessageNode(node) {
        const className = node.className || '';
        const hasMessageClass = className.includes('message') || 
                              className.includes('bubble') ||
                              className.includes('chat');
        const hasSubstantialText = node.textContent.trim().length > 20;
        
        return hasMessageClass || hasSubstantialText;
    }

    async translateMessage(node) {
        if (node._translated || !this.config.translateOutput) return;
        
        const text = node.textContent.trim();
        if (!text || text.length < 5) return;

        const needsTranslation = this.needsTranslation(text);
        if (!needsTranslation) return;

        node._translated = true;
        const originalText = text;
        
        node.classList.add('translating');
        
        try {
            const translated = await this.translateText(originalText);
            if (translated && translated !== originalText) {
                node.textContent = translated;
                if (this.config.showBadge) {
                    this.addTranslationBadge(node);
                }
            }
        } catch (error) {
            console.warn('翻译失败:', error);
        } finally {
            node.classList.remove('translating');
        }
    }

    async translateInputText() {
        if (!this.config.translateInput) return;
        
        const inputSelectors = [
            'textarea',
            'input[type="text"]',
            '[contenteditable="true"]'
        ];
        
        for (const selector of inputSelectors) {
            const input = document.querySelector(selector);
            if (input && input.value) {
                const text = input.value.trim();
                if (text && this.needsTranslation(text)) {
                    const translated = await this.translateText(text);
                    if (translated) {
                        input.value = translated;
                    }
                }
                break;
            }
        }
    }

    needsTranslation(text) {
        const hasChinese = /[\u4e00-\u9fa5]/.test(text);
        const hasEnglish = /[a-zA-Z]{3,}/.test(text);
        
        if (this.config.targetLang === 'en') {
            return hasChinese;
        } else {
            return hasEnglish && !hasChinese;
        }
    }

    async translateText(text) {
        try {
            if (this.config.translationService === 'google') {
                return await this.googleTranslate(text);
            } else {
                return await this.bingTranslate(text);
            }
        } catch (error) {
            console.log('使用备用翻译');
            return this.simpleTranslate(text);
        }
    }

    async googleTranslate(text) {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${this.config.targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        const data = await response.json();
        return data[0][0][0];
    }

    async bingTranslate(text) {
        return text;
    }

    simpleTranslate(text) {
        const dict = {
            '你好': 'Hello', '谢谢': 'Thank you', '早上好': 'Good morning',
            'hello': '你好', 'thank': '谢谢', 'good morning': '早上好'
        };
        
        let result = text;
        for (const [key, value] of Object.entries(dict)) {
            result = result.replace(new RegExp(key, 'gi'), value);
        }
        return result;
    }

    addTranslationBadge(node) {
        const badge = document.createElement('span');
        badge.className = 'translation-badge';
        badge.textContent = this.config.targetLang === 'en' ? 'EN' : 'CN';
        badge.title = '自动翻译';
        node.appendChild(badge);
    }
}

new AITranslator();

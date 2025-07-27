// script.js - Основной файл приложения с динамической конфигурацией
// ========================================================================

// 🌐 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let supabase = null;
let currentUser = null;
let tg = null;

// Карты и состояние приложения
let TAROT_CARDS_CACHE = [];
let CARDS_LOADED = false;
let CARDS_LOADING_PROMISE = null;

// Состояние UI
let dailyCardDrawn = false;
let currentSpread = { cards: [], interpretations: [] };
let history = [];

// 🚀 ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
async function initApp() {
    console.log('🔮 Инициализация Tarot Web App v2.0');
    
    try {
        console.log('🔧 Загружаю конфигурацию...');
        await initializeConfig();
        
        initTelegramWebApp();
        
        const supabaseReady = initSupabase();
        if (!supabaseReady) {
            console.warn('⚠️ Supabase недоступен, работаем в автономном режиме');
        }
        
        const cardsPromise = loadCardsFromGitHub();
        
        if (supabaseReady) {
            currentUser = await initTelegramUser();
            if (currentUser) {
                console.log(`👤 Пользователь: ${currentUser.first_name || currentUser.username}`);
                console.log(`🎫 Бесплатных вопросов: ${currentUser.free_predictions_left}`);
                console.log(`⭐ Премиум: ${currentUser.is_subscribed ? 'Да' : 'Нет'}`);
            }
        } else {
            currentUser = {
                user_id: 123456789,
                first_name: 'Тестовый пользователь',
                free_predictions_left: window.APP_CONFIG?.freeQuestionsLimit || 3,
                is_subscribed: false
            };
        }
        
        await cardsPromise;
        
        if (supabase && currentUser) {
            await loadUserHistoryFromSupabase();
        } else {
            loadLocalHistory();
        }
        
        initEventListeners();
        updateUserInterface();
        switchTab('daily');
        
        await checkDailyCardStatus();
        
        console.log('✅ Приложение готово к работе');
        console.log(`🃏 Доступно карт: ${TAROT_CARDS_CACHE.length}`);
        
        showNotification(window.APP_CONFIG?.texts?.cardsReady || 'Карты готовы!');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        
        initOfflineMode();
        initEventListeners();
        switchTab('daily');
        showNotification('Приложение запущено в автономном режиме');
    }
}

// 🔧 ИНИЦИАЛИЗАЦИЯ SUPABASE
function initSupabase() {
    try {
        const config = window.SUPABASE_CONFIG;
        if (typeof window.supabase !== 'undefined' && config?.url && config?.anonKey) {
            supabase = window.supabase.createClient(config.url, config.anonKey);
            console.log('✅ Supabase инициализирован с динамической конфигурацией');
            return true;
        } else {
            console.warn('⚠️ Supabase недоступен или неправильная конфигурация');
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
        return false;
    }
}

// 🃏 ЗАГРУЗКА КАРТ С GITHUB
async function loadCardsFromGitHub() {
    if (CARDS_LOADING_PROMISE) {
        return CARDS_LOADING_PROMISE;
    }
    
    CARDS_LOADING_PROMISE = (async () => {
        try {
            console.log('🃏 Загружаю карты с GitHub...');
            
            if (loadCardsFromCache()) {
                console.log('📦 Карты загружены из кэша');
                return;
            }
            
            const cardsData = await fetchCardsFromGitHub();
            
            if (cardsData && cardsData.length > 0) {
                TAROT_CARDS_CACHE = cardsData;
                CARDS_LOADED = true;
                
                saveCardsToCache(cardsData);
                
                console.log(`✅ Загружено ${TAROT_CARDS_CACHE.length} карт с GitHub`);
            } else {
                throw new Error('Получены пустые данные карт');
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки карт с GitHub:', error);
            
            if (loadCardsFromCache()) {
                console.log('📦 Использую карты из кэша (ошибка GitHub)');
            } else {
                console.log('⚠️ Использую фоллбэк карты');
                TAROT_CARDS_CACHE = getLocalFallbackCards();
                CARDS_LOADED = true;
            }
        }
    })();
    
    return CARDS_LOADING_PROMISE;
}

async function fetchCardsFromGitHub() {
    const apiConfig = window.API_CONFIG;
    const urls = [
        apiConfig?.cardsUrl,
        apiConfig?.cardsFallbackUrl,
        apiConfig?.cardsLocalFallback || './cards.json'
    ].filter(Boolean);
    
    for (const url of urls) {
        try {
            console.log('📡 Запрос к:', url);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), apiConfig?.requestTimeout || 15000);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (Array.isArray(data) && data.length > 0) {
                console.log(`✅ Получено ${data.length} карт с ${url}`);
                return data.map(card => normalizeCard(card));
            } else if (data.cards && Array.isArray(data.cards)) {
                console.log(`✅ Получено ${data.cards.length} карт с ${url}`);
                return data.cards.map(card => normalizeCard(card));
            } else {
                throw new Error('Неверный формат данных карт');
            }
            
        } catch (error) {
            console.warn(`⚠️ Ошибка загрузки с ${url}:`, error.message);
            continue;
        }
    }
    
    throw new Error('Все URL карт недоступны');
}

function normalizeCard(card) {
    return {
        id: card.id || card.name || `card_${Math.random()}`,
        name: card.name || 'Неизвестная карта',
        symbol: card.symbol || '🃏',
        meaningUpright: card.meaningUpright || card.meaning || 'Значение не указано',
        meaningReversed: card.meaningReversed || card.meaningUpright || card.meaning || 'Значение не указано',
        meaning: card.meaning || card.meaningUpright || 'Значение не указано',
        image: card.image || card.imageUpright || './images/cards/default.jpg',
        type: card.type || 'Неизвестный тип',
        element: card.element || 'Эфир',
        description: card.description || '',
        keyPhrase: card.keyPhrase || ''
    };
}

// 📱 ИНТЕГРАЦИЯ С TELEGRAM WEB APP
function initTelegramWebApp() {
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();
            
            document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#0f0f23');
            document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#e2e8f0');
            
            console.log('✅ Telegram WebApp инициализирован');
        } else {
            console.warn('⚠️ Telegram WebApp недоступен');
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram WebApp:', error);
    }
}

// 🃏 КАРТА ДНЯ
async function checkDailyCardStatus() {
    if (!currentUser) return;
    
    try {
        if (supabase) {
            const todayCard = await getTodayDailyCard(currentUser.user_id);
            if (todayCard) {
                console.log('📅 Карта дня уже была вытянута сегодня');
                displayExistingDailyCard(todayCard);
                return;
            }
        }
        
        const today = new Date().toDateString();
        const lastCardDate = localStorage.getItem('lastDailyCardDate');
        
        if (lastCardDate === today) {
            console.log('📅 Карта дня уже была вытянута (локально)');
            dailyCardDrawn = true;
            const cardData = JSON.parse(localStorage.getItem('todayDailyCard') || '{}');
            if (cardData.name) {
                displayExistingDailyCard({ card_data: cardData });
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка проверки карты дня:', error);
    }
}

async function drawDailyCard() {
    if (!CARDS_LOADED) {
        const appConfig = window.APP_CONFIG;
        showNotification(appConfig?.texts?.loadingCards || 'Карты еще загружаются...');
        return;
    }
    
    const card = document.getElementById('daily-card');
    const loading = document.getElementById('daily-loading');
    
    if (!card || !loading) return;
    
    loading.style.display = 'block';
    card.style.pointerEvents = 'none';
    
    addSparkles(card);
    
    try {
        const appConfig = window.APP_CONFIG;
        setTimeout(async () => {
            const randomCard = getRandomCard();
            
            displayCardInUI(card, randomCard);
            
            loading.style.display = 'none';
            dailyCardDrawn = true;
            
            localStorage.setItem('lastDailyCardDate', new Date().toDateString());
            localStorage.setItem('todayDailyCard', JSON.stringify(randomCard));
            
            if (supabase && currentUser) {
                await saveCompleteDailyCardSession(currentUser.user_id, randomCard);
            }
            
            setTimeout(async () => {
                const aiContainer = document.getElementById('daily-ai-container');
                if (aiContainer) {
                    await generateAIPredictionToContainer(aiContainer, 'daily', randomCard, '');
                }
                
                setTimeout(() => {
                    const banner = document.getElementById('daily-info-banner');
                    if (banner) banner.style.display = 'block';
                }, 2000);
            }, 1000);
            
            addToHistory('daily', 'Карта дня', '', [randomCard]);
            
        }, appConfig?.loadingDelay || 2000);
        
    } catch (error) {
        console.error('❌ Ошибка при вытягивании карты дня:', error);
        loading.style.display = 'none';
        card.style.pointerEvents = 'auto';
        showNotification('Произошла ошибка. Попробуйте еще раз.');
    }
}

function displayExistingDailyCard(cardRecord) {
    const card = document.getElementById('daily-card');
    if (!card) return;
    
    const cardData = cardRecord.card_data;
    displayCardInUI(card, cardData);
    
    dailyCardDrawn = true;
    card.style.pointerEvents = 'none';
    
    if (cardRecord.ai_prediction) {
        const aiContainer = document.getElementById('daily-ai-container');
        if (aiContainer) {
            aiContainer.innerHTML = `
                <div class="ai-prediction">
                    <h3>🤖 ИИ-толкование</h3>
                    <p>${cardRecord.ai_prediction}</p>
                </div>
            `;
        }
    }
    
    const banner = document.getElementById('daily-info-banner');
    if (banner) banner.style.display = 'block';
}

// ❓ ВОПРОСЫ И ОТВЕТЫ
async function askQuestion() {
    const input = document.getElementById('question-input');
    const question = input.value.trim();
    
    const appConfig = window.APP_CONFIG;
    
    if (!question) {
        showNotification(appConfig?.texts?.noQuestions || 'Пожалуйста, задайте вопрос');
        return;
    }
    
    if (!CARDS_LOADED) {
        showNotification(appConfig?.texts?.loadingCards || 'Карты еще загружаются...');
        return;
    }
    
    if (!currentUser || (!currentUser.is_subscribed && currentUser.free_predictions_left <= 0)) {
        showNotification(appConfig?.texts?.questionsEnded || 'У вас закончились бесплатные вопросы');
        showPremiumOffer();
        return;
    }
    
    try {
        const randomCard = getRandomCard();
        
        const container = document.getElementById('question-result');
        displayQuestionResult(container, question, randomCard);
        
        const aiPrediction = await generateAIPredictionFromN8N(question, [randomCard], 'question');
        
        if (supabase && currentUser) {
            await saveCompleteQuestionSession(
                currentUser.user_id, 
                question, 
                [randomCard], 
                aiPrediction, 
                'question'
            );
            
            if (!currentUser.is_subscribed) {
                currentUser.free_predictions_left--;
                updateUserInterface();
            }
        }
        
        addToHistory('question', 'Вопрос к картам', question, [randomCard], aiPrediction);
        
        input.value = '';
        
    } catch (error) {
        console.error('❌ Ошибка при обработке вопроса:', error);
        showNotification('Произошла ошибка. Попробуйте еще раз.');
    }
}

// 📚 ИСТОРИЯ
async function loadUserHistoryFromSupabase() {
    if (!supabase || !currentUser) return;
    
    try {
        console.log('📚 Загружаю историю из Supabase...');
        
        const supabaseHistory = await getUserHistory(currentUser.user_id);
        
        history = supabaseHistory.map(item => {
            const baseItem = {
                id: item.id,
                timestamp: new Date(item.created_at).getTime(),
                date: new Date(item.created_at).toLocaleDateString('ru-RU'),
                time: new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
                type: item.type
            };
            
            if (item.type === 'daily') {
                return {
                    ...baseItem,
                    title: 'Карта дня',
                    cards: [item.card_data],
                    aiPrediction: item.ai_prediction
                };
            } else if (item.type === 'question') {
                const answers = item.tarot_answers || [];
                const answer = answers[0] || {};
                
                return {
                    ...baseItem,
                    title: 'Вопрос к картам',
                    question: item.question_text,
                    cards: answer.cards_drawn || [],
                    aiPrediction: answer.ai_prediction
                };
            } else if (item.type === 'spread') {
                return {
                    ...baseItem,
                    title: item.spread_name || 'Расклад',
                    question: item.question,
                    cards: item.cards_data || [],
                    spreadType: item.spread_name
                };
            }
            
            return baseItem;
        }).filter(Boolean);
        
        console.log(`📚 Загружено ${history.length} записей истории`);
        renderHistory();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки истории из Supabase:', error);
        loadLocalHistory();
    }
}

function loadLocalHistory() {
    try {
        const savedHistory = localStorage.getItem('tarot_history');
        if (savedHistory) {
            history = JSON.parse(savedHistory);
            console.log(`📦 Загружена локальная история: ${history.length} записей`);
        }
        renderHistory();
    } catch (error) {
        console.error('❌ Ошибка загрузки локальной истории:', error);
        history = [];
    }
}

function addToHistory(type, title, question = '', cards = [], aiPrediction = null, spreadType = null) {
    const historyItem = {
        id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: type,
        title: title,
        question: question,
        cards: cards,
        aiPrediction: aiPrediction,
        spreadType: spreadType,
        timestamp: Date.now(),
        date: new Date().toLocaleDateString('ru-RU'),
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    };
    
    history.unshift(historyItem);
    
    const appConfig = window.APP_CONFIG;
    const maxItems = appConfig?.maxHistoryItems || 100;
    if (history.length > maxItems) {
        history = history.slice(0, maxItems);
    }
    
    localStorage.setItem('tarot_history', JSON.stringify(history));
    
    console.log('📝 Добавлено в историю:', title);
}

// 🤖 ИИ-ПРЕДСКАЗАНИЯ
async function generateAIPredictionFromN8N(question, cards, type = 'question') {
    if (!currentUser) return 'ИИ-предсказание недоступно';
    
    try {
        console.log('🤖 Генерирую ИИ-предсказание...');
        
        const response = await fetch('/api/generate-prediction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.user_id,
                question: question,
                cards: cards,
                type: type
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        console.log('✅ ИИ-предсказание получено');
        return result.prediction || result.message || 'Предсказание получено';
        
    } catch (error) {
        console.error('❌ Ошибка генерации ИИ-предсказания:', error);
        return 'К сожалению, не удалось получить ИИ-предсказание. Попробуйте позже.';
    }
}

async function generateAIPredictionToContainer(container, type, card, question) {
    if (!container) return;
    
    const appConfig = window.APP_CONFIG;
    
    container.innerHTML = `
        <div class="ai-loading">
            <div class="loading-spinner"></div>
            <p>${appConfig?.texts?.generating || 'Генерирую предсказание...'}</p>
        </div>
    `;
    
    try {
        const prediction = await generateAIPredictionFromN8N(question, [card], type);
        
        container.innerHTML = `
            <div class="ai-prediction">
                <h3>🤖 ИИ-толкование</h3>
                <div class="prediction-text" id="prediction-text-${Date.now()}"></div>
            </div>
        `;
        
        const textElement = container.querySelector('.prediction-text');
        await typewriterEffect(textElement, prediction);
        
        return prediction;
        
    } catch (error) {
        console.error('❌ Ошибка отображения ИИ-предсказания:', error);
        container.innerHTML = `
            <div class="ai-prediction error">
                <h3>🤖 ИИ-толкование</h3>
                <p>Не удалось получить предсказание. Попробуйте позже.</p>
            </div>
        `;
        return null;
    }
}

// 🎨 UI ФУНКЦИИ
function updateUserInterface() {
    if (!currentUser) return;
    
    const counter = document.getElementById('free-questions-counter');
    if (counter) {
        counter.textContent = currentUser.free_predictions_left;
    }
    
    const premiumElements = document.querySelectorAll('.premium-only');
    const freeElements = document.querySelectorAll('.free-only');
    
    if (currentUser.is_subscribed) {
        premiumElements.forEach(el => el.style.display = 'block');
        freeElements.forEach(el => el.style.display = 'none');
    } else {
        premiumElements.forEach(el => el.style.display = 'none');
        freeElements.forEach(el => el.style.display = 'block');
    }
    
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.innerHTML = `
            <div class="user-name">${currentUser.first_name || currentUser.username || 'Пользователь'}</div>
            <div class="user-status">
                ${currentUser.is_subscribed 
                    ? '<span class="premium-badge">⭐ Премиум</span>' 
                    : `<span class="free-badge">🎫 ${currentUser.free_predictions_left} вопросов</span>`
                }
            </div>
        `;
    }
}

function displayCardInUI(container, cardData) {
    if (!container || !cardData) return;
    
    container.innerHTML = `
        <div class="card-header">
            <div class="card-name">${cardData.name}</div>
            <div class="card-symbol">${cardData.symbol}</div>
        </div>
        <div class="card-body">
            <img src="${cardData.image}" alt="${cardData.name}" class="card-image" 
                 onerror="this.style.display='none'">
            <div class="card-meaning">${cardData.meaning}</div>
            ${cardData.keyPhrase ? `<div class="card-phrase">"${cardData.keyPhrase}"</div>` : ''}
        </div>
    `;
    
    container.classList.add('flipped');
}

function displayQuestionResult(container, question, card) {
    if (!container) return;
    
    container.innerHTML = `
        <div class="question-result-content">
            <h3>Ваш вопрос</h3>
            <p class="question-text">"${question}"</p>
            
            <h3>Ответ карт</h3>
            <div class="result-card">
                <div class="card-name">${card.name}</div>
                <div class="card-symbol">${card.symbol}</div>
                <img src="${card.image}" alt="${card.name}" class="card-image" 
                     onerror="this.style.display='none'">
                <div class="card-meaning">${card.meaning}</div>
            </div>
            
            <div id="question-ai-container" class="ai-container"></div>
        </div>
    `;
    
    setTimeout(() => {
        const aiContainer = document.getElementById('question-ai-container');
        if (aiContainer) {
            generateAIPredictionToContainer(aiContainer, 'question', card, question);
        }
    }, 1000);
}

// 🎯 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function getRandomCard() {
    if (!CARDS_LOADED || TAROT_CARDS_CACHE.length === 0) {
        console.warn('⚠️ Карты не загружены, используем фоллбэк');
        return getLocalFallbackCards()[0];
    }
    
    const randomIndex = Math.floor(Math.random() * TAROT_CARDS_CACHE.length);
    const selectedCard = TAROT_CARDS_CACHE[randomIndex];
    
    const isReversed = Math.random() < 0.3;
    
    return {
        ...selectedCard,
        position: isReversed ? 'Перевёрнутая' : 'Прямая',
        isReversed: isReversed,
        meaning: isReversed ? selectedCard.meaningReversed : selectedCard.meaningUpright
    };
}

function getLocalFallbackCards() {
    return window.FALLBACK_CARDS || [
        {
            id: "fallback_1",
            name: "Загадочная карта",
            symbol: "🔮",
            meaning: "Карты временно недоступны, но энергия Вселенной все равно с вами.",
            image: "./images/cards/default.jpg"
        }
    ];
}

function saveCardsToCache(cards) {
    try {
        const appConfig = window.APP_CONFIG;
        const cacheData = {
            cards: cards,
            timestamp: Date.now(),
            version: appConfig?.cacheVersion || '2.0',
            source: 'github'
        };
        
        localStorage.setItem('tarot_cards_cache', JSON.stringify(cacheData));
        console.log('💾 Карты сохранены в кэш');
    } catch (error) {
        console.warn('⚠️ Не удалось сохранить в кэш:', error);
    }
}

function loadCardsFromCache() {
    try {
        const cached = localStorage.getItem('tarot_cards_cache');
        if (!cached) return false;
        
        const cacheData = JSON.parse(cached);
        const cacheAge = Date.now() - cacheData.timestamp;
        const apiConfig = window.API_CONFIG;
        
        if (cacheAge < (apiConfig?.cacheTimeout || 24 * 60 * 60 * 1000) && 
            cacheData.cards && cacheData.cards.length > 0) {
            
            TAROT_CARDS_CACHE = cacheData.cards;
            CARDS_LOADED = true;
            
            console.log(`📦 Загружено ${TAROT_CARDS_CACHE.length} карт из кэша`);
            return true;
        } else {
            localStorage.removeItem('tarot_cards_cache');
            return false;
        }
        
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки кэша:', error);
        localStorage.removeItem('tarot_cards_cache');
        return false;
    }
}

// 💎 ПРЕМИУМ ФУНКЦИИ
function showPremiumOffer() {
    const appConfig = window.APP_CONFIG;
    const apiConfig = window.API_CONFIG;
    
    const modal = document.createElement('div');
    modal.className = 'premium-modal';
    modal.innerHTML = `
        <div class="premium-content">
            <h3>⭐ Премиум доступ</h3>
            <p>Получите неограниченные вопросы к картам и эксклюзивные расклады!</p>
            <div class="premium-price">Всего ${appConfig?.premiumPrice || 299} ₽ на ${appConfig?.premiumDuration || 30} дней</div>
            <div class="premium-buttons">
                <button onclick="openPaymentLink()" class="premium-btn">Оформить премиум</button>
                <button onclick="closePremiumModal()" class="cancel-btn">Отмена</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    window.currentPremiumModal = modal;
}

function openPaymentLink() {
    const paymentUrl = window.API_CONFIG?.paymentUrl;
    if (tg && tg.openLink && paymentUrl) {
        tg.openLink(paymentUrl);
    } else if (paymentUrl) {
        window.open(paymentUrl, '_blank');
    }
    closePremiumModal();
}

function closePremiumModal() {
    if (window.currentPremiumModal) {
        document.body.removeChild(window.currentPremiumModal);
        window.currentPremiumModal = null;
    }
}

// 🔔 УВЕДОМЛЕНИЯ
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// 🎪 АНИМАЦИИ И ЭФФЕКТЫ
function addSparkles(element) {
    const appConfig = window.APP_CONFIG;
    const sparkleCount = appConfig?.sparkleCount || 5;
    
    for (let i = 0; i < sparkleCount; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.top = Math.random() * 100 + '%';
        sparkle.style.animationDelay = Math.random() * 1000 + 'ms';
        
        element.appendChild(sparkle);
        
        setTimeout(() => {
            if (sparkle.parentNode) {
                sparkle.parentNode.removeChild(sparkle);
            }
        }, 2000);
    }
}

async function typewriterEffect(element, text) {
    if (!element || !text) return;
    
    const appConfig = window.APP_CONFIG;
    const speed = appConfig?.typewriterSpeed || 30;
    
    element.innerHTML = '';
    
    for (let i = 0; i < text.length; i++) {
        element.innerHTML += text.charAt(i);
        await new Promise(resolve => setTimeout(resolve, speed));
    }
}

// 🎛️ УПРАВЛЕНИЕ ТАБАМИ
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.style.display = 'none');
    
    const buttons = document.querySelectorAll('.tab-button');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    if (tabName === 'history') {
        renderHistory();
    } else if (tabName === 'reviews') {
        loadReviews();
    }
}

// 📚 ОТОБРАЖЕНИЕ ИСТОРИИ
function renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">🔮</div>
                <p>История раскладов пуста.<br>Начните с карты дня или задайте вопрос!</p>
            </div>
        `;
        return;
    }
    
    const groupedHistory = {};
    history.forEach(item => {
        if (!groupedHistory[item.date]) {
            groupedHistory[item.date] = [];
        }
        groupedHistory[item.date].push(item);
    });
    
    let historyHTML = '';
    Object.keys(groupedHistory).forEach(date => {
        historyHTML += `<div class="history-date-group">
            <div class="history-date-header">${date}</div>`;
        
        groupedHistory[date].forEach(item => {
            const typeIcon = item.type === 'daily' ? '🌅' : 
                           item.type === 'question' ? '❓' : '🃏';
            
            historyHTML += `
                <div class="history-item" onclick="viewHistoryDetail('${item.id}')">
                    <div class="history-header">
                        <div class="history-type">
                            <span class="history-icon">${typeIcon}</span>
                            ${item.title}
                        </div>
                        <div class="history-time">${item.time}</div>
                    </div>
                    ${item.question ? `<div class="history-question">"${item.question}"</div>` : ''}
                    <div class="history-cards">
                        ${item.cards.slice(0, 3).map(card => `
                            <span class="history-mini-card">${card.symbol} ${card.name}</span>
                        `).join('')}
                        ${item.cards.length > 3 ? `<span class="more-cards">+${item.cards.length - 3}</span>` : ''}
                    </div>
                </div>
            `;
        });
        
        historyHTML += '</div>';
    });
    
    historyList.innerHTML = historyHTML;
}

function viewHistoryDetail(itemId) {
    const item = history.find(h => h.id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    modal.innerHTML = `
        <div class="history-detail">
            <h3>${item.title}</h3>
            <p class="history-date">${item.date} в ${item.time}</p>
            
            ${item.question ? `<div class="detail-question">"${item.question}"</div>` : ''}
            
            <div class="detail-cards">
                ${item.cards.map(card => `
                    <div class="detail-card">
                        <div class="card-name">${card.name} ${card.symbol}</div>
                        <div class="card-meaning">${card.meaning}</div>
                    </div>
                `).join('')}
            </div>
            
            ${item.aiPrediction ? `
                <div class="detail-ai-prediction">
                    <h4>🤖 ИИ-толкование</h4>
                    <p>${item.aiPrediction}</p>
                </div>
            ` : ''}
            
            <div class="history-actions">
                <button onclick="shareHistoryItem('${item.id}')" class="share-btn">Поделиться</button>
                <button onclick="closeHistoryModal()" class="close-btn">Закрыть</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    window.currentHistoryModal = modal;
}

function closeHistoryModal() {
    if (window.currentHistoryModal) {
        document.body.removeChild(window.currentHistoryModal);
        window.currentHistoryModal = null;
    }
}

function shareHistoryItem(itemId) {
    const item = history.find(h => h.id === itemId);
    if (!item) return;
    
    let message = `🔮 ${item.title}\n📅 ${item.date}\n\n`;
    
    if (item.question) {
        message += `❓ Вопрос: "${item.question}"\n\n`;
    }
    
    message += `🃏 Карты:\n`;
    item.cards.forEach(card => {
        message += `${card.symbol} ${card.name}: ${card.meaning}\n`;
    });
    
    if (item.aiPrediction) {
        message += `\n🤖 ИИ-толкование:\n${item.aiPrediction}`;
    }
    
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({
            type: 'history_share',
            data: item,
            text_message: message
        }));
        showNotification('Данные отправлены в бота!');
    } else {
        navigator.clipboard.writeText(message).then(() => {
            showNotification('Текст скопирован в буфер обмена!');
        }).catch(() => {
            showNotification('Не удалось скопировать текст');
        });
    }
    
    closeHistoryModal();
}

// 📝 ФУНКЦИИ ДЛЯ ОТЗЫВОВ
async function loadReviews() {
    console.log('📝 Загрузка отзывов');
    renderReviews();
}

function renderReviews() {
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return;
    
    const staticReviews = [
        {
            id: 1, author: '@maria_k', rating: 5,
            text: 'Невероятно точные предсказания! Карта дня всегда в точку попадает. ИИ-толкования очень подробные и полезные.',
            date: '3 дня назад', isAnonymous: false
        },
        {
            id: 2, author: 'Анонимно', rating: 5,
            text: 'Премиум подписка стоит своих денег! Неограниченные вопросы и эксклюзивные расклады - то что нужно.',
            date: '5 дней назад', isAnonymous: true
        },
        {
            id: 3, author: '@alexey_777', rating: 4,
            text: 'Отличное приложение для ежедневного гадания. Интерфейс красивый, всё работает быстро.',
            date: '1 неделю назад', isAnonymous: false
        }
    ];
    
    let reviewsHTML = '';
    staticReviews.forEach(review => {
        reviewsHTML += `
            <div class="review-item">
                <div class="review-header">
                    <div class="review-author">${review.author}</div>
                    <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
                </div>
                <div class="review-text">${review.text}</div>
                <div class="review-date">${review.date}</div>
            </div>
        `;
    });
    
    reviewsList.innerHTML = reviewsHTML;
}

// 🎬 ИНИЦИАЛИЗАЦИЯ ОБРАБОТЧИКОВ СОБЫТИЙ
function initEventListeners() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    const dailyCardBtn = document.getElementById('draw-daily-card');
    if (dailyCardBtn) {
        dailyCardBtn.addEventListener('click', drawDailyCard);
    }
    
    const askBtn = document.getElementById('ask-question-btn');
    if (askBtn) {
        askBtn.addEventListener('click', askQuestion);
    }
    
    const questionInput = document.getElementById('question-input');
    if (questionInput) {
        questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                askQuestion();
            }
        });
    }
    
    const premiumBtn = document.getElementById('premium-btn');
    if (premiumBtn) {
        premiumBtn.addEventListener('click', showPremiumOffer);
    }
    
    console.log('🎛️ Обработчики событий инициализированы');
}

// 🔄 АВТОНОМНЫЙ РЕЖИМ
function initOfflineMode() {
    console.log('📱 Инициализация автономного режима');
    
    currentUser = {
        user_id: 123456789,
        first_name: 'Пользователь',
        free_predictions_left: 3,
        is_subscribed: false
    };
    
    TAROT_CARDS_CACHE = getLocalFallbackCards();
    CARDS_LOADED = true;
    
    loadLocalHistory();
}

// 🔧 ОТЛАДОЧНЫЕ ФУНКЦИИ
async function refreshCardsCache() {
    console.log('🔄 Принудительное обновление карт...');
    
    CARDS_LOADED = false;
    CARDS_LOADING_PROMISE = null;
    localStorage.removeItem('tarot_cards_cache');
    
    await loadCardsFromGitHub();
    const appConfig = window.APP_CONFIG;
    showNotification(appConfig?.notifications?.cardsCached || '🃏 Карты обновлены!');
}

function getAppStats() {
    return {
        cardsLoaded: CARDS_LOADED,
        cardsCount: TAROT_CARDS_CACHE.length,
        historyCount: history.length,
        currentUser: currentUser,
        supabaseConnected: !!supabase,
        configLoaded: !!(window.SUPABASE_CONFIG && window.API_CONFIG && window.APP_CONFIG)
    };
}

// Интеграция с отладчиком (только в development)
if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
    window.TarotDebug = {
        log: (message, level = 'info') => {
            console.log(`[${level.toUpperCase()}] ${message}`);
            // Отправка в отладчик если открыт
            if (window.TarotDebugger) {
                window.TarotDebugger.log(message, level);
            }
        },
        trackApiCall: () => {
            if (window.TarotDebugger) {
                const state = window.TarotDebugger.getState();
                state.apiCalls++;
            }
        },
        trackError: (error) => {
            if (window.TarotDebugger) {
                window.TarotDebugger.log(error.message, 'error');
            }
        }
    };
}

// 🚀 ЗАПУСК ПРИЛОЖЕНИЯ
document.addEventListener('DOMContentLoaded', initApp);

// Глобальные функции для доступа из HTML
window.switchTab = switchTab;
window.drawDailyCard = drawDailyCard;
window.askQuestion = askQuestion;
window.showPremiumOffer = showPremiumOffer;
window.openPaymentLink = openPaymentLink;
window.closePremiumModal = closePremiumModal;
window.viewHistoryDetail = viewHistoryDetail;
window.closeHistoryModal = closeHistoryModal;
window.shareHistoryItem = shareHistoryItem;
window.refreshCardsCache = refreshCardsCache;
window.getAppStats = getAppStats;

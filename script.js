// ИСПРАВЛЕННЫЕ функции для загрузки карт в script.js
// Заменить существующие функции на эти:

// Глобальные переменные для карт
let TAROT_CARDS_CACHE = []; // Кэш карт с GitHub
let CARDS_LOADED = false; // Флаг загрузки
let CARDS_LOADING_PROMISE = null; // Promise для предотвращения дублирования

// 1. ОСНОВНАЯ функция загрузки карт с GitHub
async function loadCardsFromGitHub() {
    // Предотвращаем множественные запросы
    if (CARDS_LOADING_PROMISE) {
        return CARDS_LOADING_PROMISE;
    }
    
    CARDS_LOADING_PROMISE = (async () => {
        try {
            console.log('🃏 Загружаю карты с GitHub Raw...');
            
            // Сначала пробуем загрузить из кэша
            if (loadCardsFromCache()) {
                console.log('📦 Карты загружены из кэша');
                // Проверяем обновления в фоне
                setTimeout(() => checkForCardsUpdate(), 1000);
                return;
            }
            
            // Загружаем с GitHub
            const cardsData = await fetchCardsFromGitHub();
            
            if (cardsData && cardsData.length > 0) {
                TAROT_CARDS_CACHE = cardsData;
                CARDS_LOADED = true;
                
                // Сохраняем в кэш
                saveCardsToCache(cardsData);
                
                console.log(`✅ Загружено ${TAROT_CARDS_CACHE.length} карт с GitHub`);
            } else {
                throw new Error('Получены пустые данные карт');
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки карт с GitHub:', error);
            
            // Пробуем кэш
            if (loadCardsFromCache()) {
                console.log('📦 Использую карты из кэша (ошибка GitHub)');
            } else {
                // Фоллбэк на локальные карты
                console.log('⚠️ Использую фоллбэк карты');
                TAROT_CARDS_CACHE = getLocalFallbackCards();
                CARDS_LOADED = true;
            }
        }
    })();
    
    return CARDS_LOADING_PROMISE;
}

// 2. Функция запроса к GitHub API
async function fetchCardsFromGitHub() {
    const urls = [
        API_CONFIG.cardsUrl, 
        API_CONFIG.cardsFallbackUrl
    ].filter(Boolean);
    
    for (const url of urls) {
        try {
            console.log('📡 Запрос к:', url);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.requestTimeout || 15000);
            
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
            
            // Валидируем данные
            if (Array.isArray(data) && data.length > 0) {
                console.log(`✅ Получено ${data.length} карт с ${url}`);
                
                // Нормализуем данные карт для совместимости
                const normalizedCards = data.map(card => normalizeCard(card));
                return normalizedCards;
                
            } else if (data.cards && Array.isArray(data.cards)) {
                // Если карты в свойстве cards
                console.log(`✅ Получено ${data.cards.length} карт с ${url}`);
                const normalizedCards = data.cards.map(card => normalizeCard(card));
                return normalizedCards;
            } else {
                throw new Error('Неверный формат данных карт');
            }
            
        } catch (error) {
            console.warn(`⚠️ Ошибка загрузки с ${url}:`, error.message);
            continue; // Пробуем следующий URL
        }
    }
    
    throw new Error('Все URL карт недоступны');
}

// 3. Нормализация данных карты
function normalizeCard(card) {
    return {
        id: card.id || card.name,
        name: card.name || 'Неизвестная карта',
        symbol: card.symbol || '🃏',
        meaningUpright: card.meaningUpright || card.meaning || 'Значение не указано',
        meaningReversed: card.meaningReversed || card.meaningUpright || card.meaning || 'Значение не указано',
        meaning: card.meaning || card.meaningUpright || 'Значение не указано',
        image: card.image || './images/cards/default.jpg'
    };
}

// 4. Функции кэширования
function saveCardsToCache(cards) {
    try {
        const cacheData = {
            cards: cards,
            timestamp: Date.now(),
            version: '2.0',
            source: 'github',
            url: API_CONFIG.cardsUrl
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
        
        // Проверяем возраст кэша (24 часа)
        if (cacheAge < (API_CONFIG.cacheTimeout || 24 * 60 * 60 * 1000) && 
            cacheData.cards && cacheData.cards.length > 0) {
            
            TAROT_CARDS_CACHE = cacheData.cards;
            CARDS_LOADED = true;
            
            console.log(`📦 Загружено ${TAROT_CARDS_CACHE.length} карт из кэша (возраст: ${Math.round(cacheAge / 1000 / 60)} мин)`);
            return true;
        } else {
            console.log('🗑️ Кэш устарел, удаляю');
            localStorage.removeItem('tarot_cards_cache');
            return false;
        }
        
    } catch (error) {
        console.warn('⚠️ Ошибка загрузки кэша:', error);
        localStorage.removeItem('tarot_cards_cache');
        return false;
    }
}

// 5. Фоллбэк карты на случай полного отказа загрузки
function getLocalFallbackCards() {
    return typeof FALLBACK_CARDS !== 'undefined' ? FALLBACK_CARDS : [
        {
            id: "0", 
            name: "Загадочная карта", 
            symbol: "🔮",
            meaningUpright: "Карты временно недоступны, но энергия Вселенной все равно с вами.",
            meaningReversed: "Возможно, стоит попробовать позже.",
            meaning: "Карты временно недоступны, но энергия Вселенной все равно с вами.",
            image: "./images/cards/default.jpg"
        },
        {
            id: "1", 
            name: "Маг", 
            symbol: "⚡",
            meaningUpright: "Сила воли, мастерство, концентрация. У вас есть все необходимое для достижения целей.",
            meaningReversed: "Злоупотребление силой, самообман, недостаток энергии.",
            meaning: "Сила воли, мастерство, концентрация. У вас есть все необходимое для достижения целей.",
            image: "./images/cards/magician.jpg"
        },
        {
            id: "2", 
            name: "Шут", 
            symbol: "🃏",
            meaningUpright: "Новые начинания, спонтанность, свобода. Время для смелых решений и доверия интуиции.",
            meaningReversed: "Безрассудство, необдуманные поступки, легкомыслие.",
            meaning: "Новые начинания, спонтанность, свобода. Время для смелых решений и доверия интуиции.",
            image: "./images/cards/fool.jpg"
        }
    ];
}

// 6. ИСПРАВЛЕННАЯ функция получения случайной карты
async function getRandomCard() {
    // Если карты не загружены, загружаем их
    if (!CARDS_LOADED) {
        await loadCardsFromGitHub();
    }
    
    // Проверяем, что карты есть
    if (TAROT_CARDS_CACHE.length === 0) {
        console.error('❌ Карты не загружены, используем фоллбэк');
        const fallbackCards = getLocalFallbackCards();
        return fallbackCards[Math.floor(Math.random() * fallbackCards.length)];
    }
    
    // Возвращаем случайную карту
    const randomIndex = Math.floor(Math.random() * TAROT_CARDS_CACHE.length);
    const selectedCard = TAROT_CARDS_CACHE[randomIndex];
    
    // Случайно выбираем прямое или перевернутое положение
    const isReversed = Math.random() < 0.5;
    
    // Создаем объект карты с учетом положения
    const card = {
        ...selectedCard,
        isReversed: isReversed,
        meaning: isReversed ? selectedCard.meaningReversed : selectedCard.meaningUpright,
        image: isReversed ? (selectedCard.imageReversed || selectedCard.image) : selectedCard.image,
        position: isReversed ? 'Перевёрнутая' : 'Прямая'
    };
    
    console.log('🎴 Выбрана карта:', card.name, card.position);
    return card;
}

// 7. ОБНОВЛЕННАЯ функция инициализации приложения
async function initApp() {
    console.log('🔮 Инициализация Tarot Web App');
    
    try {
        // Инициализация Telegram Web App
        initTelegramWebApp();
        
        // ВАЖНО: Предзагружаем карты с GitHub параллельно с другими операциями
        const cardsPromise = loadCardsFromGitHub();
        
        // Инициализация Supabase
        if (typeof window.supabase !== 'undefined' && typeof SUPABASE_CONFIG !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase инициализирован');
        } else {
            console.warn('Supabase недоступен, работаем без истории');
            initOfflineMode();
        }
        
        // Загрузка данных пользователя
        await loadCurrentUser();
        
        // Ждем загрузки карт
        await cardsPromise;
        
        // Инициализация UI
        initEventListeners();
        switchTab('daily');
        checkFirstLaunch();
        addTestPremiumButton();
        
        console.log('✅ Приложение готово к работе');
        console.log(`🃏 Доступно карт: ${TAROT_CARDS_CACHE.length}`);
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        initOfflineMode();
        initEventListeners();
        switchTab('daily');
    }
}

// 8. Функции для отладки (можно вызывать из консоли браузера)
async function refreshCardsCache() {
    console.log('🔄 Принудительное обновление карт...');
    
    CARDS_LOADED = false;
    CARDS_LOADING_PROMISE = null;
    localStorage.removeItem('tarot_cards_cache');
    
    await loadCardsFromGitHub();
    showNotification('🃏 Карты обновлены с GitHub!');
}

function getCardsStats() {
    console.log('📈 Статистика карт:');
    console.log('📊 Загружено:', TAROT_CARDS_CACHE.length);
    console.log('✅ Статус загрузки:', CARDS_LOADED ? 'Загружены' : 'Не загружены');
    console.log('🔗 URL:', API_CONFIG.cardsUrl);
    
    const cached = localStorage.getItem('tarot_cards_cache');
    if (cached) {
        const cacheData = JSON.parse(cached);
        const cacheAge = Date.now() - cacheData.timestamp;
        console.log('💾 Возраст кэша:', Math.round(cacheAge / 1000 / 60), 'минут');
        console.log('🏷️ Версия кэша:', cacheData.version);
        console.log('🔗 Источник кэша:', cacheData.source);
    } else {
        console.log('💾 Кэш отсутствует');
    }
    
    if (TAROT_CARDS_CACHE.length > 0) {
        console.log('🎴 Пример карты:', TAROT_CARDS_CACHE[0]);
    }
}

async function testCardsLoading() {
    console.log('🧪 Тест загрузки карт с GitHub...');
    await refreshCardsCache();
    getCardsStats();
    
    // Тест получения случайной карты
    const randomCard = await getRandomCard();
    console.log('🎲 Случайная карта:', randomCard);
}

// 9. Проверка обновлений карт в фоне
async function checkForCardsUpdate() {
    try {
        const cached = localStorage.getItem('tarot_cards_cache');
        if (!cached) return;
        
        const cacheData = JSON.parse(cached);
        const cacheAge = Date.now() - cacheData.timestamp;
        
        // Если кэш старше 6 часов, проверяем обновления
        if (cacheAge > 6 * 60 * 60 * 1000) {
            console.log('🔄 Проверяю обновления карт в фоне...');
            
            const newCards = await fetchCardsFromGitHub();
            
            if (newCards && newCards.length !== TAROT_CARDS_CACHE.length) {
                console.log('🆕 Найдены обновления карт!');
                TAROT_CARDS_CACHE = newCards;
                saveCardsToCache(newCards);
                showNotification('🃏 Карты обновлены!');
            }
        }
    } catch (error) {
        console.log('⚠️ Не удалось проверить обновления карт:', error.message);
    }
}

// Убрать старую функцию getRandomCard(), которая использовала TAROT_CARDS
// Заменить ее на новую версию выше

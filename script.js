// ========================================================================
// ИСПРАВЛЕННЫЙ SCRIPT.JS - Шёпот карт (с корректной загрузкой изображений)
// ========================================================================

// 🌟 СОСТОЯНИЕ ПРИЛОЖЕНИЯ
let appState = {
    dailyCardUsed: false,
    lastCardDate: null,
    questionsUsed: 0,
    isPremium: false,
    freeQuestionsLimit: 3,
    history: [],
    reviews: []
};

// 📦 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let allCards = [];
let isInitialized = false;
let currentRating = 0;
let initAppCalled = false; // Prevent double initialization

// 🎯 DOM ЭЛЕМЕНТЫ
let mainNav, secondaryNav, tabContents;
let tarotCard, cardBack, cardFront;
let cardInfoAfterFlip, flippedCardName, cardIntroText;
let aiAnswerContainer, aiInterpretationTitle, aiInterpretationTextElement;
let afterDailyCardBanner, askMoreQuestionsBtn, premiumBannerBtn;
let starAnimationContainer, questionsLeftElement;
let questionTextarea, submitQuestionBtn, charCounter;
let loadingState, questionAnswerContainer, questionAnswerText;
let premiumTestToggle, premiumTestLabel;
let clarifyingQuestionContainer, clarifyingQuestionTextarea, submitClarifyingQuestionBtn, clarifyingQuestionWarning;
let questionAnimationContainer, questionStarAnimationContainer, questionIntroText;
let questionCardContainer, questionTarotCard, questionCardInfoAfterFlip, questionFlippedCardName;
let spreadsGrid, spreadResult, spreadResultTitle, backToSpreadsBtn;
let spreadAnimationContainer, spreadIntroText, spreadCardsContainer, spreadCardsLayout;
let spreadAnswerContainer, spreadAnswerText;

// 🔮 ВРЕМЕННАЯ СИМУЛЯЦИЯ ИИ-ОТВЕТА

// 📝 РАНДОМНЫЕ ТЕКСТЫ ПЕРЕД ИИ-ИНТЕРПРЕТАЦИЕЙ
const preInterpretationPhrases = [
    "Сейчас узнаем, что ждет тебя сегодня...",
    "Приоткрываем завесу тайны дня...",
    "Давайте расшифруем послание Вселенной...",
    "Готовы к предсказанию, которое раскроет ваш потенциал?",
    "Погружаемся в глубины мудрости Таро, чтобы узнать ваше будущее..."
];

// 🔮 РАНДОМНЫЕ ТЕКСТЫ ДЛЯ ВОПРОСОВ
const questionPreInterpretationPhrases = [
    "Сейчас почувствуем, что скажут карты...",
    "Карты готовятся дать вам ответ...",
    "Тайные силы собираются воедино...",
    "Вселенная приготовила для вас послание...",
    "Энергии карт концентрируются на вашем вопросе...",
    "Мистические символы раскрывают свои секреты..."
];

// 👤 МИСТИЧЕСКИЕ ИМЕНА ДЛЯ ПОЛЬЗОВАТЕЛЕЙ
const mysticalNames = [
    "Странник", "Путник", "Искатель", "Таинственный гость", "Звездный путешественник",
    "Мистический странник", "Ищущий истину", "Странствующий мудрец", "Тайный искатель",
    "Лунный путник", "Звездочет", "Хранитель тайн", "Мудрый странник", "Искатель света",
    "Ночной путешественник", "Следопыт судьбы", "Странник миров", "Мистик",
    "Душа-скиталец", "Познающий", "Вечный странник", "Искатель знаний"
];

// 🎴 КОНФИГУРАЦИЯ РАСКЛАДОВ
const SPREAD_CONFIGS = {
    success: {
        name: "Расклад «Путь к успеху»",
        description: "Показывает препятствия и возможности на пути к цели",
        cards: [
            { position: "top", label: "Цель", description: "Чего вы хотите достичь" },
            { position: "left", label: "Препятствие", description: "Что мешает вам" },
            { position: "center", label: "Настоящее", description: "Ваше текущее положение" },
            { position: "right", label: "Помощь", description: "Что поможет вам" },
            { position: "bottom", label: "Результат", description: "К чему это приведет" }
        ],
        layout: "success-layout"
    },
    love: {
        name: "Расклад «Отношения»",
        description: "Раскрывает динамику отношений между партнерами",
        cards: [
            { position: "me", label: "Вы", description: "Ваши чувства и состояние" },
            { position: "partner", label: "Партнер", description: "Чувства и состояние партнера" },
            { position: "relationship", label: "Отношения", description: "Общая динамика и перспективы" }
        ],
        layout: "love-layout"
    },
    money: {
        name: "Расклад «Финансы»",
        description: "Анализирует финансовые перспективы и денежные потоки",
        cards: [
            { position: "current", label: "Текущие финансы", description: "Ваше финансовое положение сейчас" },
            { position: "opportunities", label: "Возможности", description: "Способы улучшить финансы" },
            { position: "advice", label: "Совет", description: "Как управлять деньгами" },
            { position: "future", label: "Будущее", description: "Финансовые перспективы" }
        ],
        layout: "money-layout"
    },
    growth: {
        name: "Расклад «Личный рост»", 
        description: "Помогает в развитии личности и раскрытии потенциала",
        cards: [
            { position: "past", label: "Прошлое", description: "Что сформировало вас" },
            { position: "present", label: "Настоящее", description: "Ваше текущее состояние" },
            { position: "potential", label: "Потенциал", description: "Ваши скрытые возможности" },
            { position: "future", label: "Будущее", description: "Куда ведет ваш путь развития" }
        ],
        layout: "growth-layout"
    }
};

// ========================================================================
// 💾 УПРАВЛЕНИЕ СОСТОЯНИЕМ
// ========================================================================

async function saveAppState() {
    try {
        console.log('🔄 saveAppState: проверка TarotDB...', {
            tarotDBExists: !!window.TarotDB,
            isConnected: window.TarotDB ? window.TarotDB.isConnected() : false,
            connectionStatus: window.TarotDB ? window.TarotDB.getStatus() : null
        });
        
        if (window.TarotDB && window.TarotDB.isConnected()) {
            console.log('💾 Сохранение в Supabase через TarotDB...');
            // Сохранение в базе данных
            // Используем новую логику синхронизации если доступна
            if (window.TarotDB.syncUserDataToSupabase) {
                await window.TarotDB.syncUserDataToSupabase(getUserId(), {
                    questionsUsed: appState.questionsUsed,
                    isPremium: appState.isPremium,
                    dailyCardUsed: appState.dailyCardUsed,
                    lastCardDay: appState.lastCardDate
                });
            } else {
                // Fallback к старой логике
                await window.TarotDB.updateUserProfile(getUserId(), {
                    last_card_day: appState.lastCardDate,
                    questions_used: appState.questionsUsed, // Исправлено с total_questions на questions_used
                    is_subscribed: appState.isPremium,
                    free_predictions_left: Math.max(0, appState.freeQuestionsLimit - appState.questionsUsed)
                });
            }
            console.log('✅ Состояние сохранено в Supabase');
        } else {
            console.log('📱 TarotDB недоступен, используем localStorage');
            // Резервное сохранение в localStorage
            saveAppStateLocally();
        }
    } catch (error) {
        console.error('❌ Ошибка сохранения состояния:', error);
        // Fallback к localStorage при ошибке
        saveAppStateLocally();
    }
}

function getUserId() {
    const telegramId = getTelegramUserId();
    // Обеспечиваем, что возвращается чистая строка
    const userId = telegramId ? String(telegramId).trim() : 'anonymous_user';
    console.log('🆔 getUserId:', { telegramId, userId: userId });
    return userId;
}

function saveAppStateLocally() {
    try {
        localStorage.setItem('tarotAppState', JSON.stringify(appState));
        console.log('✅ Состояние сохранено локально');
    } catch (error) {
        console.error('❌ Ошибка локального сохранения состояния:', error);
    }
}

async function loadAppState() {
    try {
        if (window.TarotDB && window.TarotDB.isConnected()) {
            // Загрузка из базы данных
            const userProfile = await window.TarotDB.getUserProfile(getUserId());
            if (userProfile) {
                appState.dailyCardUsed = userProfile.last_card_day === new Date().toISOString().split('T')[0];
                appState.lastCardDate = userProfile.last_card_day;
                appState.questionsUsed = userProfile.total_questions || 0;
                appState.isPremium = userProfile.is_subscribed || false;
                appState.freeQuestionsLimit = 3; // Базовый лимит
                
                console.log('✅ Состояние загружено из Supabase:', {
                    dailyCardUsed: appState.dailyCardUsed,
                    questionsUsed: appState.questionsUsed,
                    isPremium: appState.isPremium,
                    historyLength: appState.history.length,
                    reviewsLength: appState.reviews.length
                });
            } else {
                console.warn('⚠️ Профиль пользователя не найден в базе данных');
                await loadAppStateLocally();
            }
        } else {
            // Резервная загрузка из localStorage
            await loadAppStateLocally();
        }
        
        // Очищаем старые записи истории при загрузке
        await cleanOldHistoryItems();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки состояния:', error);
        // Fallback к localStorage
        await loadAppStateLocally();
    }
}

async function loadAppStateLocally() {
    try {
        const saved = localStorage.getItem('tarotAppState');
        if (saved) {
            const parsedState = JSON.parse(saved);
            
            // Глубокое слияние состояний с приоритетом загруженного состояния
            appState = {
                ...appState,
                ...parsedState,
                history: parsedState.history || appState.history,
                reviews: parsedState.reviews || appState.reviews
            };
            
            console.log('✅ Состояние загружено из локального хранилища');
        } else {
            console.warn('⚠️ Локальное состояние не найдено');
        }
    } catch (error) {
        console.error('❌ Ошибка локальной загрузки состояния:', error);
        // Сохраняем текущее состояние по умолчанию
        await saveAppState();
    }
}

async function cleanOldHistoryItems() {
    if (!appState.history || appState.history.length === 0) {
        return;
    }
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 дней в миллисекундах
    const initialCount = appState.history.length;
    
    // Фильтруем записи новее 30 дней
    appState.history = appState.history.filter(item => {
        // Если нет timestamp (старые записи), сохраняем их пока что
        if (!item.timestamp) {
            return true;
        }
        
        return item.timestamp > thirtyDaysAgo;
    });
    
    const removedCount = initialCount - appState.history.length;
    
    if (removedCount > 0) {
        console.log(`🗑️ Удалено ${removedCount} записей истории старше 30 дней`);
        await saveAppState(); // Сохраняем обновленное состояние
    }
}

// ========================================================================
// 🔔 СИСТЕМА УВЕДОМЛЕНИЙ
// ========================================================================

function showMessage(message, type = 'info', duration = 3000) {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    const toast = document.getElementById('toast');
    if (!toast) {
        console.warn('Toast элемент не найден');
        return;
    }

    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

// ========================================================================
// 🃏 ЗАГРУЗКА ДАННЫХ КАРТ (ИСПРАВЛЕНО)
// ========================================================================

async function loadCards() {
    try {
        console.log('🃏 Загрузка карт через API...');
        
        // 1. Пытаемся загрузить через наш API
        try {
            const response = await fetch('/api/cards', {
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const apiData = await response.json();
                
                if (apiData.success && apiData.cards && Array.isArray(apiData.cards) && apiData.cards.length > 0) {
                    // Обрабатываем карты из API
                    allCards = apiData.cards.map(card => {
                        const processedCard = { ...card };
                        
                        // Нормализуем пути к изображениям
                        if (card.image) {
                            processedCard.image = normalizeImagePath(card.image);
                        }
                        if (card.imageUpright) {
                            processedCard.imageUpright = normalizeImagePath(card.imageUpright);
                        }
                        if (card.imageReversed) {
                            processedCard.imageReversed = normalizeImagePath(card.imageReversed);
                        }
                        
                        return processedCard;
                    });
                    
                    console.log(`✅ Карты загружены через API (${apiData.source}):`, allCards.length);
                    console.log('📊 Статус кэша:', apiData.cached ? 'HIT' : 'MISS');
                    if (apiData.stale) {
                        console.warn('⚠️ Использованы устаревшие кэшированные данные');
                    }
                    
                    return; // Успешно загружены через API
                }
            }
            
            console.warn('⚠️ API карт недоступен, пробуем прямую загрузку');
        } catch (apiError) {
            console.warn('⚠️ Ошибка API карт:', apiError.message);
        }
        
        // 2. Fallback - прямая загрузка из файла
        const possiblePaths = [
            './cards.json',
            '/cards.json',
            'cards.json'
        ];
        
        let cardsLoaded = false;
        
        for (const path of possiblePaths) {
            try {
                console.log(`Fallback загрузка из: ${path}`);
                const response = await fetch(path);
                
                if (response.ok) {
                    const cardsData = await response.json();
                    
                    if (cardsData && Array.isArray(cardsData) && cardsData.length > 0) {
                        // Обрабатываем загруженные карты
                        allCards = cardsData.map(card => {
                            const processedCard = { ...card };
                            
                            // Нормализуем пути к изображениям
                            if (card.image) {
                                processedCard.image = normalizeImagePath(card.image);
                            }
                            if (card.imageUpright) {
                                processedCard.imageUpright = normalizeImagePath(card.imageUpright);
                            }
                            if (card.imageReversed) {
                                processedCard.imageReversed = normalizeImagePath(card.imageReversed);
                            }
                            
                            return processedCard;
                        });
                        
                        console.log(`✅ Карты загружены из ${path}:`, allCards.length);
                        
                        cardsLoaded = true;
                        break;
                    }
                }
            } catch (error) {
                console.warn(`Не удалось загрузить из ${path}:`, error.message);
            }
        }
        
        if (!cardsLoaded) {
            throw new Error('Все пути загрузки карт не удались');
        }
        
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить карты из файла, используем встроенные:', error);
        allCards = getBuiltInCards();
        console.log('✅ Встроенные карты загружены:', allCards.length);
    }
}

// Нормализация путей к изображениям
function normalizeImagePath(imagePath) {
    if (!imagePath) return null;
    
    // Если путь уже полный URL, возвращаем как есть
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // Если путь начинается с /, убираем его для относительных путей
    if (imagePath.startsWith('/')) {
        imagePath = imagePath.substring(1);
    }
    
    // Добавляем ./ для относительных путей если нужно
    if (!imagePath.startsWith('./')) {
        imagePath = './' + imagePath;
    }
    
    return imagePath;
}

// Создание красивого placeholder для карты
function createCardPlaceholder(card) {
    const symbol = card.symbol || '🔮';
    const name = encodeURIComponent(card.name || 'Карта');
    const colors = [
        '4B0082/FFD700', // Фиолетовый/Золотой
        '663399/FF69B4', // Пурпурный/Розовый  
        '2E8B57/98FB98', // Зеленый/Светло-зеленый
        '8B0000/FFA500', // Темно-красный/Оранжевый
        '191970/87CEEB', // Темно-синий/Голубой
        '800080/DDA0DD'  // Пурпурный/Сливовый
    ];
    
    const colorPair = colors[Math.floor(Math.random() * colors.length)];
    
    return `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='270' viewBox='0 0 180 270'><rect width='180' height='270' fill='%238A2BE2'/><text x='90' y='120' text-anchor='middle' fill='white' font-size='32'>${symbol}</text><text x='90' y='160' text-anchor='middle' fill='white' font-size='14' font-family='Arial'>${card.name || 'Карта'}</text></svg>`;
}

// Встроенные карты с правильными изображениями
function getBuiltInCards() {
    const baseCards = [
        {
            id: "built_in_1",
            name: "Звезда",
            symbol: "⭐",
            meaningUpright: "Надежда, вдохновение, исцеление",
            description: "Карта надежды и вдохновения. Сегодня звезды благоволят вашим начинаниям и открывают новые горизонты возможностей."
        },
        {
            id: "built_in_2", 
            name: "Солнце",
            symbol: "☀️",
            meaningUpright: "Радость, успех, жизненная сила",
            description: "Символ радости и успеха. Впереди светлые времена, полные энергии и достижений."
        },
        {
            id: "built_in_3",
            name: "Луна", 
            symbol: "🌙",
            meaningUpright: "Иллюзии, интуиция, страхи",
            description: "Карта интуиции и тайн. Доверьтесь внутреннему голосу и будьте внимательны к знакам судьбы."
        },
        {
            id: "built_in_4",
            name: "Маг",
            symbol: "🔮",
            meaningUpright: "Сила воли, проявление, вдохновение",
            description: "У вас есть все необходимые инструменты для достижения цели. Время действовать с уверенностью."
        },
        {
            id: "built_in_5",
            name: "Дурак",
            symbol: "🃏",
            meaningUpright: "Начало, невинность, спонтанность",
            description: "Карта новых начинаний. Смело идите навстречу неизвестному - впереди вас ждут удивительные открытия."
        },
        {
            id: "built_in_6",
            name: "Сила",
            symbol: "🦁",
            meaningUpright: "Мужество, сострадание, внутренняя сила",
            description: "Истинная сила в мягкости. Сегодня вы сможете преодолеть любые препятствия благодаря силе духа."
        },
        {
            id: "built_in_7",
            name: "Колесо Фортуны",
            symbol: "🎡",
            meaningUpright: "Удача, циклы, судьба",
            description: "Колесо судьбы поворачивается в вашу пользу. Время благоприятных перемен и новых возможностей."
        },
        {
            id: "built_in_8",
            name: "Императрица",
            symbol: "👑",
            meaningUpright: "Изобилие, материнство, природа",
            description: "Время творчества и изобилия. Позвольте себе расцвести и наслаждаться красотой жизни."
        },
        {
            id: "built_in_9",
            name: "Башня",
            symbol: "🏗️",
            meaningUpright: "Разрушение, потрясение, истина",
            description: "Старые структуры рушатся, чтобы освободить место для нового. Примите перемены как возможность роста."
        },
        {
            id: "built_in_10",
            name: "Смерть",
            symbol: "💀",
            meaningUpright: "Конец, трансформация, перерождение",
            description: "Время трансформации и обновления. Отпустите прошлое, чтобы открыть дорогу будущему."
        }
    ];
    
    // Добавляем изображения для всех карт
    return baseCards.map(card => ({
        ...card,
        image: createCardPlaceholder(card)
    }));
}

// Асинхронная загрузка изображения с Promise
async function loadImageAsync(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            console.log('✅ Изображение успешно загружено:', imageSrc);
            resolve(img);
        };
        img.onerror = () => {
            console.warn('❌ Ошибка загрузки изображения:', imageSrc);
            reject(new Error(`Не удалось загрузить изображение: ${imageSrc}`));
        };
        // Устанавливаем таймаут для медленных соединений
        setTimeout(() => {
            reject(new Error(`Таймаут загрузки изображения: ${imageSrc}`));
        }, 5000);
        
        img.src = encodeURI(imageSrc);
    });
}

// Функция проверки доступности изображения
async function checkImageAvailability(imagePath) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        // ИСПРАВЛЕНИЕ: кодируем URL для корректной работы с кириллицей
        img.src = encodeURI(imagePath);
        
        // Таймаут для медленных соединений
        setTimeout(() => resolve(false), 3000);
    });
}

// Получение случайной карты (исправлено)
function getRandomCard() {
    if (!allCards || allCards.length === 0) {
        console.warn('⚠️ Карты не загружены, используем встроенные');
        allCards = getBuiltInCards();
    }
    
    // Получаем копию карты, чтобы не изменять оригинал
    const baseCard = allCards[Math.floor(Math.random() * allCards.length)];
    const randomCard = { ...baseCard };

    // Определяем ориентацию
    randomCard.isReversed = Math.random() < 0.5;

    // Выбираем изображение для отображения
    if (randomCard.isReversed && randomCard.imageReversed) {
        randomCard.displayImage = randomCard.imageReversed;
    } else if (!randomCard.isReversed && randomCard.imageUpright) {
        randomCard.displayImage = randomCard.imageUpright;
    } else if (randomCard.image) {
        randomCard.displayImage = randomCard.image;
    } else {
        // Fallback к placeholder
        randomCard.displayImage = createCardPlaceholder(randomCard);
    }
    
    console.log(`🎯 Выбранная карта: ${randomCard.name} (${randomCard.isReversed ? 'Перевернутая' : 'Прямая'})`);
    console.log(`🖼️ Изображение: ${randomCard.displayImage}`);
    
    return randomCard;
}

// ========================================================================
// 🎨 АНИМАЦИИ И ЭФФЕКТЫ
// ========================================================================

function animateStars(count = 3, container = starAnimationContainer) {
    if (!container) return;
    
    container.innerHTML = '';
    const stars = ['✨', '🌟', '💫'];
    const positions = [
        { x: '10%', y: '20%' },
        { x: '15%', y: '80%' },
        { x: '80%', y: '50%' }
    ];

    for (let i = 0; i < count; i++) {
        const star = document.createElement('span');
        star.textContent = stars[i % stars.length];
        star.classList.add('sparkle-star');
        
        star.style.left = positions[i].x;
        star.style.top = positions[i].y;
        star.style.animationDelay = `${i * 0.1}s`;
        star.style.animationDuration = `${0.8 + Math.random() * 0.4}s`;
        
        container.appendChild(star);
    }
}

function typeText(element, text, speed = 15) {
    if (!element) return Promise.resolve();
    
    let i = 0;
    element.textContent = '';
    element.classList.remove('finished-typing');

    return new Promise(resolve => {
        function typeChar() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(typeChar, speed);
            } else {
                element.classList.add('finished-typing');
                resolve();
            }
        }
        typeChar();
    });
}

// ========================================================================
// 🔄 НАВИГАЦИЯ
// ========================================================================

function switchTab(tabId) {
    console.log('🔄 Переключение на вкладку:', tabId);
    
    // Скрываем все вкладки
    tabContents.forEach(content => {
        content.classList.remove('active');
        content.classList.add('hidden');
    });
    
    // Показываем выбранную вкладку
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        targetTab.classList.remove('hidden');
    }

    // Обновляем активную кнопку навигации
    const allNavTabs = document.querySelectorAll('.nav-tab');
    allNavTabs.forEach(tab => tab.classList.remove('active'));

    const targetNavTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
    if (targetNavTab) {
        targetNavTab.classList.add('active');
    }

    // Сбрасываем состояние карты дня при переходе на другие вкладки
    if (tabId !== 'daily-card') {
        resetDailyCardVisualState();
    }
    
    // Сбрасываем состояние вопросов при переходе на другие вкладки
    if (tabId !== 'question') {
        resetQuestionState();
    }
    
    // Сбрасываем состояние раскладов при переходе на другие вкладки
    if (tabId !== 'spreads') {
        resetSpreadState();
    }
    
    // Обновляем счетчик вопросов при переходе на вкладку вопросов
    if (tabId === 'question') {
        updateQuestionsCounter();
    }
    
    // Обновляем историю при переходе на вкладку истории
    if (tabId === 'history') {
        updateHistoryDisplay();
    }
    
    // Обновляем отзывы при переходе на вкладку отзывов
    if (tabId === 'reviews') {
        updateReviewsDisplay();
    }
}

function resetDailyCardVisualState() {
    if (!tarotCard) return;
    
    tarotCard.classList.remove('flipped');
    cardFront?.classList.add('hidden');
    cardBack?.classList.remove('hidden');
    cardInfoAfterFlip?.classList.add('hidden');
    
    if (cardIntroText) cardIntroText.textContent = '';
    
    aiAnswerContainer?.classList.remove('show');
    aiAnswerContainer?.classList.add('hidden');
    
    afterDailyCardBanner?.classList.remove('show');
    afterDailyCardBanner?.classList.add('hidden');
    
    if (aiInterpretationTextElement) {
        aiInterpretationTextElement.textContent = '';
        aiInterpretationTextElement.classList.remove('finished-typing');
    }
    
    if (starAnimationContainer) {
        starAnimationContainer.innerHTML = '';
    }
}

async function resetDailyCardState() {
    resetDailyCardVisualState();
    
    // Проверяем, нужно ли сбросить использование карты дня для нового дня
    const today = new Date().toDateString();
    if (appState.lastCardDate !== today) {
        appState.dailyCardUsed = false;
        await saveAppState();
        console.log('✅ Карта дня сброшена для нового дня');
    }
}

function resetQuestionState() {
    console.log('🔄 Сброс состояния вопросов');
    
    // Скрываем анимацию
    questionAnimationContainer?.classList.add('hidden');
    
    // Скрываем карту
    questionCardContainer?.classList.add('hidden');
    
    // Сбрасываем карту
    if (questionTarotCard) {
        questionTarotCard.classList.remove('flipped');
        questionTarotCard.querySelector('.card-front')?.classList.add('hidden');
        questionTarotCard.querySelector('.card-back')?.classList.remove('hidden');
    }
    
    // Скрываем информацию о карте
    questionCardInfoAfterFlip?.classList.add('hidden');
    
    // Скрываем ответ
    questionAnswerContainer?.classList.remove('show');
    questionAnswerContainer?.classList.add('hidden');
    
    // Скрываем уточняющий вопрос
    clarifyingQuestionContainer?.classList.add('hidden');
    clarifyingQuestionWarning?.classList.add('hidden');
    
    // Очищаем тексты
    if (questionIntroText) questionIntroText.textContent = '';
    if (questionFlippedCardName) questionFlippedCardName.textContent = '';
    if (questionAnswerText) {
        questionAnswerText.textContent = '';
        questionAnswerText.classList.remove('finished-typing');
    }
    
    // Очищаем анимации
    if (questionStarAnimationContainer) {
        questionStarAnimationContainer.innerHTML = '';
    }
    
    // Скрываем старую загрузку
    loadingState?.classList.add('hidden');
}

function resetQuestionAnswerOnly() {
    console.log('🔄 Сброс только ответа на вопрос');
    
    // Скрываем ответ
    questionAnswerContainer?.classList.remove('show');
    questionAnswerContainer?.classList.add('hidden');
    
    // Очищаем текст ответа
    if (questionAnswerText) {
        questionAnswerText.textContent = '';
        questionAnswerText.classList.remove('finished-typing');
    }
    
    // Скрываем информацию о карте (но оставляем саму карту видимой)
    questionCardInfoAfterFlip?.classList.add('hidden');
    
    // Очищаем названия карт
    if (questionFlippedCardName) questionFlippedCardName.textContent = '';
}

// ========================================================================
// ========================================================================
// 🤖 ГЕНЕРАЦИЯ ПРЕДСКАЗАНИЙ ЧЕРЕЗ API

async function generatePredictionAPI(card, question) {
    try {
        const userData = {
            user_id: appState.telegramUser?.id || 'webapp_user',
            userName: appState.telegramUser?.first_name || 'Гость'
        };

        const response = await fetch('/api/generate-prediction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userData.user_id,
                userName: userData.userName,
                question: question,
                cards: card, // Поддерживаем как одну карту, так и массив
                type: 'single_card'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success || !result.prediction) {
            throw new Error('Некорректный ответ от API');
        }

        return result.prediction;

    } catch (error) {
        console.error('❌ Ошибка API генерации предсказания:', error);
        throw error;
    }
}

// 🃏 ОБРАБОТКА КАРТЫ ДНЯ (ИСПРАВЛЕНО С УЛУЧШЕННОЙ ЗАГРУЗКОЙ ИЗОБРАЖЕНИЙ)
// ========================================================================

async function handleDailyCardClick() {
    console.log('🃏 Обработка клика по карте дня');
    
    if (appState.dailyCardUsed) {
        showMessage('Карта дня уже была получена сегодня! Вы можете получить новую карту завтра.', 'info');
        return;
    }

    // Сбрасываем состояние для нового переворота
    await resetDailyCardState();
    
    // Показываем звездочки прямо на рубашке карты
    animateStars(3, starAnimationContainer);

    // Ждем анимацию звездочек, потом переворачиваем карту
    setTimeout(() => {
        tarotCard.classList.add('flipped');
    }, 1000);

    // Выбираем случайную карту
    const randomCard = getRandomCard();

    // Обновляем содержимое карты через половину анимации
    setTimeout(async () => {
        starAnimationContainer.innerHTML = '';
        
        if (randomCard.displayImage) {
            // Подготавливаем изображение как background-image для совместимости с 3D трансформациями
            const cardFront = tarotCard?.querySelector('.card-front');
            const cardBack = tarotCard?.querySelector('.card-back');
            
            if (cardFront && cardBack) {
                try {
                    console.log('🖼️ Начинаем загрузку изображения:', randomCard.displayImage);
                    
                    // Асинхронно загружаем изображение перед анимацией
                    await loadImageAsync(randomCard.displayImage);
                    
                    // Устанавливаем изображение как фон только после успешной загрузки
                    cardFront.style.backgroundImage = `url('${encodeURI(randomCard.displayImage)}')`;
                    cardFront.style.backgroundSize = 'cover';
                    cardFront.style.backgroundPosition = 'center';
                    cardFront.style.backgroundRepeat = 'no-repeat';
                    cardFront.style.opacity = '1';
                    cardFront.style.visibility = 'visible';
                    
                    console.log('🎨 Background-image установлен после загрузки:', cardFront.style.backgroundImage);
                    
                    // Запускаем анимацию переворота только после загрузки изображения
                    tarotCard.classList.add('flipped');
                    console.log('🔄 Карта перевернута, flipped класс добавлен');
                    
                    // Ждем завершения анимации, затем переключаем видимость
                    setTimeout(() => {
                        cardFront.classList.remove('hidden');
                        cardBack.classList.add('hidden');
                        
                        console.log('👁️ Состояние видимости - cardFront hidden:', cardFront.classList.contains('hidden'));
                        console.log('👁️ Состояние видимости - cardBack hidden:', cardBack.classList.contains('hidden'));
                        console.log('🔍 Computed styles - display:', window.getComputedStyle(cardFront).display);
                        console.log('🔍 Computed styles - background-image:', window.getComputedStyle(cardFront).backgroundImage);
                    }, 400); // Ждем завершения анимации cardFlip (0.8s / 2 = 0.4s)
                    
                } catch (error) {
                    console.warn('❌ Ошибка загрузки изображения, используем placeholder:', error);
                    // Используем placeholder при ошибке загрузки
                    cardFront.style.backgroundImage = `url('${createCardPlaceholder(randomCard)}')`;
                    cardFront.style.backgroundSize = 'cover';
                    cardFront.style.backgroundPosition = 'center';
                    cardFront.style.backgroundRepeat = 'no-repeat';
                    cardFront.style.opacity = '1';
                    cardFront.style.visibility = 'visible';
                    
                    // Запускаем анимацию с placeholder
                    tarotCard.classList.add('flipped');
                    
                    setTimeout(() => {
                        cardFront.classList.remove('hidden');
                        cardBack.classList.add('hidden');
                    }, 400);
                }
            }
        }
        
        console.log('🔄 Показываем переднюю сторону карты');
        
        // Берём контейнер и стороны
        const card = tarotCard;                          // #tarotCard
        const front = card?.querySelector('.card-front');
        const back  = card?.querySelector('.card-back');

        if (!card || !front || !back) return;

        // Управляем видимостью только через CSS-классы
        front.classList.remove('hidden');
        back.classList.add('hidden');

        // Принудительный reflow для WebKit
        void front.offsetHeight;

        // Применяем 3D-трансформацию для корректного отображения
        requestAnimationFrame(() => {
            card.classList.add('flipped');
            // Микро-сдвиг для WebKit 3D-слоя
            front.style.transform = 'rotateY(180deg) translateZ(0)';
        });
        
        console.log('✅ [КАРТА ДНЯ] Классы обновлены - cardFront hidden:', front?.classList.contains('hidden'));
        console.log('✅ [КАРТА ДНЯ] Классы обновлены - cardBack hidden:', back?.classList.contains('hidden'));
        console.log('🎨 [КАРТА ДНЯ] Background-image:', front?.style.backgroundImage || 'не установлен');
    }, 400);

    // После полной анимации показываем информацию
    setTimeout(async () => {
        // Показываем имя карты
        if (flippedCardName) {
            const orientationText = randomCard.isReversed ? ' (перевернутая)' : '';
            flippedCardName.textContent = `${randomCard.name}${orientationText} ${randomCard.symbol || ''}`;
        }
        cardInfoAfterFlip?.classList.remove('hidden');

        // Показываем вводный текст
        const randomPrePhrase = preInterpretationPhrases[Math.floor(Math.random() * preInterpretationPhrases.length)];
        if (cardIntroText) {
            cardIntroText.textContent = randomPrePhrase;
            cardIntroText.classList.remove('hidden');
        }

        // Показываем контейнер ИИ-интерпретации
        if (aiInterpretationTitle) {
            aiInterpretationTitle.textContent = 'ИИ-интерпретация 🔮';
        }

        aiAnswerContainer?.classList.remove('hidden');
        aiAnswerContainer?.classList.add('show');

        // Генерируем интерпретацию через API
        let interpretationText;
        try {
            console.log('🤖 Генерируем интерпретацию карты дня через API...');
            interpretationText = await generatePredictionAPI(randomCard, 'карта дня');
            console.log('✅ Интерпретация карты дня получена:', interpretationText.substring(0, 100) + '...');
        } catch (error) {
            console.error('❌ Ошибка генерации интерпретации карты дня:', error);
            // Fallback к локальной интерпретации
            interpretationText = randomCard.description || 'Карта показывает важную информацию для размышления';
        }
        
        await typeText(aiInterpretationTextElement, interpretationText);

        // Показываем баннер
        setTimeout(() => {
            afterDailyCardBanner?.classList.remove('hidden');
            afterDailyCardBanner?.classList.add('show');
        }, 500);

        // Сохраняем карту дня в Supabase
        try {
            if (window.TarotDB && window.TarotDB.isConnected()) {
                const cardData = {
                    id: randomCard.id,
                    name: randomCard.name,
                    image: randomCard.displayImage,
                    description: randomCard.description,
                    interpretation: interpretationText
                };
                await window.TarotDB.saveDailyCard(getUserId(), cardData);
                console.log('✅ Карта дня сохранена в Supabase');
            }
        } catch (error) {
            console.error('❌ Ошибка сохранения карты дня:', error);
        }

        // Сохраняем в историю
        await addToHistory('daily-card', randomCard.name, interpretationText);
        
    }, 800);

    // Обновляем состояние
    appState.dailyCardUsed = true;
    appState.lastCardDate = new Date().toDateString();
    await saveAppState();
}

// ========================================================================
// ❓ ОБРАБОТКА ВОПРОСОВ
// ========================================================================

function updateQuestionsCounter() {
    if (!questionsLeftElement) return;

    if (appState.isPremium) {
        questionsLeftElement.textContent = 'Вопросы: неограниченно';
        questionsLeftElement.style.color = 'var(--accent-gold)';
        return;
    }
    
    const remaining = Math.max(0, appState.freeQuestionsLimit - appState.questionsUsed);
    questionsLeftElement.textContent = `Осталось бесплатных вопросов: ${remaining}`;
    
    if (remaining === 0) {
        questionsLeftElement.textContent = 'Бесплатные вопросы закончились. Получите Premium!';
        questionsLeftElement.style.color = '#ff6b6b';
    } else {
        questionsLeftElement.style.color = 'var(--primary-text)';
    }
}

function handleQuestionInput() {
    if (!questionTextarea || !charCounter || !submitQuestionBtn) return;
    
    const text = questionTextarea.value;
    const length = text.length;
    
    charCounter.textContent = `${length}/200`;
    
    // Проверяем лимиты
    const canAsk = length > 0 && length <= 200 && 
                  (appState.isPremium || appState.questionsUsed < appState.freeQuestionsLimit);
    
    submitQuestionBtn.disabled = !canAsk;
    
    if (length > 200) {
        charCounter.style.color = '#ff6b6b';
    } else {
        charCounter.style.color = '#b0b0b0';
    }
}

async function handleAskQuestion() {
    if (!questionTextarea) return;
    
    const question = questionTextarea.value.trim();
    
    if (!question) {
        showMessage('Пожалуйста, введите ваш вопрос', 'error');
        return;
    }
    
    if (!appState.isPremium && appState.questionsUsed >= appState.freeQuestionsLimit) {
        showMessage('Бесплатные вопросы закончились. Получите Premium для безлимитных вопросов!', 'error');
        return;
    }
    
    console.log('🔮 Обработка вопроса:', question);
    
    // Скрываем предыдущие результаты
    resetQuestionState();
    
    // Отключаем кнопку
    submitQuestionBtn.disabled = true;
    
    // Выбираем случайную карту для ответа
    const randomCard = getRandomCard();
    
    // 1. Показываем вводный текст
    questionAnimationContainer?.classList.remove('hidden');
    const randomPrePhrase = questionPreInterpretationPhrases[Math.floor(Math.random() * questionPreInterpretationPhrases.length)];
    if (questionIntroText) {
        questionIntroText.textContent = randomPrePhrase;
        questionIntroText.classList.remove('hidden');
    }
    
    // Ждем немного для показа текста
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
        // 2. Скрываем текст и показываем карту рубашкой с звездочками
        questionAnimationContainer?.classList.add('hidden');
        questionCardContainer?.classList.remove('hidden');
        
        // Показываем звездочки на рубашке карты
        animateStars(3, questionStarAnimationContainer);
        
        // 3. Переворачиваем карту через 1200ms (время для звездочек)
        setTimeout(async () => {
            // Переворачиваем карту
            questionTarotCard?.classList.add('flipped');
            
            // Подготавливаем изображение как background-image для совместимости с 3D трансформациями
            const cardFront = questionTarotCard?.querySelector('.card-front');
            const cardBack = questionTarotCard?.querySelector('.card-back');
            
            if (cardFront && cardBack) {
                try {
                    console.log('🖼️ Начинаем асинхронную загрузку изображения для вопроса:', randomCard.displayImage);
                    
                    // Асинхронно загружаем изображение перед показом
                    await loadImageAsync(randomCard.displayImage);
                    
                    console.log('✅ Изображение карты для вопроса успешно загружено');
                    
                    // Устанавливаем изображение как фон только после успешной загрузки
                    cardFront.style.backgroundImage = `url('${encodeURI(randomCard.displayImage)}')`;
                    cardFront.style.backgroundSize = 'cover';
                    cardFront.style.backgroundPosition = 'center';
                    cardFront.style.backgroundRepeat = 'no-repeat';
                    cardFront.style.opacity = '1';
                    cardFront.style.visibility = 'visible';
                    
                    console.log('🎨 Background-image установлен после загрузки:', cardFront.style.backgroundImage);
                    
                    // Показываем лицевую сторону только после загрузки изображения
                    cardFront.classList.remove('hidden');
                    cardBack.classList.add('hidden');
                    
                    console.log('👁️ [ВОПРОС] Состояние видимости - cardFront hidden:', cardFront.classList.contains('hidden'));
                    console.log('👁️ [ВОПРОС] Состояние видимости - cardBack hidden:', cardBack.classList.contains('hidden'));
                    console.log('🔍 [ВОПРОС] Computed styles - display:', window.getComputedStyle(cardFront).display);
                    console.log('🔍 [ВОПРОС] Computed styles - background-image:', window.getComputedStyle(cardFront).backgroundImage);
                    
                } catch (error) {
                    console.warn('❌ Ошибка загрузки изображения для вопроса, используем placeholder:', error);
                    // Используем placeholder при ошибке загрузки
                    cardFront.style.backgroundImage = `url('${createCardPlaceholder(randomCard)}')`;
                    cardFront.style.backgroundSize = 'cover';
                    cardFront.style.backgroundPosition = 'center';
                    cardFront.style.backgroundRepeat = 'no-repeat';
                    cardFront.style.opacity = '1';
                    cardFront.style.visibility = 'visible';
                    
                    cardFront.classList.remove('hidden');
                    cardBack.classList.add('hidden');
                }
            }
            
            // Обновляем лицевую сторону карты
            setTimeout(() => {
                console.log('🔄 [ВОПРОС] Показываем переднюю сторону карты');
                console.log('📍 questionTarotCard element:', questionTarotCard);
                
                const cardFront = questionTarotCard?.querySelector('.card-front');
                const cardBack = questionTarotCard?.querySelector('.card-back');
                
                console.log('📍 cardFront element:', cardFront);
                console.log('📍 cardBack element:', cardBack);
                
                // Управляем видимостью только через CSS-классы
                if (cardFront) {
                    cardFront.classList.remove('hidden');
                }
                if (cardBack) {
                    cardBack.classList.add('hidden');
                }
                
                // ОСТАВЛЯЕМ класс flipped для корректного показа лицевой стороны
                // (НЕ снимаем flipped, т.к. .card-front повернут на 180°)
                
                console.log('✅ [ВОПРОС] Классы обновлены - cardFront hidden:', cardFront?.classList.contains('hidden'));
                console.log('✅ [ВОПРОС] Классы обновлены - cardBack hidden:', cardBack?.classList.contains('hidden'));
                
                // Показываем название карты
                if (questionFlippedCardName) {
                    const orientationText = randomCard.isReversed ? ' (перевернутая)' : '';
                    questionFlippedCardName.textContent = `${randomCard.name}${orientationText} ${randomCard.symbol || ''}`;
                }
                questionCardInfoAfterFlip?.classList.remove('hidden');
            }, 400);
            
        }, 800);
        
        // 4. Через 2 секунды после переворота показываем ответ и начинаем печать
        setTimeout(async () => {
            questionAnswerContainer?.classList.remove('hidden');
            questionAnswerContainer?.classList.add('show');
            
            // Генерируем ответ через API
            let answer;
            try {
                console.log('🤖 Отправляем запрос на генерацию предсказания...');
                const prediction = await generatePredictionAPI(randomCard, question);
                const orientationText = randomCard.isReversed ? ' (перевернутая)' : '';
                answer = `На ваш вопрос "${question}" отвечает карта ${randomCard.name}${orientationText}:\n\n${prediction}`;
                console.log('✅ Предсказание получено:', prediction.substring(0, 100) + '...');
            } catch (error) {
                console.error('❌ Ошибка генерации предсказания:', error);
                // Fallback к локальной генерации
                const orientationText = randomCard.isReversed ? ' (перевернутая)' : '';
                answer = `На ваш вопрос "${question}" отвечает карта ${randomCard.name}${orientationText}:\n\n${randomCard.description || 'Карты предлагают размышления и новые перспективы'}`;
            }
            
            // Печатаем текст
            if (questionAnswerText) {
                await typeText(questionAnswerText, answer);
            }
            
            // 5. После завершения печати показываем уточняющий вопрос
            setTimeout(() => {
                clarifyingQuestionContainer?.classList.remove('hidden');
                if (!appState.isPremium) {
                    clarifyingQuestionWarning?.classList.remove('hidden');
                } else {
                    clarifyingQuestionWarning?.classList.add('hidden');
                }
            }, 500);

            // Обновляем счетчики
            if (!appState.isPremium) {
                appState.questionsUsed++;
                await saveAppState();
                updateQuestionsCounter();
            }
            
            // Сохраняем вопрос и ответ в Supabase
            try {
                if (window.TarotDB && window.TarotDB.isConnected()) {
                    const savedQuestion = await window.TarotDB.saveQuestion(getUserId(), question);
                    if (savedQuestion && savedQuestion.id) {
                        const cardData = {
                            id: randomCard.id,
                            name: randomCard.name,
                            image: randomCard.displayImage,
                            description: randomCard.description
                        };
                        await window.TarotDB.saveAnswer(savedQuestion.id, cardData, answer);
                        console.log('✅ Вопрос и ответ сохранены в Supabase');
                    }
                }
            } catch (error) {
                console.error('❌ Ошибка сохранения вопроса и ответа:', error);
            }
            
            // Сохраняем в историю
            await addToHistory('question', question, answer);
            
            // Очищаем форму
            questionTextarea.value = '';
            handleQuestionInput();
            
            showMessage('Ответ получен!', 'success');
            
        }, 3200); // 1200ms для карты + 2000ms
        
    } catch (error) {
        console.error('❌ Ошибка при обработке вопроса:', error);
        resetQuestionState();
        showMessage('Произошла ошибка. Попробуйте еще раз.', 'error');
    } finally {
        setTimeout(() => {
            submitQuestionBtn.disabled = false;
        }, 3000);
    }
}

async function handleClarifyingQuestion() {
    if (!clarifyingQuestionTextarea) return;

    const question = clarifyingQuestionTextarea.value.trim();
    if (!question) {
        showMessage('Пожалуйста, введите ваш уточняющий вопрос', 'error');
        return;
    }

    if (!appState.isPremium && appState.questionsUsed >= appState.freeQuestionsLimit) {
        showMessage('Бесплатные вопросы закончились. Получите Premium для безлимитных вопросов!', 'error');
        return;
    }

    console.log('🔮 Обработка уточняющего вопроса:', question);
    
    // Скрываем уточняющий вопрос и сбрасываем состояние для новой анимации
    clarifyingQuestionContainer?.classList.add('hidden');
    resetQuestionAnswerOnly(); // Сбрасываем только ответ, оставляя форму
    
    // Отключаем кнопку
    submitClarifyingQuestionBtn.disabled = true;
    
    // Выбираем случайную карту для ответа
    const randomCard = getRandomCard();
    
    // 1. Показываем вводный текст
    questionAnimationContainer?.classList.remove('hidden');
    const randomPrePhrase = questionPreInterpretationPhrases[Math.floor(Math.random() * questionPreInterpretationPhrases.length)];
    if (questionIntroText) {
        questionIntroText.textContent = randomPrePhrase;
        questionIntroText.classList.remove('hidden');
    }
    
    // Ждем немного для показа текста
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
        // 2. Скрываем текст и показываем карту рубашкой с звездочками
        questionAnimationContainer?.classList.add('hidden');
        questionCardContainer?.classList.remove('hidden');
        
        // Сбрасываем состояние карты перед анимацией
        if (questionTarotCard) {
            questionTarotCard.classList.remove('flipped');
            questionTarotCard.querySelector('.card-front')?.classList.add('hidden');
            questionTarotCard.querySelector('.card-back')?.classList.remove('hidden');
        }
        
        // Показываем звездочки на рубашке карты
        animateStars(3, questionStarAnimationContainer);
        
        // 3. Переворачиваем карту через 1200ms (время для звездочек)
        setTimeout(async () => {
            // Переворачиваем карту
            questionTarotCard?.classList.add('flipped');
            
            // Подготавливаем изображение как background-image для совместимости с 3D трансформациями
            const cardFront = questionTarotCard?.querySelector('.card-front');
            const cardBack = questionTarotCard?.querySelector('.card-back');
            
            if (cardFront && cardBack) {
                try {
                    console.log('🖼️ Начинаем асинхронную загрузку изображения для уточняющего вопроса:', randomCard.displayImage);
                    
                    // Асинхронно загружаем изображение перед показом
                    await loadImageAsync(randomCard.displayImage);
                    
                    console.log('✅ Изображение карты для уточняющего вопроса успешно загружено');
                    
                    // Устанавливаем изображение как фон только после успешной загрузки
                    cardFront.style.backgroundImage = `url('${encodeURI(randomCard.displayImage)}')`;
                    cardFront.style.backgroundSize = 'cover';
                    cardFront.style.backgroundPosition = 'center';
                    cardFront.style.backgroundRepeat = 'no-repeat';
                    cardFront.style.opacity = '1';
                    cardFront.style.visibility = 'visible';
                    
                    // Показываем лицевую сторону только после загрузки изображения
                    cardFront.classList.remove('hidden');
                    cardBack.classList.add('hidden');
                    
                } catch (error) {
                    console.warn('❌ Ошибка загрузки изображения для уточняющего вопроса, используем placeholder:', error);
                    // Используем placeholder при ошибке загрузки
                    cardFront.style.backgroundImage = `url('${createCardPlaceholder(randomCard)}')`;
                    cardFront.style.backgroundSize = 'cover';
                    cardFront.style.backgroundPosition = 'center';
                    cardFront.style.backgroundRepeat = 'no-repeat';
                    cardFront.style.opacity = '1';
                    cardFront.style.visibility = 'visible';
                    
                    cardFront.classList.remove('hidden');
                    cardBack.classList.add('hidden');
                }
            }
            
            // Обновляем лицевую сторону карты
            setTimeout(() => {
                const cardFront = questionTarotCard?.querySelector('.card-front');
                const cardBack = questionTarotCard?.querySelector('.card-back');
                
                // Управляем видимостью только через CSS-классы
                if (cardFront) {
                    cardFront.classList.remove('hidden');
                }
                if (cardBack) {
                    cardBack.classList.add('hidden');
                }
                
                // ОСТАВЛЯЕМ класс flipped для корректного показа лицевой стороны
                // (НЕ снимаем flipped, т.к. .card-front повернут на 180°)
                
                // Показываем название карты
                if (questionFlippedCardName) {
                    const orientationText = randomCard.isReversed ? ' (перевернутая)' : '';
                    questionFlippedCardName.textContent = `${randomCard.name}${orientationText} ${randomCard.symbol || ''}`;
                }
                questionCardInfoAfterFlip?.classList.remove('hidden');
            }, 400);
            
        }, 800);
        
        // 4. Через 2 секунды после переворота показываем ответ и начинаем печать
        setTimeout(async () => {
            questionAnswerContainer?.classList.remove('hidden');
            questionAnswerContainer?.classList.add('show');
            
            // Генерируем предсказание через API
            let answer;
            try {
                console.log('🤖 Генерируем предсказание для уточняющего вопроса через API...');
                const prediction = await generatePredictionAPI(randomCard, question);
                const orientationText = randomCard.isReversed ? ' (перевернутая)' : '';
                answer = `На ваш уточняющий вопрос "${question}" отвечает карта ${randomCard.name}${orientationText}:\n\n${prediction}`;
            } catch (error) {
                console.warn('❌ Ошибка генерации предсказания через API, используем базовое описание:', error);
                const orientationText = randomCard.isReversed ? ' (перевернутая)' : '';
                answer = `На ваш уточняющий вопрос "${question}" отвечает карта ${randomCard.name}${orientationText}:\n\n${randomCard.description || 'Карты предлагают размышления и новые перспективы'}`;
            }
            
            // Печатаем текст
            if (questionAnswerText) {
                await typeText(questionAnswerText, answer);
            }
            
            // 5. После завершения печати показываем уточняющий вопрос снова
            setTimeout(() => {
                clarifyingQuestionContainer?.classList.remove('hidden');
                if (!appState.isPremium) {
                    clarifyingQuestionWarning?.classList.remove('hidden');
                } else {
                    clarifyingQuestionWarning?.classList.add('hidden');
                }
            }, 500);

            // Обновляем счетчики
            if (!appState.isPremium) {
                appState.questionsUsed++;
                await saveAppState();
                updateQuestionsCounter();
            }
            
            // Сохраняем в историю
            await addToHistory('clarifying-question', question, answer);
            
            // Очищаем форму
            clarifyingQuestionTextarea.value = '';
            
            showMessage('Уточнение получено!', 'success');
            
        }, 3200); // 1200ms для карты + 2000ms
        
    } catch (error) {
        console.error('❌ Ошибка при обработке уточняющего вопроса:', error);
        resetQuestionState();
        showMessage('Произошла ошибка. Попробуйте еще раз.', 'error');
    } finally {
        setTimeout(() => {
            submitClarifyingQuestionBtn.disabled = false;
        }, 3000);
    }
}

// ========================================================================
// 🎴 ОБРАБОТКА РАСКЛАДОВ
// ========================================================================

async function handleSpreadClick(spreadType) {
    console.log('🎴 Начинаем расклад:', spreadType);
    
    // Проверяем Premium доступ
    if (!appState.isPremium) {
        showMessage('Расклады доступны только в Premium версии!', 'error');
        return;
    }
    
    const spreadConfig = SPREAD_CONFIGS[spreadType];
    if (!spreadConfig) {
        showMessage('Неизвестный тип расклада', 'error');
        return;
    }
    
    // Переходим к результатам расклада
    showSpreadResult(spreadType);
}

function showSpreadResult(spreadType) {
    // Скрываем сетку раскладов и показываем результат
    spreadsGrid?.classList.add('hidden');
    spreadResult?.classList.remove('hidden');
    
    const spreadConfig = SPREAD_CONFIGS[spreadType];
    
    // Обновляем заголовок
    if (spreadResultTitle) {
        spreadResultTitle.textContent = spreadConfig.name;
    }
    
    // Запускаем анимацию расклада
    performSpread(spreadType);
}

async function performSpread(spreadType) {
    const spreadConfig = SPREAD_CONFIGS[spreadType];
    
    try {
        // 1. Показываем вводный текст
        spreadAnimationContainer?.classList.remove('hidden');
        
        const spreadPhrase = `Раскладываем карты для "${spreadConfig.name.replace('Расклад «', '').replace('»', '')}"...`;
        if (spreadIntroText) {
            spreadIntroText.textContent = spreadPhrase;
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 2. Скрываем текст и показываем карты
        spreadAnimationContainer?.classList.add('hidden');
        spreadCardsContainer?.classList.remove('hidden');
        
        // 3. Создаем макет карт
        createSpreadLayout(spreadType);
        
        // 4. Анимированно показываем карты одну за другой
        await animateSpreadCards();
        
        // 5. Показываем интерпретацию
        await showSpreadInterpretation(spreadType);
        
    } catch (error) {
        console.error('❌ Ошибка выполнения расклада:', error);
        showMessage('Произошла ошибка при выполнении расклада', 'error');
    }
}

function createSpreadLayout(spreadType) {
    const spreadConfig = SPREAD_CONFIGS[spreadType];
    
    if (!spreadCardsLayout) return;
    
    // Очищаем предыдущий макет
    spreadCardsLayout.innerHTML = '';
    spreadCardsLayout.className = `spread-cards-layout ${spreadConfig.layout}`;
    
    // Создаем позиции для карт в зависимости от типа расклада
    if (spreadType === 'love') {
        // Расклад "Отношения" - специальная структура
        const topRow = document.createElement('div');
        topRow.className = 'spread-row';
        topRow.appendChild(createSpreadCardPosition(spreadConfig.cards[0], 0));
        
        const bottomRow = document.createElement('div'); 
        bottomRow.className = 'spread-row';
        bottomRow.appendChild(createSpreadCardPosition(spreadConfig.cards[1], 1));
        bottomRow.appendChild(createSpreadCardPosition(spreadConfig.cards[2], 2));
        
        spreadCardsLayout.appendChild(topRow);
        spreadCardsLayout.appendChild(bottomRow);
    } else {
        // Остальные расклады - простая структура
        spreadConfig.cards.forEach((cardConfig, index) => {
            const cardPosition = createSpreadCardPosition(cardConfig, index);
            spreadCardsLayout.appendChild(cardPosition);
        });
    }
}

function createSpreadCardPosition(cardConfig, index) {
    const position = document.createElement('div');
    position.className = 'spread-card-position';
    position.style.opacity = '0'; // Скрываем для анимации
    
    const tarotCard = document.createElement('div');
    tarotCard.className = 'tarot-card';
    
    const cardBack = document.createElement('div');
    cardBack.className = 'card-back';
    cardBack.innerHTML = `
        <span class="card-symbol">🔮</span>
        <div id="spreadStars${index}"></div>
    `;
    
    const cardFront = document.createElement('div');
    cardFront.className = 'card-front hidden';
    
    // Изображение будет установлено как background-image
    
    const cardLabel = document.createElement('div');
    cardLabel.className = 'card-label';
    cardLabel.textContent = cardConfig.label;
    tarotCard.appendChild(cardBack);
    tarotCard.appendChild(cardFront);
    position.appendChild(tarotCard);
    position.appendChild(cardLabel);
    
    // Сохраняем конфигурацию карты
    position.cardConfig = cardConfig;
    position.cardIndex = index;
    
    return position;
}

async function animateSpreadCards() {
    const cardPositions = spreadCardsLayout?.querySelectorAll('.spread-card-position');
    if (!cardPositions) return;
    
    // Показываем карты по очереди с задержкой
    for (let i = 0; i < cardPositions.length; i++) {
        const cardPosition = cardPositions[i];
        
        // 1. Показываем позицию
        cardPosition.style.opacity = '1';
        
        // 2. Показываем звездочки на рубашке
        const starsContainer = cardPosition.querySelector(`#spreadStars${i}`);
        if (starsContainer) {
            animateStars(2, starsContainer);
        }
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 3. Переворачиваем карту
        const tarotCard = cardPosition.querySelector('.tarot-card');
        const randomCard = getRandomCard();
        
        // Подготавливаем изображение как background-image для раскладов
        const cardFront = cardPosition.querySelector('.card-front');
        const cardBack = cardPosition.querySelector('.card-back');
        
        if (cardFront && cardBack) {
            try {
                console.log('🖼️ Начинаем асинхронную загрузку изображения для расклада:', randomCard.displayImage);
                
                // Асинхронно загружаем изображение перед показом
                await loadImageAsync(randomCard.displayImage);
                
                console.log('✅ Изображение для расклада успешно загружено');
                
                // Устанавливаем изображение как фон только после успешной загрузки
                cardFront.style.backgroundImage = `url('${encodeURI(randomCard.displayImage)}')`;
                cardFront.style.backgroundSize = 'cover';
                cardFront.style.backgroundPosition = 'center';
                cardFront.style.backgroundRepeat = 'no-repeat';
                cardFront.style.opacity = '1';
                cardFront.style.visibility = 'visible';
                
            } catch (error) {
                console.warn('❌ Ошибка загрузки изображения для расклада, используем placeholder:', error);
                // Используем placeholder при ошибке загрузки
                cardFront.style.backgroundImage = `url('${createCardPlaceholder(randomCard)}')`;
                cardFront.style.backgroundSize = 'cover';
                cardFront.style.backgroundPosition = 'center';
                cardFront.style.backgroundRepeat = 'no-repeat';
                cardFront.style.opacity = '1';
                cardFront.style.visibility = 'visible';
            }
        }
        
        // Переворачиваем карту
        tarotCard?.classList.add('flipped');
        
        setTimeout(() => {
            // Показываем лицевую сторону с изображением
            if (cardFront && cardBack) {
                cardFront.classList.remove('hidden');
                cardBack.classList.add('hidden');
            }
            
            // Снимаем класс flipped после завершения анимации
            tarotCard?.classList.remove('flipped');
            requestAnimationFrame(() => {
                tarotCard?.classList.remove('flipped');
            });
        }, 400);
        
        // Сохраняем выбранную карту для интерпретации
        cardPosition.selectedCard = randomCard;
        
        await new Promise(resolve => setTimeout(resolve, 600));
    }
}

async function showSpreadInterpretation(spreadType) {
    const spreadConfig = SPREAD_CONFIGS[spreadType];
    const cardPositions = spreadCardsLayout?.querySelectorAll('.spread-card-position');
    
    spreadAnswerContainer?.classList.remove('hidden');
    spreadAnswerContainer?.classList.add('show');
    
    // Собираем карты для API запроса
    const selectedCards = [];
    cardPositions?.forEach((cardPosition) => {
        const selectedCard = cardPosition.selectedCard;
        if (selectedCard) {
            selectedCards.push(selectedCard);
        }
    });
    
    let interpretation;
    
    // Генерируем предсказание через API
    try {
        console.log('🤖 Генерируем предсказание для расклада через API...');
        const spreadName = spreadConfig.name.replace('Расклад «', '').replace('»', '');
        const prediction = await generatePredictionAPI(selectedCards, `расклад ${spreadName}`);
        interpretation = `${spreadConfig.description}\n\n${prediction}`;
    } catch (error) {
        console.warn('❌ Ошибка генерации предсказания через API, используем базовое описание:', error);
        
        // Формируем интерпретацию расклада (fallback)
        interpretation = `${spreadConfig.description}\n\n`;
        
        cardPositions?.forEach((cardPosition) => {
            const cardConfig = cardPosition.cardConfig;
            const selectedCard = cardPosition.selectedCard;
            
            if (selectedCard) {
                const orientationText = selectedCard.isReversed ? ' (перевернутая)' : '';
                interpretation += `**${cardConfig.label}${orientationText}**: ${selectedCard.name}\n`;
                interpretation += `${cardConfig.description}: ${selectedCard.description || selectedCard.meaningUpright}\n\n`;
            }
        });
        
        interpretation += "Это ваш персональный расклад. Прислушайтесь к своей интуиции при интерпретации символов.";
    }
    
    // Печатаем интерпретацию
    if (spreadAnswerText) {
        await typeText(spreadAnswerText, interpretation);
    }
    
    // Сохраняем в историю
    await addToHistory('spread', spreadConfig.name, interpretation);
    
    showMessage('Расклад выполнен!', 'success');
}

function resetSpreadState() {
    console.log('🔄 Сброс состояния раскладов');
    
    // Скрываем результат и показываем сетку
    spreadResult?.classList.add('hidden');
    spreadsGrid?.classList.remove('hidden');
    
    // Очищаем контейнеры
    if (spreadCardsLayout) spreadCardsLayout.innerHTML = '';
    if (spreadIntroText) spreadIntroText.textContent = '';
    if (spreadAnswerText) {
        spreadAnswerText.textContent = '';
        spreadAnswerText.classList.remove('finished-typing');
    }
    
    // Скрываем все контейнеры анимации
    spreadAnimationContainer?.classList.add('hidden');
    spreadCardsContainer?.classList.add('hidden');
    spreadAnswerContainer?.classList.remove('show');
    spreadAnswerContainer?.classList.add('hidden');
}

// ========================================================================
// 📚 ИСТОРИЯ
// ========================================================================

async function addToHistory(type, title, content) {
    const telegramId = getTelegramUserId();
    
    console.log('📚 addToHistory вызван:', {
        type,
        title: title.substring(0, 50) + '...',
        telegramId,
        tarotDBExists: !!window.TarotDB,
        isConnected: window.TarotDB ? window.TarotDB.isConnected() : false
    });
    
    try {
        if (window.TarotDB && window.TarotDB.isConnected()) {
            console.log('💾 Сохранение чтения в Supabase...');
            
            // Сохраняем в зависимости от типа записи
            if (type === 'daily-card') {
                // Карта дня уже сохранена в handleDailyCardClick, не дублируем
                console.log('✅ Карта дня уже сохранена');
            } else if (type === 'question' || type === 'clarifying-question') {
                // Сохраняем вопрос через saveQuestion
                await window.TarotDB.saveQuestion(telegramId, title);
                console.log('✅ Вопрос сохранен в Supabase:', type);
            } else {
                console.log('ℹ️ Тип записи не требует отдельного сохранения:', type);
            }
        } else {
            console.log('📱 TarotDB недоступен для сохранения чтения, используем только localStorage');
        }
    } catch (error) {
        console.error('❌ Ошибка сохранения в Supabase:', error);
    }
    
    // Локальное сохранение как fallback
    const now = new Date();
    const historyItem = {
        id: Date.now(),
        type: type,
        title: title,
        content: content,
        date: now.toLocaleString('ru-RU'),
        timestamp: now.getTime() // Добавляем timestamp для проверки возраста
    };
    
    appState.history.unshift(historyItem);
    
    // Очищаем старые записи
    cleanOldHistoryItems();
    
    // Ограничиваем количество записей
    if (appState.history.length > 50) {
        appState.history = appState.history.slice(0, 50);
    }
    
    await saveAppState();
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    const historyEmptyState = document.getElementById('historyEmptyState');
    
    if (!historyList) return;
    
    if (appState.history.length === 0) {
        historyEmptyState?.classList.remove('hidden');
        
        // Очищаем список если он есть
        const existingItems = historyList.querySelectorAll('.history-item');
        existingItems.forEach(item => item.remove());
        return;
    }
    
    historyEmptyState?.classList.add('hidden');
    
    // Очищаем текущий список
    const existingItems = historyList.querySelectorAll('.history-item');
    existingItems.forEach(item => item.remove());
    
    // Создаем новые элементы истории
    appState.history.forEach(item => {
        const historyItemElement = document.createElement('div');
        historyItemElement.className = 'history-item';
        
        // Определяем тип для отображения
        let typeDisplay = '❓ Вопрос';
        if (item.type === 'daily-card') {
            typeDisplay = '🃏 Карта дня';
        } else if (item.type === 'spread') {
            typeDisplay = '🎴 Расклад';
        }
        
        historyItemElement.innerHTML = `
            <div class="history-header">
                <div class="history-type">${typeDisplay}</div>
                <div class="history-actions">
                    <div class="history-date">${item.date}</div>
                    <button class="delete-history-item" data-id="${item.id}" title="Удалить">🗑️</button>
                </div>
            </div>
            <div class="history-title">${item.title}</div>
            <div class="history-content">${item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content}</div>
        `;
        
        // Добавляем обработчик клика для раскрытия полного содержимого
        historyItemElement.addEventListener('click', (e) => {
            // Не раскрываем содержимое если кликнули по кнопке удаления
            if (e.target.classList.contains('delete-history-item')) {
                return;
            }
            
            const content = historyItemElement.querySelector('.history-content');
            if (content.textContent.endsWith('...')) {
                content.textContent = item.content;
            } else {
                content.textContent = item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content;
            }
        });
        
        // Добавляем обработчик для кнопки удаления
        const deleteBtn = historyItemElement.querySelector('.delete-history-item');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем всплытие события
            deleteHistoryItem(item.id);
        });
        
        historyList.appendChild(historyItemElement);
    });
}

async function deleteHistoryItem(itemId) {
    // Ищем элемент в истории
    const itemIndex = appState.history.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
        console.warn('Элемент истории не найден:', itemId);
        return;
    }
    
    // Удаляем элемент из массива
    appState.history.splice(itemIndex, 1);
    
    // Сохраняем состояние
    await saveAppState();
    
    // Обновляем отображение
    updateHistoryDisplay();
    
    showMessage('Запись удалена из истории', 'success');
}

// ========================================================================
// ⭐ ОТЗЫВЫ
// ========================================================================

function updateReviewsDisplay() {
    const reviewsList = document.getElementById('reviewsList');
    
    if (!reviewsList) return;
    
    // Очищаем текущий список отзывов
    reviewsList.innerHTML = '';
    
    if (appState.reviews.length === 0) {
        reviewsList.innerHTML = `
            <div class="reviews-empty">
                <span class="empty-icon">💬</span>
                <p>Отзывы пока отсутствуют.</p>
                <p>Станьте первым, кто оставит отзыв!</p>
            </div>
        `;
        return;
    }
    
    // Создаем элементы отзывов (показываем последние 10)
    const recentReviews = appState.reviews.slice(0, 10);
    
    recentReviews.forEach(review => {
        const reviewElement = document.createElement('div');
        reviewElement.className = 'review-item';
        
        // Создаем звездочки для отображения рейтинга
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            starsHtml += `<span class="review-star ${i <= review.rating ? 'filled' : ''}">★</span>`;
        }
        
        // Ограничиваем длину текста для превью
        const maxLength = 120;
        const isLongText = review.text.length > maxLength;
        const truncatedText = isLongText ? review.text.substring(0, maxLength) + '...' : review.text;
        
        reviewElement.innerHTML = `
            <div class="review-header">
                <div class="review-user-info">
                    <div class="review-username">${review.username || 'Анонимный пользователь'}</div>
                    <div class="review-rating">${starsHtml}</div>
                </div>
                <div class="review-date">${review.date}</div>
            </div>
            <div class="review-text" data-full-text="${encodeURIComponent(review.text)}" data-truncated-text="${encodeURIComponent(truncatedText)}" data-expanded="false">${truncatedText}</div>
            ${isLongText ? '<div class="review-expand-hint">Нажмите для раскрытия</div>' : ''}
        `;
        
        // Добавляем обработчик клика для раскрытия/скрытия длинного текста
        if (isLongText) {
            reviewElement.addEventListener('click', () => {
                const textElement = reviewElement.querySelector('.review-text');
                const expandHint = reviewElement.querySelector('.review-expand-hint');
                const isExpanded = textElement.getAttribute('data-expanded') === 'true';
                
                if (isExpanded) {
                    // Скрываем полный текст
                    textElement.textContent = decodeURIComponent(textElement.getAttribute('data-truncated-text'));
                    textElement.setAttribute('data-expanded', 'false');
                    expandHint.textContent = 'Нажмите для раскрытия';
                    reviewElement.classList.remove('expanded');
                } else {
                    // Показываем полный текст
                    textElement.textContent = decodeURIComponent(textElement.getAttribute('data-full-text'));
                    textElement.setAttribute('data-expanded', 'true');
                    expandHint.textContent = 'Нажмите для скрытия';
                    reviewElement.classList.add('expanded');
                }
            });
            
            // Добавляем курсор pointer для интерактивности
            reviewElement.style.cursor = 'pointer';
        }
        
        reviewsList.appendChild(reviewElement);
    });
}

function setupStarRating() {
    const stars = document.querySelectorAll('.star');
    
    stars.forEach((star, index) => {
        star.addEventListener('click', () => {
            currentRating = index + 1;
            updateStarsDisplay(currentRating);
            console.log('⭐ Выбранный рейтинг:', currentRating);
        });
        
        star.addEventListener('mouseenter', () => {
            updateStarsDisplay(index + 1);
        });
    });
    
    const starRating = document.getElementById('starRating');
    starRating?.addEventListener('mouseleave', () => {
        updateStarsDisplay(currentRating);
    });
    
    function updateStarsDisplay(rating) {
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }
}

async function handleSubmitReview() {
    const reviewText = document.getElementById('reviewText');
    
    const rating = currentRating;
    const text = reviewText?.value.trim();
    
    if (!rating || rating === 0) {
        showMessage('Пожалуйста, поставьте оценку', 'error');
        return;
    }
    
    if (!text) {
        showMessage('Пожалуйста, напишите отзыв', 'error');
        return;
    }
    
    // Создаем объект отзыва
    const review = {
        id: Date.now(),
        rating: rating,
        text: text,
        username: getTelegramUserName(),
        date: new Date().toLocaleString('ru-RU'),
        timestamp: Date.now()
    };
    
    // Сохраняем в Supabase
    try {
        if (window.TarotDB && window.TarotDB.isConnected()) {
            const reviewData = {
                user_id: getTelegramUserId(),
                rating: rating,
                review_text: text,
                username: getTelegramUserName(),
                created_at: new Date().toISOString()
            };
            
            await window.TarotDB.saveReview(reviewData);
            console.log('✅ Отзыв сохранен в Supabase');
        }
    } catch (error) {
        console.error('❌ Ошибка сохранения отзыва в Supabase:', error);
    }
    
    // Добавляем отзыв в начало массива (локальное сохранение как fallback)
    appState.reviews.unshift(review);
    
    // Ограничиваем количество отзывов (храним максимум 50)
    if (appState.reviews.length > 50) {
        appState.reviews = appState.reviews.slice(0, 50);
    }
    
    // Сохраняем состояние
    await saveAppState();
    
    // Обновляем отображение отзывов
    updateReviewsDisplay();
    
    console.log('📝 Отзыв сохранен:', review);
    
    showMessage('Спасибо за ваш отзыв!', 'success');
    
    // Очищаем форму
    if (reviewText) reviewText.value = '';
    currentRating = 0;
    document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
}

// ========================================================================
// 👑 PREMIUM
// ========================================================================

function updateSubscriptionStatus(isPremium = false) {
    const statusElement = document.getElementById('subscriptionStatus');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    if (!statusElement || !statusIcon || !statusText) return;
    
    if (isPremium) {
        statusElement.classList.add('premium');
        statusIcon.textContent = '👑';
        statusText.textContent = 'Premium-подписка';
    } else {
        statusElement.classList.remove('premium');
        statusIcon.textContent = '🌑';
        statusText.textContent = 'Базовый вариант';
    }

    // Update test toggle
    if (premiumTestToggle) {
        premiumTestToggle.checked = isPremium;
    }
    if (premiumTestLabel) {
        premiumTestLabel.textContent = isPremium ? 'Premium режим' : 'Базовый режим';
    }
}


async function handlePremiumPurchase() {
    const userId = getTelegramUserId();

    try {
        // Здесь должна быть реальная интеграция с платежной системой
        console.log('💰 Покупка Premium');
        
        // Если TarotDB подключен, обновляем профиль пользователя
        if (window.TarotDB && window.TarotDB.isConnected()) {
            // Сначала проверяем существование профиля
            let userProfile = await window.TarotDB.getUserProfile(userId);
            
            // Если профиль не существует, создаем его
            if (!userProfile) {
                console.log('🆕 Создаем новый профиль пользователя');
                userProfile = await window.TarotDB.createUserProfile(userId, {
                    username: getTelegramUserName(),
                    is_subscribed: false
                });
            }

            // Обновляем профиль
            await window.TarotDB.updateUserProfile(userId, {
                is_subscribed: true,
                subscription_expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 дней
                premium_purchase_date: new Date().toISOString()
            });
        }

        // Обновляем локальное состояние
        appState.isPremium = true;
        await saveAppState();
        updateSubscriptionStatus(true);
        updateQuestionsCounter();
        
        showMessage('Premium активирован! Теперь у вас безлимитные возможности!', 'success');
    } catch (error) {
        console.error('❌ Ошибка активации Premium:', error);
        showMessage('Не удалось активировать Premium', 'error');
    }
}
// ========================================================================
// 🛠️ УТИЛИТЫ
// ========================================================================

function getTelegramUserId() {
    // Пытаемся получить ID пользователя из проверенных данных
    if (window.validatedTelegramUser && window.validatedTelegramUser.id) {
        console.log('✅ Используем проверенный Telegram ID:', window.validatedTelegramUser.id);
        return window.validatedTelegramUser.id;
    }
    
    // Проверяем основной API Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        const telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
        if (telegramUser.id) {
            console.log('📱 Используем Telegram WebApp ID:', telegramUser.id);
            return telegramUser.id.toString();
        }
    }
    
    // Проверяем, не является ли это Bot API данными
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
        try {
            // В реальном приложении здесь должна быть валидация initData на сервере
            const urlParams = new URLSearchParams(window.Telegram.WebApp.initData);
            const userParam = urlParams.get('user');
            if (userParam) {
                const userData = JSON.parse(decodeURIComponent(userParam));
                if (userData && userData.id) {
                    console.log('🔐 Используем данные из initData:', userData.id);
                    return userData.id.toString();
                }
            }
        } catch (error) {
            console.warn('⚠️ Ошибка парсинга initData:', error);
        }
    }
    
    // Для пользователей без Telegram - анонимный режим
    return 'anonymous_user';
}

function getTelegramUserName() {
    // Пытаемся получить имя пользователя из проверенных данных
    if (window.validatedTelegramUser) {
        const user = window.validatedTelegramUser;
        
        // Пробуем получить имя в порядке приоритета
        if (user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        } else if (user.first_name) {
            return user.first_name;
        } else if (user.username) {
            return `@${user.username}`;
        }
    }
    
    // Для разработки используем initDataUnsafe
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        console.warn('⚠️ Используются непроверенные данные Telegram (только для разработки)');
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        
        // Пробуем получить имя в порядке приоритета
        if (user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        } else if (user.first_name) {
            return user.first_name;
        } else if (user.username) {
            return `@${user.username}`;
        }
    }
    
    // Fallback - случайное мистическое имя
    const userId = getTelegramUserId();
    // Используем ID для генерации стабильного случайного имени
    const hash = userId.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
    }, 0);
    const index = Math.abs(hash) % mysticalNames.length;
    return mysticalNames[index];
}

// Экспортируем функцию в глобальную область видимости для использования в supabase.js
window.getTelegramUserName = getTelegramUserName;

async function validateTelegramData() {
    // Проверяем, есть ли Telegram WebApp initData
    if (!window.Telegram || !window.Telegram.WebApp || !window.Telegram.WebApp.initData) {
        console.log('📱 Telegram WebApp данные недоступны (вероятно, запуск вне Telegram)');
        return false;
    }
    
    try {
        const response = await fetch('/api/validate-telegram', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                initData: window.Telegram.WebApp.initData
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.user) {
                window.validatedTelegramUser = data.user;
                console.log('✅ Telegram данные успешно проверены');
                return true;
            }
        }
        
        console.warn('⚠️ Не удалось проверить Telegram данные');
        return false;
        
    } catch (error) {
        console.warn('⚠️ Ошибка валидации Telegram данных:', error);
        return false;
    }
}

// ========================================================================
// 🎯 ИНИЦИАЛИЗАЦИЯ DOM ЭЛЕМЕНТОВ
// ========================================================================

function initializeDOMElements() {
    console.log('🎯 Инициализация DOM элементов...');
    
    // Основные элементы
    mainNav = document.getElementById('mainNav');
    secondaryNav = document.getElementById('secondaryNav');
    tabContents = document.querySelectorAll('.tab-content');
    
    // ЗАЩИТА: удаляем дублированные элементы с критическими ID
    ['tarotCard', 'questionTarotCard'].forEach(id => {
        document.querySelectorAll(`#${id}`).forEach((node, index, array) => {
            if (index < array.length - 1) {
                console.warn(`🚨 Найден дублированный #${id}, удаляем:`, node);
                node.remove();
            }
        });
    });
    
    // Карта дня
    tarotCard = document.getElementById('tarotCard');
    cardBack = tarotCard?.querySelector('.card-back');
    cardFront = tarotCard?.querySelector('.card-front');
    // cardImage больше не используется - изображения через background-image
    cardInfoAfterFlip = document.getElementById('cardInfoAfterFlip');
    flippedCardName = document.getElementById('flippedCardName');
    cardIntroText = document.getElementById('cardIntroText');
    
    // ИИ-ответы
    aiAnswerContainer = document.getElementById('aiAnswerContainer');
    aiInterpretationTitle = document.getElementById('aiInterpretationTitle');
    aiInterpretationTextElement = document.getElementById('aiInterpretationText');
    
    // Баннеры и кнопки
    afterDailyCardBanner = document.getElementById('afterDailyCardBanner');
    askMoreQuestionsBtn = document.getElementById('askMoreQuestionsBtn');
    premiumBannerBtn = document.getElementById('premiumBannerBtn');
    
    // Анимации
    starAnimationContainer = document.getElementById('starAnimationContainer');
    
    // Вопросы
    questionsLeftElement = document.getElementById('questionsLeft');
    questionTextarea = document.getElementById('questionTextarea');
    submitQuestionBtn = document.getElementById('submitQuestionBtn');
    charCounter = document.getElementById('charCounter');
    loadingState = document.getElementById('loadingState');
    questionAnswerContainer = document.getElementById('questionAnswerContainer');
    questionAnswerText = document.getElementById('questionAnswerText');
    // questionCardImage больше не используется - изображения через background-image
    
    // Новые элементы для анимации вопросов
    questionAnimationContainer = document.getElementById('questionAnimationContainer');
    questionStarAnimationContainer = document.getElementById('questionStarAnimationContainer');
    questionIntroText = document.getElementById('questionIntroText');
    questionCardContainer = document.getElementById('questionCardContainer');
    
    questionTarotCard = document.getElementById('questionTarotCard');
    
    questionCardInfoAfterFlip = document.getElementById('questionCardInfoAfterFlip');
    questionFlippedCardName = document.getElementById('questionFlippedCardName');
    
    // Уточняющий вопрос
    clarifyingQuestionContainer = document.getElementById('clarifyingQuestionContainer');
    clarifyingQuestionTextarea = document.getElementById('clarifyingQuestionTextarea');
    submitClarifyingQuestionBtn = document.getElementById('submitClarifyingQuestionBtn');
    clarifyingQuestionWarning = document.getElementById('clarifyingQuestionWarning');

    // Test Toggle
    premiumTestToggle = document.getElementById('premiumTestToggle');
    premiumTestLabel = document.getElementById('premiumTestLabel');
    
    // Расклады
    spreadsGrid = document.getElementById('spreadsGrid');
    spreadResult = document.getElementById('spreadResult');
    spreadResultTitle = document.getElementById('spreadResultTitle');
    backToSpreadsBtn = document.getElementById('backToSpreadsBtn');
    spreadAnimationContainer = document.getElementById('spreadAnimationContainer');
    spreadIntroText = document.getElementById('spreadIntroText');
    spreadCardsContainer = document.getElementById('spreadCardsContainer');
    spreadCardsLayout = document.getElementById('spreadCardsLayout');
    spreadAnswerContainer = document.getElementById('spreadAnswerContainer');
    spreadAnswerText = document.getElementById('spreadAnswerText');

    console.log('✅ DOM элементы инициализированы');
}

// ========================================================================
// 🎮 НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
// ========================================================================

function setupEventListeners() {
    console.log('🎮 Настройка обработчиков событий...');
    
    // Навигация
    mainNav?.addEventListener('click', (e) => {
        console.log('🖱️ Клик по mainNav:', e.target);
        if (e.target.classList.contains('nav-tab')) {
            console.log('🎯 Найдена nav-tab:', e.target.dataset.tab);
            switchTab(e.target.dataset.tab);
        }
    });

    secondaryNav?.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-tab')) {
            switchTab(e.target.dataset.tab);
        }
    });

    // Карта дня
    tarotCard?.addEventListener('click', handleDailyCardClick);
    
    // Кнопки баннера
    askMoreQuestionsBtn?.addEventListener('click', () => switchTab('question'));
    premiumBannerBtn?.addEventListener('click', () => switchTab('premium'));
    
    // Вопросы
    questionTextarea?.addEventListener('input', handleQuestionInput);
    submitQuestionBtn?.addEventListener('click', handleAskQuestion);
    submitClarifyingQuestionBtn?.addEventListener('click', handleClarifyingQuestion);
    
    // Отзывы
    setupStarRating();
    const submitReviewBtn = document.getElementById('submitReviewBtn');
    submitReviewBtn?.addEventListener('click', handleSubmitReview);
    
    // Premium
    const premiumBuyBtn = document.getElementById('premiumBuyBtn');
    premiumBuyBtn?.addEventListener('click', handlePremiumPurchase);

    
    // Расклады
    spreadsGrid?.addEventListener('click', (e) => {
        const spreadCard = e.target.closest('.spread-card');
        if (spreadCard && spreadCard.dataset.spread) {
            console.log('🎴 Клик по раскладу:', spreadCard.dataset.spread);
            handleSpreadClick(spreadCard.dataset.spread);
        }
    });
    
    backToSpreadsBtn?.addEventListener('click', resetSpreadState);
    
    console.log('✅ Обработчики событий настроены');
}

// ========================================================================
// 🚀 ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
// ========================================================================

async function initApp() {
    // Prevent double initialization
    if (initAppCalled) {
        console.log('⚠️ initApp уже был вызван, пропускаем повторную инициализацию');
        return;
    }
    
    initAppCalled = true;
    console.log('🚀 Инициализация приложения...');
    
    try {
        // 0. Валидируем Telegram данные (только в продакшене)
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            console.log('🔐 Валидация Telegram данных...');
            await validateTelegramData();
        }
        
        // 1. Ждем готовности конфигурации
        if (typeof window.isConfigReady === 'function') {
            let configReady = false;
            let attempts = 0;
            const maxAttempts = 50; // 5 секунд
            
            while (!configReady && attempts < maxAttempts) {
                configReady = window.isConfigReady();
                if (!configReady) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }
            }
            
            if (!configReady) {
                console.warn('⚠️ Конфигурация не готова, продолжаем с fallback');
            }
        }
        
        // 2. Инициализируем DOM
        initializeDOMElements();
        
        // 3. Получаем Telegram ID пользователя 
        const userId = getTelegramUserId();
        console.log('👤 Получен пользователь ID:', userId);
        
        // Сохраняем данные Telegram пользователя в appState
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
            appState.telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
            console.log('👤 Telegram пользователь сохранен:', appState.telegramUser);
        } else {
            // Создаем mock пользователя для тестирования
            appState.telegramUser = {
                id: userId || 'webapp_user',
                first_name: 'Анонимный пользователь',
                username: null
            };
        }
        
        // 4. Загружаем локальные данные
        await loadAppStateLocally();
        console.log('📱 Локальное состояние загружено');
        
        // 5. Синхронизируем данные с TarotDB
        try {
            console.log('🔍 Проверка TarotDB при инициализации:', {
                tarotDBExists: !!window.TarotDB,
                isConnected: window.TarotDB ? window.TarotDB.isConnected() : false,
                connectionStatus: window.TarotDB ? window.TarotDB.getStatus() : null
            });
            
            if (window.TarotDB && window.TarotDB.isConnected()) {
                console.log('🔄 Синхронизация данных с TarotDB');
                
                // Выполняем синхронизацию данных
                if (window.TarotDB.performDataSync) {
                    const syncedState = await window.TarotDB.performDataSync(userId, appState);
                    if (syncedState) {
                        // Обновляем состояние приложения синхронизированными данными
                        appState.isPremium = syncedState.isPremium;
                        appState.questionsUsed = syncedState.questionsUsed;
                        appState.dailyCardUsed = syncedState.dailyCardUsed;
                        appState.lastCardDate = syncedState.lastCardDay;
                        console.log('✅ Данные синхронизированы с TarotDB');
                    }
                } else {
                    // Fallback к старой логике если performDataSync недоступен
                    const userProfile = await window.TarotDB.getUserProfile(userId);
                    if (userProfile) {
                        appState.dailyCardUsed = userProfile.last_card_day === new Date().toISOString().split('T')[0];
                        appState.lastCardDate = userProfile.last_card_day;
                        appState.questionsUsed = userProfile.total_questions || 0;
                        appState.isPremium = userProfile.is_subscribed || false;
                        appState.freeQuestionsLimit = userProfile.free_predictions_left || 3;
                        console.log('✅ Профиль пользователя загружен из TarotDB (fallback)');
                    }
                }
                
                // Устанавливаем лимиты
                appState.freeQuestionsLimit = 3;
                
                // Загружаем историю чтений
                try {
                    const readings = await window.TarotDB.getUserReadings(userId);
                    if (readings && readings.length > 0) {
                        appState.history = readings.map(reading => ({
                            id: reading.id || Date.now(),
                            type: reading.type || 'reading',
                            title: reading.title || 'Чтение',
                            content: reading.content || '',
                            date: new Date(reading.created_at).toLocaleString('ru-RU'),
                            timestamp: new Date(reading.created_at).getTime()
                        }));
                        console.log(`✅ История загружена из TarotDB: ${readings.length} записей`);
                    }
                } catch (historyError) {
                    console.error('❌ Ошибка загрузки истории из TarotDB:', historyError);
                }
                
                // Загружаем отзывы пользователя
                try {
                    const reviews = await window.TarotDB.getUserReviews(userId);
                    if (reviews && reviews.length > 0) {
                        appState.reviews = reviews.map(review => ({
                            id: review.id || Date.now(),
                            rating: review.rating,
                            text: review.review_text || review.text,
                            username: review.username || getTelegramUserName(),
                            date: new Date(review.created_at).toLocaleString('ru-RU'),
                            timestamp: new Date(review.created_at).getTime()
                        }));
                        console.log(`✅ Отзывы загружены из TarotDB: ${reviews.length} записей`);
                    }
                } catch (reviewsError) {
                    console.error('❌ Ошибка загрузки отзывов из TarotDB:', reviewsError);
                }
            }
        } catch (cloudError) {
            console.error('❌ Ошибка загрузки данных из TarotDB:', cloudError);
        }
        
        // Fallback к локальному состоянию
        await loadAppState();
        
        // 4. Загружаем карты
        await loadCards();
        
        // 5. Настраиваем обработчики
        setupEventListeners();
        
        // 6. Обновляем UI
        updateSubscriptionStatus(appState.isPremium);
        updateQuestionsCounter();
        updateHistoryDisplay();
        updateReviewsDisplay();
        
        // 7. Инициализируем Telegram WebApp если доступен
        initializeTelegramWebApp();
        
        isInitialized = true;
        console.log('✅ Приложение успешно инициализировано');
        
        // 7.5. ПРИНУДИТЕЛЬНО ИНИЦИАЛИЗИРУЕМ SUPABASE ЕСЛИ НЕ ИНИЦИАЛИЗИРОВАН
        if (window.TarotDB && !window.TarotDB.isConnected()) {
            console.log('🔄 Принудительная инициализация Supabase...');
            if (window.TarotDB.initialize) {
                try {
                    await window.TarotDB.initialize();
                    console.log('✅ Принудительная инициализация завершена');
                } catch (error) {
                    console.error('❌ Ошибка принудительной инициализации:', error);
                }
            }
        }
        
        
        // 8. Показываем информацию о загруженных картах
        if (allCards && allCards.length > 0) {
            console.log(`🃏 Всего карт загружено: ${allCards.length}`);
            console.log('🖼️ Примеры изображений карт:', allCards.slice(0, 3).map(c => ({
                name: c.name,
                image: c.image,
                imageUpright: c.imageUpright,
                imageReversed: c.imageReversed,
                displayImage: c.displayImage
            })));
        }
        
        // 9. Синхронизируем состояние с TarotDB
        try {
            if (window.TarotDB && window.TarotDB.isConnected()) {
                const userId = getTelegramUserId();
                await window.TarotDB.updateUserProfile(userId, {
                    total_questions: appState.questionsUsed,
                    is_subscribed: appState.isPremium,
                    last_card_day: appState.lastCardDate,
                    free_predictions_left: Math.max(0, appState.freeQuestionsLimit - appState.questionsUsed)
                });
                console.log('☁️ Состояние синхронизировано с TarotDB');
            }
        } catch (syncError) {
            console.error('❌ Ошибка синхронизации состояния с TarotDB:', syncError);
        }
        
    } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        showMessage('Произошла ошибка при загрузке приложения', 'error');
    }
}

// ========================================================================
// 📱 ИНТЕГРАЦИЯ С TELEGRAM WEBAPP
// ========================================================================

function initializeTelegramWebApp() {
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            console.log('📱 Telegram WebApp обнаружен');
            
            // Расширяем на весь экран
            window.Telegram.WebApp.expand();
            
            // Устанавливаем цвета темы с проверкой версии (≥ 6.1)
            try {
                const webAppVersion = window.Telegram.WebApp.version;
                const versionNumber = parseFloat(webAppVersion || '0');
                
                if (versionNumber >= 6.1) {
                    console.log('🎨 Устанавливаем цвета темы (версия WebApp:', webAppVersion, ')');
                    window.Telegram.WebApp.setHeaderColor('#1a1a2e');
                    window.Telegram.WebApp.setBackgroundColor('#1a1a2e');
                } else {
                    console.log('⚠️ Цвета темы недоступны в версии WebApp:', webAppVersion);
                }
            } catch (colorError) {
                console.warn('⚠️ Ошибка при установке цветов темы:', colorError.message);
            }
            
            // Показываем, что приложение готово
            window.Telegram.WebApp.ready();
            
            console.log('✅ Telegram WebApp инициализирован');
        } else {
            console.log('🌐 Работаем в браузере (не в Telegram)');
        }
    } catch (error) {
        console.warn('⚠️ Ошибка инициализации Telegram WebApp:', error);
    }
}

// ========================================================================
// 🧪 ФУНКЦИИ ДЛЯ ОТЛАДКИ
// ========================================================================

function debugApp() {
    console.log('🧪 Отладочная информация:');
    console.log('Состояние приложения:', appState);
    console.log('Карты загружены:', allCards.length);
    console.log('Приложение инициализировано:', isInitialized);
    console.log('Текущий рейтинг:', currentRating);
    console.log('DOM элементы:', {
        tarotCard: !!tarotCard,
        questionTextarea: !!questionTextarea,
        submitQuestionBtn: !!submitQuestionBtn,
        historyList: !!document.getElementById('historyList')
    });
    
    if (allCards.length > 0) {
        console.log('🃏 Примеры карт:');
        allCards.slice(0, 3).forEach(card => {
            console.log(`- ${card.name}:`);
            console.log(`  Основное изображение: ${card.image}`);
            console.log(`  Прямое изображение: ${card.imageUpright}`);
            console.log(`  Перевернутое изображение: ${card.imageReversed}`);
        });
    }
}

function resetApp() {
    console.log('🔄 Сброс приложения...');
    localStorage.removeItem('tarotAppState');
    location.reload();
}

function testNotification() {
    showMessage('Тестовое уведомление', 'info');
}

function testCardImage() {
    if (allCards.length === 0) {
        console.warn('⚠️ Карты не загружены');
        return;
    }
    
    const randomCard = getRandomCard();
    console.log('🧪 Тестирование изображения карты:', randomCard);
    
    // Создаем тестовое изображение
    const testImg = new Image();
    testImg.onload = () => {
        console.log('✅ Изображение загружается успешно:', randomCard.displayImage);
    };
    testImg.onerror = () => {
        console.error('❌ Ошибка загрузки изображения:', randomCard.displayImage);
        console.log('🔄 Попробуем placeholder:', createCardPlaceholder(randomCard));
    };
    testImg.src = encodeURI(randomCard.displayImage);
}

function testAllCardImages() {
    console.log('🧪 Тестирование всех изображений карт...');
    
    if (allCards.length === 0) {
        console.warn('⚠️ Карты не загружены');
        return;
    }
    
    allCards.forEach(async (card, index) => {
        console.log(`Тестирование карты ${index + 1}/${allCards.length}: ${card.name}`);
        
        // Тестируем основное изображение
        if (card.image) {
            const available = await checkImageAvailability(card.image);
            console.log(`  Основное изображение: ${available ? '✅' : '❌'} ${card.image}`);
        }
        
        // Тестируем прямое изображение
        if (card.imageUpright) {
            const available = await checkImageAvailability(card.imageUpright);
            console.log(`  Прямое изображение: ${available ? '✅' : '❌'} ${card.imageUpright}`);
        }
        
        // Тестируем перевернутое изображение
        if (card.imageReversed) {
            const available = await checkImageAvailability(card.imageReversed);
            console.log(`  Перевернутое изображение: ${available ? '✅' : '❌'} ${card.imageReversed}`);
        }
    });
}

// ========================================================================
// 🏁 ЗАПУСК ПРИЛОЖЕНИЯ
// ========================================================================

// Безопасная инициализация - запускаем только один раз
function safeInitApp() {
    initApp();
}

// Единственная точка входа для инициализации
if (document.readyState === 'loading') {
    // Если DOM еще не загружен, ждем DOMContentLoaded
    document.addEventListener('DOMContentLoaded', safeInitApp, { once: true });
} else {
    // DOM уже загружен, запускаем сразу
    safeInitApp();
}



// Экспорт для отладки
window.TarotApp = {
    appState,
    allCards,
    switchTab,
    showMessage,
    getRandomCard,
    debugApp,
    resetApp,
    testNotification,
    testCardImage,
    testAllCardImages,
    updateHistoryDisplay,
    currentRating,
    createCardPlaceholder,
    checkImageAvailability,
    normalizeImagePath,
};

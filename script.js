// script.js - Полная логика приложения "Шёпот карт"
// ========================================================================

console.log('📜 Загрузка script.js...');

// 🌐 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let supabase = null;
let currentUser = null;
let appState = {
    currentTab: 'daily',
    questionsLeft: 3,
    isPremium: false,
    isInitialized: false,
    currentRating: 0
};

// 🚀 ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЯ
async function initApp() {
    console.log('🔮 Инициализация приложения...');
    
    // Проверяем, что приложение не было уже инициализировано
    if (appState.isInitialized) {
        console.log('⚠️ Приложение уже инициализировано');
        return;
    }

    try {
        // 1. Ждем готовности конфигурации
        await waitForConfig();
        
        // 2. Инициализируем Supabase
        await initSupabase();
        
        // 3. Инициализируем Telegram WebApp
        initTelegramWebApp();
        
        // 4. Инициализируем пользователя
        await initUser();
        
        // 5. Настраиваем обработчики событий
        setupEventListeners();
        
        // 6. Обновляем UI
        updateUI();
        
        // 7. Проверяем и показываем приветствие
        checkAndShowWelcome();
        
        // Отмечаем как инициализированное
        appState.isInitialized = true;
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        showErrorMessage('Ошибка загрузки приложения. Попробуйте перезагрузить страницу.');
    }
}

// ⏳ ОЖИДАНИЕ ГОТОВНОСТИ КОНФИГУРАЦИИ
async function waitForConfig() {
    console.log('⏳ Ожидание готовности конфигурации...');
    
    const maxAttempts = 50;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        if (window.isConfigReady && window.isConfigReady()) {
            console.log('✅ Конфигурация готова');
            return;
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Таймаут ожидания конфигурации');
}

// 🔗 ИНИЦИАЛИЗАЦИЯ SUPABASE
async function initSupabase() {
    try {
        const config = window.getSupabaseConfig();
        
        if (!config || !config.url || !config.anonKey) {
            console.warn('⚠️ Supabase конфигурация недоступна, работаем без БД');
            return false;
        }
        
        if (!window.supabase || !window.supabase.createClient) {
            console.warn('⚠️ Supabase библиотека не загружена');
            return false;
        }
        
        supabase = window.supabase.createClient(config.url, config.anonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            }
        });
        
        console.log('✅ Supabase клиент инициализирован');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
        return false;
    }
}

// 📱 ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP
function initTelegramWebApp() {
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Настраиваем Telegram WebApp
            tg.ready();
            tg.expand();
            
            // Настраиваем тему
            document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#1a1a2e');
            document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#ffffff');
            
            console.log('✅ Telegram WebApp инициализирован');
            console.log('👤 Данные пользователя:', tg.initDataUnsafe?.user);
            
        } else {
            console.log('⚠️ Telegram WebApp недоступен (возможно, открыто не в Telegram)');
        }
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram WebApp:', error);
    }
}

// 👤 ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЯ
async function initUser() {
    try {
        // Получаем данные пользователя из Telegram
        const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
        
        if (telegramUser) {
            console.log('👤 Telegram пользователь найден:', telegramUser);
            
            // Если есть Supabase, пытаемся создать/получить профиль
            if (supabase) {
                currentUser = await createOrGetUserProfile(telegramUser);
            }
            
            // Если профиль создан/получен, обновляем состояние
            if (currentUser) {
                appState.questionsLeft = currentUser.questions_left || 3;
                appState.isPremium = currentUser.is_premium || false;
            }
        } else {
            console.log('⚠️ Telegram пользователь не найден, работаем в гостевом режиме');
            
            // Пытаемся загрузить данные из localStorage
            const localData = localStorage.getItem('tarot_user_data');
            if (localData) {
                const userData = JSON.parse(localData);
                appState.questionsLeft = userData.questionsLeft || 3;
                appState.isPremium = userData.isPremium || false;
            }
        }
        
        console.log('✅ Пользователь инициализирован');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации пользователя:', error);
        
        // Fallback к localStorage
        const localData = localStorage.getItem('tarot_user_data');
        if (localData) {
            const userData = JSON.parse(localData);
            appState.questionsLeft = userData.questionsLeft || 3;
            appState.isPremium = userData.isPremium || false;
        }
    }
}

// 👤 СОЗДАНИЕ ИЛИ ПОЛУЧЕНИЕ ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ
async function createOrGetUserProfile(telegramUser) {
    if (!supabase) return null;
    
    try {
        const tables = window.getTablesConfig();
        if (!tables) return null;
        
        // Ищем существующего пользователя по telegram_user_id
        const { data: existingUser, error: searchError } = await supabase
            .from(tables.userProfiles)
            .select('*')
            .eq('telegram_user_id', telegramUser.id)
            .single();
            
        if (existingUser && !searchError) {
            console.log('✅ Существующий пользователь найден');
            return existingUser;
        }
        
        // Создаем нового пользователя
        const newUserData = {
            telegram_user_id: telegramUser.id,
            first_name: telegramUser.first_name,
            last_name: telegramUser.last_name || null,
            username: telegramUser.username || null,
            display_name: telegramUser.first_name,
            questions_left: 3,
            is_premium: false,
            created_at: new Date().toISOString()
        };
        
        const { data: newUser, error: createError } = await supabase
            .from(tables.userProfiles)
            .insert([newUserData])
            .select()
            .single();
            
        if (createError) {
            console.error('❌ Ошибка создания пользователя:', createError);
            return null;
        }
        
        console.log('✅ Новый пользователь создан');
        return newUser;
        
    } catch (error) {
        console.error('❌ Ошибка работы с профилем пользователя:', error);
        return null;
    }
}

// 🔗 НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    console.log('🔗 Настройка обработчиков событий...');
    
    // Обработчики табов
    setupTabEventListeners();
    
    // Обработчик карты дня
    const dailyCard = document.getElementById('daily-card');
    if (dailyCard) {
        dailyCard.addEventListener('click', handleDailyCardClick);
    }
    
    // Обработчик кнопки вопроса
    const askBtn = document.getElementById('ask-btn');
    if (askBtn) {
        askBtn.addEventListener('click', handleAskQuestion);
    }
    
    // Обработчик уточняющего вопроса
    const followUpBtn = document.getElementById('follow-up-btn');
    if (followUpBtn) {
        followUpBtn.addEventListener('click', handleFollowUpQuestion);
    }
    
    // Обработчик Premium кнопки
    const buyPremiumBtn = document.getElementById('buy-premium-btn');
    if (buyPremiumBtn) {
        buyPremiumBtn.addEventListener('click', handleBuyPremium);
    }
    
    // Обработчики модального окна профиля
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleSaveProfile);
    }
    
    const skipProfileBtn = document.getElementById('skip-profile-btn');
    if (skipProfileBtn) {
        skipProfileBtn.addEventListener('click', skipProfile);
    }
    
    // Обработчики раскладов
    document.querySelectorAll('.spread-card').forEach(card => {
        card.addEventListener('click', function() {
            const spreadType = this.getAttribute('data-spread');
            selectSpread(spreadType);
        });
    });
    
    // Обработчики баннеров
    document.querySelectorAll('.banner-buttons .btn, .btn[data-tab]').forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            if (tab) switchTab(tab);
        });
    });
    
    // Обработчик очистки истории
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', handleClearHistory);
    }
    
    // Обработчик отправки отзыва
    const submitReviewBtn = document.getElementById('submit-review-btn');
    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', handleSubmitReview);
    }
    
    // Обработчик звезд рейтинга
    const ratingStars = document.getElementById('rating-stars');
    if (ratingStars) {
        ratingStars.addEventListener('click', handleRatingClick);
    }
    
    // Обработчик кнопки "Назад" в раскладах
    const backToSpreadsBtn = document.getElementById('back-to-spreads');
    if (backToSpreadsBtn) {
        backToSpreadsBtn.addEventListener('click', function() {
            document.getElementById('spread-detail').style.display = 'none';
            document.querySelectorAll('.spreads-grid .spread-card').forEach(card => {
                card.style.display = 'block';
            });
        });
    }
    
    // Обработчики для ввода по Enter
    const questionInput = document.getElementById('question-input');
    if (questionInput) {
        questionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleAskQuestion();
            }
        });
    }
    
    const followupInput = document.getElementById('followup-input');
    if (followupInput) {
        followupInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleFollowUpQuestion();
            }
        });
    }
    
    console.log('✅ Обработчики событий настроены');
}

// 🔗 НАСТРОЙКА ОБРАБОТЧИКОВ ТАБОВ
function setupTabEventListeners() {
    const navTabs = document.querySelectorAll('.nav-tab');
    
    navTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
}

// 🔄 ПЕРЕКЛЮЧЕНИЕ ТАБОВ
function switchTab(tabName) {
    try {
        console.log(`🔄 Переключение на таб: ${tabName}`);
        
        appState.currentTab = tabName;
        
        // Убираем активный класс у всех табов
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Добавляем активный класс текущему табу
        const currentTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (currentTab) {
            currentTab.classList.add('active');
        }
        
        // Скрываем все контенты табов
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        // Показываем нужный контент
        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
            targetContent.style.display = 'block';
        }
        
        // Выполняем специфичную логику для таба
        handleTabSpecificLogic(tabName);
        
        // Расширяем WebApp при переключении
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.expand();
        }
        
    } catch (error) {
        console.error(`❌ Ошибка переключения таба ${tabName}:`, error);
    }
}

// 🎯 ЛОГИКА ДЛЯ КОНКРЕТНЫХ ТАБОВ
function handleTabSpecificLogic(tabName) {
    switch (tabName) {
        case 'daily':
            handleDailyTab();
            break;
        case 'question':
            handleQuestionTab();
            break;
        case 'spreads':
            handleSpreadsTab();
            break;
        case 'history':
            handleHistoryTab();
            break;
        case 'reviews':
            handleReviewsTab();
            break;
        case 'premium':
            handlePremiumTab();
            break;
    }
}

// 📅 ЛОГИКА ТАБА "КАРТА ДНЯ"
function handleDailyTab() {
    console.log('📅 Обработка таба "Карта дня"');
    checkTodayCard();
}

// ❓ ЛОГИКА ТАБА "ВОПРОС"
function handleQuestionTab() {
    console.log('❓ Обработка таба "Вопрос"');
    updateQuestionsCounter();
    
    // Показываем/скрываем баннер подписки
    const subscriptionBanner = document.getElementById('subscription-banner-question');
    if (subscriptionBanner) {
        if (!appState.isPremium && appState.questionsLeft <= 0) {
            subscriptionBanner.style.display = 'block';
        } else {
            subscriptionBanner.style.display = 'none';
        }
    }
    
    // Скрываем секции ответов при переходе на таб
    const firstAnswerSection = document.getElementById('first-answer-section');
    const followUpSection = document.getElementById('follow-up-section');
    const followupAnswerSection = document.getElementById('followup-answer-section');
    
    if (firstAnswerSection) firstAnswerSection.style.display = 'none';
    if (followUpSection) followUpSection.style.display = 'none';
    if (followupAnswerSection) followupAnswerSection.style.display = 'none';
}

// 🃏 ЛОГИКА ТАБА "РАСКЛАДЫ"
function handleSpreadsTab() {
    console.log('🃏 Обработка таба "Расклады"');
    
    if (!appState.isPremium) {
        showPremiumRequired('spreads');
    }
    
    // Скрываем детали расклада
    const spreadDetail = document.getElementById('spread-detail');
    if (spreadDetail) {
        spreadDetail.style.display = 'none';
    }
}

// 📖 ЛОГИКА ТАБА "ИСТОРИЯ"
function handleHistoryTab() {
    console.log('📖 Обработка таба "История"');
    loadUserHistory();
}

// ⭐ ЛОГИКА ТАБА "ОТЗЫВЫ"
function handleReviewsTab() {
    console.log('⭐ Обработка таба "Отзывы"');
    loadReviews();
}

// 👑 ЛОГИКА ТАБА "PREMIUM"
function handlePremiumTab() {
    console.log('👑 Обработка таба "Premium"');
    // Дополнительная логика для Premium таба
}

// 🔄 ОБНОВЛЕНИЕ UI
function updateUI() {
    // Обновляем счетчик вопросов
    updateQuestionsCounter();
    
    // Обновляем статус подписки
    updateSubscriptionStatus();
}

// 🔢 ОБНОВЛЕНИЕ СЧЕТЧИКА ВОПРОСОВ
function updateQuestionsCounter() {
    const questionsCount = document.getElementById('questions-count');
    if (questionsCount) {
        questionsCount.textContent = appState.questionsLeft;
    }
}

// 💳 ОБНОВЛЕНИЕ СТАТУСА ПОДПИСКИ
function updateSubscriptionStatus() {
    const statusElement = document.getElementById('subscription-status');
    if (statusElement) {
        const icon = statusElement.querySelector('.status-icon');
        const text = statusElement.querySelector('.status-text');
        
        if (appState.isPremium) {
            if (icon) icon.textContent = '👑';
            if (text) text.textContent = 'Premium';
            statusElement.classList.add('premium');
        } else {
            if (icon) icon.textContent = '🌑';
            if (text) text.textContent = 'Базовая версия';
            statusElement.classList.remove('premium');
        }
    }
}

// 🃏 ОБРАБОТЧИК КЛИКА ПО КАРТЕ ДНЯ
async function handleDailyCardClick() {
    console.log('🃏 Клик по карте дня');
    
    const dailyCard = document.getElementById('daily-card');
    const loading = document.getElementById('daily-loading');
    const aiContainer = document.getElementById('daily-ai-container');
    
    try {
        // Показываем загрузку
        if (loading) loading.style.display = 'block';
        
        // Получаем карту дня
        const cardData = await getDailyCard();
        
        if (cardData) {
            // Обновляем карту
            updateCardDisplay(dailyCard, cardData);
            
            // Получаем толкование от ИИ
            const interpretation = await getAIInterpretation(cardData, 'daily');
            
            // Показываем толкование
            if (aiContainer && interpretation) {
                aiContainer.innerHTML = createAIResponseHTML(interpretation);
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения карты дня:', error);
        showErrorMessage('Не удалось получить карту дня. Попробуйте еще раз.');
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

// 🃏 ПОЛУЧЕНИЕ КАРТЫ ДЛЯ ОТВЕТА
async function getAnswerCard(question) {
    try {
        // Получаем случайную карту из колоды
        const cards = window.getFallbackCards();
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        
        return {
            ...randomCard,
            question: question,
            type: 'answer',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Ошибка получения карты для ответа:', error);
        throw error;
    }
}

// 🤖 ПОЛУЧЕНИЕ ТОЛКОВАНИЯ ОТ ИИ
async function getAIInterpretation(cardData, type, question = null) {
    try {
        const apiConfig = window.getAPIConfig();
        if (!apiConfig || !apiConfig.n8nWebhookUrl) {
            console.warn('⚠️ N8N webhook недоступен, используем fallback толкование');
            return getFallbackInterpretation(cardData, type, question);
        }
        
        const requestData = {
            card: cardData,
            type: type,
            question: question,
            user: currentUser
        };
        
        const response = await fetch(apiConfig.n8nWebhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData),
            timeout: apiConfig.timeout || 10000
        });
        
        if (response.ok) {
            const result = await response.json();
            return result.interpretation || result.message || result.answer;
        } else {
            console.warn('⚠️ N8N webhook вернул ошибку, используем fallback');
            return getFallbackInterpretation(cardData, type, question);
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения толкования от ИИ:', error);
        return getFallbackInterpretation(cardData, type, question);
    }
}

// 🎭 FALLBACK ТОЛКОВАНИЕ
function getFallbackInterpretation(cardData, type, question) {
    const interpretations = {
        daily: `Карта "${cardData.name}" предвещает ${cardData.keywords[0]} в вашем дне. ${cardData.description} Обратите внимание на возможности, связанные с ${cardData.keywords.join(', ')}.`,
        question: `Карта "${cardData.name}" отвечает на ваш вопрос "${question}". ${cardData.description} Ключевые энергии: ${cardData.keywords.join(', ')}.`,
        followup: `Уточняя ваш вопрос "${question}", карта "${cardData.name}" указывает на ${cardData.keywords[0]}. ${cardData.description}`
    };
    
    return interpretations[type] || `Карта "${cardData.name}": ${cardData.description}`;
}

// 🎨 СОЗДАНИЕ HTML ДЛЯ ОТВЕТА ИИ
function createAIResponseHTML(interpretation) {
    return `
        <div class="ai-response">
            <div class="ai-response-header">
                <div class="ai-icon">🔮</div>
                <h4>Толкование карт</h4>
            </div>
            <div class="ai-response-content">
                <p>${interpretation}</p>
            </div>
        </div>
    `;
}

// 🎨 ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ КАРТЫ
function updateCardDisplay(cardElement, cardData) {
    if (!cardElement) return;
    
    cardElement.innerHTML = `
        <div class="card-front">
            <div class="card-header">
                <div class="card-number">${cardData.arcana === 'major' ? cardData.number : ''}</div>
                <div class="card-symbol">${cardData.image || '🃏'}</div>
            </div>
            <div class="card-name">${cardData.name}</div>
            <div class="card-keywords">${cardData.keywords.slice(0, 2).join(' • ')}</div>
        </div>
    `;
    
    cardElement.classList.add('flipped');
}

// 🔄 СБРОС ОТОБРАЖЕНИЯ КАРТЫ
function resetCardDisplay(cardElement, text) {
    if (!cardElement) return;
    
    cardElement.innerHTML = `
        <div class="card-back">
            <div class="card-symbol">🔮</div>
            <div class="card-text">${text}</div>
        </div>
    `;
    
    cardElement.classList.remove('flipped');
}

// 💳 ОБРАБОТЧИК ПОКУПКИ PREMIUM
function handleBuyPremium() {
    console.log('💳 Обработка покупки Premium');
    
    const apiConfig = window.getAPIConfig();
    const paymentUrl = apiConfig?.paymentUrl || 'https://www.wildberries.ru/catalog/199937445/detail.aspx';
    
    // Открываем страницу оплаты
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openLink(paymentUrl);
    } else {
        window.open(paymentUrl, '_blank');
    }
}

// 🔒 ПОКАЗ ТРЕБОВАНИЯ PREMIUM
function showPremiumRequired(context) {
    const messages = {
        questions: 'Для продолжения задавания вопросов требуется Premium подписка',
        spreads: 'Эксклюзивные расклады доступны только в Premium версии'
    };
    
    const message = messages[context] || 'Для доступа к этой функции требуется Premium';
    
    showMessage(message, 'premium');
    
    // Переключаемся на таб Premium
    setTimeout(() => {
        switchTab('premium');
    }, 2000);
}

// 🃏 ВЫБОР РАСКЛАДА
function selectSpread(spreadType) {
    console.log(`🃏 Выбор расклада: ${spreadType}`);
    
    if (!appState.isPremium) {
        showPremiumRequired('spreads');
        return;
    }
    
    const spreadsConfig = window.getSpreadsConfig();
    const spread = spreadsConfig[spreadType];
    
    if (!spread) {
        showErrorMessage('Расклад не найден');
        return;
    }
    
    // Скрываем сетку раскладов
    document.querySelectorAll('.spreads-grid .spread-card').forEach(card => {
        card.style.display = 'none';
    });
    
    // Показываем детали расклада
    const spreadDetail = document.getElementById('spread-detail');
    const spreadTitle = document.getElementById('spread-title');
    const spreadContent = document.getElementById('spread-content');
    
    if (spreadDetail) spreadDetail.style.display = 'block';
    if (spreadTitle) spreadTitle.textContent = spread.name;
    if (spreadContent) {
        spreadContent.innerHTML = createSpreadHTML(spread);
    }
}

// 🎨 СОЗДАНИЕ HTML ДЛЯ РАСКЛАДА
function createSpreadHTML(spread) {
    return `
        <div class="spread-description">
            <p>${spread.description}</p>
        </div>
        <div class="spread-cards">
            ${spread.cards.map((card, index) => `
                <div class="spread-position">
                    <div class="position-number">${index + 1}</div>
                    <div class="position-name">${card.name}</div>
                    <div class="position-description">${card.description}</div>
                    <div class="tarot-card spread-card" data-position="${index}">
                        <div class="card-back">
                            <div class="card-symbol">🔮</div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="spread-actions">
            <button class="btn btn-primary" onclick="performSpread('${spread.name}')">
                Выполнить расклад ✨
            </button>
        </div>
    `;
}

// 🎯 ВЫПОЛНЕНИЕ РАСКЛАДА
async function performSpread(spreadName) {
    console.log(`🎯 Выполнение расклада: ${spreadName}`);
    
    const spreadsConfig = window.getSpreadsConfig();
    const spread = Object.values(spreadsConfig).find(s => s.name === spreadName);
    
    if (!spread) {
        showErrorMessage('Расклад не найден');
        return;
    }
    
    try {
        const cards = window.getFallbackCards();
        const spreadCards = [];
        
        // Получаем карты для каждой позиции
        for (let i = 0; i < spread.cards.length; i++) {
            const randomCard = cards[Math.floor(Math.random() * cards.length)];
            spreadCards.push({
                ...randomCard,
                position: i,
                positionName: spread.cards[i].name,
                positionDescription: spread.cards[i].description
            });
        }
        
        // Обновляем отображение карт
        const spreadPositions = document.querySelectorAll('.spread-position');
        spreadPositions.forEach((position, index) => {
            const cardElement = position.querySelector('.tarot-card');
            if (cardElement && spreadCards[index]) {
                updateCardDisplay(cardElement, spreadCards[index]);
            }
        });
        
        // Сохраняем в историю
        saveToHistory({
            type: 'spread',
            spreadName: spreadName,
            cards: spreadCards,
            timestamp: new Date().toISOString()
        });
        
        showMessage('Расклад выполнен успешно!', 'info');
        
    } catch (error) {
        console.error('❌ Ошибка выполнения расклада:', error);
        showErrorMessage('Не удалось выполнить расклад. Попробуйте еще раз.');
    }
}

// 📖 ЗАГРУЗКА ИСТОРИИ ПОЛЬЗОВАТЕЛЯ
function loadUserHistory() {
    console.log('📖 Загрузка истории пользователя');
    
    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');
    
    if (!historyList) return;
    
    try {
        const history = JSON.parse(localStorage.getItem('tarot_user_history') || '[]');
        
        if (history.length === 0) {
            historyList.style.display = 'none';
            if (historyEmpty) historyEmpty.style.display = 'block';
            return;
        }
        
        if (historyEmpty) historyEmpty.style.display = 'none';
        historyList.style.display = 'block';
        
        historyList.innerHTML = history.reverse().map(item => createHistoryItemHTML(item)).join('');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки истории:', error);
        if (historyEmpty) historyEmpty.style.display = 'block';
    }
}

// 🎨 СОЗДАНИЕ HTML ДЛЯ ЭЛЕМЕНТА ИСТОРИИ
function createHistoryItemHTML(item) {
    const date = new Date(item.timestamp).toLocaleDateString('ru-RU');
    const time = new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    let content = `
        <div class="history-item">
            <div class="history-header">
                <div class="history-type">${getHistoryTypeText(item.type)}</div>
                <div class="history-date">${date} ${time}</div>
            </div>
    `;
    
    if (item.question) {
        content += `<div class="history-question">"${item.question}"</div>`;
    }
    
    if (item.card) {
        content += `
            <div class="history-card">
                <span class="card-icon">${item.card.image || '🃏'}</span>
                <span class="card-name">${item.card.name}</span>
            </div>
        `;
    }
    
    if (item.cards && item.cards.length > 0) {
        content += `
            <div class="history-cards">
                ${item.cards.map(card => `
                    <span class="card-icon">${card.image || '🃏'}</span>
                `).join('')}
                <span class="cards-count">${item.cards.length} карт</span>
            </div>
        `;
    }
    
    if (item.interpretation) {
        content += `<div class="history-interpretation">${item.interpretation}</div>`;
    }
    
    content += '</div>';
    return content;
}

// 📝 ПОЛУЧЕНИЕ ТЕКСТА ТИПА ИСТОРИИ
function getHistoryTypeText(type) {
    const types = {
        daily: '📅 Карта дня',
        question: '❓ Вопрос',
        followup: '🔍 Уточнение',
        spread: '🃏 Расклад'
    };
    return types[type] || '🔮 Предсказание';
}

// 🗑️ ОЧИСТКА ИСТОРИИ
function handleClearHistory() {
    if (confirm('Вы уверены, что хотите очистить всю историю?')) {
        localStorage.removeItem('tarot_user_history');
        loadUserHistory();
        showMessage('История очищена', 'info');
    }
}

// ⭐ ЗАГРУЗКА ОТЗЫВОВ
function loadReviews() {
    console.log('⭐ Загрузка отзывов');
    
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return;
    
    // Пример отзывов (в реальном приложении загружались бы из Supabase)
    const mockReviews = [
        {
            name: 'Анна',
            rating: 5,
            text: 'Очень точные предсказания! Карта дня всегда попадает в точку.',
            date: '2024-01-15'
        },
        {
            name: 'Михаил',
            rating: 4,
            text: 'Интересное приложение, помогает принимать решения.',
            date: '2024-01-14'
        },
        {
            name: 'Елена',
            rating: 5,
            text: 'Premium версия того стоит! Расклады очень детальные.',
            date: '2024-01-13'
        }
    ];
    
    reviewsList.innerHTML = mockReviews.map(review => `
        <div class="review-item">
            <div class="review-header">
                <div class="review-author">${review.name}</div>
                <div class="review-rating">${'⭐'.repeat(review.rating)}</div>
            </div>
            <div class="review-text">${review.text}</div>
            <div class="review-date">${new Date(review.date).toLocaleDateString('ru-RU')}</div>
        </div>
    `).join('');
}

// ⭐ ОБРАБОТЧИК КЛИКА ПО ЗВЕЗДАМ
function handleRatingClick(e) {
    if (e.target.classList.contains('star')) {
        const rating = parseInt(e.target.getAttribute('data-rating'));
        appState.currentRating = rating;
        
        // Обновляем отображение звезд
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }
}

// 📝 ОТПРАВКА ОТЗЫВА
async function handleSubmitReview() {
    const reviewText = document.getElementById('review-text');
    const submitBtn = document.getElementById('submit-review-btn');
    
    if (!reviewText || !reviewText.value.trim()) {
        showErrorMessage('Пожалуйста, напишите отзыв');
        return;
    }
    
    if (appState.currentRating === 0) {
        showErrorMessage('Пожалуйста, поставьте оценку');
        return;
    }
    
    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправляю...';
        
        const reviewData = {
            rating: appState.currentRating,
            text: reviewText.value.trim(),
            user: currentUser?.display_name || 'Анонимный пользователь',
            timestamp: new Date().toISOString()
        };
        
        // Здесь можно добавить отправку в Supabase
        console.log('Отзыв для отправки:', reviewData);
        
        // Очищаем форму
        reviewText.value = '';
        appState.currentRating = 0;
        document.querySelectorAll('.star').forEach(star => star.classList.remove('active'));
        
        showMessage('Спасибо за отзыв!', 'info');
        
        // Перезагружаем отзывы
        loadReviews();
        
    } catch (error) {
        console.error('❌ Ошибка отправки отзыва:', error);
        showErrorMessage('Не удалось отправить отзыв. Попробуйте еще раз.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить отзыв';
    }
}

// 💾 СОХРАНЕНИЕ В ИСТОРИЮ
function saveToHistory(item) {
    try {
        const history = JSON.parse(localStorage.getItem('tarot_user_history') || '[]');
        history.push(item);
        
        // Ограничиваем историю 100 записями
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }
        
        localStorage.setItem('tarot_user_history', JSON.stringify(history));
        
    } catch (error) {
        console.error('❌ Ошибка сохранения в историю:', error);
    }
}

// 💾 СОХРАНЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
function saveUserData() {
    try {
        const userData = {
            questionsLeft: appState.questionsLeft,
            isPremium: appState.isPremium,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('tarot_user_data', JSON.stringify(userData));
        
        // Также обновляем в Supabase, если доступен
        if (supabase && currentUser) {
            updateUserInSupabase(userData);
        }
        
    } catch (error) {
        console.error('❌ Ошибка сохранения данных пользователя:', error);
    }
}

// 📤 ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ В SUPABASE
async function updateUserInSupabase(userData) {
    if (!supabase || !currentUser) return;
    
    try {
        const tables = window.getTablesConfig();
        if (!tables) return;
        
        const { error } = await supabase
            .from(tables.userProfiles)
            .update({
                questions_left: userData.questionsLeft,
                is_premium: userData.isPremium,
                updated_at: new Date().toISOString()
            })
            .eq('telegram_user_id', currentUser.telegram_user_id);
            
        if (error) {
            console.error('❌ Ошибка обновления пользователя в Supabase:', error);
        } else {
            console.log('✅ Пользователь обновлен в Supabase');
        }
        
    } catch (error) {
        console.error('❌ Ошибка при обновлении в Supabase:', error);
    }
}

// 🎭 ПРОВЕРКА И ПОКАЗ ПРИВЕТСТВИЯ
function checkAndShowWelcome() {
    const hasSeenWelcome = localStorage.getItem('tarot_seen_welcome_modal');
    
    if (!hasSeenWelcome && !currentUser) {
        showProfileModal();
    }
}

// 📝 ПОКАЗ МОДАЛЬНОГО ОКНА ПРОФИЛЯ
function showProfileModal() {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) {
        profileModal.style.display = 'flex';
        setTimeout(() => {
            profileModal.classList.add('show');
        }, 50);
    }
}

// 💾 ОБРАБОТЧИК СОХРАНЕНИЯ ПРОФИЛЯ
async function handleSaveProfile(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const displayName = formData.get('display_name');
    const birthDate = formData.get('birth_date');
    
    if (!displayName) {
        showErrorMessage('Пожалуйста, введите ваше имя');
        return;
    }
    
    try {
        // Сохраняем в localStorage
        const profileData = {
            displayName: displayName,
            birthDate: birthDate,
            createdAt: new Date().toISOString()
        };
        
        localStorage.setItem('tarot_user_profile', JSON.stringify(profileData));
        localStorage.setItem('tarot_seen_welcome_modal', 'true');
        
        console.log('✅ Профиль сохранен');
        closeProfileModal();
        showMessage('Добро пожаловать в Шёпот карт!', 'info');
        
    } catch (error) {
        console.error('❌ Ошибка сохранения профиля:', error);
        showErrorMessage('Не удалось сохранить профиль. Попробуйте еще раз.');
    }
}

// ⏭️ ПРОПУСК ПРОФИЛЯ
function skipProfile() {
    localStorage.setItem('tarot_seen_welcome_modal', 'true');
    closeProfileModal();
}

// ❌ ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА ПРОФИЛЯ
function closeProfileModal() {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) {
        profileModal.classList.remove('show');
        setTimeout(() => {
            profileModal.style.display = 'none';
        }, 300);
    }
}

// 📢 ПОКАЗ СООБЩЕНИЙ
function showMessage(message, type = 'info') {
    // Создаем элемент для сообщения
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    
    // Добавляем стили
    Object.assign(messageEl.style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: type === 'error' ? '#e74c3c' : type === 'premium' ? '#f39c12' : '#27ae60',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        zIndex: '9999',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        opacity: '0',
        transition: 'opacity 0.3s ease',
        maxWidth: '90%',
        textAlign: 'center'
    });
    
    document.body.appendChild(messageEl);
    
    // Показываем с анимацией
    setTimeout(() => {
        messageEl.style.opacity = '1';
    }, 50);
    
    // Убираем через 3 секунды
    setTimeout(() => {
        messageEl.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(messageEl)) {
                document.body.removeChild(messageEl);
            }
        }, 300);
    }, 3000);
}

function showErrorMessage(message) {
    showMessage(message, 'error');
}

// 🔧 УТИЛИТЫ ДЛЯ ОТЛАДКИ
function debugApp() {
    console.log('🔧 Состояние приложения:', {
        appState: appState,
        currentUser: currentUser,
        supabase: !!supabase,
        configReady: window.isConfigReady ? window.isConfigReady() : false
    });
}

// 🌟 ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
window.tarotApp = {
    initApp,
    switchTab,
    appState,
    currentUser,
    updateUI,
    handleDailyCardClick,
    handleAskQuestion,
    handleFollowUpQuestion,
    handleBuyPremium,
    selectSpread,
    performSpread,
    showMessage,
    showErrorMessage,
    debugApp,
    saveUserData,
    loadUserHistory,
    handleClearHistory,
    handleSubmitReview,
    handleRatingClick
};

// 🏁 АВТОМАТИЧЕСКИЙ ЗАПУСК ПРИЛОЖЕНИЯ
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏁 DOM готов, запускаю приложение...');
    
    // Небольшая задержка для загрузки всех скриптов
    setTimeout(() => {
        initApp();
    }, 100);
});

console.log('✅ Script.js загружен полностью');
    }
}

// 📅 ПРОВЕРКА КАРТЫ ДНЯ
function checkTodayCard() {
    const today = new Date().toDateString();
    const lastCardDate = localStorage.getItem('tarot_last_daily_card_date');
    
    if (lastCardDate !== today) {
        // Сбрасываем карту дня для нового дня
        localStorage.removeItem('tarot_daily_card_data');
        localStorage.setItem('tarot_last_daily_card_date', today);
        
        // Сбрасываем отображение карты
        const dailyCard = document.getElementById('daily-card');
        if (dailyCard) {
            resetCardDisplay(dailyCard, 'Нажмите, чтобы<br>узнать карту дня');
        }
        
        const aiContainer = document.getElementById('daily-ai-container');
        if (aiContainer) {
            aiContainer.innerHTML = '';
        }
    } else {
        // Загружаем сохраненную карту дня
        const savedCardData = localStorage.getItem('tarot_daily_card_data');
        if (savedCardData) {
            try {
                const cardData = JSON.parse(savedCardData);
                const dailyCard = document.getElementById('daily-card');
                const aiContainer = document.getElementById('daily-ai-container');
                
                if (dailyCard) {
                    updateCardDisplay(dailyCard, cardData);
                }
                
                if (aiContainer && cardData.interpretation) {
                    aiContainer.innerHTML = createAIResponseHTML(cardData.interpretation);
                }
            } catch (error) {
                console.error('❌ Ошибка загрузки сохраненной карты:', error);
            }
        }
    }
}

// 🃏 ПОЛУЧЕНИЕ КАРТЫ ДНЯ
async function getDailyCard() {
    try {
        // Проверяем, есть ли уже карта на сегодня
        const today = new Date().toDateString();
        const savedCardData = localStorage.getItem('tarot_daily_card_data');
        const lastCardDate = localStorage.getItem('tarot_last_daily_card_date');
        
        if (savedCardData && lastCardDate === today) {
            return JSON.parse(savedCardData);
        }
        
        // Получаем случайную карту из колоды
        const cards = window.getFallbackCards();
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        
        // Сохраняем карту дня
        const cardData = {
            ...randomCard,
            date: today,
            type: 'daily'
        };
        
        localStorage.setItem('tarot_daily_card_data', JSON.stringify(cardData));
        localStorage.setItem('tarot_last_daily_card_date', today);
        
        return cardData;
        
    } catch (error) {
        console.error('❌ Ошибка получения карты дня:', error);
        throw error;
    }
}

// ❓ ОБРАБОТЧИК ЗАДАТЬ ВОПРОС
async function handleAskQuestion() {
    console.log('❓ Обработка вопроса');
    
    const questionInput = document.getElementById('question-input');
    const askBtn = document.getElementById('ask-btn');
    const firstAnswerSection = document.getElementById('first-answer-section');
    const followUpSection = document.getElementById('follow-up-section');
    const loading = document.getElementById('question-loading');
    
    if (!questionInput || !questionInput.value.trim()) {
        showErrorMessage('Пожалуйста, введите ваш вопрос');
        return;
    }
    
    // Проверяем лимит вопросов
    if (!appState.isPremium && appState.questionsLeft <= 0) {
        showPremiumRequired('questions');
        return;
    }
    
    const question = questionInput.value.trim();
    
    try {
        // Блокируем кнопку и показываем загрузку
        if (askBtn) {
            askBtn.disabled = true;
            askBtn.textContent = 'Получаю ответ...';
        }
        if (loading) loading.style.display = 'block';
        if (firstAnswerSection) firstAnswerSection.style.display = 'block';
        
        // Получаем карту для ответа
        const cardData = await getAnswerCard(question);
        
        if (cardData) {
            // Обновляем отображение карты
            const answerCard = document.getElementById('answer-card');
            if (answerCard) {
                updateCardDisplay(answerCard, cardData);
            }
            
            // Получаем толкование от ИИ
            const interpretation = await getAIInterpretation(cardData, 'question', question);
            
            // Показываем толкование
            const aiContainer = document.getElementById('first-ai-container');
            if (aiContainer && interpretation) {
                aiContainer.innerHTML = createAIResponseHTML(interpretation);
            }
            
            // Уменьшаем счетчик вопросов (если не Premium)
            if (!appState.isPremium) {
                appState.questionsLeft = Math.max(0, appState.questionsLeft - 1);
                updateQuestionsCounter();
                saveUserData();
            }
            
            // Показываем секцию уточняющего вопроса
            if (followUpSection) {
                followUpSection.style.display = 'block';
            }
            
            // Очищаем поле ввода
            questionInput.value = '';
            
            // Сохраняем в историю
            saveToHistory({
                type: 'question',
                question: question,
                card: cardData,
                interpretation: interpretation,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения ответа на вопрос:', error);
        showErrorMessage('Не удалось получить ответ. Попробуйте еще раз.');
    } finally {
        if (askBtn) {
            askBtn.disabled = false;
            askBtn.textContent = 'Получить ответ ✨';
        }
        if (loading) loading.style.display = 'none';
    }
}

// 🔍 ОБРАБОТЧИК УТОЧНЯЮЩЕГО ВОПРОСА
async function handleFollowUpQuestion() {
    console.log('🔍 Обработка уточняющего вопроса');
    
    const followupInput = document.getElementById('followup-input');
    const followUpBtn = document.getElementById('follow-up-btn');
    const followupAnswerSection = document.getElementById('followup-answer-section');
    const loading = document.getElementById('followup-loading');
    
    if (!followupInput || !followupInput.value.trim()) {
        showErrorMessage('Пожалуйста, введите уточняющий вопрос');
        return;
    }
    
    // Проверяем лимит вопросов (уточняющие тоже считаются)
    if (!appState.isPremium && appState.questionsLeft <= 0) {
        showPremiumRequired('questions');
        return;
    }
    
    const question = followupInput.value.trim();
    
    try {
        // Блокируем кнопку и показываем загрузку
        if (followUpBtn) {
            followUpBtn.disabled = true;
            followUpBtn.textContent = 'Уточняю...';
        }
        if (loading) loading.style.display = 'block';
        if (followupAnswerSection) followupAnswerSection.style.display = 'block';
        
        // Получаем карту для ответа
        const cardData = await getAnswerCard(question);
        
        if (cardData) {
            // Обновляем отображение карты
            const followupCard = document.getElementById('followup-card');
            if (followupCard) {
                updateCardDisplay(followupCard, cardData);
            }
            
            // Получаем толкование от ИИ
            const interpretation = await getAIInterpretation(cardData, 'followup', question);
            
            // Показываем толкование
            const aiContainer = document.getElementById('followup-ai-container');
            if (aiContainer && interpretation) {
                aiContainer.innerHTML = createAIResponseHTML(interpretation);
            }
            
            // Уменьшаем счетчик вопросов (если не Premium)
            if (!appState.isPremium) {
                appState.questionsLeft = Math.max(0, appState.questionsLeft - 1);
                updateQuestionsCounter();
                saveUserData();
            }
            
            // Очищаем поле ввода
            followupInput.value = '';
            
            // Сохраняем в историю
            saveToHistory({
                type: 'followup',
                question: question,
                card: cardData,
                interpretation: interpretation,
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения уточняющего ответа:', error);
        showErrorMessage('Не удалось получить ответ. Попробуйте еще раз.');
    } finally {
        if (followUpBtn) {
            followUpBtn.disabled = false;
            followUpBtn.textContent = 'Уточнить ✨';
        }
        if (loading) loading.style.display = 'none';

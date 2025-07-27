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

// 🚫 ФЛАГИ ДЛЯ ПРЕДОТВРАЩЕНИЯ ПОВТОРНЫХ ИНИЦИАЛИЗАЦИЙ
let isInitializing = false;
let supabaseInitialized = false;

// 🚀 ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЯ
async function initApp() {
    console.log('🔮 Инициализация приложения...');
    
    // Проверяем, что приложение не было уже инициализировано или находится в процессе инициализации
    if (appState.isInitialized || isInitializing) {
        console.log('⚠️ Приложение уже инициализировано или инициализируется');
        return;
    }
    
    // Устанавливаем флаг инициализации
    isInitializing = true;

    try {
        // 1. Ждем готовности конфигурации
        await waitForConfig();
        
        // 2. Инициализируем Supabase (только один раз)
        await initSupabaseOnce();
        
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
        isInitializing = false;
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        isInitializing = false;
        showErrorMessage('Ошибка загрузки приложения. Попробуйте перезагрузить страницу.');
    }
}

// ⏰ ОЖИДАНИЕ ГОТОВНОСТИ КОНФИГУРАЦИИ
async function waitForConfig() {
    console.log('⏰ Ожидание готовности конфигурации...');
    
    let attempts = 0;
    const maxAttempts = 50; // 5 секунд максимум
    
    while (attempts < maxAttempts) {
        if (window.isConfigReady && window.isConfigReady()) {
            console.log('✅ Конфигурация готова');
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    console.warn('⚠️ Конфигурация не загружена за 5 секунд, продолжаем...');
}

// 🔧 ИНИЦИАЛИЗАЦИЯ SUPABASE (ТОЛЬКО ОДИН РАЗ)
async function initSupabaseOnce() {
    // Проверяем, не был ли уже инициализирован
    if (supabaseInitialized) {
        console.log('✅ Supabase уже инициализирован');
        return true;
    }
    
    console.log('🔧 Инициализация Supabase...');
    
    try {
        // Проверяем наличие библиотеки Supabase
        if (typeof window.supabase === 'undefined') {
            console.warn('⚠️ Библиотека Supabase не загружена');
            return false;
        }
        
        // Инициализируем через глобальную функцию
        if (window.initSupabase && typeof window.initSupabase === 'function') {
            const success = window.initSupabase();
            if (success) {
                // Получаем инициализированный клиент
                supabase = window.supabaseClient || null;
                supabaseInitialized = true;
                console.log('✅ Supabase инициализирован успешно');
                return true;
            }
        }
        
        console.warn('⚠️ Не удалось инициализировать Supabase');
        return false;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
        return false;
    }
}

// 📱 ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP
function initTelegramWebApp() {
    console.log('📱 Инициализация Telegram WebApp...');
    
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Настройка темы (только если поддерживается)
            try {
                tg.setHeaderColor('#1a1a2e');
                tg.setBackgroundColor('#16213e');
            } catch (e) {
                console.log('📱 Цвета темы не поддерживаются в этой версии Telegram');
            }
            
            // Расширяем приложение
            tg.expand();
            
            // Готовность к отображению
            tg.ready();
            
            console.log('✅ Telegram WebApp инициализирован');
            
            // Сохраняем информацию о пользователе
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                console.log('👤 Пользователь Telegram найден:', tg.initDataUnsafe.user);
                return tg.initDataUnsafe.user;
            }
        } else {
            console.warn('⚠️ Telegram WebApp недоступен (возможно, запуск вне Telegram)');
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram WebApp:', error);
        return null;
    }
}

// 👤 ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЯ
async function initUser() {
    console.log('👤 Инициализация пользователя...');
    
    try {
        const telegramUser = initTelegramWebApp();
        
        if (telegramUser) {
            currentUser = telegramUser;
            
            // Загружаем или создаем профиль пользователя
            if (supabase && window.createOrGetUserProfile) {
                try {
                    const userProfile = await window.createOrGetUserProfile(telegramUser);
                    if (userProfile) {
                        // Обновляем состояние приложения данными из профиля
                        appState.questionsLeft = userProfile.questions_left || 3;
                        appState.isPremium = userProfile.is_premium || false;
                    }
                } catch (error) {
                    console.warn('⚠️ Не удалось загрузить профиль из Supabase:', error);
                }
            }
        }
        
        // Загружаем данные из localStorage
        loadUserData();
        
        console.log('✅ Пользователь инициализирован:', currentUser);
        
    } catch (error) {
        console.error('❌ Ошибка инициализации пользователя:', error);
    }
}

// 💾 ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
function loadUserData() {
    try {
        const userData = localStorage.getItem('tarot_user_data');
        if (userData) {
            const parsed = JSON.parse(userData);
            appState.questionsLeft = parsed.questionsLeft || 3;
            appState.isPremium = parsed.isPremium || false;
        }
        
        console.log('💾 Данные пользователя загружены:', appState);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
    }
}

// 🎛️ НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    console.log('🎛️ Настройка обработчиков событий...');
    
    // Навигационные табы
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            if (tab) switchTab(tab);
        });
    });
    
    // Карта дня
    const dailyCard = document.getElementById('daily-card');
    if (dailyCard) {
        dailyCard.addEventListener('click', handleDailyCardClick);
    }
    
    // Кнопка задать вопрос
    const askBtn = document.getElementById('ask-btn');
    if (askBtn) {
        askBtn.addEventListener('click', handleAskQuestion);
    }
    
    // Кнопка дополнительного вопроса
    const followUpBtn = document.getElementById('follow-up-btn');
    if (followUpBtn) {
        followUpBtn.addEventListener('click', handleFollowUpQuestion);
    }
    
    // Кнопки премиума
    const premiumBtns = document.querySelectorAll('.premium-btn, .buy-premium-btn');
    premiumBtns.forEach(btn => {
        btn.addEventListener('click', handleBuyPremium);
    });
    
    // Расклады
    const spreadCards = document.querySelectorAll('.spread-card');
    spreadCards.forEach(card => {
        card.addEventListener('click', (e) => {
            const spreadType = e.currentTarget.dataset.spread;
            if (spreadType) selectSpread(spreadType);
        });
    });
    
    // Рейтинг
    const ratingStars = document.querySelectorAll('.rating-star');
    ratingStars.forEach((star, index) => {
        star.addEventListener('click', () => handleRatingClick(index + 1));
    });
    
    // Отправка отзыва
    const reviewForm = document.getElementById('review-form');
    if (reviewForm) {
        reviewForm.addEventListener('submit', handleSubmitReview);
    }
    
    // Очистка истории
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', handleClearHistory);
    }
    
    // Модальное окно профиля
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', handleSaveProfile);
    }
    
    const skipProfileBtn = document.getElementById('skip-profile-btn');
    if (skipProfileBtn) {
        skipProfileBtn.addEventListener('click', skipProfile);
    }
    
    console.log('✅ Обработчики событий настроены');
}

// 🎯 ПЕРЕКЛЮЧЕНИЕ ТАБОВ
function switchTab(tabName) {
    console.log('🎯 Переключение на таб:', tabName);
    
    // Обновляем состояние
    appState.currentTab = tabName;
    
    // Скрываем все секции
    const sections = document.querySelectorAll('.tab-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Показываем выбранную секцию
    const targetSection = document.getElementById(`${tabName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Обновляем активные табы
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Специальная логика для табов
    if (tabName === 'daily') {
        checkTodayCard();
    } else if (tabName === 'history') {
        loadUserHistory();
    } else if (tabName === 'reviews') {
        loadReviews();
    } else if (tabName === 'spreads') {
        loadSpreadsMenu();
    }
    
    updateUI();
}

// 🖼️ ОБНОВЛЕНИЕ UI
function updateUI() {
    console.log('🖼️ Обновление UI...');
    
    // Обновляем счетчик вопросов
    const questionsLeftEl = document.querySelectorAll('.questions-left');
    questionsLeftEl.forEach(el => {
        el.textContent = appState.questionsLeft;
    });
    
    // Обновляем статус премиума
    const premiumElements = document.querySelectorAll('.premium-status');
    premiumElements.forEach(el => {
        el.textContent = appState.isPremium ? 'Премиум активен' : 'Базовая версия';
        el.className = `premium-status ${appState.isPremium ? 'premium' : 'basic'}`;
    });
    
    // Показываем/скрываем кнопки премиума
    const premiumBtns = document.querySelectorAll('.buy-premium-btn');
    premiumBtns.forEach(btn => {
        btn.style.display = appState.isPremium ? 'none' : 'block';
    });
    
    // Обновляем лимиты
    const limitWarnings = document.querySelectorAll('.limit-warning');
    limitWarnings.forEach(warning => {
        const shouldShow = !appState.isPremium && appState.questionsLeft <= 1;
        warning.style.display = shouldShow ? 'block' : 'none';
    });
}

// 🃏 ОБРАБОТЧИК КАРТЫ ДНЯ
async function handleDailyCardClick() {
    console.log('🃏 Клик по карте дня');
    
    const dailyCard = document.getElementById('daily-card');
    const aiContainer = document.getElementById('daily-ai-container');
    
    if (!dailyCard) return;
    
    try {
        // Показываем загрузку
        dailyCard.innerHTML = '<div class="card-loading">Получаю карту дня...</div>';
        
        // Получаем карту дня
        const cardData = await getDailyCard();
        
        if (cardData) {
            // Обновляем отображение карты
            updateCardDisplay(dailyCard, cardData);
            
            // Показываем ИИ интерпретацию
            if (aiContainer && cardData.aiInterpretation) {
                aiContainer.innerHTML = `
                    <div class="ai-interpretation">
                        <h4>✨ Значение карты</h4>
                        <p>${cardData.aiInterpretation}</p>
                    </div>
                `;
            }
            
            // Сохраняем в историю
            saveToHistory({
                type: 'daily_card',
                date: new Date().toISOString(),
                card: cardData
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения карты дня:', error);
        resetCardDisplay(dailyCard, 'Ошибка загрузки.<br>Нажмите для повтора');
        showErrorMessage('Не удалось получить карту дня. Попробуйте еще раз.');
    }
}

// 🎴 ПОЛУЧЕНИЕ КАРТЫ ДНЯ
async function getDailyCard() {
    console.log('🎴 Получение карты дня...');
    
    try {
        const today = new Date().toDateString();
        const lastCardDate = localStorage.getItem('tarot_last_daily_card_date');
        
        // Проверяем, есть ли уже карта на сегодня
        if (lastCardDate === today) {
            const savedCard = localStorage.getItem('tarot_daily_card_data');
            if (savedCard) {
                console.log('📱 Загрузка сохраненной карты дня');
                return JSON.parse(savedCard);
            }
        }
        
        // Получаем новую карту через API
        const apiConfig = window.getAPIConfig && window.getAPIConfig();
        
        if (!apiConfig || !apiConfig.dailyCardEndpoint) {
            throw new Error('API конфигурация недоступна');
        }
        
        const response = await fetch(apiConfig.dailyCardEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'daily_card',
                user_id: currentUser ? currentUser.id : 'anonymous',
                date: today
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const cardData = await response.json();
        
        // Сохраняем карту дня
        localStorage.setItem('tarot_daily_card_data', JSON.stringify(cardData));
        localStorage.setItem('tarot_last_daily_card_date', today);
        
        return cardData;
        
    } catch (error) {
        console.error('❌ Ошибка получения карты дня:', error);
        
        // Fallback - возвращаем случайную карту из конфигурации
        const fallbackCards = window.getFallbackCards && window.getFallbackCards();
        if (fallbackCards && fallbackCards.length > 0) {
            const randomCard = fallbackCards[Math.floor(Math.random() * fallbackCards.length)];
            console.log('🎯 Используем fallback карту:', randomCard);
            return randomCard;
        }
        
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
            // Обновляем отображение ответа
            displayAnswer(cardData, question);
            
            // Уменьшаем количество вопросов
            if (!appState.isPremium) {
                appState.questionsLeft = Math.max(0, appState.questionsLeft - 1);
                saveUserData();
                updateUI();
            }
            
            // Показываем секцию дополнительного вопроса
            if (followUpSection) {
                followUpSection.style.display = 'block';
            }
            
            // Сохраняем в историю
            saveToHistory({
                type: 'question',
                date: new Date().toISOString(),
                question: question,
                card: cardData
            });
            
            // Очищаем поле ввода
            questionInput.value = '';
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения ответа:', error);
        showErrorMessage('Не удалось получить ответ. Попробуйте еще раз.');
        
    } finally {
        // Восстанавливаем кнопку
        if (askBtn) {
            askBtn.disabled = false;
            askBtn.textContent = 'Получить ответ';
        }
        if (loading) loading.style.display = 'none';
    }
}

// 🎴 ПОЛУЧЕНИЕ КАРТЫ ДЛЯ ОТВЕТА
async function getAnswerCard(question) {
    console.log('🎴 Получение карты для ответа на вопрос:', question);
    
    try {
        const apiConfig = window.getAPIConfig && window.getAPIConfig();
        
        if (!apiConfig || !apiConfig.questionEndpoint) {
            throw new Error('API конфигурация недоступна');
        }
        
        const response = await fetch(apiConfig.questionEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'question',
                question: question,
                user_id: currentUser ? currentUser.id : 'anonymous'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const cardData = await response.json();
        return cardData;
        
    } catch (error) {
        console.error('❌ Ошибка получения карты для ответа:', error);
        
        // Fallback - возвращаем случайную карту из конфигурации
        const fallbackCards = window.getFallbackCards && window.getFallbackCards();
        if (fallbackCards && fallbackCards.length > 0) {
            const randomCard = fallbackCards[Math.floor(Math.random() * fallbackCards.length)];
            randomCard.aiInterpretation = `Ответ на ваш вопрос "${question}": ${randomCard.description}`;
            console.log('🎯 Используем fallback карту для ответа:', randomCard);
            return randomCard;
        }
        
        throw error;
    }
}

// 📝 ОТОБРАЖЕНИЕ ОТВЕТА
function displayAnswer(cardData, question) {
    const answerCard = document.getElementById('answer-card');
    const answerAI = document.getElementById('answer-ai');
    
    if (answerCard) {
        updateCardDisplay(answerCard, cardData);
    }
    
    if (answerAI && cardData.aiInterpretation) {
        answerAI.innerHTML = `
            <div class="answer-content">
                <h4>🔮 Ответ на ваш вопрос</h4>
                <p class="question-text">"${question}"</p>
                <div class="interpretation">
                    ${cardData.aiInterpretation}
                </div>
            </div>
        `;
    }
}

// ❓ ОБРАБОТЧИК ДОПОЛНИТЕЛЬНОГО ВОПРОСА
async function handleFollowUpQuestion() {
    console.log('❓ Обработка дополнительного вопроса');
    
    const followUpInput = document.getElementById('follow-up-input');
    const followUpBtn = document.getElementById('follow-up-btn');
    const followUpAnswer = document.getElementById('follow-up-answer');
    const followUpLoading = document.getElementById('follow-up-loading');
    
    if (!followUpInput || !followUpInput.value.trim()) {
        showErrorMessage('Пожалуйста, введите дополнительный вопрос');
        return;
    }
    
    // Проверяем лимит вопросов
    if (!appState.isPremium && appState.questionsLeft <= 0) {
        showPremiumRequired('questions');
        return;
    }
    
    const question = followUpInput.value.trim();
    
    try {
        // Блокируем кнопку и показываем загрузку
        if (followUpBtn) {
            followUpBtn.disabled = true;
            followUpBtn.textContent = 'Получаю ответ...';
        }
        if (followUpLoading) followUpLoading.style.display = 'block';
        
        // Получаем ответ
        const response = await getFollowUpAnswer(question);
        
        if (response && followUpAnswer) {
            followUpAnswer.innerHTML = `
                <div class="follow-up-content">
                    <h4>💫 Дополнительный ответ</h4>
                    <p class="question-text">"${question}"</p>
                    <div class="interpretation">
                        ${response.answer}
                    </div>
                </div>
            `;
            followUpAnswer.style.display = 'block';
            
            // Уменьшаем количество вопросов
            if (!appState.isPremium) {
                appState.questionsLeft = Math.max(0, appState.questionsLeft - 1);
                saveUserData();
                updateUI();
            }
            
            // Сохраняем в историю
            saveToHistory({
                type: 'follow_up',
                date: new Date().toISOString(),
                question: question,
                answer: response.answer
            });
            
            // Очищаем поле ввода
            followUpInput.value = '';
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения дополнительного ответа:', error);
        showErrorMessage('Не удалось получить ответ. Попробуйте еще раз.');
        
    } finally {
        // Восстанавливаем кнопку
        if (followUpBtn) {
            followUpBtn.disabled = false;
            followUpBtn.textContent = 'Задать вопрос';
        }
        if (followUpLoading) followUpLoading.style.display = 'none';
    }
}

// 🔮 ПОЛУЧЕНИЕ ДОПОЛНИТЕЛЬНОГО ОТВЕТА
async function getFollowUpAnswer(question) {
    console.log('🔮 Получение дополнительного ответа:', question);
    
    try {
        const apiConfig = window.getAPIConfig && window.getAPIConfig();
        
        if (!apiConfig || !apiConfig.followUpEndpoint) {
            throw new Error('API конфигурация недоступна');
        }
        
        const response = await fetch(apiConfig.followUpEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'follow_up',
                question: question,
                user_id: currentUser ? currentUser.id : 'anonymous'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const answerData = await response.json();
        return answerData;
        
    } catch (error) {
        console.error('❌ Ошибка получения дополнительного ответа:', error);
        
        // Fallback ответ
        return {
            answer: `Интуитивный ответ на ваш вопрос "${question}": Доверьтесь своему внутреннему голосу и следуйте тому пути, который кажется вам наиболее правильным в данный момент.`
        };
    }
}

// 💎 ОБРАБОТЧИК ПОКУПКИ ПРЕМИУМА
async function handleBuyPremium() {
    console.log('💎 Обработка покупки премиума');
    
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Показываем инвойс для оплаты
            tg.showPopup({
                title: 'Премиум доступ',
                message: 'Хотите получить безлимитный доступ ко всем функциям приложения?',
                buttons: [
                    {id: 'buy', type: 'default', text: 'Купить за 299₽'},
                    {id: 'cancel', type: 'cancel', text: 'Отмена'}
                ]
            }, (buttonId) => {
                if (buttonId === 'buy') {
                    // В реальном приложении здесь будет обращение к Telegram Payments API
                    // Пока что эмулируем успешную покупку
                    appState.isPremium = true;
                    appState.questionsLeft = 999; // Безлимитный доступ
                    saveUserData();
                    updateUI();
                    showMessage('Премиум доступ активирован!', 'premium');
                }
            });
        } else {
            // Fallback для тестирования вне Telegram
            const confirmed = confirm('Активировать премиум доступ для тестирования?');
            if (confirmed) {
                appState.isPremium = true;
                appState.questionsLeft = 999;
                saveUserData();
                updateUI();
                showMessage('Премиум доступ активирован!', 'premium');
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка обработки покупки премиума:', error);
        showErrorMessage('Не удалось обработать покупку. Попробуйте еще раз.');
    }
}

// 🔒 ПОКАЗ ТРЕБОВАНИЯ ПРЕМИУМА
function showPremiumRequired(context = 'general') {
    const messages = {
        questions: 'У вас закончились бесплатные вопросы. Получите премиум доступ для безлимитных консультаций!',
        spreads: 'Расклады доступны только в премиум версии. Получите полный доступ ко всем функциям!',
        general: 'Эта функция доступна только в премиум версии.'
    };
    
    const message = messages[context] || messages.general;
    
    if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        
        tg.showPopup({
            title: 'Требуется премиум',
            message: message,
            buttons: [
                {id: 'buy', type: 'default', text: 'Получить премиум'},
                {id: 'cancel', type: 'cancel', text: 'Позже'}
            ]
        }, (buttonId) => {
            if (buttonId === 'buy') {
                handleBuyPremium();
            }
        });
    } else {
        showMessage(message, 'premium');
    }
}

// 🎴 ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ КАРТЫ
function updateCardDisplay(cardElement, cardData) {
    if (!cardElement || !cardData) return;
    
    cardElement.innerHTML = `
        <div class="card-inner">
            <div class="card-image">
                ${cardData.image ? `<img src="${cardData.image}" alt="${cardData.name}" />` : '🎴'}
            </div>
            <div class="card-info">
                <h3>${cardData.name}</h3>
                <p class="card-description">${cardData.description || ''}</p>
            </div>
        </div>
    `;
    
    cardElement.classList.add('revealed');
}

// 🔄 СБРОС ОТОБРАЖЕНИЯ КАРТЫ
function resetCardDisplay(cardElement, text = 'Нажмите для получения карты') {
    if (!cardElement) return;
    
    cardElement.innerHTML = `
        <div class="card-placeholder">
            <div class="card-back">🎴</div>
            <p>${text}</p>
        </div>
    `;
    
    cardElement.classList.remove('revealed');
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
        const savedCard = localStorage.getItem('tarot_daily_card_data');
        if (savedCard) {
            try {
                const cardData = JSON.parse(savedCard);
                const dailyCard = document.getElementById('daily-card');
                const aiContainer = document.getElementById('daily-ai-container');
                
                if (dailyCard) {
                    updateCardDisplay(dailyCard, cardData);
                }
                
                if (aiContainer && cardData.aiInterpretation) {
                    aiContainer.innerHTML = `
                        <div class="ai-interpretation">
                            <h4>✨ Значение карты</h4>
                            <p>${cardData.aiInterpretation}</p>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('❌ Ошибка загрузки сохраненной карты дня:', error);
            }
        }
    }
}

// 🃏 ВЫБОР РАСКЛАДА
function selectSpread(spreadType) {
    console.log('🃏 Выбор расклада:', spreadType);
    
    // Проверяем премиум доступ
    if (!appState.isPremium) {
        showPremiumRequired('spreads');
        return;
    }
    
    const spreadConfigs = window.getSpreadsConfig && window.getSpreadsConfig();
    
    if (!spreadConfigs || !spreadConfigs[spreadType]) {
        showErrorMessage('Расклад недоступен');
        return;
    }
    
    // Сохраняем выбранный расклад
    appState.selectedSpread = spreadType;
    
    // Переключаемся на экран выполнения расклада
    showSpreadPerform(spreadType);
}

// 🎯 ПОКАЗ ЭКРАНА ВЫПОЛНЕНИЯ РАСКЛАДА
function showSpreadPerform(spreadType) {
    const spreadsSection = document.getElementById('spreads-section');
    const spreadConfigs = window.getSpreadsConfig && window.getSpreadsConfig();
    
    if (!spreadsSection || !spreadConfigs || !spreadConfigs[spreadType]) return;
    
    const config = spreadConfigs[spreadType];
    
    spreadsSection.innerHTML = `
        <div class="spread-perform">
            <div class="spread-header">
                <button class="back-btn" onclick="window.tarotApp.loadSpreadsMenu()">← Назад</button>
                <h2>${config.name}</h2>
                <p>${config.description}</p>
            </div>
            
            <div class="spread-question">
                <label for="spread-question-input">Ваш вопрос для расклада:</label>
                <textarea id="spread-question-input" placeholder="Введите ваш вопрос..." rows="3"></textarea>
                <button class="perform-spread-btn" onclick="window.tarotApp.performSpread('${spreadType}')">
                    Выполнить расклад
                </button>
            </div>
            
            <div id="spread-result" class="spread-result" style="display: none;">
                <!-- Результат расклада -->
            </div>
        </div>
    `;
}

// 🎲 ВЫПОЛНЕНИЕ РАСКЛАДА
async function performSpread(spreadType) {
    console.log('🎲 Выполнение расклада:', spreadType);
    
    const questionInput = document.getElementById('spread-question-input');
    const performBtn = document.querySelector('.perform-spread-btn');
    const resultDiv = document.getElementById('spread-result');
    
    if (!questionInput || !questionInput.value.trim()) {
        showErrorMessage('Пожалуйста, введите вопрос для расклада');
        return;
    }
    
    const question = questionInput.value.trim();
    
    try {
        // Блокируем кнопку
        if (performBtn) {
            performBtn.disabled = true;
            performBtn.textContent = 'Выполняю расклад...';
        }
        
        // Получаем расклад
        const spreadResult = await getSpreadResult(spreadType, question);
        
        if (spreadResult && resultDiv) {
            // Отображаем результат
            displaySpreadResult(spreadResult, resultDiv);
            resultDiv.style.display = 'block';
            
            // Сохраняем в историю
            saveToHistory({
                type: 'spread',
                spreadType: spreadType,
                question: question,
                result: spreadResult,
                date: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ Ошибка выполнения расклада:', error);
        showErrorMessage('Не удалось выполнить расклад. Попробуйте еще раз.');
        
    } finally {
        // Восстанавливаем кнопку
        if (performBtn) {
            performBtn.disabled = false;
            performBtn.textContent = 'Выполнить расклад';
        }
    }
}

// 🔮 ПОЛУЧЕНИЕ РЕЗУЛЬТАТА РАСКЛАДА
async function getSpreadResult(spreadType, question) {
    console.log('🔮 Получение результата расклада:', spreadType, question);
    
    try {
        const apiConfig = window.getAPIConfig && window.getAPIConfig();
        
        if (!apiConfig || !apiConfig.spreadEndpoint) {
            throw new Error('API конфигурация недоступна');
        }
        
        const response = await fetch(apiConfig.spreadEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                type: 'spread',
                spreadType: spreadType,
                question: question,
                user_id: currentUser ? currentUser.id : 'anonymous'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const spreadData = await response.json();
        return spreadData;
        
    } catch (error) {
        console.error('❌ Ошибка получения результата расклада:', error);
        
        // Fallback - создаем простой расклад из fallback карт
        const fallbackCards = window.getFallbackCards && window.getFallbackCards();
        if (fallbackCards && fallbackCards.length > 0) {
            const spreadConfigs = window.getSpreadsConfig && window.getSpreadsConfig();
            const config = spreadConfigs && spreadConfigs[spreadType];
            const cardsCount = config ? config.cardsCount || 3 : 3;
            
            const cards = [];
            for (let i = 0; i < cardsCount; i++) {
                const randomCard = fallbackCards[Math.floor(Math.random() * fallbackCards.length)];
                cards.push({
                    ...randomCard,
                    position: `Позиция ${i + 1}`
                });
            }
            
            return {
                cards: cards,
                interpretation: `Расклад на вопрос "${question}": Карты указывают на важность баланса и внимательного отношения к деталям в данной ситуации.`
            };
        }
        
        throw error;
    }
}

// 📊 ОТОБРАЖЕНИЕ РЕЗУЛЬТАТА РАСКЛАДА
function displaySpreadResult(spreadResult, container) {
    if (!spreadResult || !container) return;
    
    let html = `
        <div class="spread-cards">
            <h3>🔮 Результат расклада</h3>
    `;
    
    if (spreadResult.cards && Array.isArray(spreadResult.cards)) {
        spreadResult.cards.forEach((card, index) => {
            html += `
                <div class="spread-card-result">
                    <div class="position-label">${card.position || `Позиция ${index + 1}`}</div>
                    <div class="card-display">
                        ${card.image ? `<img src="${card.image}" alt="${card.name}" />` : '🎴'}
                        <h4>${card.name}</h4>
                        <p>${card.description || ''}</p>
                    </div>
                </div>
            `;
        });
    }
    
    html += '</div>';
    
    if (spreadResult.interpretation) {
        html += `
            <div class="spread-interpretation">
                <h4>✨ Толкование расклада</h4>
                <div class="interpretation-text">
                    ${spreadResult.interpretation}
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// 🔙 ЗАГРУЗКА МЕНЮ РАСКЛАДОВ
function loadSpreadsMenu() {
    const spreadsSection = document.getElementById('spreads-section');
    if (!spreadsSection) return;
    
    const spreadConfigs = window.getSpreadsConfig && window.getSpreadsConfig();
    
    let html = `
        <div class="spreads-menu">
            <h2>🃏 Расклады Таро</h2>
            <p>Выберите подходящий расклад для вашего вопроса</p>
            
            <div class="spreads-grid">
    `;
    
    if (spreadConfigs && Object.keys(spreadConfigs).length > 0) {
        Object.entries(spreadConfigs).forEach(([key, config]) => {
            html += `
                <div class="spread-card" data-spread="${key}">
                    <div class="spread-icon">${config.icon || '🎴'}</div>
                    <h3>${config.name}</h3>
                    <p>${config.description}</p>
                    <div class="spread-info">
                        <span class="cards-count">${config.cardsCount || 3} карт</span>
                        ${!appState.isPremium ? '<span class="premium-badge">Premium</span>' : ''}
                    </div>
                </div>
            `;
        });
    } else {
        // Fallback расклады, если конфигурация не загружена
        const defaultSpreads = [
            {
                key: 'three_cards',
                name: 'Три карты',
                description: 'Прошлое, настоящее, будущее',
                icon: '🎴',
                cardsCount: 3
            },
            {
                key: 'celtic_cross',
                name: 'Кельтский крест',
                description: 'Полный анализ ситуации',
                icon: '✝️',
                cardsCount: 10
            }
        ];
        
        defaultSpreads.forEach(spread => {
            html += `
                <div class="spread-card" data-spread="${spread.key}">
                    <div class="spread-icon">${spread.icon}</div>
                    <h3>${spread.name}</h3>
                    <p>${spread.description}</p>
                    <div class="spread-info">
                        <span class="cards-count">${spread.cardsCount} карт</span>
                        ${!appState.isPremium ? '<span class="premium-badge">Premium</span>' : ''}
                    </div>
                </div>
            `;
        });
    }
    
    html += `
            </div>
        </div>
    `;
    
    spreadsSection.innerHTML = html;
    
    // Добавляем обработчики
    setTimeout(() => {
        const spreadCards = document.querySelectorAll('.spread-card');
        spreadCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const spreadType = e.currentTarget.dataset.spread;
                if (spreadType) selectSpread(spreadType);
            });
        });
    }, 100);
}

// 📚 ЗАГРУЗКА ИСТОРИИ ПОЛЬЗОВАТЕЛЯ
function loadUserHistory() {
    console.log('📚 Загрузка истории пользователя');
    
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;
    
    try {
        const history = JSON.parse(localStorage.getItem('tarot_user_history') || '[]');
        
        if (history.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-history">
                    <p>📝 Ваша история пуста</p>
                    <p>Задайте вопрос или получите карту дня, чтобы начать!</p>
                </div>
            `;
            return;
        }
        
        // Сортируем по дате (новые сверху)
        history.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        let html = '<div class="history-list">';
        
        history.forEach((item, index) => {
            const date = new Date(item.date).toLocaleDateString('ru-RU');
            const time = new Date(item.date).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            html += `<div class="history-item">`;
            
            if (item.type === 'daily_card') {
                html += `
                    <div class="history-header">
                        <span class="history-type">🎴 Карта дня</span>
                        <span class="history-date">${date} ${time}</span>
                    </div>
                    <div class="history-content">
                        <strong>${item.card.name}</strong>
                        <p>${item.card.description || ''}</p>
                    </div>
                `;
            } else if (item.type === 'question') {
                html += `
                    <div class="history-header">
                        <span class="history-type">❓ Вопрос</span>
                        <span class="history-date">${date} ${time}</span>
                    </div>
                    <div class="history-content">
                        <p class="question-text">"${item.question}"</p>
                        <strong>${item.card.name}</strong>
                        <p>${item.card.description || ''}</p>
                    </div>
                `;
            } else if (item.type === 'spread') {
                html += `
                    <div class="history-header">
                        <span class="history-type">🃏 Расклад</span>
                        <span class="history-date">${date} ${time}</span>
                    </div>
                    <div class="history-content">
                        <p class="question-text">"${item.question}"</p>
                        <p><strong>Тип:</strong> ${item.spreadType}</p>
                    </div>
                `;
            } else if (item.type === 'follow_up') {
                html += `
                    <div class="history-header">
                        <span class="history-type">💫 Доп. вопрос</span>
                        <span class="history-date">${date} ${time}</span>
                    </div>
                    <div class="history-content">
                        <p class="question-text">"${item.question}"</p>
                        <p>${item.answer}</p>
                    </div>
                `;
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        
        historyContainer.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки истории:', error);
        historyContainer.innerHTML = `
            <div class="error-message">
                <p>Ошибка загрузки истории</p>
            </div>
        `;
    }
}

// 🗑️ ОЧИСТКА ИСТОРИИ
function handleClearHistory() {
    if (confirm('Вы уверены, что хотите очистить всю историю? Это действие нельзя отменить.')) {
        localStorage.removeItem('tarot_user_history');
        loadUserHistory();
        showMessage('История очищена', 'info');
    }
}

// 📝 ЗАГРУЗКА ОТЗЫВОВ
async function loadReviews() {
    console.log('📝 Загрузка отзывов');
    
    const reviewsContainer = document.getElementById('reviews-container');
    if (!reviewsContainer) return;
    
    try {
        // Показываем загрузку
        reviewsContainer.innerHTML = '<div class="loading">Загрузка отзывов...</div>';
        
        if (supabase && window.TABLES) {
            // Загружаем из Supabase
            const { data: reviews, error } = await supabase
                .from(window.TABLES.reviews)
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (!error && reviews) {
                displayReviews(reviews, reviewsContainer);
                return;
            }
        }
        
        // Fallback - загружаем из localStorage
        const localReviews = JSON.parse(localStorage.getItem('tarot_reviews') || '[]');
        displayReviews(localReviews, reviewsContainer);
        
    } catch (error) {
        console.error('❌ Ошибка загрузки отзывов:', error);
        reviewsContainer.innerHTML = `
            <div class="error-message">
                <p>Ошибка загрузки отзывов</p>
            </div>
        `;
    }
}

// 📋 ОТОБРАЖЕНИЕ ОТЗЫВОВ
function displayReviews(reviews, container) {
    if (!container) return;
    
    if (!reviews || reviews.length === 0) {
        container.innerHTML = `
            <div class="empty-reviews">
                <p>📝 Отзывов пока нет</p>
                <p>Станьте первым, кто оставит отзыв!</p>
            </div>
        `;
        return;
    }
    
    let html = '<div class="reviews-list">';
    
    reviews.forEach(review => {
        const date = new Date(review.created_at || review.date).toLocaleDateString('ru-RU');
        const stars = '⭐'.repeat(review.rating || 5);
        
        html += `
            <div class="review-item">
                <div class="review-header">
                    <span class="review-rating">${stars}</span>
                    <span class="review-date">${date}</span>
                </div>
                <div class="review-content">
                    <p class="review-name">${review.display_name || review.name || 'Аноним'}</p>
                    <p class="review-text">${review.review_text || review.text}</p>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ⭐ ОБРАБОТЧИК КЛИКА ПО ЗВЕЗДАМ
function handleRatingClick(rating) {
    console.log('⭐ Выбран рейтинг:', rating);
    
    appState.currentRating = rating;
    
    // Обновляем отображение звезд
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        star.classList.toggle('active', index < rating);
    });
}

// 📤 ОТПРАВКА ОТЗЫВА
async function handleSubmitReview(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const name = formData.get('review_name');
    const text = formData.get('review_text');
    const rating = appState.currentRating;
    
    if (!rating) {
        showErrorMessage('Пожалуйста, выберите рейтинг');
        return;
    }
    
    if (!text || text.trim().length < 10) {
        showErrorMessage('Пожалуйста, напишите отзыв (минимум 10 символов)');
        return;
    }
    
    const submitBtn = form.querySelector('.submit-review-btn');
    
    try {
        // Блокируем кнопку
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';
        
        const reviewData = {
            display_name: name || 'Аноним',
            review_text: text.trim(),
            rating: rating,
            created_at: new Date().toISOString(),
            user_id: currentUser ? currentUser.id : null
        };
        
        // Сохраняем в Supabase
        if (supabase && window.TABLES) {
            const { error } = await supabase
                .from(window.TABLES.reviews)
                .insert([reviewData]);
                
            if (error) {
                console.error('❌ Ошибка сохранения отзыва в Supabase:', error);
            }
        }
        
        // Также сохраняем локально
        const localReviews = JSON.parse(localStorage.getItem('tarot_reviews') || '[]');
        localReviews.push(reviewData);
        localStorage.setItem('tarot_reviews', JSON.stringify(localReviews));
        
        // Очищаем форму
        form.reset();
        appState.currentRating = 0;
        
        // Сбрасываем звезды
        const stars = document.querySelectorAll('.rating-star');
        stars.forEach(star => star.classList.remove('active'));
        
        showMessage('Спасибо за ваш отзыв!', 'info');
        
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
        supabaseInitialized: supabaseInitialized,
        isInitializing: isInitializing,
        configReady: window.isConfigReady ? window.isConfigReady() : false,
        functions: {
            initApp: typeof initApp,
            switchTab: typeof switchTab,
            updateUI: typeof updateUI
        }
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
    handleRatingClick,
    loadSpreadsMenu,
    showSpreadPerform,
    checkTodayCard,
    getDailyCard,
    getAnswerCard,
    showProfileModal,
    handleSaveProfile,
    skipProfile,
    closeProfileModal
};

// 🏁 АВТОМАТИЧЕСКИЙ ЗАПУСК ПРИЛОЖЕНИЯ (ТОЛЬКО ОДИН РАЗ)
let appStarted = false;

document.addEventListener('DOMContentLoaded', function() {
    if (appStarted) {
        console.log('⚠️ Приложение уже запущено, пропускаем повторный запуск');
        return;
    }
    
    console.log('🏁 DOM готов, запускаю приложение...');
    appStarted = true;
    
    // Небольшая задержка для загрузки всех скриптов
    setTimeout(() => {
        initApp();
    }, 100);
});

console.log('✅ Script.js загружен полностью');

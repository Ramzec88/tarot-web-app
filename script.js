// script.js - Исправленная логика приложения "Шёпот карт"
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
    currentRating: 0,
    dailyCardUsed: false
};

// 🚫 ФЛАГИ СОСТОЯНИЯ
let isInitializing = false;
let supabaseInitialized = false;

// 🚀 ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
async function initApp() {
    console.log('🔮 Инициализация приложения...');
    
    if (appState.isInitialized || isInitializing) {
        console.log('⚠️ Приложение уже инициализировано');
        return;
    }
    
    isInitializing = true;

    try {
        // Показываем состояние загрузки
        showLoadingState();
        
        // 1. Ждём готовности конфигурации (максимум 3 секунды)
        await waitForConfig();
        
        // 2. Инициализируем базовый UI без зависимостей
        initBasicUI();
        
        // 3. Инициализируем Telegram WebApp
        initTelegramWebApp();
        
        // 4. Пытаемся инициализировать Supabase (не критично)
        await initSupabaseOnce();
        
        // 5. Инициализируем пользователя
        await initUser();
        
        // 6. Настраиваем обработчики событий
        setupEventListeners();
        
        // 7. Обновляем UI
        updateUI();
        
        // 8. Скрываем состояние загрузки
        hideLoadingState();
        
        // 9. Проверяем приветствие (опционально)
        setTimeout(checkAndShowWelcome, 1000);
        
        appState.isInitialized = true;
        isInitializing = false;
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        isInitializing = false;
        
        // Показываем базовый UI даже при ошибках
        initBasicUI();
        setupEventListeners();
        hideLoadingState();
        
        showErrorMessage('Не удалось полностью загрузить приложение. Некоторые функции могут быть недоступны.');
    }
}

// 🔄 ПОКАЗАТЬ СОСТОЯНИЕ ЗАГРУЗКИ
function showLoadingState() {
    // Создаем простой индикатор загрузки если его нет
    let loader = document.getElementById('app-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'app-loader';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
            font-family: Arial, sans-serif;
        `;
        loader.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 20px;">🔮</div>
                <div style="font-size: 20px; color: #ffd700;">Шёпот карт</div>
                <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">Загрузка...</div>
            </div>
        `;
        document.body.appendChild(loader);
    }
}

// 🫥 СКРЫТЬ СОСТОЯНИЕ ЗАГРУЗКИ
function hideLoadingState() {
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
    }
}

// 🎨 ИНИЦИАЛИЗАЦИЯ БАЗОВОГО UI
function initBasicUI() {
    console.log('🎨 Инициализация базового UI...');
    
    try {
        // Показываем все скрытые элементы
        const hiddenElements = document.querySelectorAll('[style*="display: none"]');
        hiddenElements.forEach(el => {
            if (el.id !== 'app-loader') {
                el.style.display = '';
            }
        });
        
        // Убеждаемся что активная вкладка видна
        const dailyTab = document.getElementById('daily-tab');
        if (dailyTab) {
            dailyTab.classList.add('active');
        }
        
        // Активируем первую кнопку таба
        const firstTabBtn = document.querySelector('.nav-tab[data-tab="daily"]');
        if (firstTabBtn) {
            firstTabBtn.classList.add('active');
        }
        
        console.log('✅ Базовый UI инициализирован');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации базового UI:', error);
    }
}

// ⏰ ОЖИДАНИЕ ГОТОВНОСТИ КОНФИГУРАЦИИ
async function waitForConfig() {
    console.log('⏰ Ожидание готовности конфигурации...');
    
    let attempts = 0;
    const maxAttempts = 30; // 3 секунды максимум
    
    while (attempts < maxAttempts) {
        if (window.isConfigReady && window.isConfigReady()) {
            console.log('✅ Конфигурация готова');
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    console.warn('⚠️ Конфигурация не загружена за 3 сек, продолжаем без неё');
}

// 🔧 ИНИЦИАЛИЗАЦИЯ SUPABASE
async function initSupabaseOnce() {
    if (supabaseInitialized) {
        console.log('✅ Supabase уже инициализирован');
        return true;
    }
    
    console.log('🔧 Инициализация Supabase...');
    
    try {
        // Проверяем библиотеку Supabase
        if (typeof window.supabase === 'undefined') {
            console.warn('⚠️ Библиотека Supabase не загружена');
            return false;
        }
        
        // Проверяем конфигурацию
        const config = window.getSupabaseConfig ? window.getSupabaseConfig() : null;
        if (!config || !config.url || !config.anonKey) {
            console.warn('⚠️ Конфигурация Supabase недоступна');
            return false;
        }
        
        // Инициализируем клиент
        supabase = window.supabase.createClient(config.url, config.anonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            }
        });
        
        supabaseInitialized = true;
        console.log('✅ Supabase инициализирован успешно');
        return true;
        
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
                if (tg.version >= '6.1') {
                    tg.setHeaderColor('#1a1a2e');
                    tg.setBackgroundColor('#16213e');
                }
            } catch (error) {
                console.log('ℹ️ Цвета темы не поддерживаются в этой версии');
            }
            
            // Базовые настройки
            tg.ready();
            tg.expand();
            
            // Настройка главной кнопки
            if (tg.MainButton) {
                tg.MainButton.hide();
            }
            
            console.log('✅ Telegram WebApp инициализирован');
            
        } else {
            console.log('ℹ️ Приложение запущено вне Telegram');
        }
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram WebApp:', error);
    }
}

// 👤 ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЯ
async function initUser() {
    console.log('👤 Инициализация пользователя...');
    
    try {
        // Получаем данные пользователя из Telegram или localStorage
        let userData = loadUserData();
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            if (tgUser) {
                userData = {
                    id: tgUser.id,
                    firstName: tgUser.first_name,
                    lastName: tgUser.last_name,
                    username: tgUser.username,
                    languageCode: tgUser.language_code
                };
                saveUserData(userData);
            }
        }
        
        // Если нет данных пользователя, создаем анонимного
        if (!userData) {
            userData = {
                id: 'anonymous_' + Date.now(),
                firstName: 'Гость',
                isAnonymous: true
            };
        }
        
        currentUser = userData;
        
        // Загружаем состояние приложения
        const savedState = loadAppState();
        if (savedState) {
            appState = { ...appState, ...savedState };
        }
        
        console.log('✅ Пользователь инициализирован:', currentUser);
        
    } catch (error) {
        console.error('❌ Ошибка инициализации пользователя:', error);
        
        // Fallback пользователь
        currentUser = {
            id: 'fallback_user',
            firstName: 'Пользователь',
            isAnonymous: true
        };
    }
}

// 🎛️ НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    console.log('🎛️ Настройка обработчиков событий...');
    
    try {
        // Обработчики табов
        const tabButtons = document.querySelectorAll('.nav-tab[data-tab]');
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                switchTab(tabName);
            });
        });
        
        // Карта дня
        const dailyCard = document.getElementById('daily-card');
        if (dailyCard) {
            dailyCard.addEventListener('click', handleDailyCardClick);
        }
        
        // Кнопка вопроса
        const askBtn = document.getElementById('ask-btn');
        if (askBtn) {
            askBtn.addEventListener('click', handleAskQuestion);
        }
        
        // Enter в поле вопроса
        const questionInput = document.getElementById('question-input');
        if (questionInput) {
            questionInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleAskQuestion();
                }
            });
        }
        
        console.log('✅ Обработчики событий настроены');
        
    } catch (error) {
        console.error('❌ Ошибка настройки обработчиков событий:', error);
    }
}

// 🔄 ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
function switchTab(tabName) {
    console.log('🔄 Переключение на вкладку:', tabName);
    
    try {
        // Убираем активность со всех табов
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Активируем нужную кнопку и контент
        const tabButton = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
        const tabContent = document.getElementById(`${tabName}-tab`);
        
        if (tabButton) tabButton.classList.add('active');
        if (tabContent) tabContent.classList.add('active');
        
        // Обновляем состояние
        appState.currentTab = tabName;
        saveAppState();
        
        console.log('✅ Вкладка переключена на:', tabName);
        
    } catch (error) {
        console.error('❌ Ошибка переключения вкладки:', error);
    }
}

// 🔮 ОБРАБОТЧИК КЛИКА ПО КАРТЕ ДНЯ
async function handleDailyCardClick() {
    console.log('🔮 Клик по карте дня');
    
    try {
        if (appState.dailyCardUsed) {
            showMessage('Карта дня уже была получена сегодня!', 'info');
            return;
        }
        
        // Получаем случайную карту
        const card = getRandomCard();
        
        // Показываем карту
        const cardElement = document.getElementById('daily-card');
        if (cardElement) {
            cardElement.innerHTML = `
                <div class="card-front">
                    <div class="card-symbol">${card.symbol}</div>
                    <div class="card-name">${card.name}</div>
                </div>
            `;
            cardElement.classList.add('flipped');
        }
        
        // Показываем толкование
        setTimeout(() => {
            const aiContainer = document.getElementById('daily-ai-container');
            if (aiContainer) {
                aiContainer.innerHTML = `
                    <div class="ai-interpretation">
                        <div class="ai-header">🤖 Толкование карты</div>
                        <div class="ai-content">${card.interpretation}</div>
                    </div>
                `;
            }
        }, 1000);
        
        // Отмечаем что карта использована
        appState.dailyCardUsed = true;
        saveAppState();
        
        console.log('✅ Карта дня показана:', card.name);
        
    } catch (error) {
        console.error('❌ Ошибка получения карты дня:', error);
        showErrorMessage('Не удалось получить карту дня');
    }
}

// ❓ ОБРАБОТЧИК ВОПРОСА
async function handleAskQuestion() {
    console.log('❓ Обработка вопроса');
    
    try {
        const questionInput = document.getElementById('question-input');
        const question = questionInput ? questionInput.value.trim() : '';
        
        if (!question) {
            showMessage('Пожалуйста, введите вопрос', 'warning');
            return;
        }
        
        if (appState.questionsLeft <= 0 && !appState.isPremium) {
            showMessage('У вас закончились бесплатные вопросы. Оформите Premium!', 'warning');
            switchTab('premium');
            return;
        }
        
        // Показываем загрузку
        const loadingElement = document.getElementById('question-loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
            loadingElement.textContent = 'Карты размышляют...';
        }
        
        // Получаем ответ (пока что локально)
        const answer = await getAnswerToQuestion(question);
        
        // Показываем ответ
        const answerSection = document.getElementById('first-answer-section');
        if (answerSection) {
            answerSection.style.display = 'block';
            
            // Карта ответа
            const answerCard = document.getElementById('answer-card');
            if (answerCard) {
                answerCard.innerHTML = `
                    <div class="card-front">
                        <div class="card-symbol">${answer.card.symbol}</div>
                        <div class="card-name">${answer.card.name}</div>
                    </div>
                `;
                answerCard.classList.add('flipped');
            }
            
            // ИИ толкование
            setTimeout(() => {
                if (loadingElement) loadingElement.style.display = 'none';
                
                const aiContainer = document.getElementById('first-ai-container');
                if (aiContainer) {
                    aiContainer.innerHTML = `
                        <div class="ai-interpretation">
                            <div class="ai-header">🤖 Ответ на ваш вопрос</div>
                            <div class="ai-content">${answer.interpretation}</div>
                        </div>
                    `;
                }
                
                // Показываем блок уточняющего вопроса
                const followUpSection = document.getElementById('follow-up-section');
                if (followUpSection) {
                    followUpSection.style.display = 'block';
                }
            }, 2000);
        }
        
        // Уменьшаем количество вопросов
        if (!appState.isPremium) {
            appState.questionsLeft = Math.max(0, appState.questionsLeft - 1);
            updateUI();
            saveAppState();
        }
        
        // Очищаем поле ввода
        if (questionInput) {
            questionInput.value = '';
        }
        
        console.log('✅ Вопрос обработан');
        
    } catch (error) {
        console.error('❌ Ошибка обработки вопроса:', error);
        showErrorMessage('Не удалось получить ответ на вопрос');
        
        const loadingElement = document.getElementById('question-loading');
        if (loadingElement) loadingElement.style.display = 'none';
    }
}

// 🎯 ОБНОВЛЕНИЕ UI
function updateUI() {
    console.log('🎯 Обновление UI...');
    
    try {
        // Обновляем статус подписки
        const statusElement = document.getElementById('subscription-status');
        if (statusElement) {
            const statusIcon = statusElement.querySelector('.status-icon');
            const statusText = statusElement.querySelector('.status-text');
            
            if (appState.isPremium) {
                if (statusIcon) statusIcon.textContent = '👑';
                if (statusText) statusText.textContent = 'Premium активен';
                statusElement.style.background = 'linear-gradient(45deg, #ffd700, #ffed4a)';
                statusElement.style.color = '#1a1a2e';
            } else {
                if (statusIcon) statusIcon.textContent = '🆓';
                if (statusText) statusText.textContent = 'Бесплатная версия';
                statusElement.style.background = 'rgba(255, 255, 255, 0.1)';
                statusElement.style.color = '#fff';
            }
        }
        
        // Обновляем счетчик вопросов
        const questionsCountElement = document.getElementById('questions-count');
        if (questionsCountElement) {
            questionsCountElement.textContent = appState.questionsLeft;
        }
        
        // Обновляем видимость элементов в зависимости от состояния
        updateElementsVisibility();
        
        console.log('✅ UI обновлен');
        
    } catch (error) {
        console.error('❌ Ошибка обновления UI:', error);
    }
}

// 👁️ ОБНОВЛЕНИЕ ВИДИМОСТИ ЭЛЕМЕНТОВ
function updateElementsVisibility() {
    try {
        // Показать/скрыть premium элементы
        const premiumElements = document.querySelectorAll('.premium-only');
        premiumElements.forEach(el => {
            el.style.display = appState.isPremium ? 'block' : 'none';
        });
        
        // Показать/скрыть базовые элементы
        const basicElements = document.querySelectorAll('.basic-only');
        basicElements.forEach(el => {
            el.style.display = !appState.isPremium ? 'block' : 'none';
        });
        
    } catch (error) {
        console.error('❌ Ошибка обновления видимости элементов:', error);
    }
}

// 🎲 ПОЛУЧЕНИЕ СЛУЧАЙНОЙ КАРТЫ
function getRandomCard() {
    const cards = getFallbackCards();
    if (cards && cards.length > 0) {
        return cards[Math.floor(Math.random() * cards.length)];
    }
    
    // Fallback карта если нет конфигурации
    return {
        name: "Звезда",
        symbol: "⭐",
        interpretation: "Карта надежды и вдохновения. Сегодня звезды благоволят вашим начинаниям."
    };
}

// 🤖 ПОЛУЧЕНИЕ ОТВЕТА НА ВОПРОС
async function getAnswerToQuestion(question) {
    console.log('🤖 Получение ответа на вопрос:', question);
    
    try {
        // Пока что возвращаем локальный ответ
        // В будущем здесь будет запрос к n8n
        const card = getRandomCard();
        
        const interpretations = [
            `Карта ${card.name} говорит о том, что ваш вопрос "${question}" требует терпения и мудрости. ${card.interpretation}`,
            `В ответ на ваш вопрос карты показывают ${card.name}. Это знак того, что решение уже близко. ${card.interpretation}`,
            `${card.name} в ответе на "${question}" символизирует новые возможности. ${card.interpretation}`
        ];
        
        return {
            card: card,
            interpretation: interpretations[Math.floor(Math.random() * interpretations.length)]
        };
        
    } catch (error) {
        console.error('❌ Ошибка получения ответа:', error);
        throw error;
    }
}

// 🔔 ПОКАЗАТЬ СООБЩЕНИЕ
function showMessage(message, type = 'info') {
    console.log(`🔔 Сообщение (${type}):`, message);
    
    try {
        // Создаем элемент сообщения
        const messageDiv = document.createElement('div');
        messageDiv.className = `app-message app-message-${type}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 90%;
            text-align: center;
            font-size: 14px;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // Убираем сообщение через 3 секунды
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ Ошибка показа сообщения:', error);
    }
}

// ❌ ПОКАЗАТЬ СООБЩЕНИЕ ОБ ОШИБКЕ
function showErrorMessage(message) {
    showMessage(message, 'error');
}

// 🔍 ПРОВЕРКА И ПОКАЗ ПРИВЕТСТВИЯ
function checkAndShowWelcome() {
    console.log('🔍 Проверка приветствия...');
    
    try {
        const hasShownWelcome = localStorage.getItem('tarot_welcome_shown');
        
        if (!hasShownWelcome && currentUser && currentUser.isAnonymous) {
            // Показать модальное окно приветствия если оно есть
            const welcomeModal = document.getElementById('profile-modal');
            if (welcomeModal) {
                welcomeModal.style.display = 'flex';
                setTimeout(() => welcomeModal.classList.add('show'), 100);
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка проверки приветствия:', error);
    }
}

// 💾 ФУНКЦИИ СОХРАНЕНИЯ/ЗАГРУЗКИ ДАННЫХ
function saveUserData(userData) {
    try {
        localStorage.setItem('tarot_user_data', JSON.stringify(userData));
    } catch (error) {
        console.error('❌ Ошибка сохранения данных пользователя:', error);
    }
}

function loadUserData() {
    try {
        const data = localStorage.getItem('tarot_user_data');
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
        return null;
    }
}

function saveAppState() {
    try {
        const stateToSave = {
            questionsLeft: appState.questionsLeft,
            isPremium: appState.isPremium,
            dailyCardUsed: appState.dailyCardUsed,
            lastCardDate: new Date().toDateString(),
            currentTab: appState.currentTab
        };
        localStorage.setItem('tarot_app_state', JSON.stringify(stateToSave));
    } catch (error) {
        console.error('❌ Ошибка сохранения состояния:', error);
    }
}

function loadAppState() {
    try {
        const data = localStorage.getItem('tarot_app_state');
        if (data) {
            const savedState = JSON.parse(data);
            // Проверяем, не новый ли день для сброса карты дня
            const today = new Date().toDateString();
            if (savedState.lastCardDate !== today) {
                savedState.dailyCardUsed = false;
            }
            return savedState;
        }
        return null;
    } catch (error) {
        console.error('❌ Ошибка загрузки состояния:', error);
        return null;
    }
}

// 🃏 ПОЛУЧЕНИЕ FALLBACK КАРТ
function getFallbackCards() {
    if (window.getFallbackCards) {
        return window.getFallbackCards();
    }
    
    // Базовые карты если конфиг недоступен
    return [
        {
            name: "Звезда",
            symbol: "⭐",
            interpretation: "Карта надежды и вдохновения. Время для осуществления мечтаний."
        },
        {
            name: "Солнце",
            symbol: "☀️",
            interpretation: "Символ радости и успеха. Впереди светлые времена."
        },
        {
            name: "Луна",
            symbol: "🌙",
            interpretation: "Карта интуиции и тайн. Доверьтесь внутреннему голосу."
        },
        {
            name: "Маг",
            symbol: "🎩",
            interpretation: "У вас есть все необходимое для достижения целей."
        },
        {
            name: "Шут",
            symbol: "🃏",
            interpretation: "Новые начинания и неожиданные возможности."
        }
    ];
}

// 🔧 ОТЛАДОЧНЫЕ ФУНКЦИИ
function debugApp() {
    console.log('🔧 Состояние приложения:', {
        appState: appState,
        currentUser: currentUser,
        supabaseInitialized: supabaseInitialized,
        isInitializing: isInitializing,
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
    showMessage,
    showErrorMessage,
    debugApp,
    saveAppState,
    getRandomCard,
    getFallbackCards
};

// 🏁 АВТОМАТИЧЕСКИЙ ЗАПУСК
let appStarted = false;

document.addEventListener('DOMContentLoaded', function() {
    if (appStarted) {
        console.log('⚠️ Приложение уже запущено');
        return;
    }
    
    console.log('🏁 DOM готов, запускаю приложение...');
    appStarted = true;
    
    // Небольшая задержка для загрузки всех ресурсов
    setTimeout(() => {
        initApp();
    }, 100);
});

// Дополнительная проверка если DOM уже готов
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (!appStarted) {
            console.log('🏁 DOM уже готов, запускаю приложение...');
            appStarted = true;
            initApp();
        }
    }, 50);
}

console.log('✅ Script.js загружен полностью');

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
        // 1. Ждём готовности конфигурации
        await waitForConfig();
        
        // 2. Инициализируем Supabase
        await initSupabaseOnce();
        
        // 3. Инициализируем Telegram WebApp
        initTelegramWebApp();
        
        // 4. Инициализируем пользователя
        await initUser();
        
        // 5. Настраиваем обработчики событий
        setupEventListeners();
        
        // 6. Обновляем UI
        updateUI();
        
        // 7. Проверяем приветствие
        checkAndShowWelcome();
        
        appState.isInitialized = true;
        isInitializing = false;
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        isInitializing = false;
        showErrorMessage('Ошибка загрузки. Попробуйте перезагрузить страницу.');
    }
}

// ⏰ ОЖИДАНИЕ ГОТОВНОСТИ КОНФИГУРАЦИИ
async function waitForConfig() {
    console.log('⏰ Ожидание готовности конфигурации...');
    
    let attempts = 0;
    const maxAttempts = 50;
    
    while (attempts < maxAttempts) {
        if (window.isConfigReady && window.isConfigReady()) {
            console.log('✅ Конфигурация готова');
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    console.warn('⚠️ Конфигурация не загружена, используем fallback');
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
        const config = window.getSupabaseConfig();
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
                // Проверяем версию перед установкой цветов
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
            console.log('📊 Версия WebApp:', tg.version);
            
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
        
        currentUser = userData;
        
        // Загружаем состояние приложения
        const savedState = loadAppState();
        if (savedState) {
            appState = { ...appState, ...savedState };
        }
        
        console.log('💾 Данные пользователя загружены:', userData);
        console.log('✅ Пользователь инициализирован:', currentUser);
        
    } catch (error) {
        console.error('❌ Ошибка инициализации пользователя:', error);
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
            lastCardDate: new Date().toDateString()
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

// 🎛️ НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    console.log('🎛️ Настройка обработчиков событий...');
    
    // Обработчики табов
    const tabButtons = document.querySelectorAll('[data-tab]');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            if (tabName) switchTab(tabName);
        });
    });
    
    // Карта дня
    const dailyCard = document.getElementById('daily-card');
    if (dailyCard) {
        dailyCard.addEventListener('click', handleDailyCardClick);
    }
    
    // Форма вопроса
    const questionBtn = document.querySelector('.question-submit-btn');
    if (questionBtn) {
        questionBtn.addEventListener('click', handleAskQuestion);
    }
    
    console.log('✅ Обработчики событий настроены');
}

// 🎯 ПЕРЕКЛЮЧЕНИЕ ТАБОВ
function switchTab(tabName) {
    console.log('🎯 Переключение на таб:', tabName);
    
    appState.currentTab = tabName;
    
    // Скрываем все секции
    const sections = document.querySelectorAll('.tab-content');
    sections.forEach(section => section.classList.remove('active'));
    
    // Показываем выбранную секцию
    const targetSection = document.getElementById(tabName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Обновляем активные табы
    const tabButtons = document.querySelectorAll('[data-tab]');
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Специальная логика для табов
    if (tabName === 'daily') {
        checkTodayCard();
    } else if (tabName === 'history') {
        loadUserHistory();
    }
    
    updateUI();
}

// 🖼️ ОБНОВЛЕНИЕ UI
function updateUI() {
    console.log('🖼️ Обновление UI...');
    
    // Обновляем счётчик вопросов
    const questionsLeftElements = document.querySelectorAll('.questions-left');
    questionsLeftElements.forEach(el => {
        el.textContent = appState.questionsLeft;
    });
    
    // Обновляем статус подписки
    const subscriptionStatus = document.getElementById('subscription-status');
    if (subscriptionStatus) {
        const statusText = subscriptionStatus.querySelector('.status-text');
        const statusIcon = subscriptionStatus.querySelector('.status-icon');
        
        if (appState.isPremium) {
            statusText.textContent = 'Premium активен';
            statusIcon.textContent = '👑';
            subscriptionStatus.classList.add('premium');
        } else {
            statusText.textContent = 'Базовая версия';
            statusIcon.textContent = '🌑';
            subscriptionStatus.classList.remove('premium');
        }
    }
    
    // Показываем/скрываем элементы в зависимости от подписки
    const premiumButtons = document.querySelectorAll('.premium-btn');
    premiumButtons.forEach(btn => {
        btn.style.display = appState.isPremium ? 'none' : 'block';
    });
    
    // Предупреждения о лимитах
    const limitWarnings = document.querySelectorAll('.limit-warning');
    limitWarnings.forEach(warning => {
        const shouldShow = !appState.isPremium && appState.questionsLeft <= 1;
        warning.style.display = shouldShow ? 'block' : 'none';
    });
    
    console.log('✅ UI обновлён');
}

// 🃏 ОБРАБОТКА КЛИКА ПО КАРТЕ ДНЯ
function handleDailyCardClick() {
    console.log('🃏 Клик по карте дня');
    
    if (appState.dailyCardUsed) {
        showMessage('Карта дня уже получена. Возвращайтесь завтра!', 'info');
        return;
    }
    
    const loadingEl = document.getElementById('daily-loading');
    const resultEl = document.getElementById('daily-result');
    const cardEl = document.getElementById('daily-card');
    
    if (loadingEl) loadingEl.style.display = 'block';
    if (cardEl) cardEl.style.display = 'none';
    if (resultEl) resultEl.style.display = 'none';
    
    // Получаем карту дня
    setTimeout(() => {
        getDailyCard();
    }, 1000);
}

// 🎴 ПОЛУЧЕНИЕ КАРТЫ ДНЯ
async function getDailyCard() {
    console.log('🎴 Получение карты дня...');
    
    try {
        let card = null;
        
        // Пытаемся получить карту через API
        const apiConfig = window.getAPIConfig();
        if (apiConfig && apiConfig.n8nWebhookUrl && apiConfig.n8nWebhookUrl !== 'https://your-n8n.app/webhook/tarot') {
            try {
                const response = await fetch(apiConfig.n8nWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'daily_card',
                        user: currentUser
                    }),
                    timeout: apiConfig.timeout || 10000
                });
                
                if (response.ok) {
                    const data = await response.json();
                    card = data.card;
                    console.log('✅ Карта получена через API');
                }
            } catch (error) {
                console.warn('⚠️ Ошибка API, используем fallback:', error);
            }
        }
        
        // Если API не сработал, используем fallback
        if (!card) {
            const fallbackCards = window.getFallbackCards();
            if (fallbackCards && fallbackCards.length > 0) {
                const randomIndex = Math.floor(Math.random() * fallbackCards.length);
                card = fallbackCards[randomIndex];
                console.log('🎯 Используем fallback карту:', card);
            }
        }
        
        if (card) {
            showDailyCardResult(card);
            appState.dailyCardUsed = true;
            saveAppState();
            saveToHistory('daily_card', null, card);
        } else {
            throw new Error('Не удалось получить карту');
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения карты дня:', error);
        showDailyCardError();
    }
}

// 🎭 ОТОБРАЖЕНИЕ РЕЗУЛЬТАТА КАРТЫ ДНЯ
function showDailyCardResult(card) {
    const loadingEl = document.getElementById('daily-loading');
    const resultEl = document.getElementById('daily-result');
    
    if (loadingEl) loadingEl.style.display = 'none';
    
    if (resultEl) {
        resultEl.innerHTML = `
            <div class="card-result">
                <div class="card-name">${card.name}</div>
                <div class="card-description">
                    ${card.description || 'Карта дня раскрывает свои тайны...'}
                </div>
                ${card.keywords ? `<div class="card-keywords">Ключевые слова: ${card.keywords.join(', ')}</div>` : ''}
                ${card.meanings ? `
                    <div class="card-meanings">
                        <strong>Значение:</strong> ${card.meanings.upright || 'Позитивные изменения ждут вас'}
                    </div>
                ` : ''}
            </div>
        `;
        resultEl.style.display = 'block';
    }
    
    showMessage('Карта дня получена! ✨', 'info');
}

// ❌ ОТОБРАЖЕНИЕ ОШИБКИ КАРТЫ ДНЯ
function showDailyCardError() {
    const loadingEl = document.getElementById('daily-loading');
    const resultEl = document.getElementById('daily-result');
    const cardEl = document.getElementById('daily-card');
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (cardEl) cardEl.style.display = 'block';
    
    if (resultEl) {
        resultEl.innerHTML = `
            <div class="card-result error">
                <div class="card-name">Ошибка</div>
                <div class="card-description">
                    Не удалось получить карту дня. Попробуйте позже.
                </div>
            </div>
        `;
        resultEl.style.display = 'block';
    }
    
    showErrorMessage('Не удалось получить карту дня');
}

// ❓ ОБРАБОТКА ВОПРОСА
async function handleAskQuestion() {
    console.log('❓ Обработка вопроса пользователя');
    
    const questionInput = document.getElementById('question-input');
    if (!questionInput) {
        showErrorMessage('Поле для вопроса не найдено');
        return;
    }
    
    const question = questionInput.value.trim();
    if (!question) {
        showErrorMessage('Пожалуйста, введите ваш вопрос');
        return;
    }
    
    // Проверяем лимиты
    if (!appState.isPremium && appState.questionsLeft <= 0) {
        showMessage('Вопросы закончились. Оформите Premium для безлимитных вопросов!', 'premium');
        return;
    }
    
    const loadingEl = document.getElementById('question-loading');
    const resultEl = document.getElementById('question-result');
    
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultEl) resultEl.style.display = 'none';
    
    try {
        const answer = await getAnswerToQuestion(question);
        
        if (loadingEl) loadingEl.style.display = 'none';
        
        if (resultEl && answer) {
            resultEl.innerHTML = `
                <div class="card-result">
                    <div class="card-name">${answer.card.name}</div>
                    <div class="question-text">"${question}"</div>
                    <div class="card-description">
                        ${answer.interpretation || answer.card.description}
                    </div>
                    ${answer.card.keywords ? `<div class="card-keywords">Ключевые слова: ${answer.card.keywords.join(', ')}</div>` : ''}
                </div>
            `;
            resultEl.style.display = 'block';
            
            // Уменьшаем счётчик вопросов
            if (!appState.isPremium) {
                appState.questionsLeft = Math.max(0, appState.questionsLeft - 1);
                saveAppState();
                updateUI();
            }
            
            // Сохраняем в историю
            saveToHistory('question', question, answer.card, answer.interpretation);
            
            // Очищаем поле ввода
            questionInput.value = '';
            
            showMessage('Ответ получен! 🔮', 'info');
        }
        
    } catch (error) {
        console.error('❌ Ошибка получения ответа:', error);
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (resultEl) {
            resultEl.innerHTML = `
                <div class="card-result error">
                    <div class="card-name">Ошибка</div>
                    <div class="card-description">
                        Не удалось получить ответ на ваш вопрос. Попробуйте позже.
                    </div>
                </div>
            `;
            resultEl.style.display = 'block';
        }
        
        showErrorMessage('Не удалось получить ответ на вопрос');
    }
}

// 🔮 ПОЛУЧЕНИЕ ОТВЕТА НА ВОПРОС
async function getAnswerToQuestion(question) {
    console.log('🔮 Получение ответа на вопрос:', question);
    
    try {
        // Пытаемся получить ответ через API
        const apiConfig = window.getAPIConfig();
        if (apiConfig && apiConfig.n8nWebhookUrl && apiConfig.n8nWebhookUrl !== 'https://your-n8n.app/webhook/tarot') {
            try {
                const response = await fetch(apiConfig.n8nWebhookUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        type: 'question',
                        question: question,
                        user: currentUser
                    }),
                    timeout: apiConfig.timeout || 15000
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ Ответ получен через API');
                    return data;
                }
            } catch (error) {
                console.warn('⚠️ Ошибка API, используем fallback:', error);
            }
        }
        
        // Fallback ответ
        const fallbackCards = window.getFallbackCards();
        if (fallbackCards && fallbackCards.length > 0) {
            const randomIndex = Math.floor(Math.random() * fallbackCards.length);
            const card = fallbackCards[randomIndex];
            
            const fallbackInterpretations = [
                'Карты советуют вам довериться интуиции и следовать сердцу.',
                'Сейчас время для действий и новых начинаний.',
                'Будьте терпеливы, всё идёт своим чередом.',
                'Обратите внимание на знаки, которые посылает вам Вселенная.',
                'Это период трансформации и роста.'
            ];
            
            const interpretation = fallbackInterpretations[Math.floor(Math.random() * fallbackInterpretations.length)];
            
            console.log('🎯 Используем fallback ответ');
            return {
                card: card,
                interpretation: interpretation
            };
        }
        
        throw new Error('Нет доступных карт для ответа');
        
    } catch (error) {
        console.error('❌ Ошибка получения ответа:', error);
        throw error;
    }
}

// 💾 СОХРАНЕНИЕ В ИСТОРИЮ
function saveToHistory(type, question, card, interpretation) {
    try {
        const history = JSON.parse(localStorage.getItem('tarot_user_history') || '[]');
        
        const historyItem = {
            id: Date.now(),
            type: type,
            question: question,
            card: card,
            interpretation: interpretation,
            date: new Date().toISOString()
        };
        
        history.unshift(historyItem); // Добавляем в начало
        
        // Ограничиваем историю 50 записями
        if (history.length > 50) {
            history.splice(50);
        }
        
        localStorage.setItem('tarot_user_history', JSON.stringify(history));
        console.log('💾 Запись сохранена в историю');
        
    } catch (error) {
        console.error('❌ Ошибка сохранения в историю:', error);
    }
}

// 📚 ЗАГРУЗКА ИСТОРИИ
function loadUserHistory() {
    console.log('📚 Загрузка истории пользователя');
    
    const historyContainer = document.getElementById('history-container');
    if (!historyContainer) return;
    
    try {
        const history = JSON.parse(localStorage.getItem('tarot_user_history') || '[]');
        
        if (history.length === 0) {
            historyContainer.innerHTML = `
                <div class="text-center">
                    <p>📝 Ваша история пуста</p>
                    <p>Задайте вопрос или получите карту дня, чтобы начать!</p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="history-list">';
        
        history.forEach(item => {
            const date = new Date(item.date).toLocaleDateString('ru-RU');
            const time = new Date(item.date).toLocaleTimeString('ru-RU', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            html += `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-type">
                            ${item.type === 'daily_card' ? '🎴 Карта дня' : '❓ Вопрос'}
                        </span>
                        <span class="history-date">${date} ${time}</span>
                    </div>
            `;
            
            if (item.question) {
                html += `<div class="history-question">"${item.question}"</div>`;
            }
            
            html += `
                    <div class="history-content">
                        <strong>${item.card.name}</strong>
                        <p>${item.interpretation || item.card.description}</p>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        historyContainer.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки истории:', error);
        historyContainer.innerHTML = `
            <div class="text-center">
                <p>❌ Ошибка загрузки истории</p>
            </div>
        `;
    }
}

// 🗑️ ОЧИСТКА ИСТОРИИ
function clearHistory() {
    try {
        localStorage.removeItem('tarot_user_history');
        loadUserHistory();
        showMessage('История очищена', 'info');
    } catch (error) {
        console.error('❌ Ошибка очистки истории:', error);
        showErrorMessage('Не удалось очистить историю');
    }
}

// ✅ ПРОВЕРКА КАРТЫ ДНЯ
function checkTodayCard() {
    const today = new Date().toDateString();
    const lastCardDate = localStorage.getItem('tarot_last_card_date');
    
    if (lastCardDate !== today) {
        appState.dailyCardUsed = false;
        localStorage.setItem('tarot_last_card_date', today);
        saveAppState();
    }
    
    // Обновляем UI карты дня
    const cardEl = document.getElementById('daily-card');
    const resultEl = document.getElementById('daily-result');
    
    if (appState.dailyCardUsed) {
        if (cardEl) cardEl.style.display = 'none';
        // Показываем последний результат если есть
        loadTodayCardResult();
    } else {
        if (cardEl) cardEl.style.display = 'block';
        if (resultEl) resultEl.style.display = 'none';
    }
}

// 📅 ЗАГРУЗКА РЕЗУЛЬТАТА КАРТЫ ДНЯ
function loadTodayCardResult() {
    try {
        const history = JSON.parse(localStorage.getItem('tarot_user_history') || '[]');
        const today = new Date().toDateString();
        
        const todayCard = history.find(item => 
            item.type === 'daily_card' && 
            new Date(item.date).toDateString() === today
        );
        
        if (todayCard) {
            showDailyCardResult(todayCard.card);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки карты дня:', error);
    }
}

// 🔔 ПРОВЕРКА И ПОКАЗ ПРИВЕТСТВИЯ
function checkAndShowWelcome() {
    const hasSeenWelcome = localStorage.getItem('tarot_seen_welcome');
    if (!hasSeenWelcome) {
        showMessage('Добро пожаловать в мир мистических предсказаний! 🔮', 'info');
        localStorage.setItem('tarot_seen_welcome', 'true');
    }
}

// 👑 ОБРАБОТКА ПОКУПКИ PREMIUM
function handleBuyPremium() {
    const apiConfig = window.getAPIConfig();
    if (apiConfig && apiConfig.paymentUrl && apiConfig.paymentUrl !== 'https://www.wildberries.ru/catalog/199937445/detail.aspx') {
        window.open(apiConfig.paymentUrl, '_blank');
    } else {
        showMessage('Оформление Premium подписки временно недоступно', 'premium');
    }
}

// 🎴 ВЫБОР РАСКЛАДА
function selectSpread(spreadType) {
    const spreadsConfig = window.getSpreadsConfig();
    const spread = spreadsConfig[spreadType];
    
    if (!spread) {
        showMessage('Расклад не найден', 'error');
        return;
    }
    
    if (spread.isPremium && !appState.isPremium) {
        showMessage('Этот расклад доступен только в Premium версии', 'premium');
        return;
    }
    
    showMessage(`Расклад "${spread.name}" будет доступен в следующем обновлении`, 'info');
}

// 💬 СИСТЕМА СООБЩЕНИЙ
function showMessage(text, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = text;
    
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
    
    setTimeout(() => messageEl.style.opacity = '1', 50);
    
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
    handleBuyPremium,
    selectSpread,
    showMessage,
    showErrorMessage,
    debugApp,
    saveAppState,
    loadUserHistory,
    clearHistory,
    checkTodayCard,
    getDailyCard,
    getAnswerToQuestion
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
    
    setTimeout(() => {
        initApp();
    }, 100);
});

console.log('✅ Script.js загружен полностью');

// script.js - Основная логика Tarot Web App (ИСПРАВЛЕННАЯ ВЕРСИЯ)

// Глобальные переменные
let supabase;
let tg;
let currentUser = null;
let questionsLeft = 3;
let dailyCardDrawn = false;
let isPremium = false;
let history = []; // Массив для хранения истории раскладов
let currentQuestionId = null; // ID текущего вопроса для Supabase
let selectedRating = 0; // Выбранный рейтинг для отзывов
let hasLaunched = false; // Флаг для первого запуска приложения
let userName = ''; // Имя пользователя
let userBirthdate = ''; // Дата рождения пользователя
let localReviews = []; // Локальные отзывы для тестирования
let testPremiumMode = false; // Флаг тестового премиум режима
let currentSpread = null; // Объект для хранения данных текущего активного расклада

// Инициализация приложения
async function initApp() {
    console.log('🔮 Инициализация Tarot Web App');
    
    try {
        // Инициализация Supabase клиента
        if (typeof window.supabase !== 'undefined' && typeof SUPABASE_CONFIG !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase инициализирован');
        } else {
             console.warn('Supabase клиент или SUPABASE_CONFIG не найден. Приложение будет работать в оффлайн-режиме.');
             initOfflineMode(); // Переходим в оффлайн режим, если Supabase недоступен
             initEventListeners(); // Инициализируем UI даже в оффлайн режиме
             switchTab('daily'); // Устанавливаем начальный таб
             return; // Прерываем дальнейшее выполнение, чтобы избежать ошибок
        }
        
        // Инициализация Telegram Web App
        initTelegramWebApp();
        
        // Загрузка данных текущего пользователя из Supabase
        await loadCurrentUser();
        
        // Инициализация обработчиков событий UI
        initEventListeners();
        
        // Установка начальной активной вкладки
        switchTab('daily');
        
        // Проверка на первый запуск для показа модального окна приветствия/профиля
        checkFirstLaunch();
        
        // Добавляем тестовую кнопку премиум режима (для разработки)
        addTestPremiumButton();
        
        console.log('✅ Приложение готово к работе');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        // Fallback для полного оффлайн тестирования при фатальных ошибках
        initOfflineMode();
        initEventListeners();
        switchTab('daily');
    }
}

// Инициализация Telegram Web App
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready(); // Сообщает Telegram о готовности Web App
        tg.expand(); // Разворачивает Web App на весь экран
        
        const user = tg.initDataUnsafe?.user; // Получаем данные пользователя Telegram
        if (user) {
            console.log('👤 Telegram пользователь:', user);
            currentUser = {
                telegram_id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name
            };
        }
        
        // Настройка главной кнопки Telegram Web App для покупки Premium
        tg.MainButton.setText('💳 Купить Premium за 299₽');
        tg.MainButton.onClick(() => {
            if (typeof API_CONFIG !== 'undefined' && API_CONFIG && API_CONFIG.paymentUrl) {
                tg.openLink(API_CONFIG.paymentUrl); // Открываем ссылку на оплату
            } else {
                showNotification('Ссылка для оплаты не настроена.');
            }
        });
        
        // Установка цветов заголовка и фона Web App
        tg.setHeaderColor('#1a1a2e');
        tg.setBackgroundColor('#1a1a2e');
        
    } else {
        console.log('🔧 Режим разработки (без Telegram)');
        // Заглушка данных пользователя для разработки
        currentUser = {
            telegram_id: Math.floor(Math.random() * 1000000) + 12345,
            username: 'test_user',
            first_name: 'Test User'
        };
    }
}

// Оффлайн режим для тестирования при отсутствии Supabase/Telegram
function initOfflineMode() {
    console.log('🔧 Запуск в оффлайн режиме');
    // Генерация тестового пользователя, если не удалось получить реального
    if (!currentUser) {
        currentUser = {
            telegram_id: Math.floor(Math.random() * 1000000) + 12345,
            username: 'offline_user',
            first_name: 'Offline User'
        };
    }
    updateSubscriptionStatus(false); // Устанавливаем бесплатную версию
    questionsLeft = APP_CONFIG.freeQuestionsLimit || 3; // Устанавливаем лимит вопросов
}

// Загрузка текущего пользователя из Supabase
async function loadCurrentUser() {
    if (!currentUser || !supabase) return; // Пропускаем, если Supabase или currentUser не инициализирован
    
    try {
        const { data: existingUser, error } = await supabase
            .from(TABLES.userProfiles)
            .select('*')
            .eq('telegram_id', currentUser.telegram_id)
            .single(); // Ожидаем одну запись
        
        // Обработка ошибки "PGRST116" - нет записей, это не фатальная ошибка
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        if (existingUser) {
            currentUser = { ...currentUser, ...existingUser }; // Обновляем текущего пользователя данными из БД
            questionsLeft = existingUser.free_questions_left || 0;
            // Проверяем, активна ли премиум подписка и не истек ли её срок
            isPremium = existingUser.is_premium && new Date(existingUser.premium_expires_at) > new Date();
            
            const today = new Date().toISOString().split('T')[0];
            dailyCardDrawn = existingUser.daily_card_drawn_date === today; // Проверяем, была ли карта дня вытянута сегодня
            
        } else {
            await createNewUser(); // Создаем нового пользователя, если не найден
        }
        
        updateSubscriptionStatus(isPremium); // Обновляем UI статус подписки
        updateQuestionsDisplay(); // Обновляем UI количество вопросов
        
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователя:', error);
    }
}

// Создание нового пользователя в Supabase
async function createNewUser() {
    if (!API_CONFIG || !API_CONFIG.createUser || !currentUser) return;
    
    try {
        const response = await fetch(API_CONFIG.createUser, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                telegram_id: currentUser.telegram_id,
                username: currentUser.username,
                first_name: currentUser.first_name,
                is_premium: false,
                free_questions_left: APP_CONFIG.freeQuestionsLimit || 3,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        currentUser = { ...currentUser, ...data };
        questionsLeft = APP_CONFIG.freeQuestionsLimit || 3;
        isPremium = false;
        
        console.log('✅ Новый пользователь создан через n8n');
        
    } catch (error) {
        console.error('❌ Ошибка создания пользователя через n8n:', error);
    }
}

// Обновление отображения статуса подписки в UI
function updateSubscriptionStatus(hasPremium) {
    const statusEl = document.getElementById('subscription-status');
    if (!statusEl) return;
    
    isPremium = hasPremium; // Обновляем глобальный флаг Premium
    
    if (hasPremium || testPremiumMode) { // Учитываем тестовый режим
        statusEl.innerHTML = `
            <span class="status-icon">👑</span>
            <span class="status-text">Премиум активен</span>
        `;
        statusEl.classList.add('premium');
        questionsLeft = 999; // Устанавливаем практически бесконечное количество вопросов для Premium
        
        if (tg && tg.MainButton) {
            tg.MainButton.hide(); // Скрываем главную кнопку Telegram для Premium пользователей
        }
    } else {
        statusEl.innerHTML = `
            <span class="status-icon">🆓</span>
            <span class="status-text">Бесплатная версия</span>
        `;
        statusEl.classList.remove('premium');
        
        if (tg && tg.MainButton) {
            tg.MainButton.show(); // Показываем главную кнопку Telegram для бесплатных пользователей
        }
    }
}

// Обновление отображения количества вопросов в UI
function updateQuestionsDisplay() {
    const questionsCountEl = document.getElementById('questions-count');
    if (questionsCountEl) {
        questionsCountEl.textContent = isPremium || testPremiumMode ? '∞' : questionsLeft; // Учитываем тестовый режим
    }
}

// Инициализация всех обработчиков событий UI
function initEventListeners() {
    console.log('🎯 Инициализация обработчиков событий');

    // Обработчики для основных вкладок меню
    document.querySelectorAll('.nav-tabs .nav-tab').forEach(tab => {
        tab.removeEventListener('click', handleMainTabClick); // Удаляем старые, чтобы избежать дублирования
        tab.addEventListener('click', handleMainTabClick); // Добавляем новый
    });

    // Обработчики для вторичных вкладок меню
    document.querySelectorAll('.nav-tabs-secondary .nav-tab').forEach(tab => {
        tab.removeEventListener('click', handleSecondaryTabClick); // Удаляем старые
        tab.addEventListener('click', handleSecondaryTabClick); // Добавляем новый
    });
    
    // Инициализация других, не связанных с навигацией, обработчиков
    initOtherEventListeners();
    
    console.log('✅ Обработчики событий настроены');
}

// Обработчик клика по основным вкладкам навигации
function handleMainTabClick(e) {
    e.preventDefault(); // Предотвращаем стандартное поведение ссылки
    e.stopPropagation(); // Останавливаем всплытие события
    
    const tabName = this.getAttribute('data-tab'); // Получаем имя вкладки из data-атрибута
    console.log('🔄 Клик по основному табу:', tabName);
    
    if (tabName) {
        switchTab(tabName); // Переключаем вкладку
    } else {
        console.error('❌ Не найден data-tab атрибут у элемента:', this);
    }
}

// Обработчик клика по вторичным вкладкам навигации
function handleSecondaryTabClick(e) {
    e.preventDefault(); // Предотвращаем стандартное поведение ссылки
    e.stopPropagation(); // Останавливаем всплытие события
    
    const tabName = this.getAttribute('data-tab'); // Получаем имя вкладки из data-атрибута
    console.log('🔄 Клик по вторичному табу:', tabName);
    
    if (tabName) {
        switchTab(tabName); // Переключаем вкладку
    } else {
        console.error('❌ Не найден data-tab атрибут у элемента:', this);
    }
}

// Функция переключения активной вкладки и её содержимого
function switchTab(tab) {
    console.log('🔄 Переключение на таб:', tab);
    
    // Проверяем, что целевой контейнер содержимого вкладки существует
    const targetContent = document.getElementById(tab + '-tab');
    if (!targetContent) {
        console.error('❌ Контент не найден для таба:', tab);
        return;
    }
    
    // Скрываем все контейнеры содержимого вкладок
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Убираем класс 'active' со всех кнопок вкладок (основных и вторичных)
    const allTabs = document.querySelectorAll('.nav-tab');
    allTabs.forEach(navTab => {
        navTab.classList.remove('active');
    });
    
    // Показываем целевой контейнер содержимого вкладки
    targetContent.classList.add('active');
    console.log('✅ Контент показан для:', tab);
    
    // Активируем соответствующую кнопку вкладки
    const targetTab = document.querySelector(`[data-tab="${tab}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
        console.log('✅ Таб активирован:', tab);
    } else {
        console.error('❌ Таб не найден с data-tab:', tab);
    }
    
    // Выполняем специфическую логику для каждой вкладки
    handleTabSpecificLogic(tab);
}

// Специфическая логика, выполняемая при переключении на определенную вкладку
function handleTabSpecificLogic(tab) {
    switch(tab) {
        case 'history':
            loadHistory(); // Загрузка и отображение истории
            break;
        case 'reviews':
            loadReviews(); // Загрузка и отображение отзывов
            break;
        case 'premium':
            console.log('👑 Пользователь посетил Premium страницу');
            break;
        case 'spreads':
            // При переключении на вкладку "Расклады" всегда показываем список раскладов
            // и скрываем детальный вид, если он был открыт.
            const spreadsGrid = document.querySelector('.spreads-grid');
            const spreadDetail = document.getElementById('spread-detail');

            if (spreadsGrid) spreadsGrid.style.display = 'grid'; // Показываем сетку выбора раскладов
            if (spreadDetail) spreadDetail.style.display = 'none'; // Скрываем детальный вид расклада

            currentSpread = null; // Сбрасываем данные текущего расклада
            console.log('✅ Переключено на выбор раскладов.');
            break;
        case 'daily':
            console.log('🌅 Переключено на карту дня');
            break;
        case 'question':
            console.log('❓ Переключено на вопросы');
            // При переключении на вопросы, скрываем секции уточняющего вопроса и его ответа
            const followUpSection = document.getElementById('follow-up-section');
            const followupAnswerSection = document.getElementById('followup-answer-section');
            const subscriptionBanner = document.getElementById('subscription-banner-question');
            const questionInput = document.getElementById('question-input');

            if (followUpSection) followUpSection.style.display = 'none';
            if (followupAnswerSection) followupAnswerSection.style.display = 'none';
            if (subscriptionBanner) subscriptionBanner.style.display = 'none';
            if (questionInput) questionInput.value = ''; // Очищаем поле вопроса
            
            // Также очищаем предыдущие предсказания, если они были
            const firstAiContainer = document.getElementById('first-ai-container');
            const answerCard = document.getElementById('answer-card');
            if (firstAiContainer) firstAiContainer.innerHTML = '';
            resetCardToDefault(answerCard);

            break;
        default:
            console.log('📋 Переключено на таб:', tab);
    }
}

// Инициализация других, не связанных с навигацией, обработчиков событий
function initOtherEventListeners() {
    // Обработчик для карты дня
    const dailyCard = document.getElementById('daily-card');
    if (dailyCard) {
        dailyCard.addEventListener('click', drawDailyCard);
    }
    
    // Обработчик для кнопки "Получить ответ"
    const askBtn = document.getElementById('ask-btn');
    if (askBtn) {
        askBtn.addEventListener('click', askQuestion);
    }
    
    // Обработчик для кнопки "Уточнить"
    const followUpBtn = document.getElementById('follow-up-btn');
    if (followUpBtn) {
        followUpBtn.addEventListener('click', askFollowUpQuestion);
    }
    
    // Обработчик для кнопки отправки отзыва
    const submitReviewBtn = document.getElementById('submit-review-btn');
    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', submitReview);
    }
    
    // Обработчик для кнопки очистки истории
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }
    
    // Обработчики нажатия Enter для полей ввода вопросов
    const questionInput = document.getElementById('question-input');
    if (questionInput) {
        questionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                askQuestion();
            }
        });
    }
    
    const followUpInput = document.getElementById('follow-up-input');
    if (followUpInput) {
        followUpInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                askFollowUpQuestion();
            }
        });
    }
    
    // Обработчики для рейтинга отзывов (звездочки)
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            updateStarsDisplay();
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
    });
    
    const starsContainer = document.getElementById('rating-stars');
    if (starsContainer) {
        starsContainer.addEventListener('mouseleave', function() {
            updateStarsDisplay();
        });
    }
    
    // Обработчики для карточек выбора раскладов
    document.querySelectorAll('.spread-card').forEach(card => {
        card.addEventListener('click', function() {
            const spreadType = this.getAttribute('data-spread');
            if (spreadType) {
                openSpread(spreadType);
            }
        });
    });
    
    // Обработчики для элементов истории (открытие деталей)
    document.addEventListener('click', function(e) {
        const historyItem = e.target.closest('.history-item');
        if (historyItem) {
            const itemId = historyItem.getAttribute('data-id');
            if (itemId) {
                viewHistoryDetail(itemId);
            }
        }
        // Обработчики для кнопок внутри баннеров
        const bannerButton = e.target.closest('.banner-buttons .btn');
        if (bannerButton && bannerButton.hasAttribute('data-tab')) {
            const tabName = bannerButton.getAttribute('data-tab');
            switchTab(tabName);
        }
    });
    
    // Обработчик для кнопки "Назад" в раскладах
    const backBtn = document.querySelector('.spread-detail .back-btn'); // Более специфичный селектор
    if (backBtn) {
        backBtn.removeEventListener('click', closeSpread); // Удаляем старые
        backBtn.addEventListener('click', closeSpread); // Добавляем новый
    }
}

// Сброс карты к дефолтному состоянию (для вопросов)
function resetCardToDefault(cardElement) {
    if (!cardElement) return;
    
    cardElement.classList.remove('flipped'); // Удаляем анимацию переворота
    cardElement.innerHTML = `
        <div class="card-back">
            <div class="card-symbol">🔮</div>
            <div class="card-text">Ваш ответ</div>
        </div>
    `;
    // Очищаем от старых блесток
    const sparkles = cardElement.querySelectorAll('.sparkle');
    sparkles.forEach(sparkle => sparkle.remove());
}

// Карта дня
async function drawDailyCard() {
    if (dailyCardDrawn) {
        showNotification('Карта дня уже была вытянута сегодня!');
        return;
    }
    
    const card = document.getElementById('daily-card');
    const loading = document.getElementById('daily-loading');
    
    if (!card || !loading) return;
    
    loading.style.display = 'block';
    card.style.pointerEvents = 'none'; // Запрещаем повторный клик
    
    addSparkles(card); // Добавляем блестки
    
    try {
        setTimeout(async () => {
            const randomCard = getRandomCard(); // Получаем случайную карту
            
            // Отображаем карту в UI
            card.innerHTML = `
                <div class="card-name">${randomCard.name}</div>
                <img src="${randomCard.image}" alt="${randomCard.name}" class="card-image" onerror="this.style.display='none'">
                <div class="card-symbol">${randomCard.symbol}</div>
                <div class="card-meaning">${randomCard.meaning}</div>
            `;
            
            card.classList.add('flipped'); // Анимация переворота карты
            loading.style.display = 'none';
            dailyCardDrawn = true; // Устанавливаем флаг, что карта дня вытянута
            
            await saveDailyCardToSupabase(randomCard); // Сохраняем карту дня в Supabase
            
            setTimeout(async () => {
                const aiPrediction = await generateAIPredictionToContainer('daily-ai-container', 'daily', randomCard, ''); // Генерируем AI-предсказание
                
                // Обновляем последнюю запись в истории (если это была карта дня) с ИИ-предсказанием
                if (history.length > 0 && history[0].type === 'daily') {
                    history[0].aiPrediction = aiPrediction;
                }
                
                // Показываем информационный баннер карты дня
                setTimeout(() => {
                    const banner = document.getElementById('daily-info-banner');
                    if (banner) {
                        banner.style.display = 'block';
                    }
                }, 2000);
            }, 1000);
            
            // Добавляем карту дня в локальную историю
            addToLocalHistory('daily', 'Карта дня', '', [randomCard]); 
        }, 2000); // Задержка для имитации "мышления" карт
        
    } catch (error) {
        console.error('❌ Ошибка при вытягивании карты дня:', error);
        loading.style.display = 'none';
        card.style.pointerEvents = 'auto'; // Снова разрешаем клик
        showNotification('Произошла ошибка при вытягивании карты дня. Попробуйте еще раз.');
    }
}

// Задать основной вопрос
function askQuestion() {
    console.log('🎯 Нажата кнопка "Задать вопрос"');
    
    const questionInput = document.getElementById('question-input');
    if (!questionInput) {
        console.error('❌ Поле ввода вопроса не найдено');
        return;
    }
    
    const question = questionInput.value.trim();
    console.log('📝 Текст вопроса:', question);
    
    if (!question) {
        showNotification('Пожалуйста, задайте вопрос');
        return;
    }
    
    // Проверка лимита бесплатных вопросов и статуса Premium
    if (questionsLeft <= 0 && !isPremium && !testPremiumMode) {
        console.log('❌ Вопросы закончились');
        checkAndShowSubscriptionBanner(); // Показываем баннер подписки
        return;
    }
    
    console.log('✅ Запуск предсказания для вопроса:', question);
    performPrediction(question, false); // false = не уточняющий вопрос
}

// Задать уточняющий вопрос
function askFollowUpQuestion() {
    const followUpInput = document.getElementById('follow-up-input');
    if (!followUpInput) return;
    
    const question = followUpInput.value.trim();
    if (!question) {
        showNotification('Пожалуйста, задайте уточняющий вопрос');
        return;
    }
    
    // Проверка лимита бесплатных вопросов и статуса Premium
    if (questionsLeft <= 0 && !isPremium && !testPremiumMode) {
        checkAndShowSubscriptionBanner();
        return;
    }
    
    performPrediction(question, true); // true = уточняющий вопрос
}

// Выполнение предсказания для вопросов (основных и уточняющих)
async function performPrediction(question, isFollowUp) {
    console.log('🔮 Начало предсказания для:', question, 'isFollowUp:', isFollowUp);
    
    const answerSection = isFollowUp ? 
        document.getElementById('followup-answer-section') : 
        document.getElementById('first-answer-section');
    const answerCard = isFollowUp ? 
        document.getElementById('followup-answer-card') : 
        document.getElementById('answer-card');
    const loading = isFollowUp ? 
        document.getElementById('followup-loading') : 
        document.getElementById('question-loading');
    const askBtn = document.getElementById('ask-btn');
    const followUpBtn = document.getElementById('follow-up-btn');
    
    if (!answerSection || !answerCard || !loading) {
        console.error('❌ Элементы интерфейса для ответа не найдены');
        return;
    }
    
    try {
        // Сброс состояния карты к дефолтному виду
        resetCardToDefault(answerCard);
        
        // Очистка предыдущих ИИ-предсказаний в соответствующих контейнерах
        if (!isFollowUp) {
            const firstAiContainer = document.getElementById('first-ai-container');
            if (firstAiContainer) {
                firstAiContainer.innerHTML = '';
            }
        } else {
            const followupAiContainer = document.getElementById('followup-ai-container');
            if (followupAiContainer) {
                followupAiContainer.innerHTML = '';
            }
        }
        
        answerSection.style.display = 'block'; // Показываем секцию ответа
        loading.style.display = 'block'; // Показываем индикатор загрузки
        if (askBtn) askBtn.disabled = true; // Отключаем кнопки
        if (followUpBtn) followUpBtn.disabled = true;
        
        // Скрываем секции уточнения и баннер подписки при новом основном вопросе
        if (!isFollowUp) {
            const followUpSection = document.getElementById('follow-up-section');
            const followupAnswerSection = document.getElementById('followup-answer-section');
            const subscriptionBanner = document.getElementById('subscription-banner-question');
            
            if (followUpSection) followUpSection.style.display = 'none';
            if (followupAnswerSection) followupAnswerSection.style.display = 'none';
            if (subscriptionBanner) subscriptionBanner.style.display = 'none';
            
            // Также очищаем контейнер уточняющего ответа при новом основном вопросе
            const followupAiContainer = document.getElementById('followup-ai-container');
            if (followupAiContainer) {
                followupAiContainer.innerHTML = '';
            }
        }
        
        addSparkles(answerCard); // Добавляем блестки к карте
        
        const questionRecord = await saveQuestionToSupabase(question, isFollowUp); // Сохраняем вопрос в БД
        currentQuestionId = questionRecord?.id; // Сохраняем ID вопроса
        
        setTimeout(async () => {
            const randomCard = getRandomCard(); // Получаем случайную карту
            
            // Отображаем карту в UI
            answerCard.innerHTML = `
                <div class="card-name">${randomCard.name}</div>
                <img src="${randomCard.image}" alt="${randomCard.name}" class="card-image" onerror="this.style.display='none'">
                <div class="card-symbol">${randomCard.symbol}</div>
                <div class="card-meaning">${randomCard.meaning}</div>
            `;
            
            answerCard.classList.add('flipped'); // Анимация переворота карты
            loading.style.display = 'none'; // Скрываем загрузку
            if (askBtn) askBtn.disabled = false; // Включаем кнопки
            if (followUpBtn) followUpBtn.disabled = false;
            
            setTimeout(async () => {
                const aiContainerId = isFollowUp ? 'followup-ai-container' : 'first-ai-container';
                const aiPrediction = await generateAIPredictionToContainer(aiContainerId, 'question', randomCard, question); // Генерируем AI-предсказание
                
                if (currentQuestionId) {
                    await saveAnswerToSupabase(currentQuestionId, randomCard, aiPrediction); // Сохраняем ответ в БД
                }
                
                // Обновляем последнюю запись в истории с ИИ-предсказанием
                // (актуально, если история уже была загружена и обновляется в реальном времени)
                if (history.length > 0 && (history[0].id === currentQuestionId || (!history[0].id && !isFollowUp))) {
                    history[0].aiPrediction = aiPrediction;
                }
                
                // Показываем секцию уточняющего вопроса после первого ответа
                if (!isFollowUp) {
                    setTimeout(() => {
                        const followUpSection = document.getElementById('follow-up-section');
                        if (followUpSection) {
                            followUpSection.style.display = 'block';
                        }
                    }, 1500);
                }
                
                // Проверяем и показываем баннер подписки, если вопросы закончились
                setTimeout(() => {
                    checkAndShowSubscriptionBanner();
                }, 2000);
                
            }, 1000); // Задержка для появления AI-предсказания
            
            // Уменьшаем счетчик бесплатных вопросов, если пользователь не Premium
            if (!isPremium && !testPremiumMode) {
                questionsLeft--;
                await updateUserQuestionsInSupabase(); // Обновляем в БД
                updateQuestionsDisplay(); // Обновляем UI
            }
            
            // Очищаем поле ввода
            if (isFollowUp) {
                document.getElementById('follow-up-input').value = '';
            } else {
                document.getElementById('question-input').value = '';
            }
            
            // Добавляем запись в локальную историю
            addToLocalHistory('question', isFollowUp ? 'Уточняющий вопрос' : 'Вопрос', question, [randomCard], aiPrediction);
            
        }, 2500); // Общая задержка для анимации карты
        
    } catch (error) {
        console.error('❌ Ошибка в performPrediction:', error);
        if (loading) loading.style.display = 'none';
        if (askBtn) askBtn.disabled = false;
        if (followUpBtn) followUpBtn.disabled = false;
        showNotification('Произошла ошибка. Попробуйте еще раз.');
    }
}

// Получение случайной карты из колоды
function getRandomCard() {
    if (typeof TAROT_CARDS === 'undefined' || TAROT_CARDS.length === 0) {
        console.error('❌ TAROT_CARDS не определены или пусты!');
        return { name: "Ошибка", symbol: "!", meaning: "Карты не загружены. Проверьте TAROT_CARDS в config.js" };
    }
    return TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
}

// Генерация AI-предсказания и отображение в контейнере
async function generateAIPredictionToContainer(containerId, type, card, question = '') {
    const container = document.getElementById(containerId);
    if (!container) return '';
    
    const aiBlock = document.createElement('div');
    aiBlock.className = 'ai-prediction';
    aiBlock.innerHTML = `
        <div class="ai-header">
            <div class="ai-icon">🤖</div>
            <div class="ai-title">ИИ-толкование</div>
        </div>
        <div class="ai-content">
            <div class="generating-text">Генерирую персональное предсказание...</div>
        </div>
    `;
    
    container.appendChild(aiBlock);
    
    try {
        let prediction = '';
        
        // ИСПРАВЛЕНО: Используем POST запрос с правильными данными
        if (typeof API_CONFIG !== 'undefined' && API_CONFIG.generatePrediction) {
            
            const requestData = {
                type: type,
                card: {
                    name: card.name,
                    symbol: card.symbol,
                    meaning: card.meaning,
                    image: card.image || ''
                },
                question: question || '',
                userName: userName || 'Гость',
                userBirthdate: userBirthdate || '',
                timestamp: new Date().toISOString(),
                requestId: Date.now()
            };

            console.log('📤 Отправляю данные в n8n:', requestData);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.requestTimeout || 30000);

            const response = await fetch(API_CONFIG.generatePrediction, {
                method: 'POST', // ИСПРАВЛЕНО: POST вместо GET
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(requestData),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const responseText = await response.text();
            console.log('📥 Ответ от n8n (raw):', responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.warn('⚠️ Ответ не JSON, используем как текст:', responseText);
                result = { prediction: responseText };
            }

            prediction = result.prediction || result.response || result.message || responseText || "Карты молчат сегодня...";
            console.log('✅ Получено предсказание от ИИ:', prediction);

        } else {
            console.warn('⚠️ API_CONFIG не настроен, используем локальную генерацию');
            prediction = generatePredictionText(type, card, question);
        }
       
        // Задержка перед началом печати текста
        setTimeout(() => {
            const aiContent = aiBlock.querySelector('.ai-content');
            if (aiContent) {
                typeWriter(aiContent, prediction, 30);
            }
        }, 2000); 
        
        return prediction;

    } catch (error) {
        console.error('❌ Ошибка ИИ-предсказания (возможно, API недоступно или ошибка сети):', error);
        
        // Детальная обработка различных типов ошибок
        let errorMessage = 'Произошла ошибка при обращении к ИИ';
        
        if (error.name === 'AbortError') {
            errorMessage = 'Превышено время ожидания ответа от ИИ';
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Не удается подключиться к серверу ИИ';
        } else if (error.message.includes('404')) {
            errorMessage = 'Эндпоинт ИИ не найден';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'Проблема с CORS настройками';
        }
        
        console.warn('🔄 Используем локальную генерацию из-за ошибки:', errorMessage);
        
        // Фоллбэк на локальную генерацию текста при ошибке API
        const prediction = generatePredictionText(type, card, question);
        setTimeout(() => {
            const aiContent = aiBlock.querySelector('.ai-content');
            if (aiContent) {
                typeWriter(aiContent, prediction, 50);
            }
        }, 2000); 
        return prediction;
    }
}

// Локальная генерация предсказания (фоллбэк, если AI API недоступно)
function generatePredictionText(type, card, question) {
    const predictions = {
        daily: [
            `Сегодня карта "${card.name}" говорит о том, что вас ждет особенный день. ${card.meaning.toLowerCase()} Звезды советуют обратить внимание на новые возможности, которые появятся во второй половине дня.`,
            `Энергия карты "${card.name}" окружает вас сегодня мощной аурой. ${card.meaning.toLowerCase()} Этот день принесет важные озарения в личной сфере.`,
            `"${card.name}" раскрывает перед вами завесу будущего на сегодня. ${card.meaning.toLowerCase()} Планеты благоволят к решительным действиям в первой половине дня.`
        ],
        question: [
            `Отвечая на ваш вопрос "${question}", карта "${card.name}" открывает глубокую истину. ${card.meaning.toLowerCase()} Вселенная показывает, что ключ к решению находится в ваших руках.`,
            `Ваш вопрос "${question}" резонирует с энергией карты "${card.name}". ${card.meaning.toLowerCase()} Духовные наставники советуют проявить терпение - ответ придет в течение 3-7 дней.`,
            `Карта "${card.name}" дает четкий ответ на "${question}": ${card.meaning.toLowerCase()} Время действовать настанет в период растущей луны.`
        ]
    };
    
    const typeArray = predictions[type] || predictions.daily;
    return typeArray[Math.floor(Math.random() * typeArray.length)];
}

// Проверка и показ баннера подписки
function checkAndShowSubscriptionBanner() {
    // Показываем баннер только если не Premium и вопросы закончились
    if (!isPremium && !testPremiumMode && questionsLeft <= 0) {
        const banner = document.getElementById('subscription-banner-question');
        if (banner) {
            banner.style.display = 'block';
            setTimeout(() => {
                banner.scrollIntoView({ behavior: 'smooth', block: 'center' }); // Плавно прокручиваем к баннеру
            }, 300);
        }
    }
}

// Проверка первого запуска приложения для показа модалки профиля
function checkFirstLaunch() {
    if (!hasLaunched) {
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) {
            profileModal.style.display = 'flex'; // Показываем модалку профиля
            
            // Привязка обработчиков к кнопкам формы профиля
            const profileForm = document.getElementById('profile-form');
            if (profileForm) {
                profileForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    saveWelcomeData();
                });
            }
            const skipBtn = document.getElementById('skip-profile-btn');
            if (skipBtn) {
                skipBtn.addEventListener('click', skipWelcome);
            }
        }
    }
}

// Сохранение данных профиля из модального окна
function saveWelcomeData() {
    const nameInput = document.getElementById('display-name');
    const birthdateInput = document.getElementById('birth-date');
    
    const inputName = nameInput ? nameInput.value.trim() : '';
    const inputBirthdate = birthdateInput ? birthdateInput.value : '';
    
    if (inputName) {
        userName = inputName;
        if (currentUser) {
            currentUser.display_name = inputName;
            // Здесь можно добавить логику сохранения display_name в Supabase
            // if (supabase) await supabase.from(TABLES.userProfiles).update({ display_name: inputName }).eq('telegram_id', currentUser.telegram_id);
        }
    }
    
    if (inputBirthdate) {
        userBirthdate = inputBirthdate;
        if (currentUser) {
            currentUser.birthdate = inputBirthdate;
            // Здесь можно добавить логику сохранения birthdate в Supabase
            // if (supabase) await supabase.from(TABLES.userProfiles).update({ birthdate: inputBirthdate }).eq('telegram_id', currentUser.telegram_id);
        }
    }
    
    hasLaunched = true; // Отмечаем, что приложение было запущено
    closeWelcomeModal(); // Скрываем модальное окно
    
    if (inputName) {
        showNotification(`Добро пожаловать, ${inputName}! Карты готовы ответить на ваши вопросы ✨`);
    } else {
        showNotification('Добро пожаловать! Карты готовы ответить на ваши вопросы ✨');
    }
}

// Пропустить ввод данных профиля
function skipWelcome() {
    hasLaunched = true; // Отмечаем, что приложение было запущено
    closeWelcomeModal(); // Скрываем модальное окно
    showNotification('Добро пожаловать! Карты готовы ответить на ваши вопросы ✨');
}

// Закрытие модального окна профиля (или приветствия)
function closeWelcomeModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        // Если используется CSS-анимация скрытия с классом 'hide'
        modal.classList.add('hide'); 
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('hide');
        }, 300); // Должно соответствовать transition в CSS
    }
}

// Вспомогательная функция для показа уведомлений (через Telegram или alert)
function showNotification(message) {
    if (tg && tg.showAlert) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

// Вспомогательная функция для эффекта печатания текста
function typeWriter(element, text, speed = 50) {
    if (!element) return;
    element.innerHTML = '';
    let i = 0;
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Вспомогательная функция для добавления блесток
function addSparkles(element) {
    if (!element) return;
    // Очищаем от старых блесток перед добавлением новых
    const existingSparkles = element.querySelectorAll('.sparkle');
    existingSparkles.forEach(s => s.remove());

    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.textContent = '✨';
            // Позиционируем блестки относительно элемента
            const rect = element.getBoundingClientRect();
            sparkle.style.left = `${Math.random() * rect.width}px`;
            sparkle.style.top = `${Math.random() * rect.height}px`;
            sparkle.style.position = 'absolute'; // Элемент, к которому добавляются блестки, должен иметь position: relative
            element.appendChild(sparkle);
            
            setTimeout(() => {
                sparkle.remove();
            }, 2000); // Блестка исчезает через 2 секунды
        }, i * 200); // Появление блесток с задержкой
    }
}

// Добавление записи в локальную историю
// cards: для daily/question это массив объектов карт ({name, symbol, meaning, image}),
// для spreads это массив объектов {card: {}, positionName: "", interpretation: ""}
function addToLocalHistory(type, title, question, cards, aiPrediction = '') {
    const now = new Date();
    const historyItem = {
        id: Date.now(),
        date: now.toLocaleDateString('ru-RU'),
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.getTime(),
        type: type,
        title: title,
        question: question,
        cards: cards, // Массив карт или объектов карт с позициями/интерпретациями
        aiPrediction: aiPrediction // Только для daily/question
    };
    
    history.unshift(historyItem); // Добавляем новый элемент в начало истории
    
    // Очищаем историю, оставляя записи только за последний месяц
    const oneMonthAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
    history = history.filter(item => item.timestamp > oneMonthAgo);
    
    // Ограничиваем количество записей в истории
    if (history.length > 100) {
        history = history.slice(0, 100);
    }
    
    console.log('📝 Добавлен в историю:', historyItem);
}

// Загрузка и отображение истории раскладов
async function loadHistory() {
    renderHistory();
}

// Рендеринг (отображение) истории раскладов в UI
function renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">🔮</div>
                <p>История раскладов за последний месяц пуста.<br>Начните с карты дня или задайте вопрос!</p>
            </div>
        `;
        return;
    }
    
    // Группировка истории по датам
    const groupedHistory = {};
    history.forEach(item => {
        if (!groupedHistory[item.date]) {
            groupedHistory[item.date] = [];
        }
        groupedHistory[item.date].push(item);
    });
    
    let historyHTML = '';
    // Проходим по каждой группе дат
    Object.keys(groupedHistory).forEach(date => {
        historyHTML += `<div class="history-date-group">
            <div class="history-date-header">${date}</div>`;
        
        // Проходим по каждому элементу истории внутри группы
        groupedHistory[date].forEach(item => {
            // Определяем иконку и цвет границы в зависимости от типа записи
            const typeIcon = item.type === 'daily' ? '🌅' : (item.type === 'question' ? '❓' : '🃏');
            const typeColor = item.type === 'daily' ? '#ffd700' : (item.type === 'question' ? '#667eea' : '#a276b2');
            
            historyHTML += `
                <div class="history-item" data-id="${item.id}" style="border-left-color: ${typeColor}">
                    <div class="history-header">
                        <div class="history-type">
                            <span class="history-icon">${typeIcon}</span>
                            ${item.title}
                        </div>
                        <div class="history-time">${item.time}</div>
                    </div>
                    ${item.question ? `<div class="history-question">"${item.question}"</div>` : ''}
                    <div class="history-cards">
                        ${item.cards.map(cardItem => {
                            // Получаем сам объект карты (для daily/question cardItem это сама карта, для spreads это {card, position...})
                            const card = cardItem.card || cardItem; 
                            const positionName = cardItem.positionName || ''; // Получаем имя позиции, если есть
                            return `
                                <div class="history-mini-card">
                                    ${card.symbol} ${card.name} ${positionName ? `(${positionName})` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="history-actions">
                        <button class="history-btn" onclick="viewHistoryDetail('${item.id}')">
                            📖 Подробнее
                        </button>
                        ${item.aiPrediction || (item.type === 'spread' && item.cards.some(c => c.interpretation)) ? `
                            <button class="history-btn" onclick="sendToTelegram('${item.id}')">
                                📤 В Telegram
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        historyHTML += '</div>';
    });
    
    historyList.innerHTML = historyHTML;
}

// Показ детальной информации о записи истории в модальном окне
function viewHistoryDetail(id) {
    const item = history.find(h => h.id == id);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    modal.innerHTML = `
        <div class="history-modal-content">
            <div class="history-modal-header">
                <h3>${item.type === 'daily' ? '🌅' : (item.type === 'question' ? '❓' : '🃏')} ${item.title}</h3>
                <button class="history-modal-close" onclick="closeHistoryModal()">&times;</button>
            </div>
            <div class="history-modal-body">
                <div class="history-detail-date">📅 ${item.date} в ${item.time}</div>
                
                ${item.question ? `
                    <div class="history-detail-question">
                        <strong>❓ Вопрос:</strong>
                        <p>"${item.question}"</p>
                    </div>
                ` : ''}
                
                <div class="history-detail-cards">
                    <strong>🃏 Карты:</strong>
                    ${item.cards.map(cardItem => {
                        const card = cardItem.card || cardItem; // Получаем объект карты
                        const positionName = cardItem.positionName || ''; // Получаем имя позиции, если есть
                        return `
                            <div class="history-detail-card">
                                <div class="card-header">
                                    <span class="card-symbol-large">${card.symbol}</span>
                                    <span class="card-name-large">${card.name}</span>
                                </div>
                                ${positionName ? `<div class="card-position-name">${positionName}:</div>` : ''}
                                <div class="card-meaning-detail">${card.meaning}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                ${item.aiPrediction ? `
                    <div class="history-detail-prediction">
                        <strong>🤖 ИИ-толкование:</strong>
                        <p>${item.aiPrediction}</p>
                    </div>
                ` : (item.type === 'spread' && item.cards.some(c => c.interpretation)) ? `
                    <div class="history-detail-prediction">
                        <strong>🤖 ИИ-толкования карт:</strong>
                        ${item.cards.map(cardItem => `
                            <p><strong>${cardItem.card.name}${cardItem.positionName ? ` (${cardItem.positionName})` : ''}:</strong> ${cardItem.interpretation || 'Нет толкования'}</p>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="history-modal-footer">
                <button class="btn btn-secondary" onclick="closeHistoryModal()">Закрыть</button>
                ${item.aiPrediction || (item.type === 'spread' && item.cards.some(c => c.interpretation)) ? `
                    <button class="btn" onclick="sendToTelegram('${item.id}')">📤 Отправить в Telegram</button>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Анимация появления модального окна
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Закрытие модального окна истории
function closeHistoryModal() {
    const modal = document.querySelector('.history-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove(); // Удаляем модальное окно из DOM
        }, 300);
    }
}

// Отправка информации из истории в Telegram
function sendToTelegram(id) {
    const item = history.find(h => h.id == id);
    if (!item) return;
    
    let message = `🔮 ${item.title}\n`;
    message += `📅 ${item.date} в ${item.time}\n\n`;
    
    if (item.question) {
        message += `❓ Вопрос: "${item.question}"\n\n`;
    }
    
    message += `🃏 Карты:\n`;
    item.cards.forEach(cardItem => {
        const card = cardItem.card || cardItem;
        const positionName = cardItem.positionName || '';
        message += `${card.symbol} ${card.name}${positionName ? ` (${positionName})` : ''}\n`;
        message += `${card.meaning}\n\n`;
    });
    
    // Добавляем AI-толкования
    if (item.aiPrediction) {
        message += `🤖 ИИ-толкование:\n${item.aiPrediction}`;
    } else if (item.type === 'spread' && item.cards.some(c => c.interpretation)) {
        message += `🤖 ИИ-толкования карт:\n`;
        item.cards.forEach(cardItem => {
            message += `${cardItem.card.name}${cardItem.positionName ? ` (${cardItem.positionName})` : ''}: ${cardItem.interpretation || 'Нет толкования'}\n`;
        });
    }
    
    // Отправка данных в Telegram бота
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({
            type: 'history_share',
            data: item, // Отправляем полный объект данных
            text_message: message // Отправляем также форматированный текст для удобства бота
        }));
        showNotification('Данные отправлены в бота!'); // Оповещение пользователю
    } else {
        // Фоллбэк - копируем текст в буфер обмена
        navigator.clipboard.writeText(message).then(() => {
            showNotification('Текст скопирован в буфер обмена!');
        }).catch(() => {
            showNotification('Не удалось скопировать текст');
        });
    }
}

// Обертка для viewHistoryDetail (для старых вызовов)
function viewHistoryItem(id) {
    viewHistoryDetail(id);
}

// Очистка всей локальной истории
function clearHistory() {
    if (confirm('Удалить всю историю раскладов за последний месяц?')) {
        history = []; // Очищаем массив истории
        renderHistory(); // Перерисовываем историю
        showNotification('История очищена!');
    }
}

// Функции для отзывов
async function loadReviews() {
    console.log('📝 Загрузка отзывов');
    renderReviews(); // Отображаем отзывы
}

// Рендеринг (отображение) отзывов в UI
function renderReviews() {
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return;
    
    // Статичные отзывы для примера (можно получать с сервера)
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
    
    // Объединяем локальные отзывы (добавленные пользователем) со статичными
    const allReviews = [...localReviews, ...staticReviews];
    
    let reviewsHTML = '';
    
    allReviews.forEach(review => {
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating); // Отображение звездочек
        const isLongText = review.text.length > 150;
        const shortText = isLongText ? review.text.substring(0, 150) + '...' : review.text; // Обрезка длинного текста
        
        reviewsHTML += `
            <div class="review-item">
                <div class="review-header">
                    <div class="review-author">${review.author}</div>
                    <div class="review-rating">${stars}</div>
                    <div class="review-date">${review.date}</div>
                </div>
                <div class="review-text" id="review-text-${review.id}">
                    <span class="review-short"${isLongText ? '' : ' style="display: none;"'}>${shortText}</span>
                    <span class="review-full"${isLongText ? ' style="display: none;"' : ''}>${review.text}</span>
                    ${isLongText ? `
                        <button class="review-expand-btn" onclick="toggleReviewText(${review.id})">
                            <span class="expand-text">Читать полностью</span>
                            <span class="collapse-text" style="display: none;">Свернуть</span>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    reviewsList.innerHTML = reviewsHTML;
    
    // Обновляем статистику отзывов
    updateReviewsStats(allReviews);
}

// Обновление статистики отзывов (общее количество и средний рейтинг)
function updateReviewsStats(reviews) {
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews : 0;
    
    const reviewsTotalEl = document.getElementById('reviews-total');
    const ratingDisplay = document.querySelector('.rating');
    
    if (reviewsTotalEl) {
        reviewsTotalEl.textContent = totalReviews;
    }
    
    if (ratingDisplay) {
        // Округляем средний рейтинг до одной десятичной и отображаем звезды
        const stars = '★'.repeat(Math.round(averageRating)) + '☆'.repeat(5 - Math.round(averageRating));
        ratingDisplay.textContent = `${averageRating.toFixed(1)} ${stars}`;
    }
}

// Переключение между коротким и полным текстом отзыва
function toggleReviewText(reviewId) {
    const reviewTextEl = document.getElementById(`review-text-${reviewId}`);
    if (!reviewTextEl) return;
    
    const shortSpan = reviewTextEl.querySelector('.review-short');
    const fullSpan = reviewTextEl.querySelector('.review-full');
    const expandBtn = reviewTextEl.querySelector('.review-expand-btn');
    const expandText = expandBtn.querySelector('.expand-text');
    const collapseText = expandBtn.querySelector('.collapse-text');
    
    const isExpanded = fullSpan.style.display !== 'none';
    
    if (isExpanded) {
        shortSpan.style.display = 'inline';
        fullSpan.style.display = 'none';
        expandText.style.display = 'inline';
        collapseText.style.display = 'none';
    } else {
        shortSpan.style.display = 'none';
        fullSpan.style.display = 'inline';
        expandText.style.display = 'none';
        collapseText.style.display = 'inline';
    }
}

// Отправка нового отзыва
async function submitReview() {
    const reviewText = document.getElementById('review-text');
    const anonymousCheckbox = document.getElementById('anonymous-review');
    const submitBtn = document.getElementById('submit-review-btn');
    
    if (!selectedRating) {
        showNotification('Пожалуйста, поставьте оценку');
        return;
    }
    
    if (!reviewText) {
        showNotification('Поле для отзыва не найдено');
        return;
    }
    
    const text = reviewText.value.trim();
    if (!text) {
        showNotification('Пожалуйста, напишите текст отзыва');
        return;
    }
    
    try {
        // Создаем новый объект отзыва
        const isAnonymous = anonymousCheckbox ? anonymousCheckbox.checked : false;
        const authorName = isAnonymous ? 'Анонимно' : (userName || '@пользователь');
        
        const newReview = {
            id: Date.now(),
            author: authorName,
            rating: selectedRating,
            text: text,
            date: 'только что', // Дата для отображения
            isAnonymous: isAnonymous,
            timestamp: Date.now() // Метка времени для сортировки/удаления
        };
        
        // Добавляем новый отзыв в начало массива локальных отзывов
        localReviews.unshift(newReview);
        
        // Анимация отправки кнопки
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправляется...';
            submitBtn.classList.add('loading'); // Для индикатора загрузки
        }
        
        // Имитация отправки на сервер (задержка)
        setTimeout(() => {
            showNotification('Спасибо за отзыв! Он появился в списке ниже ✨');
            
            // Очищаем форму отзыва
            reviewText.value = '';
            selectedRating = 0; // Сбрасываем выбранный рейтинг
            updateStarsDisplay(); // Обновляем отображение звезд
            if (anonymousCheckbox) anonymousCheckbox.checked = false;
            
            // Обновляем отображение списка отзывов
            renderReviews();
            
            // Сбрасываем состояние кнопки
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Отправить отзыв';
                submitBtn.classList.remove('loading');
            }
            
            // Плавно прокручиваем к началу списка отзывов, чтобы пользователь увидел свой отзыв
            setTimeout(() => {
                const reviewsList = document.getElementById('reviews-list');
                if (reviewsList) {
                    reviewsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 300);
            
        }, 1500); // Задержка 1.5 секунды
        
    } catch (error) {
        console.error('❌ Ошибка отправки отзыва:', error);
        showNotification('Ошибка при отправке отзыва');
        
        // Сбрасываем состояние кнопки при ошибке
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить отзыв';
            submitBtn.classList.remove('loading');
        }
    }
}

// Обновление визуального отображения звездочек рейтинга
function updateStarsDisplay() {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < selectedRating) {
            star.classList.add('active'); // Звезда активна
        } else {
            star.classList.remove('active'); // Звезда неактивна
        }
    });
}

// Подсветка звездочек при наведении мыши
function highlightStars(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.style.color = '#ffd700'; // Цвет активной звезды при наведении
        } else {
            star.style.color = '#444'; // Цвет неактивной звезды
        }
    });
}

// Функции для работы с раскладами

// Открытие модального окна выбора расклада
function openSpread(spreadType) {
    console.log('🃏 Открытие расклада:', spreadType);
    
    // Проверка Premium статуса или тестового режима
    const hasAccess = isPremium || testPremiumMode;
    
    if (!hasAccess) {
        checkAndShowSubscriptionBanner(); // Показываем баннер подписки, если нет доступа
        return;
    }
    
    // Получаем конфигурацию для выбранного типа расклада
    const spreadConfig = getSpreadConfig(spreadType);
    if (!spreadConfig) {
        showNotification('Неизвестный тип расклада');
        return;
    }
    
    // Инициализируем объект текущего расклада
    currentSpread = {
        type: spreadType,
        config: spreadConfig,
        cards: [], // Массив для хранения объектов карт с позициями и интерпретациями
        question: '' // Вопрос пользователя для расклада
    };
    
    showSpreadModal(spreadConfig); // Показываем модальное окно с описанием расклада
}

// Получение конфигурации расклада по типу
function getSpreadConfig(spreadType) {
    const configs = {
        love: {
            name: "💕 Любовь и отношения",
            description: "Расклад раскроет тайны вашего сердца",
            positions: [
                { name: "Вы", description: "Ваше внутреннее состояние в отношениях" },
                { name: "Партнер", description: "Чувства и мысли вашего партнера" },
                { name: "Отношения", description: "Перспективы развития отношений" }
            ],
            layout: "horizontal"
        },
        career: {
            name: "💼 Карьера и финансы", 
            description: "Путь к профессиональному успеху",
            positions: [
                { name: "Текущее", description: "Ваше текущее положение" },
                { name: "Препятствия", description: "Что мешает развитию" },
                { name: "Возможности", description: "Скрытые перспективы" },
                { name: "Совет", description: "Рекомендации карт" }
            ],
            layout: "cross"
        },
        week: {
            name: "📅 Неделя впереди",
            description: "Что готовит вам каждый день недели",
            positions: [
                { name: "Понедельник", description: "Начало недели" },
                { name: "Вторник", description: "Развитие событий" },
                { name: "Среда", description: "Середина недели" },
                { name: "Четверг", description: "Активные действия" },
                { name: "Пятница", description: "Завершение дел" },
                { name: "Суббота", description: "Отдых и восстановление" },
                { name: "Воскресенье", description: "Подготовка к новому" }
            ],
            layout: "week"
        },
        celtic: {
            name: "🍀 Кельтский крест",
            description: "Глубокий анализ жизненной ситуации",
            positions: [
                { name: "Ситуация", description: "Суть текущего положения" },
                { name: "Вызов", description: "Главные препятствия" },
                { name: "Прошлое", description: "Корни ситуации" },
                { name: "Будущее", description: "Возможное развитие" },
                { name: "Цель", description: "К чему стремиться" },
                { name: "Подсознание", description: "Скрытые мотивы" },
                { name: "Ваш подход", description: "Как вы действуете" },
                { name: "Окружение", description: "Влияние других людей" },
                { name: "Страхи", description: "Что вас беспокоит" },
                { name: "Итог", description: "Финальный результат" }
            ],
            layout: "celtic"
        }
    };
    
    return configs[spreadType];
}

// Показ модального окна с деталями расклада и полем для вопроса
function showSpreadModal(config) {
    const modal = document.createElement('div');
    modal.className = 'spread-modal';
    modal.innerHTML = `
        <div class="spread-modal-content">
            <div class="spread-modal-header">
                <h3>${config.name}</h3>
                <button class="spread-modal-close" onclick="closeSpreadModal()">&times;</button>
            </div>
            <div class="spread-modal-body">
                <div class="spread-description">
                    <p>${config.description}</p>
                    <p><strong>Позиций карт:</strong> ${config.positions.length}</p>
                </div>
                
                <div class="spread-question-section">
                    <label for="spread-question">💭 Ваш вопрос (необязательно):</label>
                    <textarea 
                        id="spread-question" 
                        class="spread-question-input" 
                        placeholder="О чем вы хотите узнать? Чем конкретнее вопрос, тем точнее будет толкование..."
                        maxlength="300"
                    ></textarea>
                </div>
                
                <div class="spread-positions-preview">
                    <h4>📍 Позиции расклада:</h4>
                    <div class="positions-list">
                        ${config.positions.map((pos, index) => `
                            <div class="position-preview">
                                <span class="position-number">${index + 1}</span>
                                <div class="position-info">
                                    <strong>${pos.name}</strong>
                                    <small>${pos.description}</small>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="spread-modal-footer">
                <button class="btn btn-secondary" onclick="closeSpreadModal()">Отмена</button>
                <button class="btn spread-start-btn" onclick="startSpread()">
                    ✨ Начать расклад
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Анимация появления модального окна
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Начало расклада после подтверждения в модальном окне
function startSpread() {
    const questionInput = document.getElementById('spread-question');
    const question = questionInput ? questionInput.value.trim() : '';
    
    if (currentSpread) {
        currentSpread.question = question; // Сохраняем вопрос в текущем раскладе
    }
    
    closeSpreadModal(); // Закрываем модальное окно
    
    setTimeout(() => {
        showSpreadInterface(); // Показываем интерфейс расклада
    }, 300);
}

// Отображение интерфейса расклада (где вытягиваются карты)
function showSpreadInterface() {
    if (!currentSpread) return;
    
    const { config } = currentSpread;
    
    // Скрываем сетку выбора раскладов и показываем детальный интерфейс расклада
    const spreadsGrid = document.querySelector('.spreads-grid');
    const spreadDetail = document.getElementById('spread-detail');
    
    if (spreadsGrid) spreadsGrid.style.display = 'none';
    if (spreadDetail) {
        spreadDetail.style.display = 'block';
        
        // Обновляем заголовок расклада и контейнер для карт
        const spreadTitle = document.getElementById('spread-title');
        const spreadCardsContainer = document.getElementById('spread-cards-container');
        const drawSpreadBtn = document.getElementById('draw-spread-btn');
        const spreadLoading = document.getElementById('spread-loading');

        if (spreadTitle) {
            spreadTitle.innerHTML = `
                ${config.name}
                ${currentSpread.question ? `<div class="spread-question-display">❓ ${currentSpread.question}</div>` : ''}
            `;
        }
        
        if (spreadCardsContainer) {
            spreadCardsContainer.innerHTML = generateSpreadLayout(config); // Генерируем слоты для карт
        }
        
        if (drawSpreadBtn) {
            drawSpreadBtn.textContent = `🃏 Вытянуть ${config.positions.length} карт`;
            drawSpreadBtn.style.display = 'block';
            drawSpreadBtn.disabled = false; // Убеждаемся, что кнопка активна
            drawSpreadBtn.onclick = drawSpread; // Перепривязываем обработчик
        }
        
        if (spreadLoading) { // Скрываем индикатор загрузки, если он был виден
            spreadLoading.style.display = 'none';
        }

        // Убеждаемся, что кнопка "Назад" работает
        const backBtn = spreadDetail.querySelector('.back-btn');
        if (backBtn) {
            backBtn.onclick = closeSpread; // Привязываем обработчик к кнопке "Назад"
        }
    }
}

// Генерация HTML-разметки для слотов карт в раскладе
function generateSpreadLayout(config) {
    const { positions, layout } = config;
    
    let layoutClass = 'spread-layout-' + layout;
    let cardsHTML = '';
    
    positions.forEach((position, index) => {
        cardsHTML += `
            <div class="spread-position" data-position="${index}">
                <div class="spread-card-slot" id="spread-card-${index}">
                    <div class="card-back">
                        <div class="card-symbol">🔮</div>
                        <div class="card-text">?</div>
                    </div>
                </div>
                <div class="position-label">
                    <strong>${position.name}</strong>
                    <small>${position.description}</small>
                </div>
            </div>
        `;
    });
    
    return `<div class="${layoutClass}">${cardsHTML}</div>`;
}

// Процесс вытягивания и отображения карт в раскладе
async function drawSpread() {
    console.log('🃏 Начинаем drawSpread, currentSpread:', currentSpread);
    
    if (!currentSpread) {
        console.error('❌ currentSpread is null. Расклад не инициализирован.');
        showNotification('Ошибка: расклад не выбран');
        return;
    }
    
    const { config } = currentSpread;
    const drawBtn = document.getElementById('draw-spread-btn');
    const loading = document.getElementById('spread-loading');
    
    console.log('🎯 Элементы найдены:', { drawBtn: !!drawBtn, loading: !!loading });
    
    try {
        if (drawBtn) {
            drawBtn.style.display = 'none'; // Скрываем кнопку "Вытянуть карты"
            drawBtn.disabled = true;
        }
        
        if (loading) {
            loading.style.display = 'block'; // Показываем индикатор загрузки
        }
        
        // Генерируем уникальные карты для расклада
        const uniqueSpreadCards = [];
        const usedCardNames = new Set();
        
        console.log('🃏 Генерируем карты для', config.positions.length, 'позиций');
        
        for (let i = 0; i < config.positions.length; i++) {
            let randomCard;
            let attempts = 0;
            // Цикл для получения уникальных карт
            do {
                randomCard = getRandomCard();
                attempts++;
                if (attempts > 100) {
                    console.warn('⚠️ Слишком много попыток генерации уникальных карт. Возможно, колода мала или дубликаты неизбежны.');
                    break;
                }
            } while (usedCardNames.has(randomCard.name)); // Проверяем уникальность по имени карты
            
            usedCardNames.add(randomCard.name);
            uniqueSpreadCards.push(randomCard);
        }
        
        // Очищаем предыдущие карты и интерпретации перед новым раскладом
        currentSpread.cards = [];
        // currentSpread.interpretations будет заполняться в revealSpreadCard
        console.log('✅ Карты сгенерированы:', uniqueSpreadCards.length);
        
        // Анимированное открытие карт по очереди и генерация толкований
        for (let i = 0; i < uniqueSpreadCards.length; i++) {
            console.log(`🎴 Открываем карту ${i + 1}/${uniqueSpreadCards.length}`);
            
            await new Promise(resolve => {
                setTimeout(async () => {
                    try {
                        // revealSpreadCard теперь возвращает строку интерпретации
                        const interpretationText = await revealSpreadCard(i, uniqueSpreadCards[i], config.positions[i]);
                        
                        // Сохраняем полную информацию о карте, её позиции и интерпретации
                        currentSpread.cards.push({
                            card: uniqueSpreadCards[i], // Сам объект карты
                            positionName: config.positions[i].name, // Имя позиции
                            positionDescription: config.positions[i].description, // Описание позиции
                            interpretation: interpretationText // Сгенерированная интерпретация
                        });
                        
                        resolve();
                    } catch (error) {
                        console.error(`❌ Ошибка при открытии карты ${i}:`, error);
                        // Продолжаем, даже если произошла ошибка, чтобы не блокировать расклад
                        currentSpread.cards.push({
                            card: uniqueSpreadCards[i],
                            positionName: config.positions[i].name,
                            positionDescription: config.positions[i].description,
                            interpretation: 'Не удалось получить толкование.'
                        });
                        resolve();
                    }
                }, i * 1200); // Увеличена задержка между открытием карт для лучшей анимации
            });
        }
        
        if (loading) {
            loading.style.display = 'none'; // Скрываем индикатор загрузки после открытия всех карт
        }
        
        // Показываем кнопку для просмотра всех толкований
        showInterpretationsButton();
        
        console.log('✅ Все карты открыты, добавляем расклад в историю автоматически');
        
        // Автоматически добавляем расклад в историю сразу после его завершения
        // aiPrediction здесь пуст, т.к. толкования привязаны к каждой карте
        addToLocalHistory('spread', config.name, currentSpread.question || '', currentSpread.cards, ''); 
        
    } catch (error) {
        console.error('❌ Ошибка в drawSpread:', error);
        
        if (loading) {
            loading.style.display = 'none';
        }
        
        if (drawBtn) {
            drawBtn.style.display = 'block';
            drawBtn.disabled = false;
        }
        
        showNotification('Произошла ошибка при создании расклада. Попробуйте еще раз.');
    }
}

// Отображение кнопки "Посмотреть толкования" и "Сохранить в историю"
function showInterpretationsButton() {
    const spreadDetail = document.getElementById('spread-detail');
    if (!spreadDetail) return;
    
    // Удаляем старую кнопку "Посмотреть толкования", если она была
    const oldBtn = spreadDetail.querySelector('.show-interpretations-btn');
    if (oldBtn) oldBtn.remove(); // Удаляем старую кнопку
    
    // Удаляем контейнер с кнопками, если он уже есть (для предотвращения дублирования)
    const oldButtonsContainer = spreadDetail.querySelector('.spread-actions');
    if (oldButtonsContainer) oldButtonsContainer.remove();

    // Создаем новый контейнер для кнопок
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'spread-actions'; // Новый класс для стилизации кнопок после расклада
    buttonsContainer.innerHTML = `
        <button class="btn show-interpretations-btn" onclick="showInterpretationsModal()">
            🔮 Посмотреть все толкования
        </button>
        <button class="btn btn-secondary" onclick="sendSpreadToTelegram()">
            📤 Отправить в Telegram
        </button>
    `;
    
    spreadDetail.appendChild(buttonsContainer);
    // Добавьте стили для .spread-actions в ваш style.css, чтобы кнопки располагались красиво.
    // Пример: .spread-actions { display: flex; gap: 10px; margin-top: 20px; justify-content: center; flex-wrap: wrap; }
}

// Показ модального окна со всеми толкованиями расклада
function showInterpretationsModal() {
    // currentSpread.cards теперь содержит объекты {card: {}, positionName: "", interpretation: ""}
    if (!currentSpread || !currentSpread.cards || currentSpread.cards.length === 0) {
        showNotification('Нет толкований для отображения.');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'interpretations-modal';
    
    let interpretationsHTML = '';
    currentSpread.cards.forEach((cardItem) => { // Итерируем по объектам карты с данными позиции и интерпретации
        const card = cardItem.card; 
        const positionName = cardItem.positionName;
        const interpretation = cardItem.interpretation;

        interpretationsHTML += `
            <div class="interpretation-item">
                <div class="interpretation-card-info">
                    <div class="interpretation-card-symbol">${card.symbol}</div>
                    <div class="interpretation-card-details">
                        <h4>${card.name}</h4>
                        <p class="position-name">${positionName} - ${cardItem.positionDescription}</p>
                    </div>
                </div>
                <div class="interpretation-text">${interpretation}</div>
            </div>
        `;
    });
    
    modal.innerHTML = `
        <div class="interpretations-modal-content">
            <div class="interpretations-modal-header">
                <h3>🔮 Толкования расклада</h3>
                <button class="interpretations-modal-close" onclick="closeInterpretationsModal()">&times;</button>
            </div>
            <div class="interpretations-modal-body">
                ${currentSpread.question ? `
                    <div class="spread-question-display" style="margin-bottom: 20px;">
                        <strong>❓ Ваш вопрос:</strong> ${currentSpread.question}
                    </div>
                ` : ''}
                ${interpretationsHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Анимация появления модального окна
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Закрытие модального окна толкований
function closeInterpretationsModal() {
    const modal = document.querySelector('.interpretations-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove(); // Удаляем модальное окно из DOM
        }, 300);
    }
}

// Открытие карты в раскладе и генерация её толкования
// Возвращает сгенерированную интерпретацию
async function revealSpreadCard(index, card, position) {
    console.log(`🎴 revealSpreadCard: ${index}, карта: ${card.name}, позиция: ${position.name}`);
    
    const cardSlot = document.getElementById(`spread-card-${index}`);
    if (!cardSlot) {
        console.error(`❌ Не найден элемент spread-card-${index}`);
        return 'Не удалось сгенерировать толкование для этой карты.';
    }
    
    try {
        addSparkles(cardSlot); // Добавляем блестки
        
        // Показываем карту с анимацией переворота
        await new Promise(resolve => {
            setTimeout(() => {
                cardSlot.innerHTML = `
                    <div class="spread-card-revealed">
                        <div class="card-name">${card.name}</div>
                        <img src="${card.image}" alt="${card.name}" class="card-image" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.fontSize='24px';">
                        <div class="card-symbol">${card.symbol}</div>
                        <div class="card-meaning">${card.meaning}</div>
                        <div class="position-context">
                            <strong>${position.name}</strong>
                            <small>${position.description}</small>
                        </div>
                    </div>
                `;
                
                cardSlot.classList.add('flipped'); // Запускаем анимацию
                console.log(`✅ Карта ${index} показана`);
                resolve();
            }, 800); // Задержка для анимации
        });
        
        // Генерируем персональное толкование для позиции (AI или локальное)
        const interpretation = await generateAdvancedInterpretation(card, position, currentSpread.question);
        
        // Добавляем толкование под карту в UI (для немедленного отображения)
        setTimeout(() => {
            const interpretationDiv = document.createElement('div');
            interpretationDiv.className = 'position-interpretation';
            interpretationDiv.innerHTML = `
                <div class="interpretation-header">
                    <span class="interpretation-icon">🔮</span>
                    <span class="interpretation-title">Толкование</span>
                </div>
                <div class="interpretation-text">${interpretation}</div>
            `;
            
            const positionElement = cardSlot.closest('.spread-position');
            if (positionElement) {
                positionElement.appendChild(interpretationDiv);
                // Анимация появления толкования
                setTimeout(() => {
                    interpretationDiv.classList.add('show');
                }, 100);
            }
        }, 1000); // Задержка после появления карты
        
        return interpretation; // Возвращаем интерпретацию для сохранения в currentSpread
        
    } catch (error) {
        console.error(`❌ Ошибка в revealSpreadCard ${index}:`, error);
        return 'Произошла ошибка при генерации толкования.';
    }
}

// Генерация расширенного толкования (попытка через API или локальный фоллбэк)
async function generateAdvancedInterpretation(card, position, question) {
    try {
        // Если настроен API для генерации через ИИ (например, n8n webhook)
        if (typeof API_CONFIG !== 'undefined' && API_CONFIG.generatePredictionEndpoint) { // Использовать generatePredictionEndpoint
            const response = await fetch(API_CONFIG.generatePredictionEndpoint, { // Используем правильный endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'spread_position', // Тип запроса для AI
                    card: card,
                    position: position,
                    question: question,
                    userName: userName,
                    userBirthdate: userBirthdate
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                return result.prediction || generateLocalInterpretation(card, position, question); // Возвращаем AI-предсказание или фоллбэк
            }
        }
    } catch (error) {
        console.error('❌ Ошибка API генерации, используем локальную:', error);
    }
    
    // Фоллбэк на локальную генерацию, если API недоступен или произошла ошибка
    return generateLocalInterpretation(card, position, question);
}

// Локальная генерация толкования для позиции (фоллбэк)
function generateLocalInterpretation(card, position, question) {
    const templates = [
        `В позиции "${position.name}" карта "${card.name}" раскрывает важную истину: ${card.meaning.toLowerCase()} Это ключевой аспект для понимания ${position.description.toLowerCase()}.`,
        
        `"${card.name}" в контексте "${position.name}" говорит о том, что ${card.meaning.toLowerCase()} Обратите особое внимание на то, как это влияет на ${position.description.toLowerCase()}.`,
        
        `Позиция "${position.name}" освещается энергией карты "${card.name}": ${card.meaning.toLowerCase()} Это указывает на важность ${position.description.toLowerCase()} в вашей текущей ситуации.`,
        
        `Карта "${card.name}" в позиции "${position.name}" символизирует: ${card.meaning.toLowerCase()} Духовные наставники советуют сосредоточиться на ${position.description.toLowerCase()}.`
    ];
    
    let interpretation = templates[Math.floor(Math.random() * templates.length)];
    
    // Добавляем контекст вопроса, если он есть
    if (question && question.trim()) {
        const questionContexts = [
            ` В контексте вашего вопроса "${question}" это означает, что ответ кроется в области ${position.description.toLowerCase()}.`,
            ` Относительно вашего запроса "${question}", эта карта указывает на важность ${position.description.toLowerCase()} для получения ясности.`,
            ` Ваш вопрос "${question}" находит отклик в этой позиции - ${position.description.toLowerCase()} станет ключом к пониманию.`
        ];
        
        interpretation += questionContexts[Math.floor(Math.random() * questionContexts.length)];
    }
    
    return interpretation;
}

// Закрытие интерфейса расклада (возврат к выбору раскладов)
function closeSpread() {
    const spreadsGrid = document.querySelector('.spreads-grid');
    const spreadDetail = document.getElementById('spread-detail');
    
    if (spreadsGrid) spreadsGrid.style.display = 'grid'; // Показываем сетку выбора
    if (spreadDetail) spreadDetail.style.display = 'none'; // Скрываем детальный расклад
    
    currentSpread = null; // Сбрасываем данные текущего расклада
    console.log('✅ Интерфейс расклада закрыт, вернулись к выбору раскладов.');
}

// Закрытие модального окна выбора расклада
function closeSpreadModal() {
    const modal = document.querySelector('.spread-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove(); // Удаляем модальное окно из DOM
        }, 300);
    }
}

// Тестовая кнопка для переключения Premium режима (для разработки)
function addTestPremiumButton() {
    const header = document.querySelector('.header');
    if (header && !document.getElementById('test-premium-btn')) {
        const testBtn = document.createElement('button');
        testBtn.id = 'test-premium-btn';
        testBtn.className = 'test-premium-btn';
        testBtn.textContent = testPremiumMode ? '👑 Тест Premium ON' : '🆓 Тест Premium OFF';
        testBtn.onclick = toggleTestPremium;
        header.appendChild(testBtn);
    }
}

// Переключение тестового Premium режима
function toggleTestPremium() {
    testPremiumMode = !testPremiumMode;
    const btn = document.getElementById('test-premium-btn');
    if (btn) {
        btn.textContent = testPremiumMode ? '👑 Тест Premium ON' : '🆓 Тест Premium OFF';
        btn.style.background = testPremiumMode ? 
            'linear-gradient(45deg, #ffd700, #ffed4a)' : 
            'rgba(255, 255, 255, 0.1)';
        btn.style.color = testPremiumMode ? '#1a1a2e' : '#fff';
    }
    
    showNotification(testPremiumMode ? 
        'Тестовый Premium режим включен! 👑' : 
        'Тестовый Premium режим выключен 🆓'
    );
    // Обновляем статус подписки в UI
    updateSubscriptionStatus(isPremium || testPremiumMode); 
    // Также обновляем количество вопросов в UI
    updateQuestionsDisplay();
}

// Функции для работы с Supabase (заглушки или реальная логика)

async function saveDailyCardToSupabase(card) {
    console.log('💾 Сохранение карты дня:', card.name);
    if (!API_CONFIG || !API_CONFIG.saveDailyCard) {
        console.warn('API не настроен, пропуск сохранения.');
        return null;
    }
    
    try {
        const response = await fetch(API_CONFIG.saveDailyCard, {
            method: 'POST', // ИСПРАВЛЕНО: POST вместо GET
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser?.telegram_id || 'anonymous',
                card_name: card.name,
                card_symbol: card.symbol,
                card_meaning: card.meaning,
                card_image: card.image || '',
                drawn_date: new Date().toISOString().split('T')[0],
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Карта дня сохранена в n8n:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения карты дня:', error);
        return null;
    }
}

async function saveQuestionToSupabase(question, isFollowUp) {
    console.log('💾 Сохранение вопроса:', question);
    if (!API_CONFIG || !API_CONFIG.saveQuestion) {
        console.warn('API не настроен, пропуск сохранения.');
        return { id: Date.now() };
    }
    
    try {
        const response = await fetch(API_CONFIG.saveQuestion, {
            method: 'POST', // ИСПРАВЛЕНО: POST вместо GET
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser?.telegram_id || 'anonymous',
                question_text: question,
                is_follow_up: isFollowUp,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Вопрос сохранен в n8n:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения вопроса:', error);
        return { id: Date.now() };
    }
}

async function saveAnswerToSupabase(questionId, card, aiPrediction) {
    console.log('💾 Сохранение ответа для вопроса:', questionId);
    if (!API_CONFIG || !API_CONFIG.saveAnswer) {
        console.warn('API не настроен, пропуск сохранения.');
        return null;
    }
    
    try {
        const response = await fetch(API_CONFIG.saveAnswer, {
            method: 'POST', // ИСПРАВЛЕНО: POST вместо GET
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                question_id: questionId,
                user_id: currentUser?.telegram_id || 'anonymous',
                card_name: card.name,
                card_symbol: card.symbol,
                card_meaning: card.meaning,
                card_image: card.image || '',
                ai_prediction: aiPrediction,
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Ответ сохранен в n8n:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения ответа:', error);
        return null;
    }
}

async function updateUserQuestionsInSupabase() {
    console.log('💾 Обновление количества вопросов:', questionsLeft);
    if (!API_CONFIG || !API_CONFIG.updateSubscription) {
        console.warn('API не настроен, пропуск обновления.');
        return;
    }
    
    try {
        const response = await fetch(API_CONFIG.updateSubscription, {
            method: 'POST', // ИСПРАВЛЕНО: POST вместо GET
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                user_id: currentUser?.telegram_id || 'anonymous',
                free_questions_left: questionsLeft,
                action: 'update_questions',
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Количество вопросов обновлено в n8n:', data);
    } catch (error) {
        console.error('❌ Ошибка обновления количества вопросов:', error);
    }
}

// Функция для сохранения расклада (если нужна отдельная кнопка "сохранить")
// Сейчас расклад уже автоматически сохраняется в drawSpread через addToLocalHistory
function saveSpreadToHistory() {
    if (!currentSpread || !currentSpread.cards || currentSpread.cards.length === 0) {
        showNotification('Нет данных для сохранения в историю.');
        return;
    }
    
    // Расклад уже был добавлен в локальную историю в функции drawSpread.
    // Эта функция может быть переделана для сохранения в БД или для других действий.
    showNotification('✅ Расклад успешно сохранен в истории!');
    
    // Опционально: переключиться на вкладку истории после сохранения
    setTimeout(() => {
        switchTab('history');
    }, 1000);
}

// Функция для отправки всего расклада в Telegram
function sendSpreadToTelegram() {
    if (!currentSpread || !currentSpread.cards || currentSpread.cards.length === 0) {
        showNotification('Нет данных расклада для отправки.');
        return;
    }
    
    let message = `🔮 *${currentSpread.config.name}*\n`;
    message += `📅 ${new Date().toLocaleString('ru-RU')}\n\n`;
    
    if (currentSpread.question) {
        message += `❓ *Ваш вопрос*: "${currentSpread.question}"\n\n`;
    }
    
    message += `🃏 *Карты в раскладе*:\n\n`;
    
    currentSpread.cards.forEach((cardData, index) => {
        message += `*${index + 1}. ${cardData.positionName}*\n`;
        message += `_Карта:_ ${cardData.card.symbol} ${cardData.card.name}\n`;
        // message += `_Значение:_ ${cardData.card.meaning}\n`; // Можно добавить, если не слишком длинно
        message += `_Толкование:_ ${cardData.interpretation}\n\n`;
    });
    
    if (tg && tg.sendData) {
        tg.sendData(JSON.stringify({
            type: 'spread_share',
            data: currentSpread, // Отправляем полный объект расклада
            text_message: message // Отправляем также форматированный текст
        }));
        showNotification('Расклад отправлен в Telegram бота!');
        closeInterpretationsModal(); // Закрываем модальное окно после отправки
    } else {
        // Фоллбэк - копируем в буфер обмена
        navigator.clipboard.writeText(message).then(() => {
            showNotification('Текст расклада скопирован в буфер обмена!');
        }).catch(() => {
            showNotification('Не удалось скопировать текст расклада.');
        });
    }
}


// Проверка работы скрипта
console.log('🔮 Script.js (финальная исправленная версия) загружен успешно!');

// Функция для тестирования подключения к n8n (можно вызвать из консоли)
async function testN8NConnection() {
    try {
        console.log('🧪 Тестирую подключение к n8n...');
        
        const testData = {
            type: 'connection_test',
            message: 'Тест подключения от Telegram Web App',
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent
        };
        
        const response = await fetch(API_CONFIG.generatePrediction, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(testData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.text();
        console.log('✅ Тест подключения успешен:', result);
        showNotification('✅ Подключение к n8n работает!');
        return true;
        
    } catch (error) {
        console.error('❌ Тест подключения неудачен:', error);
        showNotification('❌ Ошибка подключения к n8n');
        return false;
    }
}

// Автоматическое тестирование при загрузке (в development режиме)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Тестируем подключение через 3 секунды после загрузки
    setTimeout(testN8NConnection, 3000);
}

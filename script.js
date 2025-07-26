// script.js - Основная логика Tarot Web App (ИСПРАВЛЕННАЯ ВЕРСИЯ)

// Глобальные переменные - ДОЛЖНЫ БЫТЬ В САМОМ НАЧАЛЕ ФАЙЛА, ПОСЛЕ ИМПОРТОВ И КОНФИГУРАЦИЙ
let supabase;
let tg;
let currentUser = null;
let questionsLeft = 3;
let dailyCardDrawn = false;
let isPremium = false;
let history = [];
let currentQuestionId = null;
let selectedRating = 0;
let hasLaunched = false; // Заменяем localStorage
let userName = '';
let userBirthdate = '';
let localReviews = []; // Локальные отзывы для тестирования
let testPremiumMode = false; // Тестовый премиум режим
let currentSpread = null; // Текущий активный расклад

// Инициализация приложения
async function initApp() {
    console.log('🔮 Инициализация Tarot Web App');
    
    try {
        // Инициализация Supabase
        // Убедитесь, что SUPABASE_CONFIG доступен глобально (из config.js)
        if (typeof window.supabase !== 'undefined' && typeof SUPABASE_CONFIG !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase инициализирован');
        } else {
             console.warn('Supabase клиент или SUPABASE_CONFIG не найден. Приложение будет работать в оффлайн-режиме.');
             initOfflineMode(); // Переходим в оффлайн режим, если Supabase недоступен
             initEventListeners();
             switchTab('daily');
             return; // Прерываем дальнейшее выполнение, чтобы избежать ошибок
        }
        
        // Инициализация Telegram Web App
        initTelegramWebApp();
        
        // Загрузка пользователя
        await loadCurrentUser();
        
        // Инициализация UI
        initEventListeners();
        
        // Установка начального таба
        switchTab('daily');
        
        // Проверка на первый запуск
        checkFirstLaunch();
        
        // Добавляем тестовую кнопку премиум режима в режиме разработки
        addTestPremiumButton();
        
        console.log('✅ Приложение готово к работе');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        // Fallback для тестирования без Supabase
        initOfflineMode();
        initEventListeners();
        switchTab('daily');
    }
}

// Инициализация Telegram Web App
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        const user = tg.initDataUnsafe?.user;
        if (user) {
            console.log('👤 Telegram пользователь:', user);
            currentUser = {
                telegram_id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name
            };
        }
        
        tg.MainButton.setText('💳 Купить Premium за 299₽');
        tg.MainButton.onClick(() => {
            if (typeof API_CONFIG !== 'undefined' && API_CONFIG && API_CONFIG.paymentUrl) {
                tg.openLink(API_CONFIG.paymentUrl);
            } else {
                showNotification('Ссылка для оплаты не настроена.');
            }
        });
        
        tg.setHeaderColor('#1a1a2e');
        tg.setBackgroundColor('#1a1a2e');
        
    } else {
        console.log('🔧 Режим разработки (без Telegram)');
        currentUser = {
            telegram_id: Math.floor(Math.random() * 1000000) + 12345,
            username: 'test_user',
            first_name: 'Test User'
        };
    }
}

// Оффлайн режим для тестирования
function initOfflineMode() {
    console.log('🔧 Запуск в оффлайн режиме');
    currentUser = {
        telegram_id: Math.floor(Math.random() * 1000000) + 12345,
        username: 'test_user',
        first_name: 'Test User'
    };
    updateSubscriptionStatus(false);
}

// Загрузка текущего пользователя
async function loadCurrentUser() {
    if (!currentUser || !supabase) return; // Пропускаем, если Supabase не инициализирован
    
    try {
        const { data: existingUser, error } = await supabase
            .from(TABLES.userProfiles)
            .select('*')
            .eq('telegram_id', currentUser.telegram_id)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 - "No rows found"
            throw error;
        }
        
        if (existingUser) {
            currentUser = { ...currentUser, ...existingUser };
            questionsLeft = existingUser.free_questions_left || 0;
            isPremium = existingUser.is_premium && new Date(existingUser.premium_expires_at) > new Date();
            
            const today = new Date().toISOString().split('T')[0];
            dailyCardDrawn = existingUser.daily_card_drawn_date === today;
            
        } else {
            await createNewUser();
        }
        
        updateSubscriptionStatus(isPremium);
        updateQuestionsDisplay();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователя:', error);
    }
}

// Создание нового пользователя
async function createNewUser() {
    if (!supabase || !currentUser) return; // Пропускаем, если Supabase не инициализирован
    try {
        const { data, error } = await supabase
            .from(TABLES.userProfiles)
            .insert([{
                telegram_id: currentUser.telegram_id,
                username: currentUser.username,
                first_name: currentUser.first_name,
                is_premium: false,
                free_questions_left: APP_CONFIG.freeQuestionsLimit
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        currentUser = { ...currentUser, ...data };
        questionsLeft = APP_CONFIG.freeQuestionsLimit;
        isPremium = false;
        
        console.log('✅ Новый пользователь создан');
        
    } catch (error) {
        console.error('❌ Ошибка создания пользователя:', error);
    }
}

// Обновление отображения статуса подписки
function updateSubscriptionStatus(hasPremium) {
    const statusEl = document.getElementById('subscription-status');
    if (!statusEl) return;
    
    isPremium = hasPremium;
    
    if (hasPremium) {
        statusEl.innerHTML = `
            <span class="status-icon">👑</span>
            <span class="status-text">Премиум активен</span>
        `;
        statusEl.classList.add('premium');
        questionsLeft = 999; // Устанавливаем бесконечное количество вопросов для премиум
        
        if (tg && tg.MainButton) {
            tg.MainButton.hide();
        }
    } else {
        statusEl.innerHTML = `
            <span class="status-icon">🆓</span>
            <span class="status-text">Бесплатная версия</span>
        `;
        statusEl.classList.remove('premium');
        
        if (tg && tg.MainButton) {
            tg.MainButton.show();
        }
    }
}

// Обновление отображения количества вопросов
function updateQuestionsDisplay() {
    const questionsCountEl = document.getElementById('questions-count');
    if (questionsCountEl) {
        questionsCountEl.textContent = isPremium ? '∞' : questionsLeft;
    }
}

// Инициализация обработчиков событий
function initEventListeners() {
    console.log('🎯 Инициализация обработчиков событий');

    // Основные табы
    // Удалены строки tab.replaceWith(tab.cloneNode(true));
    document.querySelectorAll('.nav-tabs .nav-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tabName = this.getAttribute('data-tab');
            console.log('🔄 Переключение на основной таб:', tabName);
            
            if (tabName) {
                switchTab(tabName);
            }
        });
    });

    // Вторичные табы
    // Удалены строки tab.replaceWith(tab.cloneNode(true));
    document.querySelectorAll('.nav-tabs-secondary .nav-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tabName = this.getAttribute('data-tab');
            console.log('🔄 Переключение на вторичный таб:', tabName);
            
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
    
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
    
    // Enter для полей ввода
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
    
    // Обработчики для рейтинга отзывов
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
    
    // Обработчики для раскладов
    document.querySelectorAll('.spread-card').forEach(card => {
        card.addEventListener('click', function() {
            const spreadType = this.getAttribute('data-spread');
            if (spreadType) {
                openSpread(spreadType);
            }
        });
    });
    
    // Обработчики для элементов истории  
    document.addEventListener('click', function(e) {
        if (e.target.closest('.history-item')) {
            const historyItem = e.target.closest('.history-item');
            const itemId = historyItem.getAttribute('data-id');
            if (itemId) {
                viewHistoryItem(itemId);
            }
        }
    });
    
    // Обработчик для кнопки "Назад" в раскладах (будет перепривязан в showSpreadInterface)
    const backBtn = document.querySelector('.back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', closeSpread);
    }
    
    console.log('✅ Обработчики событий настроены');
}

// Переключение табов
function switchTab(tab) {
    console.log('🔄 Переключение на таб:', tab);
    
    // Скрываем все контенты табов
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Убираем активный класс со всех табов
    const allTabs = document.querySelectorAll('.nav-tab');
    allTabs.forEach(navTab => {
        navTab.classList.remove('active');
    });
    
    // Показываем нужный контент
    const targetContent = document.getElementById(tab + '-tab');
    if (targetContent) {
        targetContent.classList.add('active');
        console.log('✅ Контент показан для:', tab);
    } else {
        console.error('❌ Контент не найден для таба:', tab);
    }
    
    // Активируем нужный таб
    const targetTab = document.querySelector(`[data-tab="${tab}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
        console.log('✅ Таб активирован:', tab);
    } else {
        console.error('❌ Таб не найден:', tab);
    }
    
    // Специальная логика для разных табов
    if (tab === 'history') {
        loadHistory();
    } else if (tab === 'reviews') {
        loadReviews();
    } else if (tab === 'premium') {
        console.log('👑 Пользователь посетил Premium страницу');
    } else if (tab === 'spreads') { // БЛОК ДЛЯ ВКЛАДКИ "РАСКЛАДЫ"
        // При переключении на вкладку "Расклады" всегда показываем список раскладов
        // и скрываем детальный вид, если он был активен.
        const spreadsGrid = document.querySelector('.spreads-grid');
        const spreadDetail = document.getElementById('spread-detail');

        if (spreadsGrid) spreadsGrid.style.display = 'grid'; // Убедимся, что сетка выбора видна
        if (spreadDetail) spreadDetail.style.display = 'none'; // Убедимся, что детальный расклад скрыт

        currentSpread = null; // Сбрасываем текущий расклад
        console.log('✅ Переключено на выбор раскладов.');
    }
}

// Сброс карты к дефолтному состоянию
function resetCardToDefault(cardElement) {
    if (!cardElement) return;
    
    // Удаляем анимацию флипа если была
    cardElement.classList.remove('flipped');
    
    // Очищаем от старых блесток
    const sparkles = cardElement.querySelectorAll('.sparkle');
    sparkles.forEach(sparkle => sparkle.remove());
    
    // Возвращаем дефолтный вид карты
    cardElement.innerHTML = `
        <div class="card-back">
            <div class="card-symbol">🔮</div>
            <div class="card-text">Ваш ответ</div>
        </div>
    `;
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
    card.style.pointerEvents = 'none';
    
    addSparkles(card);
    
    try {
        setTimeout(async () => {
            const randomCard = getRandomCard();
            
            card.innerHTML = `
                <div class="card-name">${randomCard.name}</div>
                <img src="${randomCard.image}" alt="${randomCard.name}" class="card-image" onerror="this.style.display='none'">
                <div class="card-symbol">${randomCard.symbol}</div>
                <div class="card-meaning">${randomCard.meaning}</div>
            `;
            
            card.classList.add('flipped');
            loading.style.display = 'none';
            dailyCardDrawn = true;
            
            await saveDailyCardToSupabase(randomCard);
            
            setTimeout(async () => {
                const aiPrediction = await generateAIPredictionToContainer('daily-ai-container', 'daily', randomCard, '');
                
                // Обновляем историю с ИИ-предсказанием
                if (history.length > 0) {
                    history[0].aiPrediction = aiPrediction;
                }
                
                setTimeout(() => {
                    const banner = document.getElementById('daily-info-banner');
                    if (banner) {
                        banner.style.display = 'block';
                    }
                }, 2000);
            }, 1000);
            
            // Для карты дня, передаем просто объект randomCard в массив.
            // viewHistoryDetail будет проверять, есть ли positionName.
            addToLocalHistory('daily', 'Карта дня', '', [randomCard]); 
        }, 2000);
        
    } catch (error) {
        console.error('❌ Ошибка при вытягивании карты дня:', error);
        loading.style.display = 'none';
        card.style.pointerEvents = 'auto';
    }
}

// Задать вопрос
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
    
    if (questionsLeft <= 0 && !isPremium) {
        console.log('❌ Вопросы закончились');
        checkAndShowSubscriptionBanner();
        return;
    }
    
    console.log('✅ Запуск предсказания для вопроса:', question);
    performPrediction(question, false);
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
    
    if (questionsLeft <= 0 && !isPremium) {
        checkAndShowSubscriptionBanner();
        return;
    }
    
    performPrediction(question, true);
}

// Выполнение предсказания
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
        console.error('❌ Элементы интерфейса не найдены');
        return;
    }
    
    try {
        // Сброс состояния карты к дефолтному виду
        resetCardToDefault(answerCard);
        
        // Очистка предыдущих ИИ-предсказаний
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
        
        answerSection.style.display = 'block';
        loading.style.display = 'block';
        if (askBtn) askBtn.disabled = true;
        if (followUpBtn) followUpBtn.disabled = true;
        
        if (!isFollowUp) {
            const followUpSection = document.getElementById('follow-up-section');
            const followupAnswerSection = document.getElementById('followup-answer-section');
            const subscriptionBanner = document.getElementById('subscription-banner-question');
            
            if (followUpSection) followUpSection.style.display = 'none';
            if (followupAnswerSection) followupAnswerSection.style.display = 'none';
            if (subscriptionBanner) subscriptionBanner.style.display = 'none';
            
            // Очистка контейнера уточняющего ответа при новом основном вопросе
            const followupAiContainer = document.getElementById('followup-ai-container');
            if (followupAiContainer) {
                followupAiContainer.innerHTML = '';
            }
        }
        
        addSparkles(answerCard);
        
        const questionRecord = await saveQuestionToSupabase(question, isFollowUp);
        currentQuestionId = questionRecord?.id;
        
        setTimeout(async () => {
            const randomCard = getRandomCard();
            
            answerCard.innerHTML = `
                <div class="card-name">${randomCard.name}</div>
                <img src="${randomCard.image}" alt="${randomCard.name}" class="card-image" onerror="this.style.display='none'">
                <div class="card-symbol">${randomCard.symbol}</div>
                <div class="card-meaning">${randomCard.meaning}</div>
            `;
            
            loading.style.display = 'none';
            if (askBtn) askBtn.disabled = false;
            if (followUpBtn) followUpBtn.disabled = false;
            
            setTimeout(async () => {
                const aiContainerId = isFollowUp ? 'followup-ai-container' : 'first-ai-container';
                const aiPrediction = await generateAIPredictionToContainer(aiContainerId, 'question', randomCard, question);
                
                if (currentQuestionId) {
                    await saveAnswerToSupabase(currentQuestionId, randomCard, aiPrediction);
                }
                
                // Обновляем последнюю запись в истории с ИИ-предсказанием
                if (history.length > 0) {
                    history[0].aiPrediction = aiPrediction;
                }
                
                if (!isFollowUp) {
                    setTimeout(() => {
                        const followUpSection = document.getElementById('follow-up-section');
                        if (followUpSection) {
                            followUpSection.style.display = 'block';
                        }
                    }, 1500);
                }
                
                setTimeout(() => {
                    checkAndShowSubscriptionBanner();
                }, 2000);
                
            }, 1000);
            
            if (!isPremium) {
                questionsLeft--;
                await updateUserQuestionsInSupabase();
                updateQuestionsDisplay();
            }
            
            if (isFollowUp) {
                document.getElementById('follow-up-input').value = '';
            } else {
                document.getElementById('question-input').value = '';
            }
            
            // Для обычного вопроса, передаем просто объект randomCard в массив.
            // viewHistoryDetail будет проверять, есть ли positionName.
            addToLocalHistory('question', isFollowUp ? 'Уточняющий вопрос' : 'Вопрос', question, [randomCard]);
            
        }, 2500);
        
    } catch (error) {
        console.error('❌ Ошибка в performPrediction:', error);
        if (loading) loading.style.display = 'none';
        if (askBtn) askBtn.disabled = false;
        if (followUpBtn) followUpBtn.disabled = false;
        showNotification('Произошла ошибка. Попробуйте еще раз.');
    }
}

// Получение случайной карты
function getRandomCard() {
    // Убедитесь, что TAROT_CARDS определен (например, в config.js)
    if (typeof TAROT_CARDS === 'undefined' || TAROT_CARDS.length === 0) {
        console.error('❌ TAROT_CARDS не определены или пусты!');
        // Фоллбэк или бросить ошибку
        return { name: "Ошибка", symbol: "!", meaning: "Карты не загружены." };
    }
    return TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
}

// Генерация ИИ-предсказания в конкретный контейнер
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
        // Если API_CONFIG.aiPredictionEndpoint настроен, делаем fetch запрос
        if (typeof API_CONFIG !== 'undefined' && API_CONFIG.aiPredictionEndpoint) {
             const response = await fetch(API_CONFIG.aiPredictionEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: type,
                    card: card,
                    question: question,
                    userName: userName, // Передаем данные пользователя для персонализации
                    userBirthdate: userBirthdate
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            const prediction = result.prediction || "Не удалось сгенерировать предсказание.";
            typeWriter(aiContent, prediction, 30);
            return prediction;

        } else {
            // Иначе используем фоллбэк генерацию текста
            const prediction = generatePredictionText(type, card, question);
            setTimeout(() => {
                typeWriter(aiContent, prediction, 30);
            }, 2000); // Задержка для имитации генерации
            return prediction;
        }
       
    } catch (error) {
        console.error('❌ Ошибка ИИ-предсказания (возможно, API недоступно):', error);
        // Фоллбэк на локальную генерацию текста при ошибке API
        const prediction = generatePredictionText(type, card, question);
        setTimeout(() => {
            typeWriter(aiContent, prediction, 50);
        }, 2000); // Задержка для имитации генерации
        return prediction;
    }
}

// Генерация предсказания (фоллбэк)
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
    if (!isPremium && questionsLeft <= 0) {
        const banner = document.getElementById('subscription-banner-question');
        if (banner) {
            banner.style.display = 'block';
            setTimeout(() => {
                banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
}

// Проверка первого запуска (использование showWelcomeModal)
function checkFirstLaunch() {
    // В вашем index.html вы уже добавили modal-profile, так что используем его.
    // Если hasLaunched === false, показываем модалку профиля
    if (!hasLaunched) {
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) {
            profileModal.style.display = 'flex'; // Показываем модалку профиля
            // Здесь можно добавить обработчики для кнопок сохранения/пропуска профиля
            document.getElementById('profile-form').addEventListener('submit', function(e) {
                e.preventDefault();
                saveWelcomeData(); // Сохранить данные профиля
            });
            document.getElementById('skip-profile-btn').addEventListener('click', skipWelcome);
        }
    }
}

// Сохранение данных приветствия (теперь для модалки профиля)
function saveWelcomeData() {
    const nameInput = document.getElementById('display-name');
    const birthdateInput = document.getElementById('birth-date');
    
    const inputName = nameInput ? nameInput.value.trim() : '';
    const inputBirthdate = birthdateInput ? birthdateInput.value : '';
    
    if (inputName) {
        userName = inputName;
        if (currentUser) {
            currentUser.display_name = inputName;
            // Здесь можно добавить сохранение display_name в Supabase
            // await supabase.from(TABLES.userProfiles).update({ display_name: inputName }).eq('telegram_id', currentUser.telegram_id);
        }
    }
    
    if (inputBirthdate) {
        userBirthdate = inputBirthdate;
        if (currentUser) {
            currentUser.birthdate = inputBirthdate;
            // Здесь можно добавить сохранение birthdate в Supabase
            // await supabase.from(TABLES.userProfiles).update({ birthdate: inputBirthdate }).eq('telegram_id', currentUser.telegram_id);
        }
    }
    
    hasLaunched = true;
    closeWelcomeModal(); // Используем ту же функцию для скрытия модалки
    
    if (inputName) {
        showNotification(`Добро пожаловать, ${inputName}! Карты готовы ответить на ваши вопросы ✨`);
    }
}

// Пропустить приветствие (теперь для модалки профиля)
function skipWelcome() {
    hasLaunched = true;
    closeWelcomeModal(); // Используем ту же функцию для скрытия модалки
}

// Закрытие приветственного модального окна (теперь для модалки профиля)
function closeWelcomeModal() {
    const modal = document.getElementById('profile-modal'); // Изменено на ID модалки профиля
    if (modal) {
        // modal.classList.remove('show'); // Если у вас есть класс show для fadeOut, оставьте
        modal.style.display = 'none'; // Просто скрываем
        // setTimeout(() => { modal.remove(); }, 300); // Не удаляем, просто скрываем
    }
}


// Вспомогательные функции
function showNotification(message) {
    if (tg && tg.showAlert) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

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
            // Позиционируем блестки относительно элемента, а не всего экрана
            const rect = element.getBoundingClientRect();
            sparkle.style.left = `${Math.random() * rect.width}px`;
            sparkle.style.top = `${Math.random() * rect.height}px`;
            sparkle.style.position = 'absolute'; // Убедитесь, что элемент имеет position: relative
            element.appendChild(sparkle);
            
            setTimeout(() => {
                sparkle.remove();
            }, 2000);
        }, i * 200);
    }
}

// Добавление в локальную историю
// Cards - теперь может быть либо массив объектов карт (для daily/question),
// либо массив объектов { card: {}, positionName: "", positionDescription: "" } (для spreads).
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
        cards: cards, // Здесь может быть cards (массив карт) или cardsWithPositions (массив {card, position})
        aiPrediction: aiPrediction
    };
    
    history.unshift(historyItem);
    
    const oneMonthAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
    history = history.filter(item => item.timestamp > oneMonthAgo);
    
    if (history.length > 100) {
        history = history.slice(0, 100);
    }
    
    console.log('📝 Добавлен в историю:', historyItem);
}

// Функции истории
async function loadHistory() {
    renderHistory();
}

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
            // Определяем иконку в зависимости от типа
            const typeIcon = item.type === 'daily' ? '🌅' : (item.type === 'question' ? '❓' : '🃏'); // Добавлена иконка для раскладов
            const typeColor = item.type === 'daily' ? '#ffd700' : (item.type === 'question' ? '#667eea' : '#a276b2'); // Добавлен цвет для раскладов
            
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
                            // Проверяем, это просто карта или объект с картой и позицией
                            const card = cardItem.card || cardItem; 
                            const positionName = cardItem.positionName || '';
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

// Подробный просмотр элемента истории
function viewHistoryDetail(id) {
    const item = history.find(h => h.id == id);
    if (!item) return;
    
    // Создаем модальное окно
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
                                ${positionName ? `<div class="card-position-name">${positionName}:</div>` : ''} <div class="card-meaning-detail">${card.meaning}</div>
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
    
    // Анимация появления
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
            modal.remove();
        }, 300);
    }
}

// Отправка в Telegram
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
    
    if (item.aiPrediction) {
        message += `🤖 ИИ-толкование:\n${item.aiPrediction}`;
    } else if (item.type === 'spread' && item.cards.some(c => c.interpretation)) {
        message += `🤖 ИИ-толкования карт:\n`;
        item.cards.forEach(cardItem => {
            message += `${cardItem.card.name}${cardItem.positionName ? ` (${cardItem.positionName})` : ''}: ${cardItem.interpretation || 'Нет толкования'}\n`;
        });
    }
    
    if (tg && tg.sendData) { // Изменено с tg.showAlert на tg.sendData
        // В Telegram Web App можем отправить данные в бота
        tg.sendData(JSON.stringify({
            type: 'history_share',
            data: item,
            text_message: message // Отправляем также форматированный текст для удобства
        }));
        tg.showAlert('Данные отправлены в бота!'); // Оповещение об отправке
    } else {
        // Фоллбэк - копируем в буфер обмена
        navigator.clipboard.writeText(message).then(() => {
            showNotification('Текст скопирован в буфер обмена!');
        }).catch(() => {
            showNotification('Не удалось скопировать текст');
        });
    }
}

function viewHistoryItem(id) {
    // Старая функция - теперь перенаправляем на новую
    viewHistoryDetail(id);
}

function clearHistory() {
    if (confirm('Удалить всю историю раскладов за последний месяц?')) {
        history = [];
        renderHistory();
    }
}

// Функции для отзывов
async function loadReviews() {
    console.log('📝 Загрузка отзывов');
    renderReviews();
}

function renderReviews() {
    const reviewsList = document.getElementById('reviews-list');
    if (!reviewsList) return;
    
    // Стандартные отзывы + локальные
    const staticReviews = [
        {
            id: 1,
            author: '@maria_k',
            rating: 5,
            text: 'Невероятно точные предсказания! Карта дня всегда в точку попадает. ИИ-толкования очень подробные и полезные.',
            date: '3 дня назад',
            isAnonymous: false
        },
        {
            id: 2,
            author: 'Анонимно',
            rating: 5,
            text: 'Премиум подписка стоит своих денег! Неограниченные вопросы и эксклюзивные расклады - то что нужно.',
            date: '5 дней назад',
            isAnonymous: true
        },
        {
            id: 3,
            author: '@alexey_777',
            rating: 4,
            text: 'Отличное приложение для ежедневного гадания. Интерфейс красивый, всё работает быстро.',
            date: '1 неделю назад',
            isAnonymous: false
        }
    ];
    
    // Объединяем статичные и локальные отзывы
    const allReviews = [...localReviews, ...staticReviews];
    
    let reviewsHTML = '';
    
    allReviews.forEach(review => {
        const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
        const isLongText = review.text.length > 150;
        const shortText = isLongText ? review.text.substring(0, 150) + '...' : review.text;
        
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
    
    // Обновляем статистику
    updateReviewsStats(allReviews);
}

function updateReviewsStats(reviews) {
    const totalReviews = reviews.length;
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;
    
    const reviewsTotalEl = document.getElementById('reviews-total');
    const ratingDisplay = document.querySelector('.rating');
    
    if (reviewsTotalEl) {
        reviewsTotalEl.textContent = totalReviews;
    }
    
    if (ratingDisplay) {
        const stars = '★'.repeat(Math.round(averageRating)) + '☆'.repeat(5 - Math.round(averageRating));
        ratingDisplay.textContent = `${averageRating.toFixed(1)} ${stars}`;
    }
}

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
        // Свернуть
        shortSpan.style.display = 'inline';
        fullSpan.style.display = 'none';
        expandText.style.display = 'inline';
        collapseText.style.display = 'none';
    } else {
        // Развернуть
        shortSpan.style.display = 'none';
        fullSpan.style.display = 'inline';
        expandText.style.display = 'none';
        collapseText.style.display = 'inline';
    }
}

async function submitReview() {
    const reviewText = document.getElementById('review-text');
    const anonymousCheckbox = document.getElementById('anonymous-review');
    
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
        // Создаем новый отзыв
        const isAnonymous = anonymousCheckbox ? anonymousCheckbox.checked : false;
        const authorName = isAnonymous ? 'Анонимно' : (userName || '@пользователь');
        
        const newReview = {
            id: Date.now(),
            author: authorName,
            rating: selectedRating,
            text: text,
            date: 'только что',
            isAnonymous: isAnonymous,
            timestamp: Date.now()
        };
        
        // Добавляем в начало массива локальных отзывов
        localReviews.unshift(newReview);
        
        // Анимация отправки
        const submitBtn = document.getElementById('submit-review-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Отправляется...';
        }
        
        // Имитация отправки
        setTimeout(() => {
            showNotification('Спасибо за отзыв! Он появился в списке ниже ✨');
            
            // Очищаем форму
            reviewText.value = '';
            selectedRating = 0;
            updateStarsDisplay();
            if (anonymousCheckbox) anonymousCheckbox.checked = false;
            
            // Обновляем отображение отзывов
            renderReviews();
            
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Отправить отзыв';
            }
            
            // Плавно прокручиваем к новому отзыву
            setTimeout(() => {
                const reviewsList = document.getElementById('reviews-list');
                if (reviewsList) {
                    reviewsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 300);
            
        }, 1500);
        
    } catch (error) {
        console.error('❌ Ошибка отправки отзыва:', error);
        showNotification('Ошибка при отправке отзыва');
        
        const submitBtn = document.getElementById('submit-review-btn');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить отзыв';
        }
    }
}

function updateStarsDisplay() {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < selectedRating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.style.color = '#ffd700';
        } else {
            star.style.color = '#444';
        }
    });
}

// Функции для раскладов
function openSpread(spreadType) {
    console.log('🃏 Открытие расклада:', spreadType);
    
    // Проверяем премиум статус (включая тестовый режим)
    const hasAccess = isPremium || testPremiumMode;
    
    if (!hasAccess) {
        checkAndShowSubscriptionBanner();
        return;
    }
    
    // Определяем тип расклада
    const spreadConfig = getSpreadConfig(spreadType);
    if (!spreadConfig) {
        showNotification('Неизвестный тип расклада');
        return;
    }
    
    currentSpread = {
        type: spreadType,
        config: spreadConfig,
        cards: [], // Этот массив будет заполнен объектами {card: {}, positionName: "", positionDescription: ""}
        interpretations: [], // Этот массив будет заполнен строками интерпретаций
        question: ''
    };
    
    showSpreadModal(spreadConfig);
}

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
    
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function startSpread() {
    const questionInput = document.getElementById('spread-question');
    const question = questionInput ? questionInput.value.trim() : '';
    
    if (currentSpread) {
        currentSpread.question = question;
    }
    
    closeSpreadModal();
    
    setTimeout(() => {
        showSpreadInterface();
    }, 300);
}

function showSpreadInterface() {
    if (!currentSpread) return;
    
    const { config } = currentSpread;
    
    // Скрываем список раскладов и показываем интерфейс расклада
    const spreadsGrid = document.querySelector('.spreads-grid');
    const spreadDetail = document.getElementById('spread-detail');
    
    if (spreadsGrid) spreadsGrid.style.display = 'none';
    if (spreadDetail) {
        spreadDetail.style.display = 'block';
        
        // Обновляем содержимое
        const spreadTitle = document.getElementById('spread-title');
        const spreadCardsContainer = document.getElementById('spread-cards-container');
        const drawSpreadBtn = document.getElementById('draw-spread-btn');
        
        if (spreadTitle) {
            spreadTitle.innerHTML = `
                ${config.name}
                ${currentSpread.question ? `<div class="spread-question-display">❓ ${currentSpread.question}</div>` : ''}
            `;
        }
        
        if (spreadCardsContainer) {
            spreadCardsContainer.innerHTML = generateSpreadLayout(config);
        }
        
        if (drawSpreadBtn) {
            drawSpreadBtn.textContent = `🃏 Вытянуть ${config.positions.length} карт`;
            drawSpreadBtn.style.display = 'block';
            drawSpreadBtn.disabled = false; // Убеждаемся что кнопка активна
            
            // Перепривязываем обработчик
            drawSpreadBtn.onclick = drawSpread;
        }
        
        // Убеждаемся что кнопка "Назад" работает
        const backBtn = spreadDetail.querySelector('.back-btn');
        if (backBtn) {
            backBtn.onclick = closeSpread;
        }
    }
}

// Эта функция должна быть вне showSpreadInterface, как и в вашем коде
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

async function drawSpread() {
    console.log('🃏 Начинаем drawSpread, currentSpread:', currentSpread);
    
    if (!currentSpread) {
        console.error('❌ currentSpread is null');
        showNotification('Ошибка: расклад не выбран');
        return;
    }
    
    const { config } = currentSpread;
    const drawBtn = document.getElementById('draw-spread-btn');
    const loading = document.getElementById('spread-loading');
    
    console.log('🎯 Элементы найдены:', { drawBtn: !!drawBtn, loading: !!loading });
    
    try {
        if (drawBtn) {
            drawBtn.style.display = 'none';
            drawBtn.disabled = true;
        }
        
        if (loading) {
            loading.style.display = 'block';
        }
        
        // Генерируем уникальные карты для расклада
        const spreadCards = [];
        const usedCards = new Set();
        
        console.log('🃏 Генерируем карты для', config.positions.length, 'позиций');
        
        for (let i = 0; i < config.positions.length; i++) {
            let randomCard;
            let attempts = 0;
            do {
                randomCard = getRandomCard();
                attempts++;
                if (attempts > 100) {
                    console.error('❌ Слишком много попыток генерации уникальных карт');
                    break;
                }
            } while (usedCards.has(randomCard.name) && attempts <= 100);
            
            usedCards.add(randomCard.name);
            spreadCards.push(randomCard);
        }
        
        currentSpread.cards = spreadCards; // Массив только карт (для логики расклада)
        currentSpread.interpretations = []; // Массив для интерпретаций (строки)
        console.log('✅ Карты сгенерированы:', spreadCards.length);
        
        // Анимированное открытие карт по очереди
        for (let i = 0; i < spreadCards.length; i++) {
            console.log(`🎴 Открываем карту ${i + 1}/${spreadCards.length}`);
            
            await new Promise(resolve => {
                setTimeout(async () => {
                    try {
                        const interpretation = await revealSpreadCard(i, spreadCards[i], config.positions[i]);
                        // Сохраняем интерпретацию в объекте карты внутри currentSpread.cards для истории
                        currentSpread.cards[i].interpretation = interpretation;
                        resolve();
                    } catch (error) {
                        console.error(`❌ Ошибка при открытии карты ${i}:`, error);
                        resolve();
                    }
                }, i * 800);
            });
        }
        
        if (loading) {
            loading.style.display = 'none';
        }
        
        // Показываем кнопку для просмотра интерпретаций
        showInterpretationsButton();
        
        console.log('✅ Все карты открыты, добавляем в историю');

        // Подготовка данных для истории с позициями
        // Этот массив historyCards будет содержать объекты {card, positionName, positionDescription, interpretation}
        const historyCards = currentSpread.cards.map((card, index) => {
            const position = currentSpread.config.positions[index];
            return {
                card: card, // Сама карта (уже может содержать .interpretation)
                positionName: position.name,
                positionDescription: position.description,
                interpretation: card.interpretation // Добавляем интерпретацию здесь
            };
        });
        
        // Добавляем в историю. aiPrediction для раскладов не нужен, т.к. толкования на каждую карту.
        addToLocalHistory('spread', config.name, currentSpread.question || '', historyCards, ''); 
        
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

// ИЗМЕНЕНИЕ В ФУНКЦИИ addToLocalHistory:
// Теперь она должна принимать 'cards' как массив объектов,
// где каждый объект содержит 'card' и 'positionName'/'positionDescription'.
// Для daily/question cards будет просто массив объектов карт.
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
        cards: cards, // Здесь может быть cards (массив карт) или cardsWithPositions (массив {card, position, interpretation})
        aiPrediction: aiPrediction // Для раскладов обычно пусто, для вопросов/daily - текст
    };
    
    history.unshift(historyItem);
    
    const oneMonthAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
    history = history.filter(item => item.timestamp > oneMonthAgo);
    
    if (history.length > 100) {
        history = history.slice(0, 100);
    }
    
    console.log('📝 Добавлен в историю:', historyItem);
}


function showInterpretationsButton() {
    const spreadDetail = document.getElementById('spread-detail');
    if (!spreadDetail) return;
    
    // Удаляем старую кнопку если есть
    const oldBtn = spreadDetail.querySelector('.show-interpretations-btn');
    if (oldBtn) oldBtn.remove();
    
    // Создаем новую кнопку
    const button = document.createElement('button');
    button.className = 'show-interpretations-btn';
    button.textContent = '🔮 Посмотреть толкования карт';
    button.onclick = showInterpretationsModal;
    
    spreadDetail.appendChild(button);
}

function showInterpretationsModal() {
    // currentSpread.cards теперь содержит объекты {card: {}, positionName: "", interpretation: ""}
    if (!currentSpread || !currentSpread.cards) return; 
    
    const modal = document.createElement('div');
    modal.className = 'interpretations-modal';
    
    let interpretationsHTML = '';
    currentSpread.cards.forEach((cardItem, index) => { // Итерируем по historyCards-подобным объектам
        const card = cardItem.card; // Получаем сам объект карты
        const positionName = cardItem.positionName; // Получаем имя позиции
        const interpretation = cardItem.interpretation; // Получаем интерпретацию

        interpretationsHTML += `
            <div class="interpretation-item">
                <div class="interpretation-card-info">
                    <div class="interpretation-card-symbol">${card.symbol}</div>
                    <div class="interpretation-card-details">
                        <h4>${card.name}</h4>
                        <p class="position-name">${positionName} - ${currentSpread.config.positions[index].description}</p>
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
    
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeInterpretationsModal() {
    const modal = document.querySelector('.interpretations-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// revealSpreadCard теперь ВОЗВРАЩАЕТ интерпретацию, а не просто сохраняет
async function revealSpreadCard(index, card, position) {
    console.log(`🎴 revealSpreadCard: ${index}, карта: ${card.name}`);
    
    const cardSlot = document.getElementById(`spread-card-${index}`);
    if (!cardSlot) {
        console.error(`❌ Не найден элемент spread-card-${index}`);
        return ''; // Возвращаем пустую строку при ошибке
    }
    
    try {
        // Добавляем блестки
        addSparkles(cardSlot);
        
        await new Promise(resolve => {
            setTimeout(() => {
                // Показываем карту
                cardSlot.innerHTML = `
                    <div class="card-name">${card.name}</div>
                    <img src="${card.image}" alt="${card.name}" class="card-image" onerror="this.style.display='none'">
                    <div class="card-symbol">${card.symbol}</div>
                    <div class="card-meaning">${card.meaning}</div>
                `;
                
                cardSlot.classList.add('flipped');
                console.log(`✅ Карта ${index} показана`);
                resolve();
            }, 1000);
        });
        
        // Генерируем и ВОЗВРАЩАЕМ толкование для позиции
        const interpretation = generatePositionInterpretation(card, position, currentSpread.question);
        return interpretation; // Возвращаем интерпретацию
        
    } catch (error) {
        console.error(`❌ Ошибка в revealSpreadCard ${index}:`, error);
        return ''; // Возвращаем пустую строку при ошибке
    }
}

function generatePositionInterpretation(card, position, question) {
    const templates = [
        `В позиции "${position.name}" карта "${card.name}" указывает на то, что ${card.meaning.toLowerCase()} Это особенно важно учесть в контексте ${position.description.toLowerCase()}.`,
        `"${card.name}" в позиции "${position.name}" говорит: ${card.meaning.toLowerCase()} Обратите внимание на то, как это влияет на ${position.description.toLowerCase()}.`,
        `Позиция "${position.name}" раскрывается через карту "${card.name}": ${card.meaning.toLowerCase()} Это ключевой аспект для понимания ${position.description.toLowerCase()}.`
    ];
    
    let interpretation = templates[Math.floor(Math.random() * templates.length)];
    
    if (question) {
        interpretation += ` В контексте вашего вопроса "${question}" это означает важный шаг к пониманию ситуации.`;
    }
    
    return interpretation;
}

function closeSpread() {
    const spreadsGrid = document.querySelector('.spreads-grid');
    const spreadDetail = document.getElementById('spread-detail');
    
    if (spreadsGrid) spreadsGrid.style.display = 'grid';
    if (spreadDetail) spreadDetail.style.display = 'none';
    
    currentSpread = null;
}

function closeSpreadModal() {
    const modal = document.querySelector('.spread-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Тестовая кнопка премиум режима
function addTestPremiumButton() {
    // Добавляем тестовую кнопку только в режиме разработки
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
    // Обновляем статус подписки, чтобы UI сразу отреагировал
    updateSubscriptionStatus(isPremium || testPremiumMode); 
    // Также обновляем количество вопросов
    updateQuestionsDisplay();
}

// Функции-заглушки для Supabase
async function saveDailyCardToSupabase(card) {
    console.log('💾 Сохранение карты дня:', card.name);
    if (!supabase || !currentUser) {
        console.warn('Supabase или currentUser не инициализированы, пропуск сохранения.');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from(TABLES.dailyCards)
            .insert([{
                user_id: currentUser.telegram_id,
                card_name: card.name,
                card_symbol: card.symbol,
                card_meaning: card.meaning,
                drawn_date: new Date().toISOString().split('T')[0]
            }])
            .select(); // Добавлено .select() для получения возвращаемых данных, если нужны
        
        if (error) throw error;
        console.log('✅ Карта дня сохранена в Supabase:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения карты дня в Supabase:', error);
        return null;
    }
}

async function saveQuestionToSupabase(question, isFollowUp) {
    console.log('💾 Сохранение вопроса:', question);
    if (!supabase || !currentUser) {
        console.warn('Supabase или currentUser не инициализированы, пропуск сохранения.');
        return { id: Date.now() }; // Возвращаем фейковый ID для продолжения работы
    }
    
    try {
        const { data, error } = await supabase
            .from(TABLES.questions)
            .insert([{
                user_id: currentUser.telegram_id,
                question_text: question,
                is_follow_up: isFollowUp,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        console.log('✅ Вопрос сохранен в Supabase:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения вопроса в Supabase:', error);
        return { id: Date.now() }; // Возвращаем фейковый ID
    }
}

async function saveAnswerToSupabase(questionId, card, aiPrediction) {
    console.log('💾 Сохранение ответа для вопроса:', questionId);
    if (!supabase || !currentUser) {
        console.warn('Supabase или currentUser не инициализированы, пропуск сохранения.');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from(TABLES.answers)
            .insert([{
                question_id: questionId,
                user_id: currentUser.telegram_id,
                card_name: card.name,
                card_symbol: card.symbol,
                card_meaning: card.meaning,
                ai_prediction: aiPrediction,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        console.log('✅ Ответ сохранен в Supabase:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения ответа в Supabase:', error);
        return null;
    }
}

async function updateUserQuestionsInSupabase() {
    console.log('💾 Обновление количества вопросов:', questionsLeft);
    if (!supabase || !currentUser) {
        console.warn('Supabase или currentUser не инициализированы, пропуск обновления.');
        return;
    }
    
    try {
        const { error } = await supabase
            .from(TABLES.userProfiles)
            .update({ free_questions_left: questionsLeft })
            .eq('telegram_id', currentUser.telegram_id);
        
        if (error) throw error;
        console.log('✅ Количество вопросов обновлено в Supabase.');
    } catch (error) {
        console.error('❌ Ошибка обновления количества вопросов в Supabase:', error);
    }
}

// Проверка работы
console.log('🔮 Script.js (полная исправленная версия) загружен успешно!');

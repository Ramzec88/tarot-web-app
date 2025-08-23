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
    history: []
};

// 📦 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let allCards = [];
let isInitialized = false;
let currentRating = 0;

// 🎯 DOM ЭЛЕМЕНТЫ
let mainNav, secondaryNav, tabContents;
let tarotCard, cardBack, cardFront, cardImage;
let cardInfoAfterFlip, flippedCardName, cardIntroText;
let aiAnswerContainer, aiInterpretationTitle, aiInterpretationTextElement;
let afterDailyCardBanner, askMoreQuestionsBtn, premiumBannerBtn;
let starAnimationContainer, questionsLeftElement;
let questionTextarea, submitQuestionBtn, charCounter;
let loadingState, questionAnswerContainer, questionAnswerText, questionCardImage;
let premiumTestToggle, premiumTestLabel;
let clarifyingQuestionContainer, clarifyingQuestionTextarea, submitClarifyingQuestionBtn, clarifyingQuestionWarning;

// 🔮 ВРЕМЕННАЯ СИМУЛЯЦИЯ ИИ-ОТВЕТА
const simulatedAiText = "Глубокое погружение в энергии дня показывает, что перед вами открываются новые возможности для творчества и самовыражения. Используйте этот период для развития своих скрытых талантов и проявления уникальности. Избегайте сомнений и смело идите вперед, доверяя своей интуиции. Сегодняшний день благоприятен для начала новых проектов и установления гармоничных отношений с окружающими. Помните, что истинная сила исходит изнутри, и, проявляя ее, вы сможете преодолеть любые препятствия.";

// 📝 РАНДОМНЫЕ ТЕКСТЫ ПЕРЕД ИИ-ИНТЕРПРЕТАЦИЕЙ
const preInterpretationPhrases = [
    "Сейчас узнаем, что ждет тебя сегодня...",
    "Приоткрываем завесу тайны дня...",
    "Давайте расшифруем послание Вселенной...",
    "Готовы к предсказанию, которое раскроет ваш потенциал?",
    "Погружаемся в глубины мудрости Таро, чтобы узнать ваше будущее..."
];

// ========================================================================
// 💾 УПРАВЛЕНИЕ СОСТОЯНИЕМ
// ========================================================================

function saveAppState() {
    try {
        localStorage.setItem('tarotAppState', JSON.stringify(appState));
        console.log('✅ Состояние сохранено');
    } catch (error) {
        console.error('❌ Ошибка сохранения состояния:', error);
    }
}

function loadAppState() {
    try {
        const saved = localStorage.getItem('tarotAppState');
        if (saved) {
            const parsedState = JSON.parse(saved);
            appState = { ...appState, ...parsedState };
            console.log('✅ Состояние загружено:', appState);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки состояния:', error);
        appState = { ...appState };
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
        console.log('🃏 Загрузка карт из cards.json...');
        
        const possiblePaths = [
            './cards.json',
            '/cards.json',
            'cards.json'
        ];
        
        let cardsLoaded = false;
        
        for (const path of possiblePaths) {
            try {
                console.log(`Попытка загрузки из: ${path}`);
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
                        console.log('🖼️ Примеры изображений:', allCards.slice(0, 3).map(c => ({ 
                            name: c.name, 
                            image: c.image,
                            imageUpright: c.imageUpright,
                            imageReversed: c.imageReversed
                        })));
                        
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
    
    return `https://via.placeholder.com/180x270/${colorPair}?text=${symbol}+${name}&fontSize=16`;
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

// Функция проверки доступности изображения
async function checkImageAvailability(imagePath) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = imagePath;
        
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

function animateStars(count = 3) {
    if (!starAnimationContainer) return;
    
    starAnimationContainer.innerHTML = '';
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
        
        starAnimationContainer.appendChild(star);
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
        resetDailyCardState();
    }
    
    // Обновляем счетчик вопросов при переходе на вкладку вопросов
    if (tabId === 'question') {
        updateQuestionsCounter();
    }
    
    // Обновляем историю при переходе на вкладку истории
    if (tabId === 'history') {
        updateHistoryDisplay();
    }
}

function resetDailyCardState() {
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
    
    // Проверяем, нужно ли сбросить использование карты дня для нового дня
    const today = new Date().toDateString();
    if (appState.lastCardDate !== today) {
        appState.dailyCardUsed = false;
        saveAppState();
        console.log('✅ Карта дня сброшена для нового дня');
    }
}

// ========================================================================
// 🃏 ОБРАБОТКА КАРТЫ ДНЯ (ИСПРАВЛЕНО С УЛУЧШЕННОЙ ЗАГРУЗКОЙ ИЗОБРАЖЕНИЙ)
// ========================================================================

async function handleDailyCardClick() {
    console.log('🃏 Обработка клика по карте дня');
    
    if (appState.dailyCardUsed) {
        showMessage('Карта дня уже была получена сегодня! Вы можете получить новую карту завтра.', 'info');
        return;
    }

    // Сбрасываем состояние для нового переворота
    resetDailyCardState();
    
    // Показываем звездочки
    animateStars(3);

    // Переворачиваем карту
    tarotCard.classList.add('flipped');

    // Выбираем случайную карту
    const randomCard = getRandomCard();

    // Обновляем содержимое карты через половину анимации
    setTimeout(async () => {
        starAnimationContainer.innerHTML = '';
        
        if (cardImage && randomCard.displayImage) {
            // Проверяем доступность изображения
            const imageAvailable = await checkImageAvailability(randomCard.displayImage);
            
            if (imageAvailable) {
                console.log('✅ Изображение доступно:', randomCard.displayImage);
                cardImage.src = randomCard.displayImage;
            } else {
                console.warn('⚠️ Изображение недоступно, используем placeholder:', randomCard.displayImage);
                cardImage.src = createCardPlaceholder(randomCard);
            }
            
            cardImage.alt = randomCard.name;
            
            // Добавляем обработчики для отслеживания загрузки
            cardImage.onload = function() {
                console.log('✅ Изображение карты успешно загружено');
            };
            
            cardImage.onerror = function() {
                console.warn('❌ Ошибка загрузки изображения, устанавливаем placeholder');
                this.src = createCardPlaceholder(randomCard);
            };
        }
        
        cardFront?.classList.remove('hidden');
        cardBack?.classList.add('hidden');
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

        // Печатаем ИИ-текст
        const interpretationText = randomCard.description || simulatedAiText;
        await typeText(aiInterpretationTextElement, interpretationText);

        // Показываем баннер
        setTimeout(() => {
            afterDailyCardBanner?.classList.remove('hidden');
            afterDailyCardBanner?.classList.add('show');
        }, 500);

        // Сохраняем в историю
        await addToHistory('daily-card', randomCard.name, interpretationText);
        
    }, 800);

    // Обновляем состояние
    appState.dailyCardUsed = true;
    appState.lastCardDate = new Date().toDateString();
    saveAppState();
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
    
    // Показываем загрузку
    loadingState?.classList.remove('hidden');
    questionAnswerContainer?.classList.add('hidden');
    submitQuestionBtn.disabled = true;
    
    try {
        // Симулируем обработку вопроса
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Выбираем случайную карту для ответа
        const randomCard = getRandomCard();
        const orientationText = randomCard.isReversed ? ' (перевернутая)' : '';
        const answer = `На ваш вопрос "${question}" карты отвечают через ${randomCard.name}${orientationText}:\n\n${randomCard.description || simulatedAiText}`;
        
        // Показываем ответ
        loadingState?.classList.add('hidden');
        
        if (questionCardImage) {
            // Проверяем доступность изображения
            const imageAvailable = await checkImageAvailability(randomCard.displayImage);
            
            if (imageAvailable) {
                questionCardImage.src = randomCard.displayImage;
            } else {
                questionCardImage.src = createCardPlaceholder(randomCard);
            }
            
            questionCardImage.classList.remove('hidden');
        }

        if (questionAnswerText) {
            await typeText(questionAnswerText, answer);
        }

        // Обновляем счетчики
        if (!appState.isPremium) {
            appState.questionsUsed++;
            saveAppState();
            updateQuestionsCounter();
        }

        // Сохраняем в историю
        await addToHistory('clarifying-question', question, answer);

        // Очищаем форму
        clarifyingQuestionTextarea.value = '';

        showMessage('Уточнение получено!', 'success');

    } catch (error) {
        console.error('❌ Ошибка при обработке уточняющего вопроса:', error);
        loadingState?.classList.add('hidden');
        showMessage('Произошла ошибка. Попробуйте еще раз.', 'error');
    } finally {
        submitClarifyingQuestionBtn.disabled = false;
    }
}

// ========================================================================
// 📚 ИСТОРИЯ
// ========================================================================

async function addToHistory(type, title, content) {
    const telegramId = getTelegramUserId();
    
    try {
        if (window.TarotDB && window.TarotDB.isConnected()) {
            // Сохраняем в Supabase
            if (type === 'daily-card') {
                await window.TarotDB.saveDailyCard(telegramId, {
                    id: Date.now(),
                    name: title,
                    interpretation: content
                });
            } else if (type === 'question') {
                const question = await window.TarotDB.saveQuestion(telegramId, title);
                if (question) {
                    await window.TarotDB.saveAnswer(question.id, {
                        id: Date.now(),
                        name: 'AI Response'
                    }, content);
                }
            }
        }
    } catch (error) {
        console.error('❌ Ошибка сохранения в Supabase:', error);
    }
    
    // Локальное сохранение как fallback
    const historyItem = {
        id: Date.now(),
        type: type,
        title: title,
        content: content,
        date: new Date().toLocaleString('ru-RU')
    };
    
    appState.history.unshift(historyItem);
    
    // Ограничиваем количество записей
    if (appState.history.length > 50) {
        appState.history = appState.history.slice(0, 50);
    }
    
    saveAppState();
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
        historyItemElement.innerHTML = `
            <div class="history-header">
                <div class="history-type">${item.type === 'daily-card' ? '🃏 Карта дня' : '❓ Вопрос'}</div>
                <div class="history-date">${item.date}</div>
            </div>
            <div class="history-title">${item.title}</div>
            <div class="history-content">${item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content}</div>
        `;
        
        // Добавляем обработчик клика для раскрытия полного содержимого
        historyItemElement.addEventListener('click', () => {
            const content = historyItemElement.querySelector('.history-content');
            if (content.textContent.endsWith('...')) {
                content.textContent = item.content;
            } else {
                content.textContent = item.content.length > 100 ? item.content.substring(0, 100) + '...' : item.content;
            }
        });
        
        historyList.appendChild(historyItemElement);
    });
}

// ========================================================================
// ⭐ ОТЗЫВЫ
// ========================================================================

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

function handleSubmitReview() {
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
    
    // Здесь можно отправить отзыв на сервер
    console.log('📝 Отзыв отправлен:', { rating, text });
    
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

function handlePremiumTestToggle() {
    const isPremium = premiumTestToggle.checked;
    appState.isPremium = isPremium;
    saveAppState();
    updateSubscriptionStatus(isPremium);
    updateQuestionsCounter();
    showMessage(`Режим изменен на ${isPremium ? 'Premium' : 'Базовый'}`, 'info');
}

function handlePremiumPurchase() {
    // Здесь должна быть интеграция с платежной системой
    console.log('💰 Покупка Premium');
    
    // Симулируем успешную покупку для демо
    appState.isPremium = true;
    saveAppState();
    updateSubscriptionStatus(true);
    updateQuestionsCounter();
    
    showMessage('Premium активирован! Теперь у вас безлимитные возможности!', 'success');
}

// ========================================================================
// 🛠️ УТИЛИТЫ
// ========================================================================

function getTelegramUserId() {
    // Пытаемся получить ID пользователя из Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        return window.Telegram.WebApp.initDataUnsafe.user.id;
    }
    
    // Fallback для тестирования
    return 'test_user_' + Date.now();
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
    
    // Карта дня
    tarotCard = document.getElementById('tarotCard');
    cardBack = tarotCard?.querySelector('.card-back');
    cardFront = tarotCard?.querySelector('.card-front');
    cardImage = document.getElementById('cardImage');
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
    questionCardImage = document.getElementById('questionCardImage');
    
    // Уточняющий вопрос
    clarifyingQuestionContainer = document.getElementById('clarifyingQuestionContainer');
    clarifyingQuestionTextarea = document.getElementById('clarifyingQuestionTextarea');
    submitClarifyingQuestionBtn = document.getElementById('submitClarifyingQuestionBtn');
    clarifyingQuestionWarning = document.getElementById('clarifyingQuestionWarning');

    // Test Toggle
    premiumTestToggle = document.getElementById('premiumTestToggle');
    premiumTestLabel = document.getElementById('premiumTestLabel');

    console.log('✅ DOM элементы инициализированы');
}

// ========================================================================
// 🎮 НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
// ========================================================================

function setupEventListeners() {
    console.log('🎮 Настройка обработчиков событий...');
    
    // Навигация
    mainNav?.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-tab')) {
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

    // Test Toggle
    premiumTestToggle?.addEventListener('change', handlePremiumTestToggle);
    
    console.log('✅ Обработчики событий настроены');
}

// ========================================================================
// 🚀 ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
// ========================================================================

async function initApp() {
    console.log('🚀 Инициализация приложения...');
    
    try {
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
        
        // 3. Загружаем состояние
        loadAppState();
        
        // 4. Загружаем карты
        await loadCards();
        
        // 5. Настраиваем обработчики
        setupEventListeners();
        
        // 6. Обновляем UI
        updateSubscriptionStatus(appState.isPremium);
        updateQuestionsCounter();
        updateHistoryDisplay();
        
        // 7. Инициализируем Telegram WebApp если доступен
        initializeTelegramWebApp();
        
        isInitialized = true;
        console.log('✅ Приложение успешно инициализировано');
        
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
            
            // Устанавливаем цвета темы
            window.Telegram.WebApp.setHeaderColor('#1a1a2e');
            window.Telegram.WebApp.setBackgroundColor('#1a1a2e');
            
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
    testImg.src = randomCard.displayImage;
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

// Запускаем приложение после загрузки DOM
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏁 DOM готов, запускаем приложение...');
    await initApp();
});

// Запасной вариант инициализации
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
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
    normalizeImagePath
};Card.displayImage;
            } else {
                questionCardImage.src = createCardPlaceholder(randomCard);
            }
            
            questionCardImage.classList.remove('hidden');
        }

        if (questionAnswerText) {
            await typeText(questionAnswerText, answer);
        }
        questionAnswerContainer?.classList.remove('hidden');
        questionAnswerContainer?.classList.add('show');
        
        clarifyingQuestionContainer?.classList.remove('hidden');
        if (!appState.isPremium) {
            clarifyingQuestionWarning?.classList.remove('hidden');
        } else {
            clarifyingQuestionWarning?.classList.add('hidden');
        }

        // Обновляем счетчики
        if (!appState.isPremium) {
            appState.questionsUsed++;
            saveAppState();
            updateQuestionsCounter();
        }
        
        // Сохраняем в историю
        await addToHistory('question', question, answer);
        
        // Очищаем форму
        questionTextarea.value = '';
        handleQuestionInput();
        
        showMessage('Ответ получен!', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка при обработке вопроса:', error);
        loadingState?.classList.add('hidden');
        showMessage('Произошла ошибка. Попробуйте еще раз.', 'error');
    } finally {
        submitQuestionBtn.disabled = false;
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

    // Показываем загрузку
    loadingState?.classList.remove('hidden');
    submitClarifyingQuestionBtn.disabled = true;

    try {
        // Симулируем обработку вопроса
        await new Promise(resolve => setTimeout(resolve, 2000));

        const randomCard = getRandomCard();
        const orientationText = randomCard.isReversed ? ' (перевернутая)' : '';
        const answer = `На ваш уточняющий вопрос "${question}" карты отвечают через ${randomCard.name}${orientationText}:\n\n${randomCard.description || simulatedAiText}`;

        // Показываем ответ
        loadingState?.classList.add('hidden');

        if (questionCardImage) {
            // Проверяем доступность изображения
            const imageAvailable = await checkImageAvailability(randomCard.displayImage);
            
            if (imageAvailable) {
                questionCardImage.src = random

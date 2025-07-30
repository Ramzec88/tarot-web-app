document.addEventListener('DOMContentLoaded', () => {
    const mainNav = document.getElementById('mainNav');
    const secondaryNav = document.getElementById('secondaryNav');
    const tabContents = document.querySelectorAll('.tab-content');

    const tarotCard = document.getElementById('tarotCard');
    const cardBack = tarotCard.querySelector('.card-back');
    const cardFront = tarotCard.querySelector('.card-front');
    const cardImage = document.getElementById('cardImage');
    const cardInfoAfterFlip = document.getElementById('cardInfoAfterFlip');
    const flippedCardName = document.getElementById('flippedCardName');
    const cardIntroText = document.getElementById('cardIntroText'); // Новый элемент для вводного текста

    // const preInterpretationTextElement = document.getElementById('preInterpretationText'); // Удален, текст теперь в cardIntroText
    const aiAnswerContainer = document.getElementById('aiAnswerContainer');
    const aiInterpretationTitle = document.getElementById('aiInterpretationTitle');
    const aiInterpretationTextElement = document.getElementById('aiInterpretationText');
    const afterDailyCardBanner = document.getElementById('afterDailyCardBanner');
    const askMoreQuestionsBtn = document.getElementById('askMoreQuestionsBtn');
    const premiumBannerBtn = document.getElementById('premiumBannerBtn');

    const starAnimationContainer = document.getElementById('starAnimationContainer'); // Теперь внутри tarotCard

    let allCards = []; // Для хранения данных карт из JSON

    // Временная симуляция текста от n8n ИИ-агента
    const simulatedAiText = "Глубокое погружение в энергии дня показывает, что перед вами открываются новые возможности для творчества и самовыражения. Используйте этот период для развития своих скрытых талантов и проявления уникальности. Избегайте сомнений и смело идите вперед, доверяя своей интуиции. Сегодняшний день благоприятен для начала новых проектов и установления гармоничных отношений с окружающими. Помните, что истинная сила исходит изнутри, и, проявляя ее, вы сможете преодолеть любые препятствия.";

    // Рандомные тексты перед ИИ-интерпретацией
    const preInterpretationPhrases = [
        "Сейчас узнаем, что ждет тебя сегодня...",
        "Приоткрываем завесу тайны дня...",
        "Давайте расшифруем послание Вселенной...",
        "Готовы к предсказанию, которое раскроет ваш потенциал?",
        "Погружаемся в глубины мудрости Таро, чтобы узнать ваше будущее..."
    ];

    // Функция для переключения вкладок
    function switchTab(tabId) {
        tabContents.forEach(content => {
            content.classList.remove('active');
            content.classList.add('hidden');
        });
        document.getElementById(tabId).classList.add('active');
        document.getElementById(tabId).classList.remove('hidden');

        const allNavTabs = document.querySelectorAll('.nav-tab');
        allNavTabs.forEach(tab => tab.classList.remove('active'));

        const targetNavTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
        if (targetNavTab) {
            targetNavTab.classList.add('active');
        }

        if (tabId !== 'daily-card-tab-content') { // Исправлен ID
            resetDailyCardState();
        }
    }

    // Функция для сброса состояния карты дня
    function resetDailyCardState() {
        tarotCard.classList.remove('flipped');
        cardFront.classList.add('hidden');
        cardBack.classList.remove('hidden');
        cardInfoAfterFlip.classList.add('hidden');
        cardIntroText.textContent = ''; // Очищаем вводный текст
        aiAnswerContainer.classList.remove('show');
        aiAnswerContainer.classList.add('hidden');
        afterDailyCardBanner.classList.remove('show');
        afterDailyCardBanner.classList.add('hidden');
        aiInterpretationTextElement.textContent = '';
        aiInterpretationTextElement.classList.remove('finished-typing');
        starAnimationContainer.innerHTML = ''; // Очищаем звездочки
        
        // Сбрасываем использованную карту дня только если это новый день
        const today = new Date().toDateString();
        const lastCardDate = appState.lastCardDate;
        if (lastCardDate !== today) {
            appState.dailyCardUsed = false;
            saveAppState();
            console.log('Daily card reset for new day.');
        }
    }

    // Функция для обновления статуса подписки
    function updateSubscriptionStatus(isPremium = false) {
        const statusElement = document.getElementById('subscriptionStatus'); // ID изменен в HTML
        const statusIcon = document.getElementById('statusIcon');
        const statusText = document.getElementById('statusText');

        if (isPremium) {
            statusElement.classList.add('premium');
            statusIcon.textContent = '👑';
            statusText.textContent = 'Premium-подписка';
        } else {
            statusElement.classList.remove('premium');
            statusIcon.textContent = '🌑'; // Черная круглая луна
            statusText.textContent = 'Базовый вариант';
        }
    }

    // Загрузка данных карт из cards.json
    async function loadCards() {
        try {
            // Используем прямой путь, если файл лежит рядом
            const response = await fetch('cards.json.txt'); // Убедитесь, что cards.json.txt лежит рядом
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allCards = await response.json();
            console.log('Cards loaded:', allCards);
        } catch (error) {
            console.error('Error loading cards:', error);
            // Если не удалось загрузить, используем fallbackCards
            allCards = getFallbackCards(); 
            console.log('Using fallback cards:', allCards);
        }
    }

    // Анимация звездочек (теперь внутри карты)
    function animateStars(count = 3) { // Всего 3 смайла
        starAnimationContainer.innerHTML = '';
        const stars = ['✨', '🌟', '💫']; 
        const positions = [ // Позиции для 3 звездочек
            { x: '10%', y: '20%' }, // Левая верхняя
            { x: '15%', y: '80%' }, // Левая нижняя
            { x: '80%', y: '50%' }  // Правая середина
        ];

        for (let i = 0; i < count; i++) {
            const star = document.createElement('span');
            star.textContent = stars[i % stars.length]; // Используем все 3 разных смайла
            star.classList.add('sparkle-star');
            
            star.style.left = positions[i].x;
            star.style.top = positions[i].y;
            
            star.style.animationDelay = `${i * 0.1}s`; // Небольшая задержка для каждого смайла
            star.style.animationDuration = `${0.8 + Math.random() * 0.4}s`; // Длительность анимации
            starAnimationContainer.appendChild(star);
        }
    }

    // Анимация печати текста
    function typeText(element, text, speed = 15) { // Уменьшил скорость для плавности
        let i = 0;
        element.textContent = ''; 
        element.classList.remove('finished-typing');

        return new Promise(resolve => {
            function typeChar() {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    requestAnimationFrame(typeChar); // Использовать requestAnimationFrame для более плавной анимации
                } else {
                    element.classList.add('finished-typing');
                    resolve();
                }
            }
            requestAnimationFrame(typeChar);
        });
    }

    // Обработчик нажатия на карту дня
    async function handleDailyCardClick() {
        if (appState.dailyCardUsed) {
            showMessage('Карта дня уже была получена сегодня! Вы можете получить новую карту завтра.', 'info');
            return;
        }

        // Сбросить состояние для нового переворота
        resetDailyCardState(); 
        
        // Показываем звездочки сразу
        animateStars(3); 

        // 1. Переворачиваем карту (CSS-анимация)
        tarotCard.classList.add('flipped');

        // Выбираем случайную карту
        const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
        console.log('Selected card:', randomCard);

        // Ждем половину анимации, чтобы обновить содержимое
        setTimeout(() => {
            // Скрываем звездочки после половины анимации, чтобы они не мешали
            starAnimationContainer.innerHTML = '';

            // Обновляем изображение и информацию на лицевой стороне
            cardImage.src = randomCard.image;
            cardImage.alt = randomCard.name;
            cardFront.classList.remove('hidden');
            cardBack.classList.add('hidden');
        }, 400); // Половина от 0.8s анимации cardFlip

        // После полной анимации переворота карты и скрытия звездочек
        setTimeout(() => {
            // Показываем имя карты и вводный текст
            flippedCardName.textContent = `${randomCard.name} ${randomCard.symbol || ''}`; // Используем symbol из cards.json
            cardInfoAfterFlip.classList.remove('hidden');

            const randomPrePhrase = preInterpretationPhrases[Math.floor(Math.random() * preInterpretationPhrases.length)];
            cardIntroText.textContent = randomPrePhrase;
            cardIntroText.classList.remove('hidden'); // Показываем вводный текст
            
            // Заголовок ИИ-интерпретации
            aiInterpretationTitle.textContent = 'ИИ-интерпретация 🔮'; // Теперь текст константный

            // Показываем контейнер ИИ-интерпретации
            aiAnswerContainer.classList.remove('hidden'); // Убираем display: none
            aiAnswerContainer.classList.add('show'); // Добавляем opacity transition

            // Запускаем анимацию печати текста
            typeText(aiInterpretationTextElement, simulatedAiText).then(() => {
                // Показываем баннер после завершения печати ИИ-текста
                setTimeout(() => {
                    afterDailyCardBanner.classList.remove('hidden'); // Убираем display: none
                    afterDailyCardBanner.classList.add('show'); // Плавное появление баннера
                }, 500); // Небольшая задержка после печати
            });
            
        }, 800); // Полная длительность анимации cardFlip

        appState.dailyCardUsed = true;
        appState.lastCardDate = new Date().toDateString(); // Сохраняем дату использования
        saveAppState();
        console.log('✅ Карта дня показана:', randomCard.name);
    }

    // ... (остальной код handleAskQuestion, handleFollowupQuestion, etc. без изменений,
    // за исключением исправления ID для daily-card-tab-content в switchTab)

    // ==== Event Listeners Setup ====
    function setupEventListeners() {
        mainNav.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-tab')) {
                switchTab(e.target.dataset.tab);
            }
        });

        secondaryNav.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-tab')) {
                switchTab(e.target.dataset.tab);
            }
        });

        // Убедимся, что слушатель на самой карте
        tarotCard.addEventListener('click', handleDailyCardClick);

        // Слушатели для кнопок баннера
        askMoreQuestionsBtn.addEventListener('click', () => switchTab('question'));
        premiumBannerBtn.addEventListener('click', () => switchTab('premium'));

        console.log('✅ Обработчики событий настроены');
    }
    
    // ... (остальной код без изменений) ...

    // 🎲 ПОЛУЧЕНИЕ СЛУЧАЙНОЙ КАРТЫ (Используем allCards, если загружены, иначе Fallback)
    function getRandomCard() {
        if (allCards.length > 0) {
            return allCards[Math.floor(Math.random() * allCards.length)];
        }
        return getFallbackCards()[0]; // Возвращаем первую из fallback-карт, если allCards пуст
    }

    // ✅ Получение fallback-карт без рекурсии (обновлены symbol на emoji)
    function getFallbackCards() {
        // Сначала пробуем получить из конфигурации
        if (window.getFallbackCards && typeof window.getFallbackCards === 'function') {
            try {
                const configCards = window.getFallbackCards();
                if (configCards && configCards.length > 0) {
                    return configCards;
                }
            } catch (error) {
                console.warn('⚠️ Ошибка получения карт из конфигурации:', error);
            }
        }
        
        // Fallback набор карт (обновил смайлики на более подходящие)
        return [
            {
                name: "Звезда",
                symbol: "⭐", // Используем symbol для отображения
                image: "https://via.placeholder.com/180x270/8A2BE2/FFFFFF?text=Star", // Placeholder
                interpretation: "Карта надежды и вдохновения. Сегодня звезды благоволят вашим начинаниям."
            },
            {
                name: "Солнце",
                symbol: "☀️",
                image: "https://via.placeholder.com/180x270/8A2BE2/FFFFFF?text=Sun", // Placeholder
                interpretation: "Символ радости и успеха. Впереди светлые времена."
            },
            {
                name: "Луна",
                symbol: "🌙",
                image: "https://via.placeholder.com/180x270/8A2BE2/FFFFFF?text=Moon", // Placeholder
                interpretation: "Карта интуиции и тайн. Доверьтесь внутреннему голосу."
            }
        ];
    }

    // ... (остальной код инициализации и утилит) ...
});

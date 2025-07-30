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

    const preInterpretationTextElement = document.getElementById('preInterpretationText');
    const aiAnswerContainer = document.getElementById('aiAnswerContainer');
    const aiInterpretationTitle = document.getElementById('aiInterpretationTitle');
    const aiInterpretationTextElement = document.getElementById('aiInterpretationText');
    const afterDailyCardBanner = document.getElementById('afterDailyCardBanner');
    const askMoreQuestionsBtn = document.getElementById('askMoreQuestionsBtn');
    const premiumBannerBtn = document.getElementById('premiumBannerBtn');

    const starAnimationContainer = document.getElementById('starAnimationContainer');

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
            content.classList.add('hidden'); // Убедимся, что скрыто
        });
        document.getElementById(tabId).classList.add('active');
        document.getElementById(tabId).classList.remove('hidden'); // Показываем активную

        // Обновление активного класса для кнопок навигации
        const allNavTabs = document.querySelectorAll('.nav-tab');
        allNavTabs.forEach(tab => tab.classList.remove('active'));

        const targetNavTab = document.querySelector(`.nav-tab[data-tab="${tabId}"]`);
        if (targetNavTab) {
            targetNavTab.classList.add('active');
        }

        // При переключении вкладок, сбрасываем состояние карты дня и скрываем баннер/интерпретацию
        if (tabId !== 'daily-card') {
            resetDailyCardState();
        }
    }

    // Функция для сброса состояния карты дня
    function resetDailyCardState() {
        tarotCard.classList.remove('flipped');
        cardFront.classList.add('hidden');
        cardBack.classList.remove('hidden');
        cardInfoAfterFlip.classList.add('hidden');
        preInterpretationTextElement.classList.add('hidden');
        aiAnswerContainer.classList.remove('show'); // Плавное скрытие
        aiAnswerContainer.classList.add('hidden');
        afterDailyCardBanner.classList.remove('show'); // Плавное скрытие
        afterDailyCardBanner.classList.add('hidden');
        aiInterpretationTextElement.textContent = ''; // Очищаем текст ИИ
        aiInterpretationTextElement.classList.remove('finished-typing'); // Сбрасываем анимацию печати
        starAnimationContainer.innerHTML = ''; // Очищаем звездочки
    }

    // Функция для обновления статуса подписки
    function updateSubscriptionStatus(isPremium = false) {
        const statusElement = document.getElementById('subscriptionStatus');
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
            const response = await fetch('cards.json.txt');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allCards = await response.json();
            console.log('Cards loaded:', allCards);
        } catch (error) {
            console.error('Error loading cards:', error);
        }
    }

    // Анимация звездочек
    function animateStars(count = 5) {
        starAnimationContainer.innerHTML = ''; // Очистить предыдущие звездочки
        const stars = ['✨', '🌟', '💫', '⭐']; // Разные виды звездочек
        for (let i = 0; i < count; i++) {
            const star = document.createElement('span');
            star.textContent = stars[Math.floor(Math.random() * stars.length)];
            star.classList.add('sparkle-star');
            
            // Произвольные позиции для звездочек
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            
            // Произвольная задержка и длительность анимации
            star.style.animationDelay = `${Math.random() * 0.3}s`;
            star.style.animationDuration = `${0.8 + Math.random() * 0.4}s`;

            starAnimationContainer.appendChild(star);
        }
    }

    // Анимация печати текста
    function typeText(element, text, speed = 30) {
        let i = 0;
        element.textContent = ''; // Очищаем текст перед началом печати
        element.classList.remove('finished-typing');

        return new Promise(resolve => {
            function typeChar() {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    setTimeout(typeChar, speed);
                } else {
                    element.classList.add('finished-typing'); // Убираем каретку
                    resolve();
                }
            }
            typeChar();
        });
    }

    // Обработчик нажатия на карту дня
    async function handleDailyCardClick() {
        if (tarotCard.classList.contains('flipped')) {
            // Если карта уже перевернута, сбрасываем состояние
            resetDailyCardState();
            return;
        }

        // 1. Анимация звездочек
        animateStars(10); // Показываем 10 звездочек

        // 2. Переворачиваем карту (CSS-анимация)
        tarotCard.classList.add('flipped');

        // Выбираем случайную карту
        const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
        console.log('Selected card:', randomCard);

        // Ждем половину анимации, чтобы обновить содержимое
        setTimeout(() => {
            // Обновляем изображение и информацию на лицевой стороне
            cardImage.src = randomCard.image;
            cardImage.alt = randomCard.name;
            flippedCardName.textContent = `${randomCard.name} ${randomCard.emoji || ''}`; // Имя карты + смайл
            cardFront.classList.remove('hidden');
            cardBack.classList.add('hidden');

            // Показываем имя карты после переворота
            cardInfoAfterFlip.classList.remove('hidden');

            // 3. Появление вводного текста
            const randomPrePhrase = preInterpretationPhrases[Math.floor(Math.random() * preInterpretationPhrases.length)];
            preInterpretationTextElement.textContent = randomPrePhrase;
            preInterpretationTextElement.classList.remove('hidden');

        }, 400); // Половина от 0.8s анимации cardFlip

        // Через небольшую задержку после переворота и вводного текста показываем ИИ-интерпретацию
        setTimeout(async () => {
            aiInterpretationTitle.innerHTML = 'ИИ-интерпретация <span class="status-icon">🔮</span>'; // Включаем название внутрь
            aiAnswerContainer.classList.remove('hidden');
            aiAnswerContainer.classList.add('show'); // Плавное появление контейнера

            // Анимация печати текста
            await typeText(aiInterpretationTextElement, simulatedAiText);

            // 4. Появление баннера после завершения печати ИИ-текста
            setTimeout(() => {
                afterDailyCardBanner.classList.remove('hidden');
                afterDailyCardBanner.classList.add('show'); // Плавное появление баннера
            }, 500); // Небольшая задержка после печати
        }, 1200); // Общая задержка, чтобы все шло последовательно (переворот + вводный текст)
    }

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

        tarotCard.addEventListener('click', handleDailyCardClick);

        // Слушатели для кнопок баннера
        askMoreQuestionsBtn.addEventListener('click', () => switchTab('question'));
        premiumBannerBtn.addEventListener('click', () => switchTab('premium'));

        console.log('✅ Обработчики событий настроены');
    }

    // ==== Initializations ====
    async function initializeApp() {
        await loadCards(); // Загружаем карты при запуске
        updateSubscriptionStatus(false); // Изначально базовый вариант
        setupEventListeners();
        switchTab('daily-card'); // Убедимся, что начальная вкладка - "Карта дня"
        console.log('🚀 Приложение инициализировано!');
    }

    initializeApp();
});

document.addEventListener('DOMContentLoaded', () => {
    // State
    let cards = [];
    let isPremium = false;

    // Elements
    const mainNav = document.getElementById('mainNav');
    const secondaryNav = document.getElementById('secondaryNav');
    const tabContents = document.querySelectorAll('.tab-content');
    const tarotCard = document.getElementById('tarotCard');
    const cardImage = document.getElementById('cardImage');
    const flippedCardName = document.getElementById('flippedCardName');
    const cardInfoAfterFlip = document.getElementById('cardInfoAfterFlip');
    const cardIntroText = document.getElementById('cardIntroText');
    const aiAnswerContainer = document.getElementById('aiAnswerContainer');
    const questionTextarea = document.getElementById('questionTextarea');
    const charCounter = document.getElementById('charCounter');
    const submitQuestionBtn = document.getElementById('submitQuestionBtn');
    const premiumTestToggle = document.getElementById('premiumTestToggle');
    const premiumTestLabel = document.getElementById('premiumTestLabel');
    const starRating = document.getElementById('starRating');
    const subscriptionStatus = document.getElementById('subscriptionStatus');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');


    // Fetch cards data
    fetch('cards.json')
        .then(response => response.json())
        .then(data => {
            cards = data;
        })
        .catch(error => {
            console.error('Error fetching cards.json:', error);
        });

    // Tab switching
    const switchTab = (nav, tab) => {
        const activeTabs = document.querySelectorAll('.nav-tab.active');
        activeTabs.forEach(t => t.classList.remove('active'));

        document.querySelectorAll('.tab-content.active').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        const tabId = tab.dataset.tab;
        const activeContent = document.getElementById(tabId);
        if (activeContent) {
            activeContent.classList.add('active');
        }
    };

    mainNav.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-tab')) {
            switchTab(mainNav, e.target);
        }
    });

    secondaryNav.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-tab')) {
            switchTab(secondaryNav, e.target);
        }
    });

    // Daily card
    tarotCard.addEventListener('click', () => {
        if (tarotCard.classList.contains('flipped') || cards.length === 0) {
            return;
        }

        const randomCard = cards[Math.floor(Math.random() * cards.length)];

        tarotCard.classList.add('flipped');
        cardImage.src = randomCard.image;
        document.querySelector('.card-front').classList.remove('hidden');

        setTimeout(() => {
            flippedCardName.textContent = randomCard.name;
            cardInfoAfterFlip.classList.remove('hidden');
            cardIntroText.textContent = randomCard.meaning;
            cardIntroText.classList.remove('hidden');
            aiAnswerContainer.classList.remove('hidden');
            document.getElementById('aiInterpretationText').textContent = "Здесь будет интерпретация от ИИ...";
        }, 500);
    });

    // Question form
    questionTextarea.addEventListener('input', () => {
        const text = questionTextarea.value;
        const length = text.length;
        charCounter.textContent = `${length}/200`;
        submitQuestionBtn.disabled = length === 0 || length > 200;
    });

    // Premium toggle
    premiumTestToggle.addEventListener('change', () => {
        isPremium = premiumTestToggle.checked;
        updatePremiumStatus();
    });

    const updatePremiumStatus = () => {
        if (isPremium) {
            premiumTestLabel.textContent = 'Premium режим';
            subscriptionStatus.classList.add('premium');
            statusIcon.textContent = '👑';
            statusText.textContent = 'Premium';
        } else {
            premiumTestLabel.textContent = 'Базовый режим';
            subscriptionStatus.classList.remove('premium');
            statusIcon.textContent = '⭐';
            statusText.textContent = 'Базовый';
        }
        // You would also lock/unlock features here
    };

    // Star rating
    starRating.addEventListener('click', (e) => {
        if (e.target.classList.contains('star')) {
            const value = e.target.dataset.value;
            const stars = starRating.querySelectorAll('.star');
            stars.forEach(star => {
                star.classList.toggle('active', star.dataset.value <= value);
            });
        }
    });
    
    // Initial state
    updatePremiumStatus();
});

/* ========================================================================
   GLOBAL STYLES - Шепот Карт
   ======================================================================== */

@import url('https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&family=Marck+Script&family=Montserrat:wght@300;400;600&display=swap');

:root {
    --primary-bg: #1a1a2e;
    --secondary-bg: #2a2a4e;
    --header-bg: #161625;
    --card-bg: #3a3a6e;
    --primary-text: #e0e0ff;
    --secondary-text: #a0a0c0;
    --accent-gold: #ffd700;
    --accent-purple: #9d4edd;
    --accent-pink: #ff69b4;
    --premium-glow: 0 0 15px rgba(255, 215, 0, 0.7);
    --shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
    --border-radius: 15px;
    --font-main: 'Montserrat', sans-serif;
    --font-title: 'Marck Script', cursive;
    --font-special: 'Amatic SC', cursive;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: var(--font-main);
    background-color: var(--primary-bg);
    color: var(--primary-text);
    line-height: 1.6;
    overscroll-behavior: none;
}

.container {
    max-width: 480px;
    margin: 0 auto;
    padding: 15px;
    padding-bottom: 80px; /* Space for nav */
}

h2, h3, h4 {
    font-family: var(--font-title);
    color: var(--accent-gold);
    margin-bottom: 10px;
    text-shadow: 0 0 5px var(--accent-gold);
}

/* ========================================================================
   HEADER
   ======================================================================== */

.header {
    text-align: center;
    padding: 20px;
    background: var(--header-bg);
    border-radius: var(--border-radius);
    margin-bottom: 20px;
    box-shadow: var(--shadow);
}

.logo {
    font-family: var(--font-title);
    font-size: 2.5rem;
    color: var(--accent-gold);
    text-shadow: 0 0 10px var(--accent-gold);
}

.subtitle {
    font-family: var(--font-special);
    font-size: 1.5rem;
    color: var(--secondary-text);
    margin-top: -10px;
}

.subscription-status {
    margin-top: 15px;
    display: inline-flex;
    align-items: center;
    padding: 5px 15px;
    border-radius: 20px;
    background: var(--secondary-bg);
    font-size: 0.9rem;
}

.subscription-status.premium {
    background: var(--accent-gold);
    color: var(--primary-bg);
    box-shadow: var(--premium-glow);
}

.subscription-status .status-icon {
    margin-right: 8px;
    font-size: 1.2rem;
}

/* ========================================================================
   NAVIGATION
   ======================================================================== */

.nav-tabs {
    display: flex;
    justify-content: space-around;
    margin-bottom: 10px;
    background: var(--secondary-bg);
    border-radius: 50px;
    padding: 5px;
    box-shadow: var(--shadow);
}

.nav-tab {
    padding: 10px 15px;
    cursor: pointer;
    border-radius: 50px;
    transition: all 0.3s ease;
    font-weight: 600;
    color: var(--secondary-text);
    flex: 1;
    text-align: center;
}

.nav-tab.active {
    background: var(--accent-purple);
    color: white;
    box-shadow: 0 0 10px var(--accent-purple);
}

.nav-tabs-secondary {
    margin-bottom: 20px;
}

.nav-tab.premium-tab.active {
    background: var(--accent-gold);
    color: var(--primary-bg);
    box-shadow: var(--premium-glow);
}

/* ========================================================================
   TABS & CONTENT
   ======================================================================== */

.tab-content {
    display: none;
    padding: 20px;
    background: var(--secondary-bg);
    border-radius: var(--border-radius);
    animation: fadeIn 0.5s;
}

.tab-content.active {
    display: block;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.hidden {
    display: none !important;
}

/* ========================================================================
   DAILY CARD
   ======================================================================== */

.card-container {
    perspective: 1000px;
    position: relative;
    margin-bottom: 20px;
}

.tarot-card {
    width: 180px;
    height: 270px;
    margin: 0 auto;
    transform-style: preserve-3d;
    transition: transform 0.8s cubic-bezier(0.6, 0.04, 0.98, 0.335);
    cursor: pointer;
}

.tarot-card.flipped {
    transform: rotateY(180deg);
}

.card-back, .card-front {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    box-shadow: var(--shadow);
}

.card-back {
    background: linear-gradient(145deg, #4b0082, #6a0dad);
    color: var(--accent-gold);
    border: 2px solid var(--accent-gold);
}

.card-symbol {
    font-size: 4rem;
    text-shadow: 0 0 15px var(--accent-gold);
}

.card-text {
    font-family: var(--font-special);
    font-size: 1.2rem;
    padding: 10px;
}

.card-front {
    background: linear-gradient(145deg, #1a1a2e, #2a2a4e);
    transform: rotateY(180deg);
    padding: 10px;
}

.card-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 10px;
}

#starAnimationContainer {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none;
}

.sparkle-star {
    position: absolute;
    font-size: 2rem;
    color: var(--accent-gold);
    animation: sparkle 1s ease-out forwards;
}

@keyframes sparkle {
    0% { transform: scale(0); opacity: 1; }
    50% { transform: scale(1.5); opacity: 0.7; }
    100% { transform: scale(1); opacity: 0; }
}

.card-info-after-flip {
    text-align: center;
    margin-top: 280px; /* Height of card */
    padding: 15px 0;
}

.flippedCardName {
    font-family: var(--font-title);
    font-size: 2rem;
    color: var(--accent-pink);
}

.card-intro-text {
    font-style: italic;
    color: var(--secondary-text);
    margin-top: 5px;
}

/* AI Answer Box */
.ai-answer-container {
    margin-top: 20px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;
}

.ai-answer-container.show {
    opacity: 1;
    transform: translateY(0);
}

.ai-answer-box {
    background: var(--primary-bg);
    padding: 15px;
    border-radius: var(--border-radius);
    border-left: 3px solid var(--accent-purple);
}

.ai-answer-header h4 {
    color: var(--accent-purple);
    font-family: var(--font-special);
    font-size: 1.5rem;
}

.ai-answer-content {
    white-space: pre-wrap;
    font-size: 0.95rem;
}

/* Subscription Banner */
.subscription-banner {
    margin-top: 25px;
    display: flex;
    align-items: center;
    background: var(--card-bg);
    padding: 15px;
    border-radius: var(--border-radius);
    opacity: 0;
    transition: all 0.5s ease-out 0.3s;
}
.subscription-banner.show {
    opacity: 1;
}

.banner-icon {
    font-size: 2.5rem;
    margin-right: 15px;
}

.banner-content h4 {
    color: var(--accent-pink);
}

.banner-buttons {
    display: flex;
    flex-direction: column;
    margin-top: 15px;
    gap: 10px;
}

.banner-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    background: var(--accent-purple);
    color: white;
}

.banner-btn.premium {
    background: var(--accent-gold);
    color: var(--primary-bg);
}

.banner-btn span {
    margin-right: 8px;
}

/* ========================================================================
   QUESTION TAB
   ======================================================================== */

.questions-left {
    text-align: center;
    margin-bottom: 15px;
    font-weight: 600;
    color: var(--accent-pink);
}

.question-form {
    display: flex;
    flex-direction: column;
}

.question-textarea {
    min-height: 100px;
    padding: 10px;
    border-radius: 10px;
    border: 2px solid var(--card-bg);
    background: var(--primary-bg);
    color: var(--primary-text);
    font-family: var(--font-main);
    resize: vertical;
}

.char-counter {
    text-align: right;
    font-size: 0.8rem;
    color: var(--secondary-text);
    margin-top: 5px;
}

.question-btn {
    padding: 12px;
    border: none;
    border-radius: 10px;
    background: var(--accent-purple);
    color: white;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 15px;
    transition: all 0.3s ease;
}

.question-btn:disabled {
    background: var(--secondary-text);
    cursor: not-allowed;
}

.loading {
    text-align: center;
    padding: 30px;
}

.magic-sparkles {
    font-size: 3rem;
    animation: pulse 1.5s infinite;
}

.magic-message {
    color: var(--secondary-text);
}

@keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.7; }
    100% { transform: scale(1); opacity: 1; }
}

/* ========================================================================
   SPREADS TAB
   ======================================================================== */

.spreads-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
}

.spread-card {
    background: var(--card-bg);
    padding: 15px;
    border-radius: var(--border-radius);
    text-align: center;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow);
}

.premium-badge {
    position: absolute;
    top: 10px;
    right: -30px;
    background: var(--accent-gold);
    color: var(--primary-bg);
    padding: 2px 30px;
    font-size: 0.7rem;
    font-weight: bold;
    transform: rotate(45deg);
}

.spread-icon {
    font-size: 2.5rem;
}

.spread-name {
    font-weight: 600;
    margin-top: 10px;
    color: var(--accent-pink);
}

.spread-description {
    font-size: 0.85rem;
    color: var(--secondary-text);
    margin-top: 5px;
}

/* ========================================================================
   HISTORY & REVIEWS TABS
   ======================================================================== */

.history-container, .reviews-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.history-list, .reviews-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.history-item {
    background: var(--primary-bg);
    padding: 15px;
    border-radius: 10px;
    border-left: 3px solid var(--accent-pink);
    cursor: pointer;
}

.history-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--secondary-text);
    margin-bottom: 5px;
}

.history-title {
    font-weight: 600;
    color: var(--accent-pink);
}

.history-empty {
    text-align: center;
    padding: 30px;
    color: var(--secondary-text);
}

.empty-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 10px;
}

/* Review Form */
.review-form {
    background: var(--primary-bg);
    padding: 20px;
    border-radius: var(--border-radius);
}

.rating-input {
    text-align: center;
    margin-bottom: 15px;
}

.stars {
    font-size: 2.5rem;
    color: var(--secondary-text);
    cursor: pointer;
}

.star:hover, .star.active {
    color: var(--accent-gold);
}

.review-textarea {
    width: 100%;
    min-height: 80px;
    padding: 10px;
    border-radius: 10px;
    border: 2px solid var(--card-bg);
    background: var(--primary-bg);
    color: var(--primary-text);
}

.submit-review-btn {
    width: 100%;
    margin-top: 15px;
    padding: 12px;
    border: none;
    border-radius: 10px;
    background: var(--accent-pink);
    color: white;
    font-weight: 600;
    cursor: pointer;
}

/* ========================================================================
   PREMIUM TAB
   ======================================================================== */
.premium-container {
    text-align: center;
}

.premium-header .premium-icon {
    font-size: 4rem;
    color: var(--accent-gold);
    text-shadow: var(--premium-glow);
}

.premium-features {
    margin: 25px 0;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.feature-item {
    display: flex;
    align-items: center;
    background: var(--primary-bg);
    padding: 10px;
    border-radius: 10px;
}

.feature-icon {
    font-size: 1.8rem;
    margin-right: 15px;
}

.feature-text strong {
    color: var(--accent-pink);
}

.price-card {
    background: var(--card-bg);
    padding: 20px;
    border-radius: var(--border-radius);
    border: 2px solid var(--accent-gold);
    box-shadow: var(--premium-glow);
}

.price-label {
    background: var(--accent-gold);
    color: var(--primary-bg);
    display: inline-block;
    padding: 5px 15px;
    border-radius: 20px;
    font-weight: bold;
    margin-bottom: 10px;
}

.price-value {
    font-size: 3rem;
    font-weight: bold;
}

.price-period {
    color: var(--secondary-text);
    margin-top: -10px;
}

.price-benefits {
    list-style: none;
    margin: 20px 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.premium-buy-btn {
    width: 100%;
    padding: 15px;
    border: none;
    border-radius: 10px;
    background: var(--accent-gold);
    color: var(--primary-bg);
    font-size: 1.2rem;
    font-weight: bold;
    cursor: pointer;
}

.test-toggle-container {
    margin-top: 20px;
    padding: 10px;
    background: var(--primary-bg);
    border-radius: 10px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
  vertical-align: middle;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: .4s;
}

input:checked + .slider {
  background-color: var(--accent-gold);
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}

/* ========================================================================
   TOAST NOTIFICATION
   ======================================================================== */
.toast {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 25px;
    border-radius: 25px;
    background-color: var(--accent-purple);
    color: white;
    box-shadow: var(--shadow);
    z-index: 1000;
    transition: opacity 0.3s, transform 0.3s;
}
.toast.hidden {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
    pointer-events: none;
}
.toast.error {
    background-color: #e74c3c;
}
.toast.success {
    background-color: #2ecc71;
}

/* ========================================================================
   RESPONSIVE DESIGN
   ======================================================================== */
@media (max-width: 480px) {
    .container {
        padding: 10px;
    }
    .nav-tab {
        font-size: 0.85rem;
        padding: 8px 5px;
    }
    .spreads-grid {
        grid-template-columns: 1fr;
    }
}

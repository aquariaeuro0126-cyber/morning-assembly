/* ========================================
   朝の会アプリ - メインスクリプト
======================================== */

// ----------------------------------------
// 定数・設定
// ----------------------------------------
const TOTAL_STEPS = 8;
const ADMIN_PASSWORD = '1234';       // ← パスワードはここで変更できます
const ADMIN_TAP_COUNT = 3;           // 何回タップで管理画面トリガーか
const END_COUNTDOWN_SEC = 10;        // 終了画面の自動戻り秒数

// 管理画面トリガー：タップ間隔（ミリ秒）以内に連続タップで認識
const ADMIN_TAP_INTERVAL = 1500;

// ----------------------------------------
// 状態管理
// ----------------------------------------
let currentStep = 0;       // 現在のステップ（0〜7）
let completedSteps = [];   // 完了済みステップ
let countdownTimer = null; // 終了画面カウントダウン用タイマー
let adminTapCount = 0;     // 管理画面トリガー タップ回数
let adminTapTimer = null;  // タップ間隔リセット用タイマー

// ----------------------------------------
// DOM 取得
// ----------------------------------------
const screenStart  = document.getElementById('screen-start');
const screenMain   = document.getElementById('screen-main');
const screenEnd    = document.getElementById('screen-end');
const screenAdmin  = document.getElementById('screen-admin');
const modalAdmin   = document.getElementById('modal-admin');

const btnStart       = document.getElementById('btn-start');
const btnPrev        = document.getElementById('btn-prev');
const btnNext        = document.getElementById('btn-next');
const btnBackStart   = document.getElementById('btn-back-start');
const btnAdminCancel = document.getElementById('btn-admin-cancel');
const btnAdminEnter  = document.getElementById('btn-admin-enter');
const btnAdminClose  = document.getElementById('btn-admin-close');
const adminTrigger   = document.getElementById('admin-trigger');
const adminInput     = document.getElementById('admin-password-input');
const modalError     = document.getElementById('modal-error');
const countdownFill  = document.getElementById('countdown-fill');
const countdownText  = document.getElementById('countdown-text');
const progressDots   = document.getElementById('progress-dots');
const tabItems       = document.querySelectorAll('.tab-item');
const miniApps       = document.querySelectorAll('.mini-app');

// ----------------------------------------
// 画面切り替え
// ----------------------------------------
function showScreen(screen) {
  [screenStart, screenMain, screenEnd, screenAdmin].forEach(s => {
    s.classList.remove('active');
  });
  screen.classList.add('active');
}

// ----------------------------------------
// スタート画面 → メイン画面
// ----------------------------------------
btnStart.addEventListener('click', () => {
  currentStep = 0;
  completedSteps = [];
  renderStep(0);
  showScreen(screenMain);
  loadDateWeather();
});

// ----------------------------------------
// ステップ描画
// ----------------------------------------
function renderStep(index) {
  // タブのアクティブ状態を更新
  tabItems.forEach((tab, i) => {
    tab.classList.remove('active');
    if (completedSteps.includes(i)) {
      tab.classList.add('completed');
    } else {
      tab.classList.remove('completed');
    }
    if (i === index) tab.classList.add('active');
  });

  // ミニアプリの表示切り替え
  miniApps.forEach((app, i) => {
    app.classList.remove('active');
    if (i === index) app.classList.add('active');
  });

  // ボタンの状態
  btnPrev.disabled = index === 0;
  btnNext.textContent = index === TOTAL_STEPS - 1 ? '終わる ✓' : 'つぎへ ▶';

  // プログレスドット更新
  renderDots(index);
}

// ----------------------------------------
// プログレスドット描画
// ----------------------------------------
function renderDots(activeIndex) {
  progressDots.innerHTML = '';
  for (let i = 0; i < TOTAL_STEPS; i++) {
    const dot = document.createElement('div');
    dot.classList.add('dot');
    if (completedSteps.includes(i)) dot.classList.add('completed');
    if (i === activeIndex) dot.classList.add('active');
    dot.addEventListener('click', () => jumpToStep(i));
    progressDots.appendChild(dot);
  }
}

// ----------------------------------------
// タブクリックでジャンプ
// ----------------------------------------
tabItems.forEach(tab => {
  tab.addEventListener('click', () => {
    const index = parseInt(tab.dataset.index);
    jumpToStep(index);
  });
});

function jumpToStep(index) {
  if (index === currentStep) return;
  currentStep = index;
  renderStep(currentStep);
}

// ----------------------------------------
// 「次へ」ボタン
// ----------------------------------------
btnNext.addEventListener('click', () => {
  if (!completedSteps.includes(currentStep)) {
    completedSteps.push(currentStep);
  }

  if (currentStep === TOTAL_STEPS - 1) {
    // 最後のステップ → 終了画面へ
    startEndCountdown();
    showScreen(screenEnd);
  } else {
    currentStep++;
    renderStep(currentStep);
  }
});

// ----------------------------------------
// 「もどる」ボタン
// ----------------------------------------
btnPrev.addEventListener('click', () => {
  if (currentStep > 0) {
    currentStep--;
    renderStep(currentStep);
  }
});

// ----------------------------------------
// 終了画面カウントダウン
// ----------------------------------------
function startEndCountdown() {
  clearTimeout(countdownTimer);
  let remaining = END_COUNTDOWN_SEC;
  countdownFill.style.width = '100%';
  countdownText.textContent = `${remaining}秒後にトップにもどります`;

  countdownTimer = setInterval(() => {
    remaining--;
    const pct = (remaining / END_COUNTDOWN_SEC) * 100;
    countdownFill.style.width = pct + '%';
    countdownText.textContent = `${remaining}秒後にトップにもどります`;

    if (remaining <= 0) {
      clearInterval(countdownTimer);
      returnToStart();
    }
  }, 1000);
}

function returnToStart() {
  clearInterval(countdownTimer);
  showScreen(screenStart);
}

btnBackStart.addEventListener('click', returnToStart);

// ----------------------------------------
// 日付・天気の読み込み
// ----------------------------------------
function loadDateWeather() {
  const dateText    = document.getElementById('date-text');
  const weatherText = document.getElementById('weather-text');

  // 日付・曜日の表示
  const now    = new Date();
  const month  = now.getMonth() + 1;
  const day    = now.getDate();
  const youbi  = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
  dateText.textContent = `${month}月${day}日（${youbi}曜日）`;

  // LocalStorageから前回天気を取得（オフライン対応）
  const cachedWeather = localStorage.getItem('weather_today');
  const cachedDate    = localStorage.getItem('weather_date');
  const today         = `${now.getFullYear()}-${month}-${day}`;

  if (cachedWeather && cachedDate === today) {
    weatherText.textContent = `天気：${cachedWeather}`;
    return;
  }

  // Open-Meteo API（無料・登録不要）で天気取得
  // 緯度・経度は東京のデフォルト値（管理画面で変更できるよう後で対応）
  const lat = localStorage.getItem('school_lat') || '35.6895';
  const lon = localStorage.getItem('school_lon') || '139.6917';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      const code    = data.current_weather.weathercode;
      const weather = weatherCodeToJapanese(code);
      weatherText.textContent = `天気：${weather}`;

      // キャッシュ保存
      localStorage.setItem('weather_today', weather);
      localStorage.setItem('weather_date', today);
    })
    .catch(() => {
      // オフライン時のフォールバック
      if (cachedWeather) {
        weatherText.textContent = `天気：${cachedWeather}（前回）`;
      } else {
        weatherText.textContent = '天気：取得できませんでした';
      }
    });
}

// WMO天気コードを日本語に変換
function weatherCodeToJapanese(code) {
  if (code === 0)               return '☀️ 晴れ';
  if (code <= 2)                return '⛅ 晴れ時々くもり';
  if (code === 3)               return '☁️ くもり';
  if (code >= 51 && code <= 57) return '🌦️ 小雨';
  if (code >= 61 && code <= 67) return '🌧️ 雨';
  if (code >= 71 && code <= 77) return '❄️ 雪';
  if (code >= 80 && code <= 82) return '🌧️ にわか雨';
  if (code >= 95 && code <= 99) return '⛈️ 雷雨';
  return '🌤️ 不明';
}

// ----------------------------------------
// 管理画面トリガー（右下の隠しエリアを3回タップ）
// ----------------------------------------
adminTrigger.addEventListener('click', () => {
  adminTapCount++;

  clearTimeout(adminTapTimer);
  adminTapTimer = setTimeout(() => {
    adminTapCount = 0;
  }, ADMIN_TAP_INTERVAL);

  if (adminTapCount >= ADMIN_TAP_COUNT) {
    adminTapCount = 0;
    clearTimeout(adminTapTimer);
    openAdminModal();
  }
});

// ----------------------------------------
// 管理画面モーダル
// ----------------------------------------
function openAdminModal() {
  adminInput.value = '';
  modalError.classList.add('hidden');
  modalAdmin.classList.remove('hidden');
  setTimeout(() => adminInput.focus(), 100);
}

btnAdminCancel.addEventListener('click', () => {
  modalAdmin.classList.add('hidden');
});

btnAdminEnter.addEventListener('click', checkAdminPassword);
adminInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') checkAdminPassword();
});

function checkAdminPassword() {
  if (adminInput.value === ADMIN_PASSWORD) {
    modalAdmin.classList.add('hidden');
    showScreen(screenAdmin);
  } else {
    modalError.classList.remove('hidden');
    adminInput.value = '';
    adminInput.focus();
  }
}

btnAdminClose.addEventListener('click', () => {
  showScreen(screenStart);
});

// ----------------------------------------
// 初期化：プログレスドットを生成
// ----------------------------------------
renderDots(0);

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
// 号令ミニアプリ - 声測定（Web Audio API）
// ----------------------------------------

// 測定設定
const MEASURE_SEC      = 3;    // 測定時間（秒）
const COUNTDOWN_SEC    = 3;    // カウントダウン秒数

// 状態
let audioContext    = null;
let analyser        = null;
let micStream       = null;
let measureInterval = null;
let maxVolume       = 0;       // 測定中の最大音量（0〜255）

// フェーズ要素（DOM読み込み後に安全に取得）
let phaseReady, phaseCountdown, phaseMeasuring, phaseResult;
let countdownNum, volumeFill, measureTimer, resultScore, resultMessage;

function initVoiceElements() {
  phaseReady     = document.getElementById('voice-phase-ready');
  phaseCountdown = document.getElementById('voice-phase-countdown');
  phaseMeasuring = document.getElementById('voice-phase-measuring');
  phaseResult    = document.getElementById('voice-phase-result');
  countdownNum   = document.getElementById('countdown-number');
  volumeFill     = document.getElementById('volume-meter-fill');
  measureTimer   = document.getElementById('measure-timer');
  resultScore    = document.getElementById('result-score');
  resultMessage  = document.getElementById('result-message');

  const btnVoiceStart = document.getElementById('btn-voice-start');
  const btnVoiceRetry = document.getElementById('btn-voice-retry');

  if (btnVoiceStart) {
    btnVoiceStart.addEventListener('click', async () => {
      try {
        await startMicAndCountdown();
      } catch (e) {
        alert('マイクの使用が許可されませんでした。\nSafariの設定でマイクを許可してください。');
      }
    });
  }

  if (btnVoiceRetry) {
    btnVoiceRetry.addEventListener('click', () => {
      stopMic();
      maxVolume = 0;
      if (volumeFill) volumeFill.style.width = '0%';
      showVoicePhase(phaseReady);
    });
  }
}

// フェーズ切り替え
function showVoicePhase(phase) {
  if (!phase) return;
  [phaseReady, phaseCountdown, phaseMeasuring, phaseResult].forEach(p => {
    if (p) p.classList.add('hidden');
  });
  phase.classList.remove('hidden');
}

// マイク起動 → カウントダウン → 測定
async function startMicAndCountdown() {
  // マイク許可・AudioContext生成
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createMediaStreamSource(micStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  // カウントダウン開始
  showVoicePhase(phaseCountdown);
  let count = COUNTDOWN_SEC;
  countdownNum.textContent = count;

  const cdInterval = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(cdInterval);
      startMeasuring();
    } else {
      countdownNum.textContent = count;
      // アニメーションを再起動
      countdownNum.style.animation = 'none';
      countdownNum.offsetHeight; // reflow
      countdownNum.style.animation = 'countPop 0.4s ease';
    }
  }, 1000);
}

// 測定開始
function startMeasuring() {
  maxVolume = 0;
  let remaining = MEASURE_SEC;
  measureTimer.textContent = remaining;
  showVoicePhase(phaseMeasuring);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  // リアルタイム音量バー更新（60fps相当）
  measureInterval = setInterval(() => {
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const pct = Math.min(avg / 80 * 100, 100); // 80を基準に正規化
    if (volumeFill) volumeFill.style.width = pct + '%';
    if (avg > maxVolume) maxVolume = avg;
  }, 16);

  // 1秒ごとにタイマー更新
  let timerCount = MEASURE_SEC;
  const timerInterval = setInterval(() => {
    timerCount--;
    measureTimer.textContent = timerCount;
    if (timerCount <= 0) {
      clearInterval(timerInterval);
      clearInterval(measureInterval);
      stopMic();
      showResult();
    }
  }, 1000);
}

// 結果表示
function showResult() {
  // maxVolume（0〜約80以上）を100点満点にスケール
  const score = Math.min(Math.round((maxVolume / 75) * 100), 100);
  resultScore.textContent = score;

  // メッセージとカラー
  let msg = '';
  let color = '';
  if (score >= 90) {
    msg = '🌟 すごい！さいこうの声だ！';
    color = '#ff9a3c';
  } else if (score >= 70) {
    msg = '😊 よかった！元気な声だね！';
    color = '#06d6a0';
  } else if (score >= 50) {
    msg = '👍 もうちょっと！大きな声で！';
    color = '#4a9eda';
  } else {
    msg = '😮 もっと大きな声で言えるかな？';
    color = '#b0bec5';
  }
  resultMessage.textContent = msg;
  resultMessage.style.color = color;

  showVoicePhase(phaseResult);
}

// マイク停止・リソース解放
function stopMic() {
  clearInterval(measureInterval);
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  analyser = null;
}

// ----------------------------------------
// 号令ミニアプリ - タイミングライト
// ----------------------------------------

// 礼までのカウントダウン秒数
const REIKO_COUNTDOWN_SEC = 3;

// SVGリングの円周（r=52 → 2π×52 ≈ 326.7）
const RING_CIRCUMFERENCE = 2 * Math.PI * 52;

let reikoTimer = null;

function initReikoElements() {
  const reikoPhaseReady    = document.getElementById('reiko-phase-ready');
  const reikoPhaseKiotsuke = document.getElementById('reiko-phase-kiotsuke');
  const reikoPhaseRei      = document.getElementById('reiko-phase-rei');
  const reikoPhaseDone     = document.getElementById('reiko-phase-done');
  const ringProgress       = document.getElementById('reiko-ring-progress');
  const ringNumber         = document.getElementById('reiko-ring-number');
  const btnReikoStart      = document.getElementById('btn-reiko-start');
  const btnReikoNaore      = document.getElementById('btn-reiko-naore');
  const btnReikoRetry      = document.getElementById('btn-reiko-retry');

  if (!btnReikoStart) return;

  function showReikoPhase(phase) {
    [reikoPhaseReady, reikoPhaseKiotsuke, reikoPhaseRei, reikoPhaseDone].forEach(p => {
      if (p) p.classList.add('hidden');
    });
    if (phase) phase.classList.remove('hidden');
  }

  btnReikoStart.addEventListener('click', () => {
    showReikoPhase(reikoPhaseKiotsuke);

    // SVGリング初期化（満タン状態からスタート）
    ringProgress.style.strokeDashoffset = '0';
    let count = REIKO_COUNTDOWN_SEC;
    ringNumber.textContent = count;

    clearInterval(reikoTimer);
    reikoTimer = setInterval(() => {
      count--;
      // リング進捗（0→円周でリングが消える）
      const offset = ((REIKO_COUNTDOWN_SEC - count) / REIKO_COUNTDOWN_SEC) * RING_CIRCUMFERENCE;
      ringProgress.style.strokeDashoffset = offset;
      ringNumber.textContent = count;

      if (count <= 0) {
        clearInterval(reikoTimer);
        showReikoPhase(reikoPhaseRei);
      }
    }, 1000);
  });

  btnReikoNaore.addEventListener('click', () => {
    showReikoPhase(reikoPhaseDone);
  });

  btnReikoRetry.addEventListener('click', () => {
    clearInterval(reikoTimer);
    ringProgress.style.strokeDashoffset = '0';
    showReikoPhase(reikoPhaseReady);
  });
}

// ----------------------------------------
// ③ 日付・曜日・天気ミニアプリ
// ----------------------------------------

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

// 実際の天気をAPIまたはキャッシュから取得して返す
function fetchTodayWeather() {
  return new Promise(resolve => {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const day   = now.getDate();
    const today = `${now.getFullYear()}-${month}-${day}`;

    const cached     = localStorage.getItem('weather_today');
    const cachedDate = localStorage.getItem('weather_date');

    if (cached && cachedDate === today) {
      resolve(cached);
      return;
    }

    const lat = localStorage.getItem('school_lat') || '35.6895';
    const lon = localStorage.getItem('school_lon') || '139.6917';
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const code    = data.current_weather.weathercode;
        const weather = weatherCodeToJapanese(code);
        // キャッシュ保存
        localStorage.setItem('weather_today', weather);
        localStorage.setItem('weather_date', today);
        resolve(weather);
      })
      .catch(() => {
        resolve(cached || null);
      });
  });
}

// 天気文字列から4択正解を判定するためのカテゴリに変換
function weatherToCategory(weatherStr) {
  if (!weatherStr) return null;
  if (weatherStr.includes('晴')) return '晴れ';
  if (weatherStr.includes('くもり') || weatherStr.includes('曇')) return 'くもり';
  if (weatherStr.includes('雨') || weatherStr.includes('にわか雨')) return '雨';
  if (weatherStr.includes('雪')) return '雪';
  return null;
}

function initDateWeather() {
  // --- 要素取得 ---
  const phaseDate    = document.getElementById('dw-phase-date');
  const phaseWeather = document.getElementById('dw-phase-weather');
  const phaseSummary = document.getElementById('dw-phase-summary');
  const monthDisplay = document.getElementById('dw-month-display');
  const dayDisplay   = document.getElementById('dw-day-display');
  const weekdayDisplay = document.getElementById('dw-weekday-display');
  const btnConfirm   = document.getElementById('btn-dw-confirm');
  const quizGrid     = document.getElementById('weather-quiz-grid');
  const quizResult   = document.getElementById('weather-quiz-result');
  const quizResultIcon = document.getElementById('quiz-result-icon');
  const quizResultText = document.getElementById('quiz-result-text');
  const btnNext        = document.getElementById('btn-dw-next');
  const dwWeatherBtns  = document.getElementById('dw-weather-buttons');
  const summaryText    = document.getElementById('dw-summary-text');
  const btnRetry       = document.getElementById('btn-dw-retry');

  if (!phaseDate) return;

  // --- スライダーの値範囲 ---
  const MONTHS       = Array.from({ length: 12 }, (_, i) => i + 1);   // 1〜12
  const DAYS         = Array.from({ length: 31 }, (_, i) => i + 1);   // 1〜31
  const WEEKDAY_LIST = [...WEEKDAYS];                                   // 日〜土

  // --- 現在の選択インデックス（初期値はランダム） ---
  let monthIdx   = Math.floor(Math.random() * MONTHS.length);
  let dayIdx     = Math.floor(Math.random() * DAYS.length);
  let weekdayIdx = Math.floor(Math.random() * WEEKDAY_LIST.length);

  function updateDisplay() {
    if (monthDisplay) monthDisplay.textContent = MONTHS[monthIdx];
    dayDisplay.textContent     = DAYS[dayIdx];
    weekdayDisplay.textContent = WEEKDAY_LIST[weekdayIdx];
  }
  updateDisplay();

  // --- ▲▼ ボタンのイベント登録 ---
  function wrapIdx(idx, len) {
    return (idx + len) % len;
  }

  document.querySelectorAll('.dw-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const dir    = btn.classList.contains('dw-arrow-up') ? -1 : 1;

      if (target === 'month') {
        monthIdx = wrapIdx(monthIdx + dir, MONTHS.length);
      } else if (target === 'day') {
        dayIdx = wrapIdx(dayIdx + dir, DAYS.length);
      } else if (target === 'weekday') {
        weekdayIdx = wrapIdx(weekdayIdx + dir, WEEKDAY_LIST.length);
      }
      updateDisplay();
    });
  });

  // --- フェーズ切り替え ---
  function showDwPhase(phase) {
    [phaseDate, phaseWeather, phaseSummary].forEach(p => {
      if (p) p.classList.add('hidden');
    });
    if (phase) phase.classList.remove('hidden');
  }

  // --- 選んだ日付を記憶 ---
  let selectedMonth   = null;
  let selectedDay     = null;
  let selectedWeekday = null;
  let todayWeather    = null;

  // --- 「確認！」ボタン → 正誤判定 → フェーズ② or 「惜しい！」 ---
  const oshiiEl = document.getElementById('dw-oshii');

  btnConfirm.addEventListener('click', async () => {
    selectedMonth   = MONTHS[monthIdx];
    selectedDay     = DAYS[dayIdx];
    selectedWeekday = WEEKDAY_LIST[weekdayIdx];

    // 今日の実際の日付を取得して比較
    const now          = new Date();
    const todayMonth   = now.getMonth() + 1;          // 1〜12
    const todayDay     = now.getDate();                // 1〜31
    const todayWeekday = WEEKDAYS[now.getDay()];       // '日'〜'土'

    const isCorrect =
      selectedMonth   === todayMonth   &&
      selectedDay     === todayDay     &&
      selectedWeekday === todayWeekday;

    if (!isCorrect) {
      // 不正解 → 「惜しい！」表示してフェーズ①に留まる
      if (oshiiEl) {
        oshiiEl.classList.remove('hidden');
        // 2秒後に自動で非表示（次のトライに備える）
        setTimeout(() => oshiiEl.classList.add('hidden'), 2000);
      }
      return;
    }

    // 正解 → 天気取得してフェーズ②へ
    if (oshiiEl) oshiiEl.classList.add('hidden');
    todayWeather = await fetchTodayWeather();

    // クイズボタンをリセット
    document.querySelectorAll('.weather-quiz-btn').forEach(b => {
      b.disabled = false;
      b.classList.remove('correct', 'wrong');
    });
    quizResult.classList.add('hidden');
    if (dwWeatherBtns) dwWeatherBtns.classList.add('hidden');

    showDwPhase(phaseWeather);
  });

  // --- 天気クイズの回答 ---
  document.querySelectorAll('.weather-quiz-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const answer   = btn.dataset.weather;
      const correct  = weatherToCategory(todayWeather);

      // 全ボタン無効化
      document.querySelectorAll('.weather-quiz-btn').forEach(b => b.disabled = true);

      if (answer === correct) {
        btn.classList.add('correct');
        quizResultIcon.textContent = '⭕';
        quizResultText.textContent = `せいかい！今日は${todayWeather}だよ！`;
      } else {
        btn.classList.add('wrong');
        // 正解のボタンも光らせる
        document.querySelectorAll('.weather-quiz-btn').forEach(b => {
          if (b.dataset.weather === correct) b.classList.add('correct');
        });
        quizResultIcon.textContent = '❌';
        quizResultText.textContent = `ざんねん！正解は${todayWeather}だよ！`;
      }

      quizResult.classList.remove('hidden');
      if (dwWeatherBtns) dwWeatherBtns.classList.remove('hidden');
    });
  });

  // --- 「次へ」ボタン → フェーズ③ ---
  btnNext.addEventListener('click', () => {
    const weatherLabel = todayWeather || '？';
    summaryText.innerHTML =
      `今日は<br><strong>${selectedMonth}月${selectedDay}日（${selectedWeekday}曜日）</strong><br>天気は<strong>${weatherLabel}</strong>です！`;
    showDwPhase(phaseSummary);
  });

  // --- 「もう一度」ボタン → リセット ---
  btnRetry.addEventListener('click', () => {
    // ランダムに再設定
    monthIdx   = Math.floor(Math.random() * MONTHS.length);
    dayIdx     = Math.floor(Math.random() * DAYS.length);
    weekdayIdx = Math.floor(Math.random() * WEEKDAY_LIST.length);
    updateDisplay();
    if (oshiiEl) oshiiEl.classList.add('hidden');
    showDwPhase(phaseDate);
  });
}

// ----------------------------------------
// 初期化
// ----------------------------------------
renderDots(0);
initReikoElements();
initVoiceElements();
initDateWeather();

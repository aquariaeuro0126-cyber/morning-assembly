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
    // 管理画面を開いた際に名簿リストを最新化
    document.dispatchEvent(new CustomEvent('admin-opened'));
  } else {
    modalError.classList.remove('hidden');
    adminInput.value = '';
    adminInput.focus();
  }
}

btnAdminClose.addEventListener('click', () => {
  showScreen(screenStart);
  // 名簿変更を出席ミニアプリに反映
  document.dispatchEvent(new CustomEvent('roster-updated'));
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
// ④ 出席ミニアプリ
// ----------------------------------------
function initAttendance() {

  // --- DOM 取得 ---
  const phaseReady   = document.getElementById('att-phase-ready');
  const phaseCalling = document.getElementById('att-phase-calling');
  const phaseResult  = document.getElementById('att-phase-result');

  const memberCountEl  = document.getElementById('att-member-count');
  const noMemberEl     = document.getElementById('att-no-member');
  const btnAttStart    = document.getElementById('btn-att-start');

  const progressTextEl = document.getElementById('att-progress-text');
  const nameEl         = document.getElementById('att-name');
  const btnPresent     = document.getElementById('btn-att-present');
  const btnAbsent      = document.getElementById('btn-att-absent');

  const resultIconEl   = document.getElementById('att-result-icon');
  const resultMainEl   = document.getElementById('att-result-main');
  const resultDetailEl = document.getElementById('att-result-detail');
  const absentListEl   = document.getElementById('att-absent-list');
  const absentNamesEl  = document.getElementById('att-absent-names');
  const btnAttRetry    = document.getElementById('btn-att-retry');

  // --- 状態変数 ---
  let shuffledNames = []; // シャッフル済み名前リスト
  let callIndex     = 0;  // 現在呼名中のインデックス
  let absentNames   = []; // 欠席者リスト

  // --- ユーティリティ ---

  // localStorage から名前リストを取得
  function loadNames() {
    const raw = localStorage.getItem('att_names');
    return raw ? JSON.parse(raw) : [];
  }

  // Fisher-Yates シャッフル
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // フェーズ切り替え
  function showAttPhase(phase) {
    [phaseReady, phaseCalling, phaseResult].forEach(p => p.classList.add('hidden'));
    phase.classList.remove('hidden');
  }

  // スタート画面の人数表示を更新
  function refreshReadyScreen() {
    const names = loadNames();
    memberCountEl.textContent = `登録：${names.length}人`;
  }

  // --- フェーズ①：スタートボタン ---
  btnAttStart.addEventListener('click', () => {
    const names = loadNames();
    if (names.length === 0) {
      noMemberEl.classList.remove('hidden');
      return;
    }
    noMemberEl.classList.add('hidden');

    // 初期化
    shuffledNames = shuffle(names);
    callIndex     = 0;
    absentNames   = [];

    showCallCard();
    showAttPhase(phaseCalling);
  });

  // 現在の呼名カードを表示
  function showCallCard() {
    nameEl.textContent       = shuffledNames[callIndex];
    progressTextEl.textContent = `${callIndex + 1} / ${shuffledNames.length}`;

    // 名前カードにアニメーション再起動
    nameEl.closest('.att-name-card').style.animation = 'none';
    requestAnimationFrame(() => {
      nameEl.closest('.att-name-card').style.animation = '';
    });
  }

  // --- フェーズ②：出席 / 欠席ボタン ---
  function handleCall(isPresent) {
    if (!isPresent) {
      absentNames.push(shuffledNames[callIndex]);
    }
    callIndex++;

    if (callIndex < shuffledNames.length) {
      showCallCard();
    } else {
      showResult();
    }
  }

  btnPresent.addEventListener('click', () => handleCall(true));
  btnAbsent.addEventListener('click',  () => handleCall(false));

  // --- フェーズ③：集計結果表示 ---
  function showResult() {
    const total   = shuffledNames.length;
    const absent  = absentNames.length;
    const present = total - absent;

    if (absent === 0) {
      resultIconEl.textContent  = '🌟';
      resultMainEl.textContent  = '全員出席！';
      resultDetailEl.textContent = `${total}人 みんな来たよ！`;
      absentListEl.classList.add('hidden');
    } else {
      resultIconEl.textContent  = '📋';
      resultMainEl.textContent  = `出席 ${present}人 / 欠席 ${absent}人`;
      resultDetailEl.textContent = `全体 ${total}人`;
      absentNamesEl.textContent  = absentNames.join('、');
      absentListEl.classList.remove('hidden');
    }

    showAttPhase(phaseResult);
  }

  // --- 「もう一度」ボタン ---
  btnAttRetry.addEventListener('click', () => {
    refreshReadyScreen();
    showAttPhase(phaseReady);
  });

  // --- 名簿変更を受け取り人数表示を更新 ---
  document.addEventListener('roster-updated', refreshReadyScreen);

  // --- 初回表示 ---
  refreshReadyScreen();
}

// ----------------------------------------
// 管理画面 — 名簿管理
// ----------------------------------------
function initAdminRoster() {

  const nameInput      = document.getElementById('admin-name-input');
  const btnAddName     = document.getElementById('btn-admin-add-name');
  const nameError      = document.getElementById('admin-name-error');
  const nameList       = document.getElementById('admin-name-list');
  const nameCountEl    = document.getElementById('admin-name-count');
  const nameEmptyEl    = document.getElementById('admin-name-empty');
  const btnClearAll    = document.getElementById('btn-admin-clear-all');

  // localStorage の読み書き
  function loadNames() {
    const raw = localStorage.getItem('att_names');
    return raw ? JSON.parse(raw) : [];
  }

  function saveNames(names) {
    localStorage.setItem('att_names', JSON.stringify(names));
  }

  // リストを再描画
  function renderList() {
    const names = loadNames();

    // 人数表示
    nameCountEl.textContent = `${names.length}人登録中`;

    // 既存リストアイテムをすべて削除（空メッセージ以外）
    Array.from(nameList.children).forEach(li => {
      if (li !== nameEmptyEl) li.remove();
    });

    if (names.length === 0) {
      nameEmptyEl.style.display = '';
    } else {
      nameEmptyEl.style.display = 'none';
      names.forEach((name, i) => {
        const li     = document.createElement('li');
        const span   = document.createElement('span');
        span.textContent = name;
        const delBtn = document.createElement('button');
        delBtn.className   = 'btn-admin-remove';
        delBtn.textContent = '削除';
        delBtn.addEventListener('click', () => {
          const updated = loadNames();
          updated.splice(i, 1);
          saveNames(updated);
          renderList();
        });
        li.appendChild(span);
        li.appendChild(delBtn);
        nameList.appendChild(li);
      });
    }
  }

  // 名前追加
  btnAddName.addEventListener('click', () => {
    const val = nameInput.value.trim();
    if (!val) {
      nameError.classList.remove('hidden');
      return;
    }
    nameError.classList.add('hidden');

    const names = loadNames();
    names.push(val);
    saveNames(names);
    nameInput.value = '';
    renderList();
  });

  // Enterキーでも追加
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') btnAddName.click();
  });

  // 全員削除
  btnClearAll.addEventListener('click', () => {
    if (!confirm('全員の名前を削除しますか？')) return;
    saveNames([]);
    renderList();
  });

  // 管理画面を開くたびにリストを最新化
  document.addEventListener('admin-opened', renderList);

  // 初回描画
  renderList();
}

// ----------------------------------------
// ⑤ 給食ミニアプリ
// ----------------------------------------
function initKyushoku() {
  const STORAGE_KEY = 'kyushokuMenus';
  // 5日分のデータ構造: [ { label: '月曜日', items: ['ご飯', ...] }, ... ]
  const DAY_LABELS = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日'];

  // ダミー候補（クイズの不正解選択肢として使用）
  const DUMMY_ITEMS = [
    'カレーライス', 'スパゲッティ', 'ラーメン', 'うどん', 'ピザ',
    'ハンバーグ', 'から揚げ', 'コロッケ', 'エビフライ', 'サラダ',
    'みそ汁', 'スープ', 'ヨーグルト', 'ゼリー', 'パン',
    'おにぎり', '焼き魚', '煮物', 'チャーハン', 'オムライス'
  ];

  // --- データ操作 ---
  function loadMenus() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DAY_LABELS.map(label => ({ label, items: [] }));
      return JSON.parse(raw);
    } catch {
      return DAY_LABELS.map(label => ({ label, items: [] }));
    }
  }

  function saveMenus(menus) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menus));
  }

  // 今日の曜日に対応する献立を返す（月〜金、0ベース）
  function getTodayMenu(menus) {
    const day = new Date().getDay(); // 0=日, 1=月, ... 6=土
    // 月〜金 → インデックス 0〜4
    const idx = day - 1;
    if (idx < 0 || idx > 4) return null; // 土日は null
    return menus[idx];
  }

  // Fisher-Yates シャッフル
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --- ミニアプリ UI ---
  const phaseReady  = document.getElementById('kyu-phase-ready');
  const phaseQuiz   = document.getElementById('kyu-phase-quiz');
  const phaseMenu   = document.getElementById('kyu-phase-menu');
  const todayLabel  = document.getElementById('kyu-today-label');
  const btnStart    = document.getElementById('btn-kyu-start');
  const noMenuMsg   = document.getElementById('kyu-no-menu');
  const quizGrid    = document.getElementById('kyu-quiz-grid');
  const quizResult  = document.getElementById('kyu-quiz-result');
  const resultIcon  = document.getElementById('kyu-result-icon');
  const resultText  = document.getElementById('kyu-result-text');
  const nextButtons = document.getElementById('kyu-next-buttons');
  const btnNext     = document.getElementById('btn-kyu-next');
  const menuBox     = document.getElementById('kyu-menu-box');
  const btnRetry    = document.getElementById('btn-kyu-retry');

  function showKyuPhase(id) {
    [phaseReady, phaseQuiz, phaseMenu].forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
  }

  function refreshReadyPhase() {
    const menus   = loadMenus();
    const today   = getTodayMenu(menus);
    const dayName = ['日', '月', '火', '水', '木', '金', '土'];
    const day     = new Date().getDay();
    todayLabel.textContent = `📅 今日は${dayName[day]}曜日`;

    if (!today || today.items.length === 0) {
      btnStart.disabled = true;
      noMenuMsg.classList.remove('hidden');
    } else {
      btnStart.disabled = false;
      noMenuMsg.classList.add('hidden');
    }
  }

  btnStart.addEventListener('click', () => {
    const menus  = loadMenus();
    const today  = getTodayMenu(menus);
    if (!today || today.items.length === 0) return;

    // 正解：今日の献立からランダムに1品
    const correct = today.items[Math.floor(Math.random() * today.items.length)];

    // ダミー：今日の献立に含まれないDUMMY_ITEMSから3つ選ぶ
    const dummies = shuffle(DUMMY_ITEMS.filter(d => !today.items.includes(d))).slice(0, 3);

    // 4択をシャッフル
    const choices = shuffle([correct, ...dummies]);

    // クイズ画面を構築
    quizGrid.innerHTML = '';
    quizResult.classList.add('hidden');
    nextButtons.classList.add('hidden');

    choices.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'kyu-quiz-btn';
      btn.textContent = item;
      btn.addEventListener('click', () => {
        // 全ボタンを無効化
        quizGrid.querySelectorAll('.kyu-quiz-btn').forEach(b => b.disabled = true);

        if (item === correct) {
          btn.classList.add('correct');
          resultIcon.textContent = '⭕';
          resultText.textContent = '正解！ 「' + correct + '」だよ！';
        } else {
          btn.classList.add('wrong');
          // 正解ボタンをハイライト
          quizGrid.querySelectorAll('.kyu-quiz-btn').forEach(b => {
            if (b.textContent === correct) b.classList.add('correct');
          });
          resultIcon.textContent = '❌';
          resultText.textContent = '残念！ 正解は「' + correct + '」だよ！';
        }

        quizResult.classList.remove('hidden');
        nextButtons.classList.remove('hidden');
      });
      quizGrid.appendChild(btn);
    });

    // 献立一覧フェーズ用に保存
    btnNext.dataset.items = JSON.stringify(today.items);

    showKyuPhase('kyu-phase-quiz');
  });

  btnNext.addEventListener('click', () => {
    let items = [];
    try { items = JSON.parse(btnNext.dataset.items); } catch { items = []; }

    const icons = ['🍚', '🍜', '🥗', '🍞', '🥛', '🍮', '🫕', '🥘'];
    menuBox.innerHTML = '';
    items.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'kyu-menu-item';
      div.style.animationDelay = (i * 0.08) + 's';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'kyu-menu-item-icon';
      iconSpan.textContent = icons[i % icons.length];
      const nameSpan = document.createElement('span');
      nameSpan.textContent = item;
      div.appendChild(iconSpan);
      div.appendChild(nameSpan);
      menuBox.appendChild(div);
    });

    showKyuPhase('kyu-phase-menu');
  });

  btnRetry.addEventListener('click', () => {
    refreshReadyPhase();
    showKyuPhase('kyu-phase-ready');
  });

  // 管理画面を閉じたときに Ready フェーズの表示を更新
  document.addEventListener('roster-updated', refreshReadyPhase);

  refreshReadyPhase();
}

// ----------------------------------------
// 管理画面：給食献立管理
// ----------------------------------------
function initAdminKyushoku() {
  const STORAGE_KEY = 'kyushokuMenus';
  const DAY_LABELS  = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日'];
  const MAX_ITEMS   = 8;

  function loadMenus() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DAY_LABELS.map(label => ({ label, items: [] }));
      return JSON.parse(raw);
    } catch {
      return DAY_LABELS.map(label => ({ label, items: [] }));
    }
  }

  function saveMenus(menus) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menus));
  }

  const daysContainer = document.getElementById('admin-menu-days');
  const editArea      = document.getElementById('admin-menu-edit');
  const editTitle     = document.getElementById('admin-menu-edit-title');
  const itemsList     = document.getElementById('admin-menu-items-list');
  const btnCancel     = document.getElementById('btn-admin-menu-cancel');
  const btnSave       = document.getElementById('btn-admin-menu-save');

  let editingIndex = -1;

  function renderDayCards() {
    const menus = loadMenus();
    daysContainer.innerHTML = '';

    menus.forEach((menu, i) => {
      const card = document.createElement('div');
      card.className = 'admin-menu-day-card' + (menu.items.length > 0 ? ' has-menu' : '');

      const label = document.createElement('div');
      label.className = 'admin-menu-day-label';
      label.textContent = menu.label;

      const content = document.createElement('div');
      content.className = 'admin-menu-day-content';

      if (menu.items.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'admin-menu-empty-text';
        empty.textContent = '未登録';
        content.appendChild(empty);
      } else {
        menu.items.forEach(item => {
          const chip = document.createElement('span');
          chip.className = 'admin-menu-chip';
          chip.textContent = item;
          content.appendChild(chip);
        });
      }

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-admin-menu-edit';
      editBtn.textContent = '編集';
      editBtn.addEventListener('click', () => openEditArea(i));

      card.appendChild(label);
      card.appendChild(content);
      card.appendChild(editBtn);
      daysContainer.appendChild(card);
    });
  }

  function openEditArea(index) {
    const menus = loadMenus();
    const menu  = menus[index];
    editingIndex = index;

    editTitle.textContent = `🍱 ${menu.label} の献立を編集`;

    // 入力欄を MAX_ITEMS 個生成
    itemsList.innerHTML = '';
    for (let i = 0; i < MAX_ITEMS; i++) {
      const row = document.createElement('div');
      row.className = 'admin-menu-item-row';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'admin-menu-item-input';
      input.placeholder = `品目 ${i + 1}（空欄は除外）`;
      input.maxLength = 30;
      input.value = menu.items[i] || '';

      row.appendChild(input);
      itemsList.appendChild(row);
    }

    editArea.classList.remove('hidden');
    // 最初の入力欄にフォーカス
    itemsList.querySelector('input')?.focus();
  }

  btnCancel.addEventListener('click', () => {
    editArea.classList.add('hidden');
    editingIndex = -1;
  });

  btnSave.addEventListener('click', () => {
    if (editingIndex < 0) return;

    const inputs = itemsList.querySelectorAll('.admin-menu-item-input');
    const items  = [];
    inputs.forEach(inp => {
      const val = inp.value.trim();
      if (val) items.push(val);
    });

    const menus = loadMenus();
    menus[editingIndex].items = items;
    saveMenus(menus);

    editArea.classList.add('hidden');
    editingIndex = -1;
    renderDayCards();
  });

  // 管理画面を開くたびにリストを再描画
  document.addEventListener('admin-opened', renderDayCards);

  renderDayCards();
}

// ----------------------------------------
// 初期化
// ----------------------------------------
renderDots(0);
initReikoElements();
initVoiceElements();
initDateWeather();
initAttendance();
initAdminRoster();
initKyushoku();
initAdminKyushoku();

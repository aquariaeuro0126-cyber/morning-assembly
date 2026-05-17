/* ========================================
   朝の会アプリ - メインスクリプト
======================================== */

// ----------------------------------------
// 定数・設定
// ----------------------------------------
const TOTAL_STEPS = 8;
const ADMIN_PASSWORD = '1234';       // ← パスワードはここで変更できます
// 管理画面トリガー：タップ順序 '💡' → '🌅' → '💡'
const END_COUNTDOWN_SEC = 10;        // 終了画面の自動戻り秒数

// 管理画面トリガー：タップ間隔（ミリ秒）以内に次のタップで認識
const ADMIN_TAP_INTERVAL = 3000;

// ----------------------------------------
// 状態管理
// ----------------------------------------
let currentStep = 0;       // 現在のステップ（0〜7）
let completedSteps = [];   // 完了済みステップ
let countdownTimer = null; // 終了画面カウントダウン用タイマー
// 管理画面トリガー: タップ順序 bulb→sun→bulb を追跡
// 0: 待機中, 1: 💡を1回タップ済み, 2: 🌅をタップ済み
let adminTapStep  = 0;
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
const adminTriggerBulb = document.getElementById('admin-trigger-bulb');
const startIcon        = document.getElementById('start-icon');
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
  // スタート画面のときだけ💡ボタンを表示
  if (screen === screenStart) {
    adminTriggerBulb.classList.add('visible');
  } else {
    adminTriggerBulb.classList.remove('visible');
    resetAdminTap();
  }
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
function getCountdownLabel(remaining) {
  const isHiragana = document.body.dataset.mode === 'hiragana';
  if (isHiragana) {
    return `${remaining}びょうごにトップにもどります`;
  }
  return `${remaining}秒後にトップにもどります`;
}

function startEndCountdown() {
  clearTimeout(countdownTimer);
  let remaining = END_COUNTDOWN_SEC;
  countdownFill.style.width = '100%';
  countdownText.textContent = getCountdownLabel(remaining);

  countdownTimer = setInterval(() => {
    remaining--;
    const pct = (remaining / END_COUNTDOWN_SEC) * 100;
    countdownFill.style.width = pct + '%';
    countdownText.textContent = getCountdownLabel(remaining);

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
// 管理画面トリガー（💡→🌅→💡 の順にタップ）
// ----------------------------------------
function resetAdminTap() {
  adminTapStep = 0;
  clearTimeout(adminTapTimer);
}

function advanceAdminTap(expectedStep) {
  if (adminTapStep !== expectedStep) return; // 順序違いは無視
  adminTapStep++;
  clearTimeout(adminTapTimer);
  adminTapTimer = setTimeout(resetAdminTap, ADMIN_TAP_INTERVAL);

  if (adminTapStep >= 3) {
    resetAdminTap();
    openAdminModal();
  }
}

// 💡ボタン（step 0 → 1、step 2 → 完成）
adminTriggerBulb.addEventListener('click', () => {
  if (adminTapStep === 0) {
    advanceAdminTap(0); // step 0 → 1
  } else if (adminTapStep === 2) {
    advanceAdminTap(2); // step 2 → 3（開放）
  }
  // step 1（🌅 待ち）のときは何もしない（タイムアウトで自動リセット）
});

// 🌅アイコン（step 1 → 2）
startIcon.addEventListener('click', () => {
  advanceAdminTap(1);
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
// ⑥ 歌ミニアプリ
// ----------------------------------------

// YouTube IFrame API が読み込まれたときに呼ばれるコールバック
// （API側から自動で呼び出されるためグローバルに定義する必要がある）
let ytPlayer = null;
let ytPlayerReady = false;

window.onYouTubeIframeAPIReady = function() {
  ytPlayerReady = true;
};

function extractYouTubeId(url) {
  if (!url) return null;
  // youtu.be/XXXX または watch?v=XXXX または embed/XXXX 形式に対応
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_\-]{11})/,
    /[?&]v=([A-Za-z0-9_\-]{11})/,
    /embed\/([A-Za-z0-9_\-]{11})/
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function initSong() {
  const STORAGE_KEY_MONTHLY = 'songMonthly';
  const STORAGE_KEY_FAV     = 'songFavList';
  const STORAGE_KEY_WIN     = 'songWinCount';
  const LOTTERY_TOTAL       = 10; // くじの総枚数

  // --- DOM 取得 ---
  const phaseReady   = document.getElementById('song-phase-ready');
  const phaseLottery = document.getElementById('song-phase-lottery');
  const phaseSelect  = document.getElementById('song-phase-select');
  const phasePlay    = document.getElementById('song-phase-play');

  const thisMonthLabel  = document.getElementById('song-this-month-label');
  const btnLottery      = document.getElementById('btn-song-lottery');
  const noDataMsg       = document.getElementById('song-no-data');

  const lotteryBox      = document.getElementById('lottery-box');
  const lotteryIcon     = document.getElementById('lottery-icon');
  const lotteryShakeText = document.getElementById('lottery-shake-text');
  const lotteryResult   = document.getElementById('lottery-result');
  const lotteryResultBadge = document.getElementById('lottery-result-badge');
  const lotteryResultText  = document.getElementById('lottery-result-text');
  const btnLotteryNext  = document.getElementById('btn-song-lottery-next');

  const songSelectList  = document.getElementById('song-select-list');
  const songNowTitle    = document.getElementById('song-now-title');
  const songLyricsWrap  = document.getElementById('song-lyrics-wrap');
  const songLyricsBody  = document.getElementById('song-lyrics-body');
  const btnSongRetry    = document.getElementById('btn-song-retry');

  if (!phaseReady) return;

  // --- データ読み込み ---
  function loadMonthly() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_MONTHLY)) || null; }
    catch { return null; }
  }
  function loadFavList() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_FAV)) || []; }
    catch { return []; }
  }
  function loadWinCount() {
    const v = parseInt(localStorage.getItem(STORAGE_KEY_WIN));
    return (!isNaN(v) && v >= 1 && v <= 9) ? v : 3;
  }

  // --- フェーズ切り替え ---
  function showSongPhase(phase) {
    [phaseReady, phaseLottery, phaseSelect, phasePlay].forEach(p => {
      if (p) p.classList.add('hidden');
    });
    if (phase) phase.classList.remove('hidden');
  }

  // --- スタート画面を更新 ---
  function refreshReady() {
    const monthly = loadMonthly();
    if (!monthly || !monthly.title || !monthly.url) {
      thisMonthLabel.textContent = '📀 今月の歌：未登録';
      btnLottery.disabled = true;
      noDataMsg.classList.remove('hidden');
    } else {
      thisMonthLabel.textContent = `📀 今月の歌：${monthly.title}`;
      btnLottery.disabled = false;
      noDataMsg.classList.add('hidden');
    }
  }

  // --- くじ引き実行 ---
  btnLottery.addEventListener('click', () => {
    showSongPhase(phaseLottery);

    // アニメーション中はボックスをシェイク
    lotteryBox.style.animation = 'lotteryShake 0.4s ease infinite';
    lotteryIcon.textContent = '🎫';
    lotteryShakeText.textContent = '？？？';
    lotteryResult.classList.add('hidden');
    btnLotteryNext.classList.add('hidden');

    // 1.5秒後に結果を表示
    setTimeout(() => {
      const winCount = loadWinCount();
      const isWin    = Math.random() < (winCount / LOTTERY_TOTAL);

      // アニメーション停止
      lotteryBox.style.animation = 'none';

      if (isWin) {
        lotteryIcon.textContent    = '🎊';
        lotteryShakeText.textContent = '当たり！！';
        lotteryResultBadge.textContent = '🎉';
        lotteryResultText.textContent  = '好きな歌を選んでいいよ！';

        lotteryResult.classList.remove('hidden');
        btnLotteryNext.textContent = '曲をえらぶ ▶';
        btnLotteryNext.classList.remove('hidden');
        btnLotteryNext.dataset.result = 'win';
      } else {
        lotteryIcon.textContent    = '😢';
        lotteryShakeText.textContent = 'はずれ…';
        lotteryResultBadge.textContent = '📀';
        lotteryResultText.textContent  = '今月の歌を歌おう！';

        lotteryResult.classList.remove('hidden');
        btnLotteryNext.textContent = '歌いにいく ▶';
        btnLotteryNext.classList.remove('hidden');
        btnLotteryNext.dataset.result = 'lose';
      }
    }, 1500);
  });

  // --- くじ結果の「次へ」 ---
  btnLotteryNext.addEventListener('click', () => {
    const result = btnLotteryNext.dataset.result;
    if (result === 'win') {
      // 当たり → 好きな曲一覧へ
      const favList = loadFavList();
      if (favList.length === 0) {
        // 好きな曲が未登録の場合は今月の歌へ
        playSong(loadMonthly());
        return;
      }
      buildSelectList(favList);
      showSongPhase(phaseSelect);
    } else {
      // はずれ → 今月の歌を再生
      playSong(loadMonthly());
    }
  });

  // --- 好きな曲選択リストを構築 ---
  function buildSelectList(favList) {
    songSelectList.innerHTML = '';
    favList.forEach(song => {
      const btn = document.createElement('button');
      btn.className = 'song-select-btn';
      btn.innerHTML = `🎵 <span>${song.title}</span>`;
      btn.addEventListener('click', () => playSong(song));
      songSelectList.appendChild(btn);
    });
  }

  // --- 歌を再生するフェーズへ ---
  function playSong(song) {
    if (!song) return;
    songNowTitle.textContent = song.title;

    // 歌詞
    if (song.lyrics && song.lyrics.trim()) {
      songLyricsBody.textContent = song.lyrics;
      songLyricsWrap.classList.remove('hidden');
    } else {
      songLyricsWrap.classList.add('hidden');
    }

    // YouTube 埋め込み
    const videoId = extractYouTubeId(song.url);
    const playerEl = document.getElementById('song-youtube-player');
    if (videoId && playerEl) {
      if (ytPlayer) {
        ytPlayer.destroy();
        ytPlayer = null;
      }
      if (ytPlayerReady) {
        // YouTube API が読み込み済み
        ytPlayer = new YT.Player('song-youtube-player', {
          height: '315',
          width:  '100%',
          videoId: videoId,
          playerVars: { rel: 0, modestbranding: 1 }
        });
      } else {
        // フォールバック：iframe を直接埋め込む
        playerEl.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1" width="100%" height="315" allowfullscreen></iframe>`;
      }
    } else {
      const playerEl2 = document.getElementById('song-youtube-player');
      if (playerEl2) playerEl2.innerHTML = '<p style="text-align:center;padding:40px;color:#b0bec5;">動画URLが設定されていません</p>';
    }

    showSongPhase(phasePlay);
  }

  // --- 「もう一度」ボタン ---
  btnSongRetry.addEventListener('click', () => {
    // YouTube プレーヤーを停止・破棄
    if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
      ytPlayer.stopVideo();
      ytPlayer.destroy();
      ytPlayer = null;
    }
    // iframe フォールバックも破棄
    const playerEl = document.getElementById('song-youtube-player');
    if (playerEl) playerEl.innerHTML = '';

    refreshReady();
    showSongPhase(phaseReady);
  });

  // 管理画面変更を反映
  document.addEventListener('song-updated', refreshReady);

  // 初回表示
  refreshReady();
}

// ----------------------------------------
// 管理画面 — 歌設定管理
// ----------------------------------------
function initAdminSong() {
  const STORAGE_KEY_MONTHLY = 'songMonthly';
  const STORAGE_KEY_FAV     = 'songFavList';
  const STORAGE_KEY_WIN     = 'songWinCount';

  // --- DOM 取得 ---
  const monthlyTitle  = document.getElementById('admin-song-monthly-title');
  const monthlyUrl    = document.getElementById('admin-song-monthly-url');
  const monthlyLyrics = document.getElementById('admin-song-monthly-lyrics');
  const btnMonthlySave = document.getElementById('btn-admin-song-monthly-save');
  const monthlySaved  = document.getElementById('admin-song-monthly-saved');

  const winCountInput = document.getElementById('admin-song-win-count');
  const btnWinSave    = document.getElementById('btn-admin-song-win-save');
  const winSaved      = document.getElementById('admin-song-win-saved');

  const favTitleInput  = document.getElementById('admin-song-fav-title');
  const favUrlInput    = document.getElementById('admin-song-fav-url');
  const favLyricsInput = document.getElementById('admin-song-fav-lyrics');
  const btnFavAdd      = document.getElementById('btn-admin-song-fav-add');
  const favError       = document.getElementById('admin-song-fav-error');
  const favCountEl     = document.getElementById('admin-song-fav-count');
  const favList        = document.getElementById('admin-song-fav-list');
  const favEmptyEl     = document.getElementById('admin-song-fav-empty');

  if (!btnMonthlySave) return;

  // --- データ読み書き ---
  function loadMonthly() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_MONTHLY)) || { title: '', url: '', lyrics: '' }; }
    catch { return { title: '', url: '', lyrics: '' }; }
  }
  function saveMonthly(data) { localStorage.setItem(STORAGE_KEY_MONTHLY, JSON.stringify(data)); }

  function loadFavList() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_FAV)) || []; }
    catch { return []; }
  }
  function saveFavList(list) { localStorage.setItem(STORAGE_KEY_FAV, JSON.stringify(list)); }

  function loadWinCount() {
    const v = parseInt(localStorage.getItem(STORAGE_KEY_WIN));
    return (!isNaN(v) && v >= 1 && v <= 9) ? v : 3;
  }
  function saveWinCount(v) { localStorage.setItem(STORAGE_KEY_WIN, String(v)); }

  // --- 今月の歌フォームを初期化 ---
  function loadMonthlyForm() {
    const data = loadMonthly();
    monthlyTitle.value  = data.title  || '';
    monthlyUrl.value    = data.url    || '';
    monthlyLyrics.value = data.lyrics || '';
  }

  // 今月の歌を保存
  btnMonthlySave.addEventListener('click', () => {
    saveMonthly({
      title:  monthlyTitle.value.trim(),
      url:    monthlyUrl.value.trim(),
      lyrics: monthlyLyrics.value
    });
    monthlySaved.classList.remove('hidden');
    setTimeout(() => monthlySaved.classList.add('hidden'), 2000);
    document.dispatchEvent(new CustomEvent('song-updated'));
  });

  // --- 当たり枠数 ---
  function loadWinForm() {
    winCountInput.value = loadWinCount();
  }

  btnWinSave.addEventListener('click', () => {
    let v = parseInt(winCountInput.value);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 9) v = 9;
    winCountInput.value = v;
    saveWinCount(v);
    winSaved.classList.remove('hidden');
    setTimeout(() => winSaved.classList.add('hidden'), 2000);
  });

  // --- 好きな曲リスト ---
  function renderFavList() {
    const list = loadFavList();
    favCountEl.textContent = `${list.length}曲登録中`;

    Array.from(favList.children).forEach(li => {
      if (li !== favEmptyEl) li.remove();
    });

    if (list.length === 0) {
      favEmptyEl.style.display = '';
    } else {
      favEmptyEl.style.display = 'none';
      list.forEach((song, i) => {
        const li = document.createElement('li');
        const span = document.createElement('span');
        span.textContent = song.title;
        span.style.flex = '1';
        span.style.fontSize = '15px';

        const delBtn = document.createElement('button');
        delBtn.className   = 'btn-admin-remove';
        delBtn.textContent = '削除';
        delBtn.addEventListener('click', () => {
          const updated = loadFavList();
          updated.splice(i, 1);
          saveFavList(updated);
          renderFavList();
          document.dispatchEvent(new CustomEvent('song-updated'));
        });

        li.appendChild(span);
        li.appendChild(delBtn);
        favList.appendChild(li);
      });
    }
  }

  btnFavAdd.addEventListener('click', () => {
    const title  = favTitleInput.value.trim();
    const url    = favUrlInput.value.trim();
    const lyrics = favLyricsInput.value;

    if (!title || !url) {
      favError.classList.remove('hidden');
      return;
    }
    favError.classList.add('hidden');

    const list = loadFavList();
    list.push({ title, url, lyrics });
    saveFavList(list);

    favTitleInput.value  = '';
    favUrlInput.value    = '';
    favLyricsInput.value = '';
    renderFavList();
    document.dispatchEvent(new CustomEvent('song-updated'));
  });

  // 管理画面を開くたびにフォームを最新化
  document.addEventListener('admin-opened', () => {
    loadMonthlyForm();
    loadWinForm();
    renderFavList();
  });

  // 初回
  loadMonthlyForm();
  loadWinForm();
  renderFavList();
}

// ----------------------------------------
// ⑦ 日直の話ミニアプリ
// ----------------------------------------

const NICHOKU_STORAGE_KEY = 'nichokuTopics';

// デフォルトトピック（5個）
const NICHOKU_DEFAULT_TOPICS = [
  '今日楽しみなこと',
  '最近はまっていること',
  '好きな食べ物',
  '週末にしたこと',
  'おすすめしたいもの'
];

function initNichokuTalk() {
  const phaseReady    = document.getElementById('nichoku-phase-ready');
  const phaseSpinning = document.getElementById('nichoku-phase-spinning');
  const phaseResult   = document.getElementById('nichoku-phase-result');

  const topicsPreview   = document.getElementById('nichoku-topics-preview');
  const btnSpin         = document.getElementById('btn-nichoku-spin');
  const rouletteDrum    = document.getElementById('roulette-drum');
  const resultTopic     = document.getElementById('nichoku-result-topic');
  const btnRetry        = document.getElementById('btn-nichoku-retry');

  if (!phaseReady) return;

  // --- データ読み込み ---
  function loadTopics() {
    try {
      const data = JSON.parse(localStorage.getItem(NICHOKU_STORAGE_KEY));
      return (Array.isArray(data) && data.length > 0) ? data : [...NICHOKU_DEFAULT_TOPICS];
    } catch {
      return [...NICHOKU_DEFAULT_TOPICS];
    }
  }

  // --- フェーズ切り替え ---
  function showNichokuPhase(phase) {
    [phaseReady, phaseSpinning, phaseResult].forEach(p => {
      if (p) p.classList.add('hidden');
    });
    if (phase) phase.classList.remove('hidden');
  }

  // --- スタート画面のトピックプレビューを更新 ---
  function refreshReady() {
    const topics = loadTopics();
    topicsPreview.innerHTML = '';
    topics.forEach(t => {
      const chip = document.createElement('span');
      chip.className = 'nichoku-topic-chip';
      chip.textContent = t;
      topicsPreview.appendChild(chip);
    });
  }

  // --- ルーレット実行 ---
  btnSpin.addEventListener('click', () => {
    const topics = loadTopics();
    if (topics.length === 0) return;

    // 選ばれるインデックスを事前に決定
    const winIndex = Math.floor(Math.random() * topics.length);

    // ドラムにアイテムを並べる
    // 十分な数のコピーを用意してスクロール感を出す
    const REPEAT = 5; // 5周分
    rouletteDrum.innerHTML = '';
    const totalItems = topics.length * REPEAT;
    for (let i = 0; i < totalItems; i++) {
      const item = document.createElement('div');
      item.className = 'roulette-drum-item';
      item.textContent = topics[i % topics.length];
      rouletteDrum.appendChild(item);
    }

    // ドラムを一番上に戻す
    rouletteDrum.style.transition = 'none';
    rouletteDrum.style.transform  = 'translateY(0)';

    showNichokuPhase(phaseSpinning);

    // アニメーション設定
    const ITEM_HEIGHT  = 64; // px（CSSの .roulette-drum-item の height と一致）
    const WINDOW_H     = 200; // px（.roulette-drum-window の height）
    const CENTER_OFFSET = (WINDOW_H / 2) - (ITEM_HEIGHT / 2); // 68px

    // 最終的に止まるアイテムのインデックス（最終周 + winIndex）
    const finalIndex   = topics.length * (REPEAT - 1) + winIndex;
    const finalY       = finalIndex * ITEM_HEIGHT - CENTER_OFFSET;

    // 段階的に加速→減速するアニメーション
    let currentY = 0;
    let speed    = 8;   // 初速（px/フレーム）
    const maxSpeed = 40; // 最高速
    const accelFrames  = 30;  // 加速フレーム数
    const totalDist    = finalY;
    let frame = 0;
    let raf;

    function animate() {
      // 加速フェーズ
      if (frame < accelFrames) {
        speed = 8 + (maxSpeed - 8) * (frame / accelFrames);
      }

      const remaining = totalDist - currentY;

      // 残り距離が少ない場合は減速
      if (remaining <= ITEM_HEIGHT * topics.length) {
        speed = Math.max(4, remaining / (ITEM_HEIGHT * topics.length) * maxSpeed);
      }

      currentY += speed;

      if (currentY >= finalY) {
        currentY = finalY;
        rouletteDrum.style.transform = `translateY(-${currentY}px)`;

        // 当選アイテムにクラス付与
        const items = rouletteDrum.querySelectorAll('.roulette-drum-item');
        items.forEach((el, i) => {
          el.classList.toggle('selected', i === finalIndex);
        });

        // 0.5秒後に結果画面へ
        setTimeout(() => {
          resultTopic.textContent = topics[winIndex];
          showNichokuPhase(phaseResult);
        }, 500);
        return;
      }

      rouletteDrum.style.transform = `translateY(-${currentY}px)`;
      frame++;
      raf = requestAnimationFrame(animate);
    }

    // 描画が落ち着いてからスタート
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        raf = requestAnimationFrame(animate);
      });
    });
  });

  // --- 「もう一度回す」ボタン ---
  btnRetry.addEventListener('click', () => {
    refreshReady();
    showNichokuPhase(phaseReady);
  });

  // 管理画面変更を反映
  document.addEventListener('nichoku-updated', refreshReady);

  // 初回表示
  refreshReady();
}

// ----------------------------------------
// 管理画面 — 日直トピック管理
// ----------------------------------------
function initAdminNichokuTalk() {
  const topicInput   = document.getElementById('admin-topic-input');
  const btnAdd       = document.getElementById('btn-admin-topic-add');
  const topicError   = document.getElementById('admin-topic-error');
  const topicCountEl = document.getElementById('admin-topic-count');
  const topicList    = document.getElementById('admin-topic-list');
  const topicEmptyEl = document.getElementById('admin-topic-empty');
  const btnReset     = document.getElementById('btn-admin-topic-reset');

  if (!btnAdd) return;

  function loadTopics() {
    try {
      const data = JSON.parse(localStorage.getItem(NICHOKU_STORAGE_KEY));
      return (Array.isArray(data) && data.length > 0) ? data : [...NICHOKU_DEFAULT_TOPICS];
    } catch {
      return [...NICHOKU_DEFAULT_TOPICS];
    }
  }

  function saveTopics(list) {
    localStorage.setItem(NICHOKU_STORAGE_KEY, JSON.stringify(list));
  }

  function renderTopicList() {
    const list = loadTopics();
    topicCountEl.textContent = `${list.length}件登録中`;

    // 動的生成アイテムだけ削除（emptyアイテムは残す）
    Array.from(topicList.children).forEach(li => {
      if (li !== topicEmptyEl) li.remove();
    });

    if (list.length === 0) {
      topicEmptyEl.style.display = '';
    } else {
      topicEmptyEl.style.display = 'none';
      list.forEach((topic, i) => {
        const li = document.createElement('li');

        const span = document.createElement('span');
        span.textContent = topic;
        span.style.flex = '1';
        span.style.fontSize = '15px';

        const delBtn = document.createElement('button');
        delBtn.className   = 'btn-admin-remove';
        delBtn.textContent = '削除';
        delBtn.addEventListener('click', () => {
          const updated = loadTopics();
          updated.splice(i, 1);
          saveTopics(updated);
          renderTopicList();
          document.dispatchEvent(new CustomEvent('nichoku-updated'));
        });

        li.appendChild(span);
        li.appendChild(delBtn);
        topicList.appendChild(li);
      });
    }
  }

  // トピック追加
  btnAdd.addEventListener('click', () => {
    const val = topicInput.value.trim();
    if (!val) {
      topicError.classList.remove('hidden');
      return;
    }
    topicError.classList.add('hidden');

    const list = loadTopics();
    list.push(val);
    saveTopics(list);
    topicInput.value = '';
    renderTopicList();
    document.dispatchEvent(new CustomEvent('nichoku-updated'));
  });

  // Enterキーでも追加
  topicInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnAdd.click();
  });

  // デフォルトに戻す
  btnReset.addEventListener('click', () => {
    saveTopics([...NICHOKU_DEFAULT_TOPICS]);
    renderTopicList();
    document.dispatchEvent(new CustomEvent('nichoku-updated'));
  });

  // 管理画面を開くたびに再描画
  document.addEventListener('admin-opened', renderTopicList);

  // 初回
  renderTopicList();
}

// ----------------------------------------
// ⑧ 先生の話
// ----------------------------------------
function initSenseiTalk() {
  // DOM
  const phaseReady   = document.getElementById('sensei-phase-ready');
  const phaseTalking = document.getElementById('sensei-phase-talking');
  const phaseInput   = document.getElementById('sensei-phase-input');
  const phaseResult  = document.getElementById('sensei-phase-result');

  const btnStart   = document.getElementById('btn-sensei-start');
  const btnDone    = document.getElementById('btn-sensei-done');
  const btnConfirm = document.getElementById('btn-sensei-confirm');
  const btnRetry   = document.getElementById('btn-sensei-retry');

  const meateInput       = document.getElementById('sensei-meate-input');
  const previewPlaceholder = document.getElementById('sensei-preview-placeholder');
  const previewText        = document.getElementById('sensei-preview-text');
  const inputError         = document.getElementById('sensei-input-error');
  const resultMeate        = document.getElementById('sensei-result-meate');

  function showSenseiPhase(phase) {
    [phaseReady, phaseTalking, phaseInput, phaseResult].forEach(p => {
      p.classList.add('hidden');
    });
    phase.classList.remove('hidden');
  }

  // フェーズ①→②：話をはじめる
  btnStart.addEventListener('click', () => {
    showSenseiPhase(phaseTalking);
  });

  // フェーズ②→③：話し終わりました
  btnDone.addEventListener('click', () => {
    // 入力欄をリセット
    meateInput.value = '';
    previewPlaceholder.classList.remove('hidden');
    previewText.classList.add('hidden');
    previewText.textContent = '';
    inputError.classList.add('hidden');
    showSenseiPhase(phaseInput);
    // キーボードを自動で開く
    setTimeout(() => meateInput.focus(), 100);
  });

  // 入力中にプレビューをリアルタイム更新
  meateInput.addEventListener('input', () => {
    const val = meateInput.value.trim();
    if (val) {
      previewText.textContent = val;
      previewText.classList.remove('hidden');
      previewPlaceholder.classList.add('hidden');
    } else {
      previewText.classList.add('hidden');
      previewPlaceholder.classList.remove('hidden');
    }
    inputError.classList.add('hidden');
  });

  // Enterキーでも確定
  meateInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnConfirm.click();
  });

  // フェーズ③→④：決定ボタン
  btnConfirm.addEventListener('click', () => {
    const val = meateInput.value.trim();
    if (!val) {
      inputError.classList.remove('hidden');
      meateInput.focus();
      return;
    }
    resultMeate.textContent = val;
    showSenseiPhase(phaseResult);
  });

  // フェーズ④→①：もう一度
  btnRetry.addEventListener('click', () => {
    showSenseiPhase(phaseReady);
  });
}

// ----------------------------------------
// 初期化
// ----------------------------------------
// 起動時はスタート画面 → 💡ボタンを表示
adminTriggerBulb.classList.add('visible');

renderDots(0);
initReikoElements();
initVoiceElements();
initDateWeather();
initAttendance();
initAdminRoster();
initKyushoku();
initAdminKyushoku();
initSong();
initAdminSong();
initNichokuTalk();
initAdminNichokuTalk();
initSenseiTalk();

// ----------------------------------------
// ひらがな / 漢字モード切り替え
// ----------------------------------------
(function initDisplayMode() {
  const body = document.body;
  const btnKanji    = document.getElementById('btn-mode-kanji');
  const btnHiragana = document.getElementById('btn-mode-hiragana');

  // localStorage から保存済みモードを復元（デフォルト: kanji）
  const savedMode = localStorage.getItem('displayMode') || 'kanji';
  applyMode(savedMode);

  btnKanji.addEventListener('click', () => applyMode('kanji'));
  btnHiragana.addEventListener('click', () => applyMode('hiragana'));

  function applyMode(mode) {
    body.dataset.mode = mode;
    localStorage.setItem('displayMode', mode);

    if (mode === 'kanji') {
      btnKanji.classList.add('active');
      btnHiragana.classList.remove('active');
    } else {
      btnHiragana.classList.add('active');
      btnKanji.classList.remove('active');
    }
  }
})();

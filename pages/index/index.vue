<template>
  <view class="container" :class="themeClass">
    <!-- 头部 -->
    <view class="header">
      <text class="title">安眠匣</text>
      <text class="subtitle">SleepHaven · 守护你的每一刻安宁</text>
    </view>

    <!-- 状态指示器 -->
    <view class="status-badge" :class="timePeriodClass">
      <text class="badge-icon">{{ timePeriodIcon }}</text>
      <text class="badge-text">{{ timePeriodText }}</text>
    </view>

    <!-- 睡眠负债卡片 -->
    <view class="card debt-card" :class="debtClass">
      <view class="debt-header">
        <text class="card-label">累计睡眠负债</text>
        <text v-if="sleepDebt != 0" class="reset-debt-btn" @click="clearSleepDebt">[重置]</text>
      </view>
      <text class="card-value">{{ formatDebt(sleepDebt) }}</text>
      <text class="card-tip">{{ debtTip }}</text>
    </view>

    <!-- 主操作区 -->
    <view class="main-action">
      <text v-if="!isMonitoring" class="question">{{ mainQuestion }}</text>
      
      <!-- 监测中状态 -->
      <view v-else class="monitoring-status">
        <text class="monitoring-text">监测进行中...</text>
        <text class="monitoring-timer">{{ currentDuration }}</text>
        <text class="small-hint" v-if="wakeCount > 0">⚠️ 检测到 {{ wakeCount }} 次中途亮屏</text>
        <text class="small-hint" v-else>*即使关闭 APP，数据也会自动保存</text>
      </view>
      
      <!-- 开始按钮 -->
      <button 
        v-if="!isMonitoring" 
        class="btn-start" 
        :class="btnStartClass"
        hover-class="btn-hover"
        :hover-stay-time="100"
        @click="startSleep"
      >
        <text class="btn-icon">{{ startIcon }}</text>
        <text>{{ startButtonText }}</text>
      </button>

      <!-- 结束按钮 -->
      <button 
        v-else 
        class="btn-end" 
        hover-class="btn-hover-end"
        :hover-stay-time="100"
        @click="handleEndSleepClick"
      >
        <text class="btn-icon">☀️</text>
        <text>我醒了，结束监测</text>
      </button>
      
      <text class="hint" v-if="!isMonitoring">点击后无需保持后台，醒来点击结束即可</text>
    </view>

    <!-- 今日报告 -->
    <view v-if="hasTodayRecord" class="report-card">
      <view class="report-header">
        <text class="report-title">本次{{ lastRecord.type }}报告</text>
        <text class="reset-btn" @click="resetToday">删除</text>
      </view>
      <view class="report-grid">
        <view class="report-item">
          <text class="label">时长</text>
          <text class="value">{{ Math.floor(lastRecord.duration / 60) }}h {{ lastRecord.duration % 60 }}m</text>
        </view>
        <view class="report-item">
          <text class="label">类型</text>
          <text class="value">{{ lastRecord.type }}</text>
        </view>
        <view class="report-item">
          <text class="label">评分</text>
          <text class="value score" :style="{ color: getScoreColor(lastRecord.score) }">{{ lastRecord.score }}</text>
        </view>
      </view>
      <button class="btn-ai" hover-class="btn-hover" @click="showAISuggestionModal">
        {{ aiStatusText }}
      </button>
    </view>

    <!-- 功能入口区 -->
    <view class="action-grid">
      <view class="action-item" @click="goToStats">
        <text class="action-icon">📊</text>
        <text class="action-text">历史统计</text>
      </view>
      <view class="action-item" @click="openSettings">
        <text class="action-icon">⚙️</text>
        <text class="action-text">偏好设置</text>
      </view>
    </view>

    <!-- ================= 设置模态框 (修复版) ================= -->
    <view v-if="showSettings" class="modal-overlay" @click="closeSettings">
      <view class="modal-content settings-modal" :class="themeClass" @click.stop>
        <view class="modal-header">
          <text class="modal-title">偏好设置</text>
          <text class="close-btn" @click="closeSettings">×</text>
        </view>

        <view class="modal-body">
          <!-- 睡眠时长设置 -->
          <view class="setting-item">
            <text class="setting-label">有效睡眠最低时长 (分钟)</text>
            <view class="input-wrapper">
              <input 
                type="number" 
                :value="tempMinMinutes" 
                @input="onInputMinutes"
                class="setting-input-fixed"
                placeholder="例如：20"
                confirm-type="done"
              />
            </view>
          </view>
          
          <!-- 外观模式 -->
          <view class="setting-item">
            <text class="setting-label">外观模式</text>
            <view class="radio-group">
              <label class="radio-label" @click="setTheme('auto')">
                <view class="radio-circle" :class="{ active: themeMode === 'auto' }"></view>
                <text>跟随系统</text>
              </label>
              <label class="radio-label" @click="setTheme('light')">
                <view class="radio-circle" :class="{ active: themeMode === 'light' }"></view>
                <text>浅色</text>
              </label>
              <label class="radio-label" @click="setTheme('dark')">
                <view class="radio-circle" :class="{ active: themeMode === 'dark' }"></view>
                <text>深色</text>
              </label>
            </view>
          </view>
        </view>

        <view class="modal-footer">
          <button 
            class="btn-confirm" 
            hover-class="btn-hover-active" 
            @click="saveSettings"
            :disabled="false"
          >
            保存设置
          </button>
        </view>
      </view>
    </view>

    <!-- ================= AI 建议模态框 ================= -->
    <view v-if="showAiModal" class="modal-overlay" @click="!aiLoading && (showAiModal = false)">
      <view class="modal-content advice-modal" :class="themeClass" @click.stop>
        <view class="modal-header">
          <text class="modal-title">AI 睡眠专家</text>
          <text v-if="!aiLoading" class="close-btn" @click="showAiModal = false">×</text>
        </view>
        <view class="modal-body advice-body">
          <view v-if="aiLoading" class="loading-state">
            <view class="progress-container">
              <view class="progress-bar" :style="{ width: progressStep + '%' }"></view>
            </view>
            <text class="loading-text">正在分析您的睡眠数据...</text>
          </view>
          <view v-else class="advice-content markdown-body">
            <div v-if="aiAdviceHtml" v-html="aiAdviceHtml"></div>
            <text v-else-if="aiAdvice" style="white-space: pre-wrap;">{{ aiAdvice }}</text>
            <text v-else>暂无建议内容</text>
          </view>
        </view>
        <view class="modal-footer" v-if="!aiLoading">
          <button class="btn-confirm" hover-class="btn-hover" @click="showAiModal = false">知道了</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

// ================= 配置区域 =================
const API_KEY = 'sk-bfsbrsldyyelpzptnerbobfvfzyvaqimvverfomvhwwthnln';
const BASE_URL = 'https://api.siliconflow.cn/v1';
const MODEL_NAME = 'deepseek-ai/DeepSeek-V3.2';
const TARGET_SLEEP_MINUTES = 480; 
// ===========================================

// --- 状态变量 ---
const isMonitoring = ref(false);
const hasTodayRecord = ref(false);
const sleepStartTime = ref(0);
const timer = ref(null);
const currentDuration = ref('00:00');
const wakeCount = ref(0);

// 用户设置
const minSleepMinutes = ref(20); 
const tempMinMinutes = ref('20'); 
const showSettings = ref(false);
const themeMode = ref('auto'); 
const systemTheme = ref('light');

// 数据变量
const sleepDebt = ref(0); 
const lastRecord = ref({
  score: 0, duration: 0, wakes: 0, date: '', level: '未知', type: '夜间睡眠', aiAdvice: ''
});

// AI 状态
const aiLoading = ref(false);
const aiAdvice = ref('');
const aiAdviceHtml = ref('');
const showAiModal = ref(false);
const progressStep = ref(0);
const aiFetched = ref(false); 

let markedLib = null;

onMounted(async () => {
  initMarked();
  loadData();
  checkTodayRecord();
  initTheme();
  
  if (isMonitoring.value) {
    startTimer();
    registerWakeListeners();
  }
});

onUnmounted(() => {
  removeWakeListeners();
  if (timer.value) clearInterval(timer.value);
});

async function initMarked() {
  if (typeof window !== 'undefined') {
    if (window.marked) { markedLib = window.marked; return; }
    try {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
      script.onload = () => { markedLib = window.marked; };
      document.head.appendChild(script);
    } catch (e) { console.error('Marked load error', e); }
  }
}

// --- ✅ 修复后的主题切换函数 ---
function initTheme() {
  const storedTheme = uni.getStorageSync('theme_mode');
  if (storedTheme) themeMode.value = storedTheme;
  
  uni.onThemeChange((res) => {
    if (themeMode.value === 'auto') {
      systemTheme.value = res.theme;
      applyTheme(res.theme);
    }
  });
  
  try {
    const sysInfo = uni.getSystemInfoSync();
    systemTheme.value = sysInfo.theme || 'light';
    const initialTheme = themeMode.value === 'auto' ? systemTheme.value : themeMode.value;
    applyTheme(initialTheme);
  } catch(e) {}
}

function applyTheme(theme) {
  const isDark = theme === 'dark';
  
  // 1. 核心：操作 DOM 类名 (H5 和 小程序 WebView 都有效)
  if (typeof document !== 'undefined') {
    const rootClass = isDark ? 'dark-mode' : 'light-mode';
    const oppositeClass = isDark ? 'light-mode' : 'dark-mode';
    
    document.body.classList.add(rootClass);
    document.body.classList.remove(oppositeClass);
    document.documentElement.classList.add(rootClass);
    document.documentElement.classList.remove(oppositeClass);
  }

  // 2. 仅在非 H5 环境调用原生 API
  // #ifndef H5
  try {
    const bgColor = isDark ? '#121212' : '#f5f7fa';
    const frontColor = isDark ? 'white' : 'black'; // 必须是小写

    uni.setNavigationBarColor({
      frontColor: frontColor, 
      backgroundColor: bgColor,
      animation: { duration: 300, timingFunc: 'easeIn' }
    });

    if (typeof uni.setStatusBarStyle === 'function') {
      uni.setStatusBarStyle({ style: isDark ? 'light' : 'dark' });
    }
  } catch (e) {
    console.warn('Native theme set failed:', e);
  }
  // #endif
}

const themeClass = computed(() => {
  let current = themeMode.value === 'auto' ? systemTheme.value : themeMode.value;
  return current === 'dark' ? 'dark-mode' : 'light-mode';
});

function setTheme(mode) {
  themeMode.value = mode;
  const finalTheme = mode === 'auto' ? systemTheme.value : mode;
  applyTheme(finalTheme);
}

// --- 智能时段识别 ---
const timePeriodInfo = computed(() => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 17) {
    return { text: '午休/小憩模式', icon: '☕', class: 'period-day', type: '午休' };
  } else {
    return { text: '夜间睡眠模式', icon: '🌙', class: 'period-night', type: '夜间睡眠' };
  }
});

const timePeriodText = computed(() => timePeriodInfo.value.text);
const timePeriodIcon = computed(() => timePeriodInfo.value.icon);
const timePeriodClass = computed(() => timePeriodInfo.value.class);

const mainQuestion = computed(() => {
  return isMonitoring.value ? '' : (timePeriodInfo.value.type === '午休' ? '准备小憩一会儿吗？' : '今晚准备睡个好觉吗？');
});

const startButtonText = computed(() => timePeriodInfo.value.type === '午休' ? '开始小憩' : '我要去睡了');
const startIcon = computed(() => timePeriodInfo.value.type === '午休' ? '☕' : '🌙');
const btnStartClass = computed(() => timePeriodInfo.value.type === '午休' ? 'btn-start-day' : 'btn-start-night');

const aiStatusText = computed(() => {
  if (!hasTodayRecord.value) return '获取 AI 建议';
  if (lastRecord.value.aiAdvice) return '查看 AI 建议';
  if (aiFetched.value && !aiAdvice.value) return '生成中...';
  return '获取 AI 建议';
});

const debtClass = computed(() => {
  if (sleepDebt.value > 120) return 'debt-high';
  if (sleepDebt.value > 0) return 'debt-warn';
  return 'debt-good';
});

const debtTip = computed(() => {
  if (sleepDebt.value > 120) return '警告：严重不足，请立即补觉！';
  if (sleepDebt.value > 0) return '提示：略有疲劳，今晚早点睡';
  if (sleepDebt.value < -60) return '状态：精力充沛，睡眠盈余！';
  return '状态：良好';
});

function getScoreColor(score) {
  if (!score) return '#ccc';
  if (score >= 90) return '#4caf50';
  if (score >= 75) return '#2196f3';
  if (score >= 60) return '#ff9800';
  return '#f44336';
}

function loadData() {
  try {
    sleepDebt.value = Number(uni.getStorageSync('sleep_debt')) || 0;
    const storedMin = uni.getStorageSync('min_sleep_minutes');
    minSleepMinutes.value = storedMin ? Number(storedMin) : 20;
    tempMinMinutes.value = String(minSleepMinutes.value);
    
    const storedStart = uni.getStorageSync('sleep_start_time');
    if (storedStart) {
      isMonitoring.value = true;
      sleepStartTime.value = Number(storedStart);
      wakeCount.value = 0; 
    }
  } catch (e) { console.error('Load data error:', e); }
}

function startSleep() {
  const now = Date.now();
  isMonitoring.value = true;
  sleepStartTime.value = now;
  wakeCount.value = 0;
  uni.setStorageSync('sleep_start_time', now);
  uni.setStorageSync('sleep_wake_count', 0);
  startTimer();
  registerWakeListeners();
  uni.showToast({ title: '监测已开始', icon: 'success', duration: 1500 });
}

function handleEndSleepClick() {
  if (aiLoading.value) return;
  const startTime = uni.getStorageSync('sleep_start_time');
  if (!startTime) {
    uni.showModal({ title: '错误', content: '未找到开始时间', showCancel: false });
    return;
  }

  const endTime = Date.now();
  const durationMs = endTime - Number(startTime);
  const durationMin = Math.floor(durationMs / 60000);
  const threshold = minSleepMinutes.value;

  if (durationMin < threshold) {
    uni.showModal({
      title: '时间过短',
      content: `监测时长仅 ${durationMin} 分钟，低于设置的最低有效时长 (${threshold} 分钟)。\n判定为误触，已取消记录。`,
      showCancel: false, confirmText: '知道了'
    });
    stopSleepProcess();
    return;
  }

  uni.showModal({
    title: '结束监测',
    content: `本次睡眠时长约 ${Math.floor(durationMin/60)}小时${durationMin%60}分。\n确定要结束监测并生成报告吗？`,
    confirmText: '我醒了', cancelText: '再睡会儿',
    success: (res) => { if (res.confirm) finalizeSleep(endTime, durationMin); }
  });
}

function finalizeSleep(endTime, durationMin) {
  const startTime = uni.getStorageSync('sleep_start_time');
  const startHour = new Date(Number(startTime)).getHours();
  const recordType = (startHour >= 5 && startHour < 17) ? '午休' : '夜间睡眠';

  const scoreResult = calculateBaseScore(durationMin, wakeCount.value);
  
  let newDebt = sleepDebt.value;
  const todayStr = new Date().toLocaleDateString();
  const lastDate = uni.getStorageSync('last_debt_date') || '';
  
  if (lastDate !== todayStr) uni.setStorageSync('last_debt_date', todayStr);
  
  if (recordType === '夜间睡眠') {
    let todayNightSleep = 0;
    let history = [];
    try {
      const stored = uni.getStorageSync('sleep_history');
      if (stored) history = JSON.parse(stored);
      const todayRecords = history.filter(r => r.date === todayStr && r.type === '夜间睡眠');
      todayNightSleep = todayRecords.reduce((sum, r) => sum + (r.duration || 0), 0);
    } catch(e) {}
    
    const totalTonightSleep = todayNightSleep + durationMin;
    const nightlyBalance = totalTonightSleep - TARGET_SLEEP_MINUTES;
    newDebt = sleepDebt.value - nightlyBalance;
  }

  const record = {
    id: Date.now(), date: todayStr, timestamp: endTime, startTime: Number(startTime),
    endTime: endTime, duration: durationMin, wakes: wakeCount.value,
    score: scoreResult.totalScore, level: scoreResult.level, debt: newDebt,
    type: recordType, aiAdvice: ''
  };
  
  uni.setStorageSync('today_sleep_record', JSON.stringify(record));
  uni.setStorageSync('sleep_debt', newDebt);
  saveToHistory(record);
  stopSleepProcess();
  
  sleepDebt.value = newDebt;
  lastRecord.value = record;
  hasTodayRecord.value = true;
  aiFetched.value = false;
  aiAdvice.value = '';
  aiAdviceHtml.value = '';
  
  uni.showToast({ title: '记录成功', icon: 'success' });
  setTimeout(() => fetchAiSuggestion(record), 1000);
}

function stopSleepProcess() {
  stopTimer();
  removeWakeListeners();
  uni.removeStorageSync('sleep_start_time');
  uni.removeStorageSync('sleep_wake_count');
  isMonitoring.value = false;
}

function saveToHistory(record) {
  let history = [];
  try {
    const stored = uni.getStorageSync('sleep_history');
    if (stored) history = JSON.parse(stored);
    if (!Array.isArray(history)) history = [];
  } catch(e) {}
  
  const idx = history.findIndex(r => r.id === record.id);
  if (idx !== -1) history[idx] = record;
  else history.unshift(record);
  
  if (history.length > 50) history = history.slice(0, 50);
  uni.setStorageSync('sleep_history', JSON.stringify(history));
}

function clearSleepDebt() {
  uni.showModal({
    title: '确认清零', content: '确定要手动清除所有累计睡眠负债吗？',
    success: (res) => {
      if (res.confirm) {
        sleepDebt.value = 0;
        uni.setStorageSync('sleep_debt', 0);
        uni.setStorageSync('last_debt_date', new Date().toLocaleDateString());
        uni.showToast({ title: '已清零', icon: 'success' });
      }
    }
  });
}

function calculateBaseScore(durationMinutes, wakes) {
  let durationScore = 0;
  const hours = durationMinutes / 60;
  if (hours >= 7.0 && hours <= 8.5) durationScore = 60;
  else if (hours < 7.0) durationScore = Math.max(0, Math.round((hours / 7.0) * 60));
  else {
    if (hours > 12) durationScore = 20;
    else durationScore = Math.max(20, Math.round(60 - (hours - 8.5) * 11.4));
  }
  
  let continuityScore = 40;
  if (wakes > 0) continuityScore = Math.max(0, 40 - (wakes * 10));
  
  const totalScore = durationScore + continuityScore;
  let level = '需改善';
  if (totalScore >= 90) level = '优秀';
  else if (totalScore >= 75) level = '良好';
  else if (totalScore >= 60) level = '一般';

  return { totalScore, level };
}

function startTimer() {
  if (timer.value) clearInterval(timer.value);
  timer.value = setInterval(() => {
    const now = Date.now();
    const diff = now - sleepStartTime.value;
    if (diff < 0) return;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    currentDuration.value = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }, 1000);
}

function stopTimer() { if (timer.value) clearInterval(timer.value); }

function checkTodayRecord() {
  try {
    const recordStr = uni.getStorageSync('today_sleep_record');
    if (recordStr) {
      const record = JSON.parse(recordStr);
      const today = new Date().toLocaleDateString();
      if (record.date === today) {
        hasTodayRecord.value = true;
        lastRecord.value = record;
        sleepDebt.value = record.debt || 0;
        if (record.aiAdvice) {
          aiAdvice.value = record.aiAdvice;
          aiAdviceHtml.value = parseMarkdown(aiAdvice.value);
          aiFetched.value = true;
        }
      } else hasTodayRecord.value = false;
    }
  } catch (e) { hasTodayRecord.value = false; }
}

function resetToday() {
  uni.showModal({
    title: '确认删除', content: '确定删除本次记录？',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('today_sleep_record');
        hasTodayRecord.value = false;
        lastRecord.value = { score: 0, duration: 0, wakes: 0, level: '', type: '', aiAdvice: '' };
        aiFetched.value = false;
        let history = [];
        try {
          const stored = uni.getStorageSync('sleep_history');
          if (stored) history = JSON.parse(stored);
          const todayStr = new Date().toLocaleDateString();
          history = history.filter(r => r.date !== todayStr);
          uni.setStorageSync('sleep_history', JSON.stringify(history));
        } catch(e) {}
        uni.showToast({ title: '已删除', icon: 'success' });
      }
    }
  });
}

function formatDebt(minutes) {
  if (minutes === null || minutes === undefined) return '0 小时';
  const absMin = Math.abs(minutes);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const sign = minutes > 0 ? '+' : '-';
  return `${sign}${h}小时${m > 0 ? m + '分' : ''}`;
}

function goToStats() {
  uni.navigateTo({ url: '/pages/stats/stats', fail: (err) => { console.error(err); uni.showToast({ title: '跳转失败', icon: 'none' }); } });
}

function openSettings() {
  tempMinMinutes.value = String(minSleepMinutes.value);
  showSettings.value = true;
}
function closeSettings() { showSettings.value = false; }
function onInputMinutes(e) { tempMinMinutes.value = e.detail.value; }

function saveSettings() {
  let val = parseInt(tempMinMinutes.value);
  if (isNaN(val) || val < 0) val = 0;
  minSleepMinutes.value = val;
  uni.setStorageSync('min_sleep_minutes', val);
  uni.setStorageSync('theme_mode', themeMode.value);
  
  const finalTheme = themeMode.value === 'auto' ? systemTheme.value : themeMode.value;
  applyTheme(finalTheme);
  
  showSettings.value = false;
  uni.showToast({ title: '设置已保存', icon: 'success' });
}

function registerWakeListeners() {
  removeWakeListeners();
  uni.onAppShow(handleWakeUp);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', handleVisibilityChange);
}
function removeWakeListeners() {
  try { uni.offAppShow(handleWakeUp); } catch(e) {}
  if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', handleVisibilityChange);
}
function handleWakeUp() { if (isMonitoring.value) incrementWakeCount(); }
function handleVisibilityChange() { if (typeof document !== 'undefined' && !document.hidden && isMonitoring.value) incrementWakeCount(); }

function incrementWakeCount() {
  const now = Date.now();
  const lastWake = uni.getStorageSync('last_wake_time') || 0;
  if (now - lastWake > 5000) {
    wakeCount.value++;
    uni.setStorageSync('sleep_wake_count', wakeCount.value);
    uni.setStorageSync('last_wake_time', now);
    if (uni.vibrateShort) uni.vibrateShort({ type: 'light' });
  }
}

function fetchAiSuggestion(record) {
  if (aiFetched.value) return;
  aiFetched.value = true;
  aiLoading.value = true;
  progressStep.value = 0;

  const prompt = `我刚刚完成了${record.type}，时长 ${record.duration} 分钟，评分 ${record.score}/100，中途亮屏 ${record.wakes} 次。请作为专业睡眠教练，针对${record.type}给我简短的建议（200 字内）。请使用 Markdown 格式。`;

  const progressTimer = setInterval(() => { if (aiLoading.value && progressStep.value < 90) progressStep.value += 5; }, 300);

  uni.request({
    url: `${BASE_URL}/chat/completions`, method: 'POST',
    header: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    data: { model: MODEL_NAME, messages: [{ role: 'user', content: prompt }], stream: false },
    success: (res) => {
      clearInterval(progressTimer);
      aiLoading.value = false;
      if (res.statusCode === 200) {
        const content = res.data.choices[0]?.message?.content;
        if (content) {
          aiAdvice.value = content;
          aiAdviceHtml.value = parseMarkdown(content);
          saveAiAdviceToLocal(content);
        }
      } else aiAdvice.value = `获取建议失败 (HTTP ${res.statusCode})`;
    },
    fail: (err) => {
      clearInterval(progressTimer);
      aiLoading.value = false;
      aiAdvice.value = `获取建议失败：${err.errMsg}`;
    }
  });
}

function showAISuggestionModal() {
  if (!hasTodayRecord.value) return;
  if (!aiFetched.value && !aiLoading.value) fetchAiSuggestion(lastRecord.value);
  showAiModal.value = true;
}

function parseMarkdown(text) {
  if (!text) return '';
  if (markedLib && typeof markedLib.parse === 'function') { try { return markedLib.parse(text); } catch (e) {} }
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>').replace(/^- (.*?)/gm, '<li>$1</li>').replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>').replace(/\n/g, '<br/>');
}

function saveAiAdviceToLocal(text) {
  if (!text) return;
  lastRecord.value.aiAdvice = text;
  const todayRecord = uni.getStorageSync('today_sleep_record');
  if (todayRecord) {
    const record = JSON.parse(todayRecord);
    record.aiAdvice = text;
    uni.setStorageSync('today_sleep_record', JSON.stringify(record));
  }
  let history = [];
  try {
    const stored = uni.getStorageSync('sleep_history');
    if (stored) history = JSON.parse(stored);
    const idx = history.findIndex(r => r.id === lastRecord.value.id);
    if (idx !== -1) { history[idx].aiAdvice = text; uni.setStorageSync('sleep_history', JSON.stringify(history)); }
  } catch (e) {}
}
</script>

<style>
/* ================= 全局 CSS 变量系统 ================= */
page {
  --bg-color: #f5f7fa;
  --text-primary: #2c3e50;
  --text-secondary: #7f8c8d;
  --card-bg: #ffffff;
  --border-color: #eee;
  --input-bg: #fff;
  --input-border: #ddd;
  --modal-bg: #ffffff;
  --shadow: 0 4px 12px rgba(0,0,0,0.05);
  --btn-confirm-bg: #2c3e50;
}

/* 深色模式变量覆盖 */
page.dark-mode {
  --bg-color: #121212;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --card-bg: #1e1e1e;
  --border-color: #333;
  --input-bg: #2c2c2c;
  --input-border: #444;
  --modal-bg: #2c2c2c;
  --shadow: 0 4px 12px rgba(0,0,0,0.3);
  --btn-confirm-bg: #4a5568;
}

/* 强制 body 样式 (H5 端关键修复) */
body.dark-mode {
  background-color: #121212;
  color: #e0e0e0;
}
body.light-mode {
  background-color: #f5f7fa;
  color: #2c3e50;
}

/* ================= 基础布局 ================= */
.container { 
  padding: 20px; 
  font-family: sans-serif; 
  max-width: 600px; 
  margin: 0 auto; 
  min-height: 100vh; 
  background-color: var(--bg-color); 
  box-sizing: border-box; 
  color: var(--text-primary);
  transition: background-color 0.3s, color 0.3s;
}

.header { text-align: center; margin-bottom: 20px; padding-top: 20px;}
.title { font-size: 26px; font-weight: bold; color: var(--text-primary); display: block; letter-spacing: 2px; }
.subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 5px; display: block; font-weight: 300; }

.status-badge { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 16px; border-radius: 20px; margin: 0 auto 20px auto; width: fit-content; font-size: 14px; font-weight: bold; }
.period-day { background-color: #fff3e0; color: #e65100; }
.period-night { background-color: #e8eaf6; color: #283593; }
.badge-icon { font-size: 16px; }

.card { background: var(--card-bg); border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: var(--shadow); text-align: center; color: var(--text-primary); }
.debt-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.reset-debt-btn { font-size: 12px; color: var(--text-secondary); background: rgba(128,128,128,0.1); padding: 2px 8px; border-radius: 4px; }
.debt-high { border-left: 5px solid #f44336; }
.debt-warn { border-left: 5px solid #ff9800; }
.debt-good { border-left: 5px solid #4caf50; }
.card-label { font-size: 14px; color: var(--text-secondary); display: block; margin-bottom: 10px; }
.card-value { font-size: 32px; font-weight: bold; display: block; margin-bottom: 5px; color: var(--text-primary); }
.card-tip { font-size: 12px; color: var(--text-secondary); }

.main-action { text-align: center; margin: 30px 0; position: relative; z-index: 10; }
.question { font-size: 18px; color: var(--text-primary); display: block; margin-bottom: 20px; font-weight: 500; }

.monitoring-status {
  margin-bottom: 25px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.monitoring-text { font-size: 16px; color: #2196f3; font-weight: bold; }
.monitoring-timer { font-size: 32px; font-weight: bold; color: #2196f3; font-variant-numeric: tabular-nums; }
.small-hint { font-size: 12px; color: #ff9800; font-weight: bold; }

/* ================= 按钮样式修复 ================= */
.btn-start, .btn-end, .btn-ai, .btn-confirm {
  border: none; 
  cursor: pointer; 
  position: relative; 
  z-index: 100; /* 确保按钮在最上层 */
  outline: none;
}

/* 移除 uni-app button 默认边框 */
button::after { 
  content: none; 
  border: none;
}

.btn-start, .btn-end {
  color: white; 
  padding: 18px 40px; 
  border-radius: 50px; 
  font-size: 18px; 
  box-shadow: 0 4px 15px rgba(0,0,0,0.2); 
  display: inline-flex; 
  align-items: center; 
  justify-content: center; 
  gap: 10px; 
  margin: 0 auto; 
  transition: transform 0.1s; 
  width: 80%; 
  max-width: 300px;
}

.btn-hover { transform: scale(0.96); opacity: 0.9; }
.btn-hover-end { transform: scale(0.96); filter: brightness(1.1); }
.btn-hover-active { opacity: 0.85; transform: scale(0.98); }

.btn-start-night { background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%); }
.btn-start-day { background: linear-gradient(135deg, #e65100 0%, #ffb74d 100%); }
.btn-end { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); color: #c62828; }
.btn-ai { width: 100%; background: #2c3e50; color: white; padding: 12px; border-radius: 8px; font-size: 14px; }

.hint { font-size: 12px; color: var(--text-secondary); margin-top: 15px; display: block; }

/* ================= 报告与网格 ================= */
.report-card { background: var(--card-bg); padding: 20px; border-radius: 12px; box-shadow: var(--shadow); margin-bottom: 20px; color: var(--text-primary); }
.report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.report-title { font-weight: bold; font-size: 16px; color: var(--text-primary); }
.reset-btn { font-size: 12px; color: #f44336; text-decoration: underline; }
.report-grid { display: flex; justify-content: space-around; margin-bottom: 20px; }
.report-item { text-align: center; }
.report-item .label { font-size: 12px; color: var(--text-secondary); display: block; }
.report-item .value { font-size: 18px; font-weight: bold; color: var(--text-primary); }

.action-grid { display: flex; gap: 15px; margin-top: 20px; }
.action-item { flex: 1; background: var(--card-bg); padding: 15px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: var(--shadow); cursor: pointer; color: var(--text-primary); }
.action-icon { font-size: 24px; }
.action-text { font-size: 14px; color: var(--text-secondary); font-weight: 500; }

/* ================= 模态框 (弹窗) 样式 ================= */
.modal-overlay { 
  position: fixed; 
  top: 0; left: 0; right: 0; bottom: 0; 
  background: rgba(0,0,0,0.6); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  z-index: 9999; /* 最高层级 */
  backdrop-filter: blur(2px);
}

.modal-content { 
  background: var(--modal-bg); 
  color: var(--text-primary); 
  width: 85%; 
  max-width: 400px; 
  border-radius: 12px; 
  overflow: hidden; 
  animation: popIn 0.3s ease; 
  display: flex; 
  flex-direction: column; 
  max-height: 80vh; 
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.settings-modal { max-height: 500px; }
.advice-modal { max-height: 85vh; }

@keyframes popIn { 
  from { transform: scale(0.8); opacity: 0; } 
  to { transform: scale(1); opacity: 1; } 
}

.modal-header { padding: 15px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.modal-title { font-weight: bold; font-size: 16px; color: var(--text-primary); }
.close-btn { font-size: 24px; color: var(--text-secondary); cursor: pointer; line-height: 1; }

.modal-body { padding: 20px; overflow-y: auto; flex: 1; font-size: 14px; color: var(--text-primary); line-height: 1.6; }
.modal-footer { padding: 15px; text-align: right; border-top: 1px solid var(--border-color); }

.btn-confirm { 
  background: var(--btn-confirm-bg); 
  color: white; 
  padding: 10px 24px; 
  border-radius: 6px; 
  font-size: 14px; 
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

/* ================= 表单元素 ================= */
.setting-item { margin-bottom: 20px; }
.setting-label { display: block; margin-bottom: 8px; font-weight: bold; font-size: 14px; color: var(--text-primary); }
.input-wrapper { width: 100%; margin-bottom: 8px; }

.setting-input-fixed {
  width: 100%; 
  padding: 12px 15px; 
  border: 1px solid var(--input-border); 
  background: var(--input-bg);
  color: var(--text-primary); 
  border-radius: 8px; 
  font-size: 16px; 
  box-sizing: border-box; 
  outline: none; 
  height: 44px; 
  line-height: 20px;
}
.setting-input-fixed:focus { border-color: #2c3e50; }

.radio-group { display: flex; gap: 15px; justify-content: space-around; }
.radio-label { display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; font-size: 13px; color: var(--text-secondary); }

.radio-circle {
  width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--text-secondary);
  position: relative; transition: all 0.2s;
}
.radio-circle.active { border-color: #2c3e50; background: #2c3e50; }
.radio-circle.active::after {
  content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 8px; height: 8px; background: white; border-radius: 50%;
}

/* ================= AI 加载与内容 ================= */
.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100px; }
.progress-container { width: 100%; height: 6px; background: rgba(128,128,128,0.2); border-radius: 3px; overflow: hidden; margin-bottom: 10px; }
.progress-bar { height: 100%; background: #2c3e50; width: 0%; transition: width 0.3s; }
.loading-text { color: var(--text-secondary); font-size: 13px; }
.advice-body { min-height: 150px; }
.markdown-body { font-size: 14px; line-height: 1.6; color: var(--text-primary); text-align: left; }
.markdown-body strong { color: var(--text-primary); font-weight: bold; }
.markdown-body ul { padding-left: 20px; margin: 10px 0; }
.markdown-body li { margin-bottom: 4px; }
.markdown-body p { margin-bottom: 10px; }
</style>
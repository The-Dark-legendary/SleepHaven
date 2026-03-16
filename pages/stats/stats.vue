<template>
  <view class="container" :class="themeClass">
    <view class="header">
      <text class="title">安眠匣统计</text>
      <text class="subtitle">SleepHaven Data Overview</text>
    </view>

    <view v-if="loading" class="loading">加载中...</view>

    <view v-else-if="records.length === 0" class="empty">
      <view class="empty-box">[ 无数据 ]</view>
      <text class="empty-text">暂无睡眠记录</text>
      <button class="go-home-btn" @click="handleGoHome">返回首页</button>
    </view>

    <view v-else class="stats-list">
      <view class="stat-card main">
        <text class="stat-label">累计睡眠时长</text>
        <text class="stat-value">{{ totalHours }} <text class="unit">小时</text></text>
      </view>

      <view class="stat-grid">
        <view class="stat-card">
          <text class="stat-label">平均评分</text>
          <text class="stat-value" :style="{ color: avgScoreColor }">{{ avgScore }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-label">记录总数</text>
          <text class="stat-value">{{ records.length }}</text>
        </view>
      </view>

      <text class="list-title">详细记录</text>
      <view class="history-list">
        <view v-for="(item, index) in records" :key="item.id || index" class="history-item">
          <view class="item-main" @click="showDetail(item)">
            <view class="item-left">
              <text class="item-date">{{ item.date }}</text>
              <text class="item-type" :class="item.type === '夜间睡眠' ? 'type-night' : 'type-day'">{{ item.type }}</text>
            </view>
            <view class="item-right">
              <text class="item-duration">{{ Math.floor(item.duration / 60) }}h {{ item.duration % 60 }}m</text>
              <text class="item-score" :style="{ color: getScoreColor(item.score) }">{{ item.score }}分</text>
            </view>
          </view>
          <view class="item-actions">
            <text class="action-icon" v-if="item.aiAdvice" title="有建议">💡</text>
            <text class="delete-btn" @click.stop="deleteItem(index)">删除</text>
          </view>
        </view>
      </view>

      <button class="clear-data-btn" @click="clearAllData">清空所有数据</button>
    </view>

    <view v-if="showDetailModal" class="modal-overlay" @click="showDetailModal = false">
      <view class="modal-content detail-modal" :class="themeClass" @click.stop>
        <view class="modal-header">
          <text class="modal-title">睡眠详情</text>
          <text class="close-btn" @click="showDetailModal = false">×</text>
        </view>
        <view class="modal-body">
          <view v-if="currentDetail" class="detail-content">
            <view class="detail-row">
              <text class="d-label">日期:</text>
              <text class="d-value">{{ currentDetail.date }}</text>
            </view>
            <view class="detail-row">
              <text class="d-label">类型:</text>
              <text class="d-value">{{ currentDetail.type }}</text>
            </view>
            <view class="detail-row">
              <text class="d-label">时长:</text>
              <text class="d-value">{{ Math.floor(currentDetail.duration / 60) }}小时 {{ currentDetail.duration % 60 }}分钟</text>
            </view>
            <view class="detail-row">
              <text class="d-label">中断次数:</text>
              <text class="d-value">{{ currentDetail.wakes || 0 }} 次</text>
            </view>
            <view class="detail-row">
              <text class="d-label">评分:</text>
              <text class="d-value" :style="{ color: getScoreColor(currentDetail.score) }">{{ currentDetail.score }}</text>
            </view>
            
            <view class="ai-section" v-if="currentDetail.aiAdvice">
              <text class="ai-title">💡 AI 建议</text>
              <view class="ai-content markdown-body" v-html="parseMarkdown(currentDetail.aiAdvice)"></view>
            </view>
            <view v-else class="ai-section empty-ai">
              <text class="ai-title">💡 AI 建议</text>
              <text class="empty-text">该记录未生成 AI 建议</text>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="btn-confirm" @click="showDetailModal = false">关闭</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const loading = ref(true);
const records = ref([]);
const showDetailModal = ref(false);
const currentDetail = ref(null);
const themeMode = ref('auto');
const systemTheme = ref('light');
let markedLib = null;

onMounted(() => { 
  initTheme();
  initMarked();
  loadHistory(); 
});

function initTheme() {
  const storedTheme = uni.getStorageSync('theme_mode');
  if (storedTheme) themeMode.value = storedTheme;
  try {
    const sysInfo = uni.getSystemInfoSync();
    systemTheme.value = sysInfo.theme || 'light';
  } catch(e) {}
}

const themeClass = computed(() => {
  let current = themeMode.value === 'auto' ? systemTheme.value : themeMode.value;
  return current === 'dark' ? 'dark-mode' : 'light-mode';
});

async function initMarked() {
  if (typeof window !== 'undefined' && !window.marked) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
    script.onload = () => { markedLib = window.marked; };
    document.head.appendChild(script);
  } else if (window.marked) {
    markedLib = window.marked;
  }
}

function loadHistory() {
  try {
    const historyStr = uni.getStorageSync('sleep_history');
    records.value = historyStr ? JSON.parse(historyStr) : [];
  } catch (e) { records.value = []; }
  finally { loading.value = false; }
}

const totalHours = computed(() => {
  const totalMin = records.value.reduce((sum, r) => sum + (r.duration || 0), 0);
  return (totalMin / 60).toFixed(1);
});

const avgScore = computed(() => {
  if (!records.value.length) return 0;
  const total = records.value.reduce((sum, r) => sum + (r.score || 0), 0);
  return Math.round(total / records.value.length);
});

const avgScoreColor = computed(() => getScoreColor(avgScore.value));

function getScoreColor(score) {
  if (score >= 90) return '#4caf50';
  if (score >= 75) return '#2196f3';
  if (score >= 60) return '#ff9800';
  return '#f44336';
}

function parseMarkdown(text) {
  if (!text) return '';
  if (markedLib && typeof markedLib.parse === 'function') {
    try { return markedLib.parse(text); } catch (e) {}
  }
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*?)/gm, '<li>$1</li>')
    .replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n/g, '<br/>');
}

function showDetail(item) {
  currentDetail.value = item;
  showDetailModal.value = true;
}

function deleteItem(index) {
  const item = records.value[index];
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 ${item.date} 的${item.type}记录吗？`,
    success: (res) => {
      if (res.confirm) {
        records.value.splice(index, 1);
        uni.setStorageSync('sleep_history', JSON.stringify(records.value));
        
        const todayStr = new Date().toLocaleDateString();
        if (item.date === todayStr) {
          uni.removeStorageSync('today_sleep_record');
        }
        
        uni.showToast({ title: '已删除', icon: 'success' });
      }
    }
  });
}

function handleGoHome() {
  uni.reLaunch({
    url: '/pages/index/index',
    fail: () => {
      uni.switchTab({ url: '/pages/index/index' });
    }
  });
}

function clearAllData() {
  uni.showModal({
    title: '高危操作',
    content: '确定清空所有数据？不可恢复！',
    confirmColor: '#f44336',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('sleep_history');
        uni.removeStorageSync('sleep_debt');
        uni.removeStorageSync('today_sleep_record');
        uni.showToast({ title: '已清空', icon: 'success' });
        records.value = [];
      }
    }
  });
}
</script>

<style>
page {
  --bg-color: #f5f7fa;
  --text-primary: #2c3e50;
  --text-secondary: #7f8c8d;
  --card-bg: #ffffff;
  --border-color: #eee;
  --modal-bg: #ffffff;
  --shadow: 0 2px 8px rgba(0,0,0,0.05);
}
page.dark-mode {
  --bg-color: #121212;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --card-bg: #1e1e1e;
  --border-color: #333;
  --modal-bg: #2c2c2c;
  --shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.container { padding: 20px; font-family: sans-serif; max-width: 600px; margin: 0 auto; min-height: 100vh; background-color: var(--bg-color); color: var(--text-primary); transition: background-color 0.3s, color 0.3s; }
.header { text-align: center; margin-bottom: 30px; padding-top: 20px; }
.title { font-size: 24px; font-weight: bold; color: var(--text-primary); display: block; }
.subtitle { font-size: 13px; color: var(--text-secondary); margin-top: 5px; display: block; }
.loading, .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-secondary); text-align: center; }
.empty-box { font-size: 40px; color: #ddd; border: 2px dashed var(--border-color); padding: 20px; border-radius: 10px; margin-bottom: 20px; font-weight: bold; }
.empty-text { font-size: 16px; color: var(--text-secondary); margin-bottom: 20px; font-weight: bold; }
.go-home-btn { background: #2c3e50; color: white; border: none; padding: 10px 30px; border-radius: 20px; font-size: 14px; }

.stat-card { background: var(--card-bg); border-radius: 12px; padding: 20px; margin-bottom: 15px; box-shadow: var(--shadow); text-align: center; display: flex; flex-direction: column; align-items: center; color: var(--text-primary); }
.stat-card.main { padding: 30px 20px; background: linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%); color: white; }
.stat-card.main .stat-label { color: rgba(255,255,255,0.9); }
.stat-card.main .stat-value { color: white; font-size: 36px; }
.stat-card.main .unit { font-size: 14px; opacity: 0.8; }
.stat-grid { display: flex; gap: 15px; margin-bottom: 15px; }
.stat-grid .stat-card { flex: 1; }
.stat-label { font-size: 14px; color: var(--text-secondary); display: block; margin-bottom: 5px; }
.stat-value { font-size: 24px; font-weight: bold; color: var(--text-primary); }

.list-title { font-size: 16px; font-weight: bold; color: var(--text-primary); margin: 20px 0 10px; display: block; padding-left: 5px; }
.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-item { background: var(--card-bg); border-radius: 10px; padding: 15px; box-shadow: var(--shadow); display: flex; justify-content: space-between; align-items: center; color: var(--text-primary); }
.item-main { flex: 1; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.item-left { display: flex; flex-direction: column; gap: 4px; }
.item-date { font-size: 14px; font-weight: bold; color: var(--text-primary); }
.item-type { font-size: 12px; padding: 2px 6px; border-radius: 4px; display: inline-block; width: fit-content; }
.type-night { background: #e8eaf6; color: #283593; }
.type-day { background: #fff3e0; color: #e65100; }
.item-right { text-align: right; }
.item-duration { font-size: 14px; font-weight: bold; color: var(--text-primary); display: block; }
.item-score { font-size: 12px; font-weight: bold; }
.item-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 5px; margin-left: 10px; }
.action-icon { font-size: 16px; }
.delete-btn { font-size: 12px; color: #f44336; background: rgba(244, 67, 54, 0.1); padding: 2px 6px; border-radius: 4px; cursor: pointer; }

.clear-data-btn { margin-top: 30px; background: transparent; color: #f44336; border: 1px solid #f44336; padding: 12px; border-radius: 8px; font-size: 14px; width: 100%; }

.modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: var(--modal-bg); color: var(--text-primary); width: 85%; max-width: 400px; border-radius: 12px; overflow: hidden; animation: popIn 0.3s ease; display: flex; flex-direction: column; max-height: 85vh; }
.detail-modal { max-height: 85vh; }
@keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.modal-header { padding: 15px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
.modal-title { font-weight: bold; font-size: 16px; color: var(--text-primary); }
.close-btn { font-size: 24px; color: var(--text-secondary); cursor: pointer; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 15px; text-align: right; border-top: 1px solid var(--border-color); }
.btn-confirm { background: #2c3e50; color: white; border: none; padding: 8px 20px; border-radius: 6px; font-size: 14px; }

.detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
.d-label { color: var(--text-secondary); }
.d-value { font-weight: bold; color: var(--text-primary); }
.ai-section { margin-top: 20px; padding-top: 15px; border-top: 1px dashed var(--border-color); }
.ai-title { font-weight: bold; color: var(--text-primary); display: block; margin-bottom: 10px; font-size: 15px; }
.ai-content { font-size: 13px; line-height: 1.6; color: var(--text-primary); background: rgba(128,128,128,0.05); padding: 10px; border-radius: 6px; }
.empty-ai .empty-text { font-size: 12px; color: var(--text-secondary); font-style: italic; }
.markdown-body strong { color: var(--text-primary); }
.markdown-body ul { padding-left: 20px; }
</style>
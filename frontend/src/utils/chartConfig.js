export const EMOTION_CATEGORIES = ['Senang', 'Netral', 'Bosan', 'Bingung', 'Mengantuk'];

export const EMOTION_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#f43f5e', '#8b5cf6'];

const baseTooltip = {
  backgroundColor: '#1e1b4b',
  titleFont: { family: 'Outfit', size: 13 },
  bodyFont: { family: 'Outfit', size: 12 },
  padding: 10,
  cornerRadius: 8,
};

const percentScales = {
  y: {
    min: 0,
    max: 100,
    grid: { color: '#f1f5f9' },
    ticks: { font: { family: 'Outfit', size: 11 }, color: '#64748b' },
  },
  x: {
    grid: { display: false },
    ticks: { font: { family: 'Outfit', size: 11 }, color: '#64748b' },
  },
};

export const dailyAttentionOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: baseTooltip },
  scales: percentScales,
};

export const emotionDonutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: { legend: { display: false }, tooltip: baseTooltip },
};

export const weeklyAttentionOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { font: { family: 'Outfit', size: 12 }, boxWidth: 12, boxHeight: 12 },
    },
    tooltip: baseTooltip,
  },
  scales: percentScales,
};

export const reportsDailyTrendOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { font: { family: 'Outfit', size: 12 } } },
    tooltip: { backgroundColor: '#1e1b4b' },
  },
  scales: {
    y: { min: 0, max: 100, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } },
  },
};

export const classComparisonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e1b4b' } },
  scales: {
    y: { min: 0, max: 100, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false } },
  },
};

export const topStudentPerformersOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e1b4b' } },
  scales: {
    y: { min: 0, max: 100, grid: { color: '#f1f5f9' } },
    x: { grid: { display: false }, ticks: { color: '#64748b' } },
  },
};

export const buildEmotionDistributionData = (students = []) => ({
  labels: EMOTION_CATEGORIES,
  datasets: [
    {
      data: EMOTION_CATEGORIES.map(
        (emotion) => students.filter((student) => student.emotion === emotion).length,
      ),
      backgroundColor: EMOTION_COLORS,
      borderWidth: 0,
      hoverOffset: 4,
    },
  ],
});

export const buildTopStudentPerformersData = (performers = []) => ({
  labels: performers.map((student) => student.name),
  datasets: [
    {
      label: 'Rata-rata Fokus (%)',
      data: performers.map((student) =>
        Number(student.avg_focus_percentage ?? student.attention ?? 0),
      ),
      backgroundColor: '#10b981',
      borderRadius: 8,
      barThickness: 24,
    },
  ],
});

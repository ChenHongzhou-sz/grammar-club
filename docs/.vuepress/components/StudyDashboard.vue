<template>
  <section class="study_dashboard" aria-label="学习面板">
    <div class="study_hero">
      <div>
        <p class="study_kicker">Grammar Club</p>
        <h1>语法俱乐部</h1>
        <p class="study_subtitle">每天读一小节，做几道题，把语法变成能用出来的能力。</p>
      </div>
      <div class="study_ring" :style="{ '--progress': progressPercent + '%' }">
        <strong>{{ progressPercent }}%</strong>
        <span>进度</span>
      </div>
    </div>

    <div class="study_stats">
      <div>
        <strong>{{ readCount }}</strong>
        <span>已读章节</span>
      </div>
      <div>
        <strong>{{ answeredCount }}</strong>
        <span>已做题目</span>
      </div>
      <div>
        <strong>{{ accuracyText }}</strong>
        <span>正确率</span>
      </div>
      <div>
        <strong>{{ wrongCount }}</strong>
        <span>错题</span>
      </div>
    </div>

    <div class="study_actions">
      <a class="study_primary" :href="$withBase(nextChapter.link)">继续学习</a>
      <a class="study_secondary" :href="$withBase('/content/Contents.html')">查看目录</a>
    </div>

    <div class="study_panel">
      <div class="study_panel_header">
        <h2>建议节奏</h2>
        <span>20 分钟</span>
      </div>
      <ol>
        <li>先读本章核心例句，遇到长句只看主语、动词、补语。</li>
        <li>每次做 8 到 12 题，先判断句型，再看选项。</li>
        <li>错题第二天重做，只看解析不算真正掌握。</li>
      </ol>
    </div>

    <div class="study_panel" v-if="wrongItems.length">
      <div class="study_panel_header">
        <h2>最近错题</h2>
        <span>{{ wrongItems.length }} 题</span>
      </div>
      <a
        class="wrong_item"
        v-for="item in wrongItems"
        :key="item.id"
        :href="$withBase(item.path || '/content/Contents.html')"
      >
        <span>{{ item.title || '练习题' }}</span>
        <strong>{{ item.selected }} -> {{ item.answer }}</strong>
      </a>
    </div>

    <div class="chapter_grid">
      <a
        v-for="chapter in chapters"
        :key="chapter.id"
        :href="$withBase(chapter.link)"
        class="chapter_chip"
        :class="{ done: readMap[chapter.id] }"
      >
        <span>{{ chapter.id }}</span>
        <strong>{{ chapter.title }}</strong>
      </a>
    </div>
  </section>
</template>

<script>
var chapters = [
  ['01', '基本句型及补语'],
  ['02', '名词词组与冠词'],
  ['03', '动词时态'],
  ['04', '不定词短语'],
  ['05', '动名词'],
  ['06', '分词'],
  ['07', '形容词'],
  ['08', '副词'],
  ['09', '语气'],
  ['10', '介系词'],
  ['11', '主语动词一致性'],
  ['12', '名词从句'],
  ['13', '副词从句'],
  ['14', '关系从句'],
  ['15', '对等连接词'],
  ['16', '从属从句简化通则'],
  ['17', '形容词从句简化'],
  ['18', '名词从句简化'],
  ['19', '副词从句简化之一'],
  ['20', '副词从句简化之二'],
  ['21', '简化从句练习'],
  ['22', '倒装句']
].map(function (item) {
  return {
    id: item[0],
    title: item[1],
    link: '/content/Chapter' + item[0] + '.html'
  };
});

function readJson(key) {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) || '{}');
  } catch (error) {
    return {};
  }
}

export default {
  data: function () {
    return {
      chapters: chapters,
      readMap: {},
      practice: {}
    };
  },
  computed: {
    readCount: function () {
      return Object.keys(this.readMap).length;
    },
    progressPercent: function () {
      return Math.round((this.readCount / this.chapters.length) * 100);
    },
    answered: function () {
      return Object.values(this.practice).filter(function (item) {
        return item && item.selected;
      });
    },
    answeredCount: function () {
      return this.answered.length;
    },
    correctCount: function () {
      return this.answered.filter(function (item) {
        return item.correct === true;
      }).length;
    },
    wrongItems: function () {
      return this.answered
        .filter(function (item) {
          return item.correct === false;
        })
        .sort(function (a, b) {
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        })
        .slice(0, 5);
    },
    wrongCount: function () {
      return this.answered.filter(function (item) {
        return item.correct === false;
      }).length;
    },
    accuracyText: function () {
      if (!this.answeredCount) return '0%';
      return Math.round((this.correctCount / this.answeredCount) * 100) + '%';
    },
    nextChapter: function () {
      for (var i = 0; i < this.chapters.length; i += 1) {
        if (!this.readMap[this.chapters[i].id]) return this.chapters[i];
      }
      return this.chapters[this.chapters.length - 1];
    }
  },
  mounted: function () {
    this.refresh();
    window.addEventListener('storage', this.refresh);
    window.addEventListener('grammar-club-practice-updated', this.refresh);
    window.addEventListener('grammar-club-reading-updated', this.refresh);
  },
  beforeDestroy: function () {
    window.removeEventListener('storage', this.refresh);
    window.removeEventListener('grammar-club-practice-updated', this.refresh);
    window.removeEventListener('grammar-club-reading-updated', this.refresh);
  },
  methods: {
    refresh: function () {
      this.readMap = readJson('grammarClubReadChapters');
      this.practice = readJson('grammarClubPractice');
    }
  }
};
</script>

<style lang="stylus">
.study_dashboard
  margin: 0 auto 2rem;

.study_hero
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1.5rem;
  align-items: center;
  margin: 1rem 0 1.25rem;
  padding: 1.4rem;
  color: #f5f5f7;
  background: linear-gradient(135deg, #111827, #283341 58%, #0f766e);
  border-radius: 18px;

.study_kicker
  margin: 0 0 0.35rem;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0;
  text-indent: 0;
  text-transform: uppercase;

.study_hero h1
  margin: 0;
  color: #ffffff;
  font-size: 2.35rem;
  line-height: 1.05;

.study_subtitle
  margin: 0.65rem 0 0;
  max-width: 32rem;
  color: rgba(255, 255, 255, 0.78);
  text-indent: 0;

.study_ring
  width: 6.4rem;
  height: 6.4rem;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: radial-gradient(circle at center, #18212d 0 58%, transparent 59%), conic-gradient(#34d399 var(--progress), rgba(255, 255, 255, 0.16) 0);
  text-align: center;
  strong
    display: block;
    color: #fff;
    font-size: 1.3rem;
  span
    display: block;
    color: rgba(255, 255, 255, 0.68);
    font-size: 0.78rem;

.study_stats
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
  div
    padding: 0.95rem;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 14px;
  strong
    display: block;
    color: #1d1d1f;
    font-size: 1.35rem;
  span
    color: #6e6e73;
    font-size: 0.82rem;

.study_actions
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1rem 0;
  a
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.55rem;
    padding: 0 1rem;
    border-radius: 999px;
    font-weight: 800;
    text-decoration: none !important;

.study_primary
  color: #fff !important;
  background: #0071e3;

.study_secondary
  color: #0071e3 !important;
  background: rgba(0, 113, 227, 0.1);

.study_panel
  margin: 1rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  ol
    margin: 0.6rem 0 0 1.2rem;
  li
    margin: 0.35rem 0;

.study_panel_header
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  h2
    margin: 0;
    font-size: 1.1rem;
  span
    color: #6e6e73;
    font-size: 0.85rem;
    font-weight: 700;

.wrong_item
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0;
  color: #1d1d1f !important;
  text-decoration: none !important;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  strong
    white-space: nowrap;

.chapter_grid
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;

.chapter_chip
  display: grid;
  grid-template-columns: 2.2rem 1fr;
  gap: 0.65rem;
  align-items: center;
  padding: 0.85rem;
  color: #1d1d1f !important;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 14px;
  text-decoration: none !important;
  span
    display: inline-grid;
    place-items: center;
    width: 2.1rem;
    height: 2.1rem;
    color: #fff;
    background: #1d1d1f;
    border-radius: 999px;
    font-weight: 800;
  strong
    font-size: 0.95rem;
  &.done span
    background: #34c759;

@media (max-width: 719px)
  .study_hero
    grid-template-columns: 1fr;
    border-radius: 0;
    margin-left: -1.5rem;
    margin-right: -1.5rem;
  .study_ring
    width: 5.6rem;
    height: 5.6rem;
  .study_stats
    grid-template-columns: repeat(2, 1fr);
  .chapter_grid
    grid-template-columns: 1fr;
</style>

<template>
  <section class="test_card" :class="{ answered: !!selected, correct: isCorrect, wrong: selected && !isCorrect }">
    <div v-if="q && q.length > 0">
      <div class="test_summary">
        <div v-if="!nt">
          <div class="test_triangle_box">
            <div class="test_triangle" :style="{ transform: open ? 'rotate(90deg)' : '' }"></div>
          </div>
        </div>
        <div :style="{ marginLeft: nt ? '1em' : '0' }" v-html="q"></div>
      </div>

      <div class="test_choices" v-if="c && c.length > 0">
        <button
          class="test_choice"
          v-for="(d, i) in c"
          :key="options[i]"
          :class="choiceClass(options[i])"
          type="button"
          @click="choose(options[i])"
        >
          <span class="test_choice_label">{{ options[i] }}</span>
          <span>{{ d }}</span>
        </button>
      </div>
    </div>

    <div v-if="qs">
      <div class="test_summary">
        <div class="test_triangle_box">
          <div class="test_triangle" :style="{ transform: open ? 'rotate(90deg)' : '' }"></div>
        </div>
        <div><slot /></div>
      </div>
    </div>

    <div v-if="!n">
      <div class="test_result" v-if="selected && canAutoCheck">
        <span>{{ isCorrect ? '答对了' : '再想一步' }}</span>
        <span v-if="!isCorrect">正确答案 {{ answerLabel }}</span>
      </div>

      <div class="test_answer" v-if="open">
        <b>{{ a }}</b>
        <slot />
      </div>

      <button class="test_answer_btn" type="button" @click="toggleAnswer">
        {{ open ? '收起解析' : selected ? '查看解析' : '显示答案' }}
      </button>
    </div>
  </section>
</template>

<script>
function hashString(value) {
  var hash = 0;
  if (!value) return '0';
  for (var i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function readStore() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem('grammarClubPractice') || '{}');
  } catch (error) {
    return {};
  }
}

function writeStore(store) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('grammarClubPractice', JSON.stringify(store));
  window.dispatchEvent(new CustomEvent('grammar-club-practice-updated'));
}

export default {
  props: {
    q: String, // 问题
    c: Array, // 选项
    a: String, // 答案
    n: Boolean, // 无答案 -> 3 & 14 章
    nt: Boolean, // 无三角 -> 14 章
    qs: Boolean // 有三角 -> 17 章
  },
  data: function () {
    return {
      options: ['A', 'B', 'C', 'D'],
      open: false,
      selected: ''
    };
  },
  computed: {
    storageId: function () {
      var pagePath = this.$page && this.$page.path ? this.$page.path : '';
      return hashString([pagePath, this.q, this.a, this.c && this.c.join('|')].join('::'));
    },
    answerLabel: function () {
      var match = (this.a || '').match(/\(([A-D])\)/);
      return match ? match[1] : '';
    },
    canAutoCheck: function () {
      return !!(this.c && this.c.length && this.answerLabel);
    },
    isCorrect: function () {
      return this.canAutoCheck && this.selected === this.answerLabel;
    }
  },
  mounted: function () {
    var saved = readStore()[this.storageId];
    if (saved) {
      this.selected = saved.selected || '';
      this.open = !!saved.open;
    }
  },
  methods: {
    choose: function (option) {
      if (!this.canAutoCheck) return;
      this.selected = option;
      this.open = true;
      this.save();
    },
    toggleAnswer: function () {
      this.open = !this.open;
      this.save();
    },
    choiceClass: function (option) {
      return {
        selected: this.selected === option,
        correct_choice: this.selected && this.answerLabel === option,
        wrong_choice: this.selected === option && this.answerLabel !== option
      };
    },
    save: function () {
      var store = readStore();
      store[this.storageId] = {
        id: this.storageId,
        path: this.$page && this.$page.path,
        title: this.$page && this.$page.title,
        q: this.q,
        answer: this.answerLabel || this.a,
        selected: this.selected,
        correct: this.canAutoCheck ? this.isCorrect : null,
        open: this.open,
        updatedAt: Date.now()
      };
      writeStore(store);
    }
  }
};
</script>

<style lang="stylus">
.test_card
  margin: 1.25rem 0;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(20, 24, 31, 0.06);

.test_summary
  display: flex;
  margin-top: 0;
  line-height: 1.7;
  font-weight: 650;

.test_triangle_box
  min-width: 1em;
  float: left;
  .test_triangle
    margin-top: 0.5em;
    width: 0;
    height: 0;
    border-top: 0.36em solid transparent;
    border-left: 0.36 * 1.734em solid;
    border-bottom: 0.36em solid transparent;

.test_choices
  display: grid;
  gap: 0.65rem;
  margin: 0.85rem 0 0 0;
  .test_choice
    appearance: none;
    width: 100%;
    display: grid;
    grid-template-columns: 2rem 1fr;
    gap: 0.75rem;
    align-items: start;
    color: #1d1d1f;
    background: #f5f5f7;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 10px;
    cursor: pointer;
    font: inherit;
    padding: 0.72rem 0.8rem;
    text-align: left;
    line-height: 1.7;
    transition: border-color 0.16s ease, background 0.16s ease, transform 0.16s ease;
    &:hover
      background: #ffffff;
      border-color: rgba(0, 113, 227, 0.35);
    &.selected
      border-color: #0071e3;
      background: #eef6ff;
    &.correct_choice
      border-color: #2da44e;
      background: #eefbf2;
    &.wrong_choice
      border-color: #d1242f;
      background: #fff2f2;

.test_choice_label
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 999px;
  color: #fff;
  background: #1d1d1f;
  font-size: 0.84rem;
  font-weight: 700;

.test_result
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-top: 0.85rem;
  color: #1d1d1f;
  font-weight: 700;

.test_answer
  margin-top: 0.85rem;
  padding: 0.85rem;
  background: rgba(245, 245, 247, 0.85);
  border-radius: 10px;
  line-height: 1.7;

.test_answer_btn
  appearance: none;
  cursor: pointer;
  margin-top: 0.9rem;
  font-size: 0.86rem;
  font-weight: 700;
  display: inline-block;
  color: #0071e3;
  background-color: transparent;
  padding: 0;
  border: 0;
  transition: color .1s ease;
  box-sizing: border-box;
  &:hover
    color: #004b9b;

@media (max-width: 719px)
  .test_card
    margin-left: -0.25rem;
    margin-right: -0.25rem;
    padding: 0.9rem;
</style>

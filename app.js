(function () {
  const data = window.HISTORY_DATA;
  const storageKey = "history-review-app-state-v1";
  const allLessons = data.books.flatMap((book) =>
    book.units.flatMap((unit) =>
      unit.lessons.map((lesson) => ({ ...lesson, book, unit }))
    )
  );
  const allUnits = data.books.flatMap((book) => book.units.map((unit) => ({ ...unit, book })));
  const trainableLessons = allLessons.filter((lesson) => lesson.status === "sample" || lesson.status === "complete");

  const state = loadState();
  const tempOrders = {};
  const tempChoices = {};
  let installPromptEvent = null;

  function sameOrder(left, right) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function shuffled(items, avoidOrder) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }

    if (result.length > 1 && avoidOrder && sameOrder(result, avoidOrder)) {
      result.push(result.shift());
    }

    return result;
  }

  function choiceOptions(drill) {
    if (!tempChoices[drill.id]) {
      const options = shuffled(drill.options, drill.options);
      if (options.length > 1 && drill.options[0] === drill.answer && options[0] === drill.answer) {
        options.push(options.shift());
      }
      tempChoices[drill.id] = options;
    }
    return tempChoices[drill.id];
  }

  function orderItems(drill) {
    if (!tempOrders[drill.id]) {
      const correctOrder = drill.items
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((item) => item.id);
      tempOrders[drill.id] = shuffled(drill.items.map((item) => item.id), correctOrder);
    }
    return tempOrders[drill.id];
  }

  function storageAvailable() {
    return typeof window.localStorage !== "undefined";
  }

  function loadState() {
    const fallback = {
      view: "dashboard",
      selectedLessonId: "7b-l1",
      cardsSeen: {},
      drillResults: {},
      writingResults: {},
      wrongbook: {},
      challengeUnitId: null,
      challengeResults: {}
    };

    try {
      if (!storageAvailable()) return fallback;
      const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
      return { ...fallback, ...(saved || {}) };
    } catch (_error) {
      return fallback;
    }
  }

  function saveState() {
    if (storageAvailable()) {
      localStorage.setItem(storageKey, JSON.stringify(state));
    }
    renderProgressSummary();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function selectedLesson() {
    return allLessons.find((lesson) => lesson.id === state.selectedLessonId) || trainableLessons[0];
  }

  function activeChallengeUnit() {
    return allUnits.find((unit) => unit.id === state.challengeUnitId) ||
      allUnits.find((unit) => unit.id === selectedLesson().unit.id) ||
      allUnits[0];
  }

  function unitLessons(unitId) {
    return allLessons.filter((lesson) => lesson.unit.id === unitId);
  }

  function challengeDrills(unitId) {
    const picked = [];
    unitLessons(unitId).forEach((lesson) => {
      ["choice", "blank", "correction"].forEach((type) => {
        const drill = lesson.drills.find((item) => item.type === type);
        if (drill) picked.push({ drill, lesson });
      });
    });
    return picked.slice(0, 12);
  }

  function findDrill(drillId) {
    for (const lesson of allLessons) {
      const drill = lesson.drills.find((item) => item.id === drillId);
      if (drill) return { drill, lesson };
    }
    return null;
  }

  function lessonProgress(lesson) {
    const cardsTotal = lesson.cards.length;
    const cardsDone = lesson.cards.filter((card) => state.cardsSeen[card.id]).length;
    const drillsTotal = lesson.drills.length;
    const drillsDone = lesson.drills.filter((drill) => state.drillResults[drill.id]?.correct).length;
    const writesTotal = lesson.writingTasks.length;
    const writesDone = lesson.writingTasks.filter((task) => state.writingResults[task.id]?.score >= 60).length;
    const total = cardsTotal + drillsTotal + writesTotal;
    const done = cardsDone + drillsDone + writesDone;
    return {
      cardsTotal,
      cardsDone,
      drillsTotal,
      drillsDone,
      writesTotal,
      writesDone,
      percent: total ? Math.round((done / total) * 100) : 0
    };
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function formatDate(date) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function weakLessons(limit) {
    return trainableLessons
      .slice()
      .sort((left, right) => lessonProgress(left).percent - lessonProgress(right).percent)
      .slice(0, limit);
  }

  function render() {
    renderRail();
    renderProgressSummary();
    renderTabs();
    renderDashboard();
    renderCalendar();
    renderChallenge();
    renderMap();
    renderTraining();
    renderWriting();
    renderWrongbook();
    renderMastery();
  }

  function renderTabs() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("is-active", tab.dataset.view === state.view);
    });
    document.querySelectorAll(".view-panel").forEach((panel) => {
      panel.classList.toggle("is-visible", panel.id === `view-${state.view}`);
    });
  }

  function renderProgressSummary() {
    const totalLessons = allLessons.length;
    const completeLessons = trainableLessons.filter((lesson) => lessonProgress(lesson).percent >= 80).length;
    const expandedLessons = allLessons.filter((lesson) => lesson.examExpanded).length;
    const wrongCount = Object.keys(state.wrongbook).length;
    document.getElementById("progressSummary").textContent =
      `已纳入 ${totalLessons} 课，可训练 ${trainableLessons.length} 课，重点扩题 ${expandedLessons} 课；错题 ${wrongCount} 道，达标 ${completeLessons} 课。`;
  }

  function renderRail() {
    const rail = document.getElementById("lessonRail");
    rail.innerHTML = `
      <p class="rail-title">教材目录</p>
      ${data.books.map((book) => `
        <div class="book-block">
          <p class="book-name">${escapeHtml(book.title)}</p>
          ${book.units.map((unit) => `
            <div>
              <p class="unit-name">${escapeHtml(unit.title)}</p>
              ${unit.lessons.map((lesson) => `
                <button class="lesson-button ${lesson.id === state.selectedLessonId ? "is-selected" : ""}"
                  data-select-lesson="${lesson.id}">
                  第${lesson.number}课 ${escapeHtml(lesson.title)}
                  <small>${lesson.examExpanded ? "重点扩题" : lesson.status === "sample" ? "样例课" : lesson.status === "complete" ? "已补齐" : "待补内容"}</small>
                </button>
              `).join("")}
            </div>
          `).join("")}
        </div>
      `).join("")}
    `;
  }

  function renderDashboard() {
    const lesson = selectedLesson();
    const progress = lessonProgress(lesson);
    const dueWrong = Object.keys(state.wrongbook).length;
    const recommendedLessons = [lesson, ...trainableLessons.filter((item) => item.id !== lesson.id)].slice(0, 4);
    document.getElementById("view-dashboard").innerHTML = `
      <section class="hero-panel">
        <div>
          <p class="eyebrow">今日复习</p>
          <h2>先把“会背”推进到“会写”</h2>
          <p>当前选中：${escapeHtml(lesson.book.title)} 第${lesson.number}课《${escapeHtml(lesson.title)}》。两册内容已按同一结构组织，可以从知识卡、训练题和书写题三个入口反复复习。</p>
          <div class="button-row">
            <button class="primary-button" data-view-jump="training">开始训练</button>
            <button class="ghost-button" data-view-jump="calendar">看复习日历</button>
            <button class="ghost-button" data-view-jump="challenge" data-select-challenge-unit="${lesson.unit.id}">单元闯关</button>
            <button class="ghost-button" data-view-jump="writing">练书写</button>
            <button class="ghost-button" data-view-jump="map">看教材地图</button>
          </div>
        </div>
        <div class="hero-stats">
          <div class="stat-tile"><strong>${allLessons.length}</strong><span>两册课目</span></div>
          <div class="stat-tile"><strong>${trainableLessons.length}</strong><span>可训练课</span></div>
          <div class="stat-tile"><strong>${allLessons.filter((item) => item.examExpanded).length}</strong><span>重点扩题</span></div>
          <div class="stat-tile"><strong>${progress.percent}%</strong><span>当前课掌握</span></div>
        </div>
      </section>

      <section class="section-panel">
        <h2>今日建议</h2>
        <div class="lesson-grid">
          ${recommendedLessons.map((item) => {
            const itemProgress = lessonProgress(item);
            return `
              <article class="lesson-card is-sample">
                <h3>${escapeHtml(item.book.title)} 第${item.number}课《${escapeHtml(item.title)}》</h3>
                <p>${escapeHtml(item.summary)}</p>
                <div class="progress-bar" aria-label="掌握度"><span style="width:${itemProgress.percent}%"></span></div>
                <div class="chip-row">
                  <span class="chip">知识卡 ${itemProgress.cardsDone}/${itemProgress.cardsTotal}</span>
                  <span class="chip">训练 ${itemProgress.drillsDone}/${itemProgress.drillsTotal}</span>
                  <span class="chip">书写 ${itemProgress.writesDone}/${itemProgress.writesTotal}</span>
                </div>
                <div class="button-row">
                  <button class="primary-button" data-select-lesson="${item.id}" data-view-jump="training">练这一课</button>
                  <button class="ghost-button" data-select-lesson="${item.id}" data-view-jump="writing">写这一课</button>
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </section>
      ${renderInstallPanel()}
    `;
  }

  function renderInstallPanel() {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
    return `
      <section class="section-panel install-panel">
        <p class="eyebrow">手机安装</p>
        <h2>${standalone ? "已在 APP 模式运行" : "可以安装到手机桌面"}</h2>
        <p>这个版本已经加入 PWA 配置。安卓 Chrome 通常会出现安装入口；苹果设备可以用 Safari 的分享按钮添加到主屏幕。安装后可像普通 APP 一样打开，并支持基础离线缓存。</p>
        <div class="install-steps">
          <div><strong>安卓</strong><span>Chrome 打开页面 -> 安装应用 / 添加到主屏幕</span></div>
          <div><strong>苹果</strong><span>Safari 打开页面 -> 分享 -> 添加到主屏幕</span></div>
        </div>
        <div class="button-row">
          ${installPromptEvent ? `<button class="primary-button" data-install-app="true">立即安装</button>` : `<span class="chip">已准备安装配置</span>`}
          <span class="chip">支持离线缓存</span>
        </div>
      </section>
    `;
  }

  function renderCalendar() {
    const today = new Date();
    const selected = selectedLesson();
    const weak = weakLessons(4);
    const wrongCount = Object.keys(state.wrongbook).length;
    const slots = [
      {
        label: "今天",
        date: formatDate(today),
        title: wrongCount ? `错题回炉 ${wrongCount} 道` : `复习第${selected.number}课《${selected.title}》`,
        body: wrongCount ? "先处理错题，再做一道书写题，避免错因过夜。" : "当前没有错题，建议从当前课开始做训练和书写。",
        view: wrongCount ? "wrongbook" : "training",
        lessonId: selected.id
      },
      {
        label: "1天后",
        date: formatDate(addDays(today, 1)),
        title: `薄弱课回看：第${weak[0]?.number || selected.number}课`,
        body: weak[0] ? `《${weak[0].title}》掌握度较低，适合做一次选择、填空和排序。` : "继续复习当前课。",
        view: "training",
        lessonId: weak[0]?.id || selected.id
      },
      {
        label: "3天后",
        date: formatDate(addDays(today, 3)),
        title: `书写巩固：第${weak[1]?.number || selected.number}课`,
        body: weak[1] ? `《${weak[1].title}》建议练 1 道短答题，把关键词写成完整句。` : "选择一课练短答题。",
        view: "writing",
        lessonId: weak[1]?.id || selected.id
      },
      {
        label: "7天后",
        date: formatDate(addDays(today, 7)),
        title: "单元闯关",
        body: `用《${selected.unit.title}》做一次混合检测，看看时间线、人物和影响是否真正分清。`,
        view: "challenge",
        unitId: selected.unit.id
      },
      {
        label: "14天后",
        date: formatDate(addDays(today, 14)),
        title: `回顾重点扩题：${weak[2]?.examExpanded ? weak[2].title : "重点课材料题"}`,
        body: "两周后适合做材料题和易混题，防止只记住答案位置。",
        view: weak[2] ? "training" : "challenge",
        lessonId: weak[2]?.id || selected.id
      }
    ];

    document.getElementById("view-calendar").innerHTML = `
      <section class="section-panel">
        <p class="eyebrow">复习日历</p>
        <h2>按 1-3-7-14 天回炉</h2>
        <p>日历会根据错题和掌握度给出复习节奏。它不是硬性任务表，而是帮孩子每天少纠结“今天练什么”。</p>
      </section>
      <section class="calendar-grid">
        ${slots.map((slot) => `
          <article class="review-card">
            <div class="chip-row">
              <span class="chip">${escapeHtml(slot.label)}</span>
              <span class="chip">${escapeHtml(slot.date)}</span>
            </div>
            <h3>${escapeHtml(slot.title)}</h3>
            <p>${escapeHtml(slot.body)}</p>
            <div class="button-row">
              <button class="primary-button"
                data-view-jump="${slot.view}"
                ${slot.lessonId ? `data-select-lesson="${slot.lessonId}"` : ""}
                ${slot.unitId ? `data-select-challenge-unit="${slot.unitId}"` : ""}>
                去复习
              </button>
            </div>
          </article>
        `).join("")}
      </section>
    `;
  }

  function renderChallenge() {
    const unit = activeChallengeUnit();
    const drills = challengeDrills(unit.id);
    const unitResults = state.challengeResults[unit.id] || {};
    const answered = Object.keys(unitResults).length;
    const correct = Object.values(unitResults).filter((result) => result.correct).length;

    document.getElementById("view-challenge").innerHTML = `
      <section class="section-panel">
        <p class="eyebrow">单元闯关</p>
        <h2>${escapeHtml(unit.book.title)} · ${escapeHtml(unit.title)}</h2>
        <p>每个单元自动抽取选择、填空和判断改错题，混合检测主干知识。答错的题也会进入错题本。</p>
        <div class="chip-row">
          <span class="chip">题目 ${drills.length} 道</span>
          <span class="chip">已答 ${answered} 道</span>
          <span class="chip">正确 ${correct} 道</span>
        </div>
        <div class="unit-picker">
          ${allUnits.map((item) => `
            <button class="tiny-button ${item.id === unit.id ? "is-current" : ""}" data-select-challenge-unit="${item.id}" data-view-jump="challenge">
              ${escapeHtml(item.book.title.replace("七年级", ""))} · ${escapeHtml(item.title.replace(/^第.单元\s*/, ""))}
            </button>
          `).join("")}
        </div>
      </section>
      <section class="challenge-grid">
        ${drills.map(({ drill, lesson }) => renderChallengeDrill(drill, lesson, unit.id, unitResults[drill.id])).join("")}
      </section>
    `;
  }

  function renderChallengeDrill(drill, lesson, unitId, result) {
    return `
      <article class="challenge-card">
        <div class="chip-row">
          <span class="chip">第${lesson.number}课</span>
          <span class="chip">${escapeHtml(drill.mastery || "闯关")}</span>
          ${result ? `<span class="chip ${result.correct ? "" : "warn"}">${result.correct ? "已答对" : "再回炉"}</span>` : ""}
        </div>
        <h3>${escapeHtml(drill.title)}</h3>
        <p>${escapeHtml(drill.prompt)}</p>
        ${renderChallengeBody(drill, unitId)}
        <div class="feedback" data-challenge-feedback="${drill.id}" ${result ? "" : "hidden"}>
          ${result ? `<strong>${result.correct ? "答对了" : "需要回炉"}</strong><p>${escapeHtml(drill.explanation)}</p>` : ""}
        </div>
      </article>
    `;
  }

  function renderChallengeBody(drill, unitId) {
    if (drill.type === "choice") {
      return `
        <div class="choice-list">
          ${choiceOptions(drill).map((option) => `
            <button class="choice-button" data-challenge-choice="${drill.id}" data-unit="${unitId}" data-value="${escapeHtml(option)}">${escapeHtml(option)}</button>
          `).join("")}
        </div>
      `;
    }

    if (drill.type === "blank") {
      return `
        <input class="blank-input" data-challenge-blank-input="${drill.id}" placeholder="输入关键词">
        <div class="button-row"><button class="primary-button" data-challenge-blank="${drill.id}" data-unit="${unitId}">检查</button></div>
      `;
    }

    if (drill.type === "correction") {
      return `
        <textarea class="writing-textarea" data-challenge-correction-input="${drill.id}" placeholder="写出判断和改正"></textarea>
        <div class="button-row"><button class="primary-button" data-challenge-correction="${drill.id}" data-unit="${unitId}">检查表达</button></div>
      `;
    }

    return "";
  }

  function renderMap() {
    const lesson = selectedLesson();
    document.getElementById("view-map").innerHTML = `
      <section class="section-panel">
        <p class="eyebrow">教材地图</p>
        <h2>两册主线</h2>
        <div class="lesson-grid">
          ${data.books.map((book) => `
            <article class="lesson-card">
              <h3>${escapeHtml(book.title)}</h3>
              <p>${escapeHtml(book.subtitle)}</p>
              <div class="chip-row">
                ${book.units.map((unit) => `<span class="chip">${escapeHtml(unit.era)}</span>`).join("")}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
      ${data.books.map((book) => `
        <section class="section-panel">
          <h2>${escapeHtml(book.title)}</h2>
          ${book.units.map((unit) => `
            <div class="map-unit">
              <p class="unit-name">${escapeHtml(unit.title)} · ${escapeHtml(unit.era)}</p>
              <div class="lesson-grid">
                ${unit.lessons.map((item) => `
                  <article class="lesson-card ${item.status === "planned" ? "" : "is-sample"}">
                    <h3>第${item.number}课 ${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.summary)}</p>
                    <div class="chip-row">
                      <span class="chip ${item.status === "planned" ? "warn" : ""}">${item.examExpanded ? "重点扩题" : item.status === "sample" ? "样例可训练" : item.status === "complete" ? "已补齐" : "待整理"}</span>
                      ${item.targets.map((target) => `<span class="chip">${escapeHtml(target)}</span>`).join("")}
                    </div>
                    <div class="button-row">
                      <button class="ghost-button" data-select-lesson="${item.id}">${item.id === lesson.id ? "当前课" : "选中"}</button>
                    </div>
                  </article>
                `).join("")}
              </div>
            </div>
          `).join("")}
        </section>
      `).join("")}
      ${renderLessonDetail(lesson)}
    `;
  }

  function renderLessonDetail(lesson) {
    if (!lesson.cards.length) {
      return `
        <section class="section-panel">
          <h2>第${lesson.number}课《${escapeHtml(lesson.title)}》</h2>
          <p class="empty-state">这一课已经放入两册地图，后续会按同样结构补齐知识卡、训练题和书写题。</p>
        </section>
      `;
    }

    return `
      <section class="section-panel">
        <p class="eyebrow">当前课详情</p>
        <h2>${escapeHtml(lesson.book.title)} 第${lesson.number}课《${escapeHtml(lesson.title)}》</h2>
        <p>${escapeHtml(lesson.summary)}</p>
        <div class="card-grid">
          ${lesson.cards.map((card) => `
            <article class="card">
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.body)}</p>
              <div class="chip-row">
                <span class="chip">速记：${escapeHtml(card.remember)}</span>
              </div>
              <p><strong>书写提示：</strong>${escapeHtml(card.writeCue)}</p>
              <button class="tiny-button" data-card-seen="${card.id}">${state.cardsSeen[card.id] ? "已记住" : "标记已读"}</button>
            </article>
          `).join("")}
        </div>
        <div class="timeline">
          ${lesson.timeline.map((item) => `
            <div class="timeline-item">
              <strong>${escapeHtml(item.time)}</strong>
              <span>${escapeHtml(item.event)}</span>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  function renderTraining() {
    const lesson = selectedLesson();
    const drills = lesson.drills;
    document.getElementById("view-training").innerHTML = `
      <section class="section-panel">
        <p class="eyebrow">训练场</p>
        <h2>${escapeHtml(lesson.book.title)} 第${lesson.number}课《${escapeHtml(lesson.title)}》</h2>
        <p>这里把基础识记、排序、配对和判断改错混在一起练。做错后会自动进入错题本。</p>
      </section>
      ${drills.length ? `
        <section class="drill-grid">
          ${drills.map(renderDrill).join("")}
        </section>
      ` : `
        <section class="section-panel">
          <p class="empty-state">这一课的训练题还没补。可以先在左侧选择七上第1课或七下第1课体验。</p>
        </section>
      `}
    `;
  }

  function renderDrill(drill) {
    const result = state.drillResults[drill.id];
    return `
      <article class="drill-card" data-drill-card="${drill.id}">
        <div class="chip-row">
          <span class="chip">${escapeHtml(drill.mastery || "训练")}</span>
          ${result ? `<span class="chip ${result.correct ? "" : "warn"}">${result.correct ? "已答对" : "需回炉"}</span>` : ""}
        </div>
        <h3>${escapeHtml(drill.title)}</h3>
        <p>${escapeHtml(drill.prompt)}</p>
        ${renderDrillBody(drill)}
        <div class="feedback" data-feedback="${drill.id}" hidden></div>
      </article>
    `;
  }

  function renderDrillBody(drill) {
    if (drill.type === "choice") {
      return `
        <div class="choice-list">
          ${choiceOptions(drill).map((option) => `
            <button class="choice-button" data-check-choice="${drill.id}" data-value="${escapeHtml(option)}">${escapeHtml(option)}</button>
          `).join("")}
        </div>
      `;
    }

    if (drill.type === "blank") {
      return `
        <input class="blank-input" data-blank-input="${drill.id}" placeholder="在这里输入关键词">
        <div class="button-row"><button class="primary-button" data-check-blank="${drill.id}">检查</button></div>
      `;
    }

    if (drill.type === "order") {
      const order = orderItems(drill);
      return `
        <div class="order-list">
          ${order.map((itemId, index) => {
            const item = drill.items.find((entry) => entry.id === itemId);
            return `
              <div class="order-item">
                <span>${index + 1}. ${escapeHtml(item.label)}</span>
                <span>
                  <button class="tiny-button" data-order-move="${drill.id}" data-item="${item.id}" data-dir="up">上移</button>
                  <button class="tiny-button" data-order-move="${drill.id}" data-item="${item.id}" data-dir="down">下移</button>
                </span>
              </div>
            `;
          }).join("")}
        </div>
        <div class="button-row"><button class="primary-button" data-check-order="${drill.id}">检查顺序</button></div>
      `;
    }

    if (drill.type === "pair") {
      const options = drill.pairs.map((pair) => pair.right);
      return `
        <div class="pair-list">
          ${drill.pairs.map((pair, index) => `
            <div class="pair-item">
              <strong>${escapeHtml(pair.left)}</strong>
              <select class="pair-select" data-pair-select="${drill.id}" data-index="${index}">
                <option value="">选择对应信息</option>
                ${options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}
              </select>
            </div>
          `).join("")}
        </div>
        <div class="button-row"><button class="primary-button" data-check-pair="${drill.id}">检查配对</button></div>
      `;
    }

    if (drill.type === "correction") {
      return `
        <textarea class="writing-textarea" data-correction-input="${drill.id}" placeholder="写出你的判断和改正"></textarea>
        <div class="button-row"><button class="primary-button" data-check-correction="${drill.id}">检查表达</button></div>
      `;
    }

    return "";
  }

  function renderWriting() {
    const lesson = selectedLesson();
    const tasks = lesson.writingTasks;
    document.getElementById("view-writing").innerHTML = `
      <section class="section-panel">
        <p class="eyebrow">书写训练</p>
        <h2>${escapeHtml(lesson.book.title)} 第${lesson.number}课《${escapeHtml(lesson.title)}》</h2>
        <p>第一版评分看三个点：关键词有没有写到、是否形成完整句、有没有因果或评价表达。它适合平时练习，不替代老师批改。</p>
      </section>
      ${tasks.length ? `
        <section class="writing-grid">
          ${tasks.map((task) => {
            const saved = state.writingResults[task.id];
            return `
              <article class="writing-card">
                <div class="chip-row">
                  <span class="chip">${escapeHtml(task.type)}</span>
                  ${saved ? `<span class="chip ${saved.score >= 60 ? "" : "warn"}">上次 ${saved.score} 分</span>` : ""}
                </div>
                <h3>${escapeHtml(task.title)}</h3>
                <p>${escapeHtml(task.prompt)}</p>
                <textarea class="writing-textarea" data-writing-input="${task.id}" placeholder="试着用完整句作答">${saved ? escapeHtml(saved.text) : ""}</textarea>
                <div class="button-row">
                  <button class="primary-button" data-submit-writing="${task.id}">提交并看提示</button>
                  <button class="ghost-button" data-show-sample="${task.id}">看参考表达</button>
                </div>
                <div class="feedback" data-writing-feedback="${task.id}" ${saved ? "" : "hidden"}>
                  ${saved ? renderWritingFeedback(task, saved) : ""}
                </div>
              </article>
            `;
          }).join("")}
        </section>
      ` : `
        <section class="section-panel">
          <p class="empty-state">这一课的书写题还没补。可以先选择七上第1课或七下第1课体验。</p>
        </section>
      `}
    `;
  }

  function renderWrongbook() {
    const entries = Object.keys(state.wrongbook)
      .map((id) => findDrill(id))
      .filter(Boolean);

    document.getElementById("view-wrongbook").innerHTML = `
      <section class="section-panel">
        <p class="eyebrow">错题本</p>
        <h2>${entries.length ? "这些题需要回炉" : "暂时没有错题"}</h2>
        <p>答错的题会留在这里。再次答对后，会自动从错题本移除。</p>
      </section>
      ${entries.length ? `
        <section class="drill-grid">
          ${entries.map(({ drill, lesson }) => `
            <article class="drill-card">
              <div class="chip-row">
                <span class="chip warn">错题</span>
                <span class="chip">${escapeHtml(lesson.book.title)} 第${lesson.number}课</span>
              </div>
              <h3>${escapeHtml(drill.title)}</h3>
              <p>${escapeHtml(drill.prompt)}</p>
              <div class="button-row">
                <button class="primary-button" data-select-lesson="${lesson.id}" data-view-jump="training">回到训练场</button>
              </div>
            </article>
          `).join("")}
        </section>
      ` : `
        <section class="section-panel">
          <p class="empty-state">现在错题本是空的。可以去训练场做几题，系统会自动记录。</p>
        </section>
      `}
    `;
  }

  function renderMastery() {
    document.getElementById("view-mastery").innerHTML = `
      <section class="section-panel">
        <p class="eyebrow">掌握度</p>
        <h2>按课看“会认、会背、会写、会解释”</h2>
        <p>已补齐课程会显示真实进度；后续精修某一课时，掌握度会自动沿用同一套统计。</p>
      </section>
      <section class="mastery-grid">
        ${allLessons.map((lesson) => {
          const progress = lessonProgress(lesson);
          return `
            <article class="mastery-card">
              <h3>${escapeHtml(lesson.book.title)} 第${lesson.number}课《${escapeHtml(lesson.title)}》</h3>
              <p>${escapeHtml(lesson.unit.title)}</p>
              <div class="mastery-row">
                <span>总掌握</span>
                <div class="progress-bar"><span style="width:${progress.percent}%"></span></div>
                <strong>${progress.percent}%</strong>
              </div>
              <div class="chip-row">
                <span class="chip">知识卡 ${progress.cardsDone}/${progress.cardsTotal}</span>
                <span class="chip">训练 ${progress.drillsDone}/${progress.drillsTotal}</span>
                <span class="chip">书写 ${progress.writesDone}/${progress.writesTotal}</span>
              </div>
            </article>
          `;
        }).join("")}
      </section>
    `;
  }

  function recordDrill(drillId, correct) {
    const previous = state.drillResults[drillId];
    state.drillResults[drillId] = {
      correct,
      attempts: (previous?.attempts || 0) + 1,
      lastTriedAt: new Date().toISOString()
    };

    if (correct) {
      delete state.wrongbook[drillId];
    } else {
      state.wrongbook[drillId] = {
        addedAt: new Date().toISOString()
      };
    }
    saveState();
  }

  function recordChallenge(unitId, drillId, correct) {
    if (!state.challengeResults[unitId]) {
      state.challengeResults[unitId] = {};
    }
    const previous = state.challengeResults[unitId][drillId];
    state.challengeResults[unitId][drillId] = {
      correct,
      attempts: (previous?.attempts || 0) + 1,
      lastTriedAt: new Date().toISOString()
    };
    saveState();
  }

  function showFeedback(drillId, correct, message) {
    const box = document.querySelector(`[data-feedback="${drillId}"]`);
    if (!box) return;
    box.hidden = false;
    box.classList.toggle("good", correct);
    box.classList.toggle("bad", !correct);
    box.innerHTML = message;
  }

  function showChallengeFeedback(drillId, correct, message) {
    const box = document.querySelector(`[data-challenge-feedback="${drillId}"]`);
    if (!box) return;
    box.hidden = false;
    box.classList.toggle("good", correct);
    box.classList.toggle("bad", !correct);
    box.innerHTML = message;
  }

  function evaluateBlank(drill, value) {
    const normalized = value.trim();
    return drill.answers.some((answer) => normalized.includes(answer));
  }

  function evaluateWriting(text, task) {
    const normalized = text.replace(/\s+/g, "");
    const hits = task.keywords.filter((keyword) => normalized.includes(keyword));
    const sentenceCount = text.split(/[。！？!?\n]/).filter((part) => part.trim().length >= 6).length;
    const hasReasoning = /因为|所以|促进|导致|影响|说明|因此|但是|同时/.test(text);
    const keywordScore = Math.round((hits.length / task.keywords.length) * 62);
    const sentenceScore = sentenceCount >= task.minSentences ? 24 : Math.round((sentenceCount / task.minSentences) * 24);
    const reasoningScore = hasReasoning ? 14 : 0;
    const score = Math.min(100, keywordScore + sentenceScore + reasoningScore);
    return { score, hits, sentenceCount, hasReasoning, text };
  }

  function renderWritingFeedback(task, result, showSample) {
    const missing = task.keywords.filter((keyword) => !result.hits.includes(keyword));
    return `
      <strong>得分：${result.score} 分</strong>
      <p>命中关键词：${result.hits.length ? result.hits.map(escapeHtml).join("、") : "暂未命中"}</p>
      <p>还可以补：${missing.length ? missing.map(escapeHtml).join("、") : "关键词比较完整"}</p>
      <p>完整句：${result.sentenceCount} 句；因果/评价表达：${result.hasReasoning ? "有" : "可以再加一句原因或影响"}</p>
      ${showSample ? `<p><strong>参考表达：</strong>${escapeHtml(task.sampleAnswer)}</p>` : ""}
    `;
  }

  function handleClick(event) {
    const target = event.target.closest("button");
    if (!target) return;

    const view = target.dataset.view || target.dataset.viewJump;
    if (view) {
      state.view = view;
    }

    if (target.dataset.selectLesson) {
      state.selectedLessonId = target.dataset.selectLesson;
    }

    if (target.dataset.selectChallengeUnit) {
      state.challengeUnitId = target.dataset.selectChallengeUnit;
    }

    if (target.dataset.cardSeen) {
      state.cardsSeen[target.dataset.cardSeen] = true;
    }

    if (target.dataset.checkChoice) {
      const match = findDrill(target.dataset.checkChoice);
      const correct = target.dataset.value === match.drill.answer;
      recordDrill(match.drill.id, correct);
      showFeedback(
        match.drill.id,
        correct,
        `<strong>${correct ? "答对了" : "这题先回炉"}</strong><p>${escapeHtml(match.drill.explanation)}</p>`
      );
      renderProgressSummary();
      return;
    }

    if (target.dataset.checkBlank) {
      const match = findDrill(target.dataset.checkBlank);
      const input = document.querySelector(`[data-blank-input="${match.drill.id}"]`);
      const correct = evaluateBlank(match.drill, input.value);
      recordDrill(match.drill.id, correct);
      showFeedback(
        match.drill.id,
        correct,
        `<strong>${correct ? "关键词对了" : "关键词还没对上"}</strong><p>${escapeHtml(match.drill.explanation)}</p>`
      );
      return;
    }

    if (target.dataset.orderMove) {
      const drillId = target.dataset.orderMove;
      const order = tempOrders[drillId];
      const index = order.indexOf(target.dataset.item);
      const next = target.dataset.dir === "up" ? index - 1 : index + 1;
      if (next >= 0 && next < order.length) {
        [order[index], order[next]] = [order[next], order[index]];
      }
      renderTraining();
      return;
    }

    if (target.dataset.checkOrder) {
      const match = findDrill(target.dataset.checkOrder);
      const order = tempOrders[match.drill.id] || [];
      const correctOrder = match.drill.items
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((item) => item.id);
      const correct = order.join("|") === correctOrder.join("|");
      recordDrill(match.drill.id, correct);
      showFeedback(
        match.drill.id,
        correct,
        `<strong>${correct ? "顺序正确" : "顺序需要再看时间线"}</strong><p>${escapeHtml(match.drill.explanation)}</p>`
      );
      return;
    }

    if (target.dataset.checkPair) {
      const match = findDrill(target.dataset.checkPair);
      const selects = [...document.querySelectorAll(`[data-pair-select="${match.drill.id}"]`)];
      const correct = selects.every((select) => {
        const pair = match.drill.pairs[Number(select.dataset.index)];
        return select.value === pair.right;
      });
      recordDrill(match.drill.id, correct);
      showFeedback(
        match.drill.id,
        correct,
        `<strong>${correct ? "配对正确" : "还有配对没对上"}</strong><p>${escapeHtml(match.drill.explanation)}</p>`
      );
      return;
    }

    if (target.dataset.checkCorrection) {
      const match = findDrill(target.dataset.checkCorrection);
      const input = document.querySelector(`[data-correction-input="${match.drill.id}"]`);
      const text = input.value.replace(/\s+/g, "");
      const correct = match.drill.keywords.every((keyword) => text.includes(keyword));
      recordDrill(match.drill.id, correct);
      showFeedback(
        match.drill.id,
        correct,
        `<strong>${correct ? "改得有关键点" : "改正里还缺关键点"}</strong><p>${escapeHtml(match.drill.explanation)}</p>`
      );
      return;
    }

    if (target.dataset.challengeChoice) {
      const match = findDrill(target.dataset.challengeChoice);
      const unitId = target.dataset.unit || activeChallengeUnit().id;
      const correct = target.dataset.value === match.drill.answer;
      recordDrill(match.drill.id, correct);
      recordChallenge(unitId, match.drill.id, correct);
      showChallengeFeedback(
        match.drill.id,
        correct,
        `<strong>${correct ? "答对了" : "这题先回炉"}</strong><p>${escapeHtml(match.drill.explanation)}</p>`
      );
      renderProgressSummary();
      renderChallenge();
      renderTabs();
      return;
    }

    if (target.dataset.challengeBlank) {
      const match = findDrill(target.dataset.challengeBlank);
      const unitId = target.dataset.unit || activeChallengeUnit().id;
      const input = document.querySelector(`[data-challenge-blank-input="${match.drill.id}"]`);
      const correct = evaluateBlank(match.drill, input.value);
      recordDrill(match.drill.id, correct);
      recordChallenge(unitId, match.drill.id, correct);
      showChallengeFeedback(
        match.drill.id,
        correct,
        `<strong>${correct ? "关键词对了" : "关键词还没对上"}</strong><p>${escapeHtml(match.drill.explanation)}</p>`
      );
      renderProgressSummary();
      renderChallenge();
      renderTabs();
      return;
    }

    if (target.dataset.challengeCorrection) {
      const match = findDrill(target.dataset.challengeCorrection);
      const unitId = target.dataset.unit || activeChallengeUnit().id;
      const input = document.querySelector(`[data-challenge-correction-input="${match.drill.id}"]`);
      const text = input.value.replace(/\s+/g, "");
      const correct = match.drill.keywords.every((keyword) => text.includes(keyword));
      recordDrill(match.drill.id, correct);
      recordChallenge(unitId, match.drill.id, correct);
      showChallengeFeedback(
        match.drill.id,
        correct,
        `<strong>${correct ? "改得有关键点" : "改正里还缺关键点"}</strong><p>${escapeHtml(match.drill.explanation)}</p>`
      );
      renderProgressSummary();
      renderChallenge();
      renderTabs();
      return;
    }

    if (target.dataset.submitWriting) {
      const task = selectedLesson().writingTasks.find((item) => item.id === target.dataset.submitWriting);
      const input = document.querySelector(`[data-writing-input="${task.id}"]`);
      const result = evaluateWriting(input.value, task);
      state.writingResults[task.id] = {
        ...result,
        submittedAt: new Date().toISOString()
      };
      saveState();
      const feedback = document.querySelector(`[data-writing-feedback="${task.id}"]`);
      feedback.hidden = false;
      feedback.classList.toggle("good", result.score >= 70);
      feedback.classList.toggle("bad", result.score < 60);
      feedback.innerHTML = renderWritingFeedback(task, result);
      return;
    }

    if (target.dataset.showSample) {
      const task = selectedLesson().writingTasks.find((item) => item.id === target.dataset.showSample);
      const saved = state.writingResults[task.id] || evaluateWriting("", task);
      const feedback = document.querySelector(`[data-writing-feedback="${task.id}"]`);
      feedback.hidden = false;
      feedback.innerHTML = renderWritingFeedback(task, saved, true);
      return;
    }

    if (target.dataset.installApp) {
      if (installPromptEvent) {
        installPromptEvent.prompt();
        installPromptEvent.userChoice.finally(() => {
          installPromptEvent = null;
          renderDashboard();
          renderTabs();
        });
      }
      return;
    }

    saveState();
    render();
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPromptEvent = event;
    renderDashboard();
    renderTabs();
  });

  window.addEventListener("appinstalled", () => {
    installPromptEvent = null;
    renderDashboard();
    renderTabs();
  });

  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  document.addEventListener("click", handleClick);
  render();
})();

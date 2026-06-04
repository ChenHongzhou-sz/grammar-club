(function () {
  var chapters = [
    ['Preface', '序：我学英语的经验', '导读'],
    ['Introduction', '前言', '导读'],
    ['Chapter01', '基本句型及补语', '初级句型'],
    ['Chapter02', '名词词组与冠词', '初级句型'],
    ['Chapter03', '动词时态', '初级句型'],
    ['Chapter04', '不定词短语', '初级句型'],
    ['Chapter05', '动名词', '初级句型'],
    ['Chapter06', '分词', '初级句型'],
    ['Chapter07', '形容词', '初级句型'],
    ['Chapter08', '副词', '初级句型'],
    ['Chapter09', '语气', '初级句型'],
    ['Chapter10', '介系词', '初级句型'],
    ['Chapter11', '主语动词一致性', '初级句型'],
    ['Chapter12', '名词从句', '中级句型'],
    ['Chapter13', '副词从句', '中级句型'],
    ['Chapter14', '关系从句', '中级句型'],
    ['Chapter15', '对等连接词与对等从句', '中级句型'],
    ['Chapter16', '从属从句简化的通则', '高级句型'],
    ['Chapter17', '形容词从句简化', '高级句型'],
    ['Chapter18', '名词从句简化', '高级句型'],
    ['Chapter19', '副词从句简化之一', '高级句型'],
    ['Chapter20', '副词从句简化之二', '高级句型'],
    ['Chapter21', '简化从句练习', '高级句型'],
    ['Chapter22', '倒装句', '高级句型']
  ].map(function (item, index) {
    return { id: item[0], title: item[1], group: item[2], index: index };
  });

  var state = {
    current: 'Chapter01',
    cache: {},
    searchIndex: []
  };
  var deployedAtRoot = !/\/docs\/app\/?$/.test(location.pathname);
  var paths = {
    content: deployedAtRoot ? './content/' : '../content/',
    assets: deployedAtRoot ? './assets/' : '../.vuepress/public/'
  };

  var els = {
    chapterList: document.getElementById('chapterList'),
    dashboard: document.getElementById('dashboard'),
    content: document.getElementById('content'),
    currentTitle: document.getElementById('currentTitle'),
    sectionLabel: document.getElementById('sectionLabel'),
    menuButton: document.getElementById('menuButton'),
    searchButton: document.getElementById('searchButton'),
    searchPanel: document.getElementById('searchPanel'),
    searchInput: document.getElementById('searchInput'),
    searchResults: document.getElementById('searchResults')
  };

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function hash(value) {
    var out = 0;
    value = String(value || '');
    for (var i = 0; i < value.length; i += 1) {
      out = (out << 5) - out + value.charCodeAt(i);
      out |= 0;
    }
    return Math.abs(out).toString(36);
  }

  function chapterNumber(id) {
    var match = id.match(/Chapter(\d+)/);
    return match ? match[1] : '';
  }

  function getChapter(id) {
    return chapters.find(function (chapter) {
      return chapter.id === id;
    });
  }

  function chapterOrDefault(id) {
    return getChapter(id) || chapters[2];
  }

  function getProgress() {
    return readJson('gcAppProgress', { read: {}, answers: {}, notes: {} });
  }

  function setProgress(progress) {
    writeJson('gcAppProgress', progress);
    renderDashboard();
    renderChapterList();
  }

  function parseChoiceArray(value) {
    if (!value) return [];
    try {
      return Function('"use strict";return (' + value + ');')();
    } catch (error) {
      return [];
    }
  }

  function getAttr(tag, name) {
    var match = tag.match(new RegExp('(?:^|\\s)' + name + '="([\\s\\S]*?)"'));
    return match ? match[1] : '';
  }

  function getChoices(tag) {
    var match = tag.match(/:c="([\s\S]*?)"/);
    return parseChoiceArray(match && match[1]);
  }

  function normalizeInline(value) {
    return String(value || '')
      .replace(/<Note([^>]*)>([\s\S]*?)<\/Note>/g, function (_, attrs, inner) {
        var note = getAttr(attrs, 'note');
        var className = attrs.indexOf('normal') > -1 ? 'note normal' : attrs.indexOf('ul') > -1 ? 'note underline' : 'note';
        return '<span class="' + className + '"><span>' + normalizeInline(inner) + '</span>' + (note ? '<b>' + escapeHtml(note) + '</b>' : '') + '</span>';
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, text, href) {
        return '<a href="' + escapeHtml(href.replace(/\.md$/, '')) + '">' + escapeHtml(text) + '</a>';
      });
  }

  function renderTest(openTag, body, chapterId) {
    var q = getAttr(openTag, 'q');
    var answer = getAttr(openTag, 'a');
    var choices = getChoices(openTag);
    var noAnswer = /\sn(?:\s|>)/.test(openTag);
    var id = hash(chapterId + q + answer + choices.join('|'));
    var progress = getProgress();
    var saved = progress.answers[id] || {};
    var match = answer.match(/\(([A-D])\)/);
    var correctAnswer = match ? match[1] : '';
    var choiceHtml = choices
      .map(function (choice, index) {
        var label = ['A', 'B', 'C', 'D'][index];
        var className = 'choice';
        if (saved.selected === label) className += ' selected';
        if (saved.selected && correctAnswer === label) className += ' correct';
        if (saved.selected === label && correctAnswer !== label) className += ' wrong';
        return '<button class="' + className + '" data-test="' + id + '" data-choice="' + label + '"><span>' + label + '</span><strong>' + normalizeInline(escapeHtml(choice)) + '</strong></button>';
      })
      .join('');
    var result = '';
    if (saved.selected && correctAnswer) {
      result = '<div class="result ' + (saved.correct ? 'good' : 'bad') + '">' + (saved.correct ? '答对了' : '再想一步，正确答案是 ' + correctAnswer) + '</div>';
    }
    var explanation = saved.open ? '<div class="explanation"><b>' + escapeHtml(answer) + '</b>' + normalizeInline(body) + '</div>' : '';
    var action = noAnswer ? '' : '<button class="answer-toggle" data-toggle="' + id + '">' + (saved.open ? '收起解析' : '查看解析') + '</button>';
    return '<section class="test-card" data-answer="' + escapeHtml(correctAnswer) + '" data-title="' + escapeHtml(chapterOrDefault(chapterId).title) + '" data-question="' + escapeHtml(q) + '" data-answer-raw="' + escapeHtml(answer) + '" id="test-' + id + '"><p class="question">' + normalizeInline(q) + '</p><div class="choices">' + choiceHtml + '</div>' + result + explanation + action + '</section>';
  }

  function renderBlocks(markdown, chapterId) {
    markdown = markdown.replace(/^---[\s\S]*?---\s*/, '');
    var tests = [];
    markdown = markdown.replace(/<Test([\s\S]*?)>([\s\S]*?)<\/Test>/g, function (full, attrs, body) {
      var token = '\n@@TEST_' + tests.length + '@@\n';
      tests.push(renderTest('<Test' + attrs + '>', body, chapterId));
      return token;
    });

    var lines = markdown.split(/\r?\n/);
    var html = [];
    var list = [];
    var table = [];

    function flushList() {
      if (!list.length) return;
      html.push('<ul>' + list.map(function (item) { return '<li>' + normalizeInline(item) + '</li>'; }).join('') + '</ul>');
      list = [];
    }

    function flushTable() {
      if (!table.length) return;
      html.push('<div class="table-wrap"><table>' + table.map(function (row) {
        var cells = row.split('|').filter(function (_, index, array) {
          return !(index === 0 || index === array.length - 1);
        });
        return '<tr>' + cells.map(function (cell) { return '<td>' + normalizeInline(cell.trim()) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</table></div>');
      table = [];
    }

    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) {
        flushList();
        flushTable();
        return;
      }
      if (trimmed === '<Card>') {
        flushList();
        flushTable();
        html.push('<div class="md-card">');
        return;
      }
      if (trimmed === '</Card>') {
        flushList();
        flushTable();
        html.push('</div>');
        return;
      }
      if (trimmed === '<Quote>') {
        flushList();
        flushTable();
        html.push('<blockquote>');
        return;
      }
      if (trimmed === '</Quote>') {
        flushList();
        flushTable();
        html.push('</blockquote>');
        return;
      }
      if (/^<Tense/.test(trimmed)) {
        flushList();
        flushTable();
        var src = paths.assets + getAttr(trimmed, 'img').replace(/^\//, '');
        html.push('<figure class="tense"><img src="' + escapeHtml(src) + '" alt="时态图示" loading="lazy"></figure>');
        return;
      }
      if (/^@@TEST_\d+@@$/.test(trimmed)) {
        flushList();
        flushTable();
        html.push(tests[Number(trimmed.match(/\d+/)[0])]);
        return;
      }
      if (/^\|/.test(trimmed)) {
        if (!/^\|?\s*:?-+:?\s*\|/.test(trimmed)) table.push(trimmed);
        return;
      }
      flushTable();
      var heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        flushList();
        html.push('<h' + heading[1].length + '>' + normalizeInline(heading[2]) + '</h' + heading[1].length + '>');
        return;
      }
      if (/^[-*]\s+/.test(trimmed)) {
        list.push(trimmed.replace(/^[-*]\s+/, ''));
        return;
      }
      html.push('<p>' + normalizeInline(trimmed) + '</p>');
    });
    flushList();
    flushTable();
    return html.join('\n');
  }

  function markRead(chapterId) {
    if (!/^Chapter/.test(chapterId)) return;
    var progress = getProgress();
    progress.read[chapterId] = Date.now();
    setProgress(progress);
  }

  function renderChapterList() {
    var progress = getProgress();
    var lastGroup = '';
    els.chapterList.innerHTML = chapters.map(function (chapter) {
      var group = chapter.group !== lastGroup ? '<p>' + chapter.group + '</p>' : '';
      lastGroup = chapter.group;
      var active = chapter.id === state.current ? ' active' : '';
      var done = progress.read[chapter.id] ? ' done' : '';
      var number = chapterNumber(chapter.id) || '•';
      return group + '<a class="' + active + done + '" href="#' + chapter.id + '"><span>' + number + '</span><strong>' + chapter.title + '</strong></a>';
    }).join('');
  }

  function renderDashboard() {
    var progress = getProgress();
    var readIds = Object.keys(progress.read).filter(function (id) { return /^Chapter/.test(id); });
    var answers = Object.keys(progress.answers).map(function (key) { return progress.answers[key]; }).filter(function (item) { return item.selected; });
    var correct = answers.filter(function (item) { return item.correct; }).length;
    var wrong = answers.filter(function (item) { return item.correct === false; }).length;
    var percent = Math.round((readIds.length / 22) * 100);
    var next = chapters.find(function (chapter) { return /^Chapter/.test(chapter.id) && !progress.read[chapter.id]; }) || chapters[chapters.length - 1];
    els.dashboard.innerHTML =
      '<div class="hero-card"><div><span>Grammar Club</span><h1>语法俱乐部</h1><p>理解语法，马上练习，用错题把薄弱点留下来。</p></div><div class="ring" style="--p:' + percent + '%"><strong>' + percent + '%</strong><small>章节</small></div></div>' +
      '<div class="stats"><div><strong>' + readIds.length + '</strong><span>已读章节</span></div><div><strong>' + answers.length + '</strong><span>已做题目</span></div><div><strong>' + (answers.length ? Math.round((correct / answers.length) * 100) : 0) + '%</strong><span>正确率</span></div><div><strong>' + wrong + '</strong><span>错题</span></div></div>' +
      '<div class="study-flow"><a class="primary" href="#' + next.id + '">继续学习</a><button id="wrongOnly" type="button">复习错题</button><button id="resetProgress" type="button">重置记录</button></div>' +
      '<div class="tips"><h2>学习建议</h2><ol><li>先读例句，再读规则。语法不是背公式，是看句子怎么组织意思。</li><li>每章至少做 8 到 12 题。做题时先判断句型，再看选项。</li><li>错题隔天重做。能解释为什么错，才算真正掌握。</li></ol></div>';
    document.getElementById('wrongOnly').onclick = renderWrongBook;
    document.getElementById('resetProgress').onclick = function () {
      if (confirm('确定清除本机学习记录吗？')) {
        localStorage.removeItem('gcAppProgress');
        renderDashboard();
        renderChapterList();
        loadChapter(state.current);
      }
    };
  }

  function renderWrongBook() {
    var progress = getProgress();
    var wrong = Object.keys(progress.answers)
      .map(function (key) { return progress.answers[key]; })
      .filter(function (item) { return item.correct === false; })
      .sort(function (a, b) { return b.updatedAt - a.updatedAt; });
    els.currentTitle.textContent = '错题本';
    els.sectionLabel.textContent = '复习';
    els.content.innerHTML = '<h1>错题本</h1>' + (wrong.length ? wrong.map(function (item) {
      return '<section class="wrong-card"><h3>' + escapeHtml(item.chapterTitle) + '</h3><p>' + normalizeInline(item.question) + '</p><p><b>你的答案：</b>' + escapeHtml(item.selected) + ' <b>正确答案：</b>' + escapeHtml(item.answer) + '</p><a href="#' + item.chapterId + '">回到章节</a></section>';
    }).join('') : '<p>暂时没有错题。做几道题后，这里会自动收集需要复习的内容。</p>');
    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function bindPractice() {
    els.content.querySelectorAll('[data-choice]').forEach(function (button) {
      button.addEventListener('click', function () {
        var id = button.getAttribute('data-test');
        var card = document.getElementById('test-' + id);
        var answer = card.getAttribute('data-answer');
        if (!answer) return;
        var selected = button.getAttribute('data-choice');
        var progress = getProgress();
        progress.answers[id] = {
          id: id,
          chapterId: state.current,
          chapterTitle: card.getAttribute('data-title'),
          question: card.getAttribute('data-question'),
          answer: answer,
          answerRaw: card.getAttribute('data-answer-raw'),
          selected: selected,
          correct: selected === answer,
          open: true,
          updatedAt: Date.now()
        };
        setProgress(progress);
        loadChapter(state.current, true);
      });
    });
    els.content.querySelectorAll('[data-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        var id = button.getAttribute('data-toggle');
        var progress = getProgress();
        progress.answers[id] = progress.answers[id] || { id: id, chapterId: state.current, updatedAt: Date.now() };
        progress.answers[id].open = !progress.answers[id].open;
        progress.answers[id].updatedAt = Date.now();
        setProgress(progress);
        loadChapter(state.current, true);
      });
    });
  }

  function loadChapter(id, keepScroll) {
    state.current = id;
    var chapter = chapterOrDefault(id);
    els.currentTitle.textContent = chapter.title;
    els.sectionLabel.textContent = chapter.group;
    renderChapterList();
    closeSidebar();
    var cached = state.cache[id];
    var promise = cached ? Promise.resolve(cached) : fetch(paths.content + id + '.md').then(function (response) {
      if (!response.ok) throw new Error('无法加载章节');
      return response.text();
    }).then(function (text) {
      state.cache[id] = text;
      return text;
    });
    promise.then(function (markdown) {
      els.content.innerHTML = renderBlocks(markdown, id);
      markRead(id);
      bindPractice();
      if (!keepScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function () {
      els.content.innerHTML = '<p>章节加载失败，请检查部署路径。</p>';
    });
  }

  function buildSearchIndex() {
    Promise.all(chapters.map(function (chapter) {
      return fetch(paths.content + chapter.id + '.md').then(function (response) {
        return response.ok ? response.text() : '';
      }).then(function (text) {
        return { id: chapter.id, title: chapter.title, text: text.replace(/<[^>]+>/g, ' ') };
      });
    })).then(function (items) {
      state.searchIndex = items;
    });
  }

  function renderSearch(query) {
    query = query.trim().toLowerCase();
    if (!query) {
      els.searchResults.innerHTML = '';
      return;
    }
    var results = state.searchIndex.filter(function (item) {
      return item.text.toLowerCase().indexOf(query) > -1 || item.title.toLowerCase().indexOf(query) > -1;
    }).slice(0, 12);
    els.searchResults.innerHTML = results.length ? results.map(function (item) {
      var index = item.text.toLowerCase().indexOf(query);
      var excerpt = index > -1 ? item.text.slice(Math.max(0, index - 36), index + 84) : item.title;
      return '<a href="#' + item.id + '"><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(excerpt) + '</span></a>';
    }).join('') : '<p>没有找到相关内容。</p>';
  }

  function closeSidebar() {
    document.body.classList.remove('sidebar-open');
  }

  function handleRoute() {
    var id = location.hash.replace('#', '') || 'Chapter01';
    if (id === 'wrong') {
      renderWrongBook();
      return;
    }
    if (!getChapter(id)) id = 'Chapter01';
    loadChapter(id);
  }

  els.menuButton.addEventListener('click', function () {
    document.body.classList.toggle('sidebar-open');
  });
  els.searchButton.addEventListener('click', function () {
    els.searchPanel.hidden = !els.searchPanel.hidden;
    if (!els.searchPanel.hidden) els.searchInput.focus();
  });
  els.searchInput.addEventListener('input', function () {
    renderSearch(els.searchInput.value);
  });
  window.addEventListener('hashchange', handleRoute);

  renderDashboard();
  renderChapterList();
  buildSearchIndex();
  handleRoute();
})();

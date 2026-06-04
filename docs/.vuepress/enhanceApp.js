var chapterPattern = /\/content\/Chapter(\d{2})\.html$/;

function markChapter(path) {
  if (typeof window === 'undefined') return;
  var match = path && path.match(chapterPattern);
  if (!match) return;

  var key = 'grammarClubReadChapters';
  var store = {};
  try {
    store = JSON.parse(window.localStorage.getItem(key) || '{}');
  } catch (error) {
    store = {};
  }

  store[match[1]] = {
    chapter: match[1],
    path: path,
    updatedAt: Date.now()
  };
  window.localStorage.setItem(key, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent('grammar-club-reading-updated'));
}

export default function ({ router }) {
  if (typeof window === 'undefined') return;

  router.afterEach(function (to) {
    window.requestAnimationFrame(function () {
      markChapter(to.path);
    });
  });
}

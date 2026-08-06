;
(function SITE_RUNTIME() {
    var root = document.documentElement;
    var cfg = window.__WIKI__ || { base: '' };

    /* 主题 */
    function applyTheme(t) {
      root.dataset.theme = t;
      var btn = document.getElementById('theme-btn');
      if (btn) btn.textContent = t === 'dark' ? '☾' : t === 'light' ? '☀' : '◐';
    }
    var savedTheme = 'auto';
    try { savedTheme = localStorage.getItem('wiki-theme') || 'auto'; } catch(e){}
    applyTheme(savedTheme);
    var tb = document.getElementById('theme-btn');
    if (tb) tb.addEventListener('click', function() {
      var next = root.dataset.theme === 'light' ? 'dark' : root.dataset.theme === 'dark' ? 'auto' : 'light';
      applyTheme(next);
      try { localStorage.setItem('wiki-theme', next); } catch(e){}
    });

    /* 树状目录折叠响应 */
    var collapsedMap = {};
    try { collapsedMap = JSON.parse(localStorage.getItem('wiki-collapsed') || '{}'); } catch(e){}

    document.querySelectorAll('.tree-item-wrap').forEach(function(wrap) {
      var id = wrap.dataset.id;
      var children = wrap.querySelector('.tree-children');
      var expander = wrap.querySelector('.expander');
      if (!children || !id) return;

      /* 如果本地有记录，则覆盖默认状态 */
      if (collapsedMap[id] !== undefined) {
        if (collapsedMap[id]) {
          children.classList.add('collapsed');
          if (expander) expander.textContent = '▶';
        } else {
          children.classList.remove('collapsed');
          if (expander) expander.textContent = '▼';
        }
      }

      if (expander) {
        expander.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var isCollapsed = children.classList.toggle('collapsed');
          expander.textContent = isCollapsed ? '▶' : '▼';
          collapsedMap[id] = isCollapsed;
          try { localStorage.setItem('wiki-collapsed', JSON.stringify(collapsedMap)); } catch(err){}
        });
      }
    });

    /* 侧栏联动父级高亮 */
    var activeRow = document.querySelector('.tree-row.active');
    if (activeRow) {
      var p = activeRow.parentElement;
      while (p) {
        if (p.classList.contains('tree-children')) {
          var parentRow = p.previousElementSibling;
          if (parentRow && parentRow.classList.contains('tree-row')) {
            parentRow.classList.add('active-parent');
          }
        }
        p = p.parentElement;
      }
    }

    /* 目录高亮 */
    var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
    if (tocLinks.length && 'IntersectionObserver' in window) {
      var map = {};
      tocLinks.forEach(function(a) { map[a.getAttribute('href').slice(1)] = a; });
      var heads = Object.keys(map).map(function(id) { return document.getElementById(id); }).filter(Boolean);
      var visible = [];
      var io = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
          var id = e.target.id, idx = visible.indexOf(id);
          if (e.isIntersecting && idx < 0) visible.push(id);
          if (!e.isIntersecting && idx >= 0) visible.splice(idx, 1);
        });
        var cur = visible.length ? heads.filter(function(h) { return visible.indexOf(h.id) >= 0; })[0] : null;
        tocLinks.forEach(function(a) { a.classList.remove('active'); });
        if (cur && map[cur.id]) map[cur.id].classList.add('active');
      }, { rootMargin: '-60px 0px -70% 0px' });
      heads.forEach(function(h) { io.observe(h); });
    }

    /* 搜索 */
    var sheet = document.getElementById('search-sheet');
    var input = document.getElementById('search-input');
    var results = document.getElementById('search-results');
    var index = null, items = [], sel = 0;

    function open() {
      if (!sheet) return;
      sheet.setAttribute('open', '');
      input.focus();
      if (!index) {
        fetch(cfg.base + 'assets/search.json')
          .then(function(r) { return r.json(); })
          .then(function(j) { index = j; run(input.value); });
      }
    }
    function close() { if(sheet) sheet.removeAttribute('open'); }
    function run(q) {
      q = (q || '').trim().toLowerCase();
      if (!q) { results.innerHTML = ''; return; }
      var hits = [];
      (index || []).forEach(function(p) {
        if (p.t.toLowerCase().indexOf(q) >= 0 || (p.c || '').toLowerCase().indexOf(q) >= 0) {
          hits.push(p);
        }
      });
      results.innerHTML = hits.map(function(h, i) {
        return '<a href="' + cfg.base + h.u + '" class="' + (i === 0 ? 'active' : '') + '">' +
          '<div class="t">' + h.t + '</div>' +
          '<div class="s">' + (h.c || '').slice(0, 100) + '...</div></a>';
      }).join('');
      items = Array.prototype.slice.call(results.querySelectorAll('a'));
      sel = 0;
    }

    var trigger = document.getElementById('search-trigger');
    if (trigger) trigger.addEventListener('click', open);
    if (input) {
      input.addEventListener('input', function() { run(input.value); });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); items[sel] && items[sel].classList.remove('active'); sel = (sel + 1) % items.length; items[sel].classList.add('active'); }
        if (e.key === 'ArrowUp') { e.preventDefault(); items[sel] && items[sel].classList.remove('active'); sel = (sel - 1 + items.length) % items.length; items[sel].classList.add('active'); }
        if (e.key === 'Enter' && items[sel]) { e.preventDefault(); items[sel].click(); }
        if (e.key === 'Escape') close();
      });
    }
    if (sheet) sheet.addEventListener('click', function(e) { if(e.target === sheet) close(); });
    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); open(); }
    });
  })();

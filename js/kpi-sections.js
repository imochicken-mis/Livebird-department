/* =====================================================
   KPI PAGES - section blocks (js/kpi-sections.js)
   Groups each section of a KPI page into its own tinted block:
   KPI Overview / Daily Analysis / Batch-wise (or Lorry-wise) / Monthly Comparison.
   Load it BEFORE the page's own kpiN-xxx.js file. Safe to load on a page
   that already has .kpi-panel blocks (it does nothing then).
   ===================================================== */
(function () {
    var card = document.querySelector(".analytics-card");
    if (!card || card.querySelector(".kpi-panel")) return;

    var strip = card.querySelector("#kpiCards");
    if (!strip) return;

    function panel() {
        var s = document.createElement("section");
        s.className = "kpi-panel";
        return s;
    }

    // block 1: Monthly Summary (title bar + the 3 cards)
    var first = panel();
    card.insertBefore(first, strip);
    var overviewBar = card.querySelector(".report-toolbar.kpi-batch-bar");   // KPI 2 already has its title bar built into the toolbar
    if (!overviewBar) {
        // other pages: build the same "KPI Overview" bar and move the month picker + Refresh button into it
        overviewBar = document.createElement("div");
        overviewBar.className = "report-toolbar kpi-batch-bar kpi-sec-top";
        overviewBar.innerHTML = '<span class="kpi-sec-title">KPI Overview</span>';
        var oldToolbar = card.querySelector(".report-toolbar");
        var filters = oldToolbar && oldToolbar.querySelector(".report-filters");
        if (filters) overviewBar.appendChild(filters);
        if (oldToolbar) oldToolbar.parentNode.removeChild(oldToolbar);
    }
    first.appendChild(overviewBar);
    first.appendChild(strip);

    // blocks 2..n: every title bar starts a new block and takes what follows it
    var current = null;
    Array.prototype.slice.call(card.children).forEach(function (el) {
        if (el === first) return;
        if (el.classList.contains("kpi-batch-bar")) {
            current = panel();
            card.insertBefore(current, el);
            current.appendChild(el);
        } else if (current) {
            current.appendChild(el);
        }
    });
})();
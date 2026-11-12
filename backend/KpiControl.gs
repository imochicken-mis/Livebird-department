/* =====================================================================
   KpiControl.gs  -  sheet "KPI_Control": one row per KPI
   ---------------------------------------------------------------------
   KPI | KPI Name | Month | Monthly KPI Value | Standard | Result | Active | Updated At

   * Monthly KPI Value is refreshed every morning (sendDailyKpiMail) and when the
     KPI dashboard is opened (at most once every REFRESH_MINUTES).
   * Active is "Active" / "Inactive": it follows the ON / OFF switch on the KPI cards
     of the dashboard. Refreshing never changes this column.

   Needs KpiDaily.gs in the same project (kpiSheet_, kpiComputeMonth_, KPI_DEFS, KPI_MAIL).
   Routes (Code.gs): getKpiControl, setKpiActive, updateKpiControl
   ===================================================================== */

var KPI_CONTROL = {
    SHEET: "KPI_Control",
    REFRESH_MINUTES: 5
};

var KPI_CONTROL_HEAD = ["KPI", "KPI Name", "Month", "Monthly KPI Value", "Standard", "Result", "Active", "Updated At"];

// the sheet with its 5 rows (KPI 1 .. KPI 5); text columns are plain text so "2026-11" and "0.11 %" stay as typed
function kpiControlSheet_() {
    var sh = kpiSheet_(KPI_CONTROL.SHEET, KPI_CONTROL_HEAD);
    sh.getRange(2, 2, 5, 5).setNumberFormat("@");   // B:F

    var last = sh.getLastRow();
    var have = {};
    if (last > 1) {
        sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { have[String(r[0]).trim()] = true; });
    }
    for (var n = 1; n <= 5; n++) {
        if (!have["KPI " + n]) sh.appendRow(["KPI " + n, KPI_DEFS[n].name, "", "", "", "", "Active", ""]);
    }
    return sh;
}

// row number of "KPI n"
function kpiControlRow_(sh, n) {
    var last = sh.getLastRow();
    var keys = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
        if (String(keys[i][0]).trim() === "KPI " + n) return i + 2;
    }
    return 0;
}

// ---- dashboard: the ON / OFF state of every KPI card ----
function getKpiControl() {
    var sh = kpiControlSheet_();
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 7).getValues();
    var items = [];
    rows.forEach(function (r) {
        var m = String(r[0]).trim().match(/^KPI (\d)$/);
        if (m) items.push({ kpi: Number(m[1]), active: String(r[6]).trim() !== "Inactive" });
    });
    return jsonResponse({ success: true, items: items });
}

// ---- dashboard: the switch of one KPI card was clicked ----
function setKpiActive(kpi, active) {
    var n = Number(kpi);
    if (!(n >= 1 && n <= 5)) return jsonResponse({ success: false, message: "Invalid KPI." });

    var on = active === true || String(active).toLowerCase() === "true";
    var sh = kpiControlSheet_();
    var row = kpiControlRow_(sh, n);
    if (!row) return jsonResponse({ success: false, message: "KPI row not found." });

    sh.getRange(row, 7).setValue(on ? "Active" : "Inactive");
    return jsonResponse({ success: true, kpi: n, active: on });
}

// ---- value refresh: dashboard open (throttled) / daily trigger (force) ----
function kpiControlUpdate_(force) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return { skipped: true };
    try {
        var sh = kpiControlSheet_();
        var rows = sh.getRange(2, 1, 5, 8).getValues();

        if (!force) {
            var limit = Date.now() - KPI_CONTROL.REFRESH_MINUTES * 60 * 1000;
            var fresh = rows.every(function (r) { return r[7] instanceof Date && r[7].getTime() > limit; });
            if (fresh) return { skipped: true };
        }

        var ym = Utilities.formatDate(new Date(), KPI_MAIL.TIMEZONE, "yyyy-MM");
        var out = kpiComputeMonth_(ym);
        var byKpi = {};
        out.rows.forEach(function (r) { byKpi[r.n] = r; });
        var now = new Date();

        for (var n = 1; n <= 5; n++) {
            var row = kpiControlRow_(sh, n);
            if (!row) continue;
            var r = byKpi[n];
            sh.getRange(row, 2, 1, 5).setValues([[
                KPI_DEFS[n].name,
                ym,
                r ? r.shown : "No data",
                r ? r.stdText : "",
                r ? (r.ok ? "Achieved" : "Not Achieved") : ""
            ]]);
            sh.getRange(row, 8).setValue(now);
        }
        return { skipped: false, month: ym };
    } finally {
        lock.releaseLock();
    }
}

function updateKpiControl() {
    var res = kpiControlUpdate_(false);
    return jsonResponse({ success: true, skipped: Boolean(res.skipped) });
}

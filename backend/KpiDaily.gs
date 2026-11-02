/* =====================================================================
   KpiDaily.gs  -  daily KPI sheet + "Not Achieved" mails to the HOD
   ---------------------------------------------------------------------
   1) every morning (~9:00)  : the value of KPI 1-5 for (today - lag) is written to the
                               sheet  KPI_Daily  and, if any KPI is Not
                               Achieved, ONE mail goes to the HOD. If the data of that day was
                               not entered yet, a "data not entered" reminder goes (not on Sundays);
                               when the data arrives later, the Not Achieved mail follows.
                               lag = REPORT_LAG_DAYS (3) for all KPIs: a KPI 3 bill's
                               2-day window is only decided on bill date + 3.
   2) 3rd of every month     : last month's status of KPI 1-5 is written to
                               KPI_Monthly and mailed to the HOD.
   Values come from the existing functions getKpi1Data ... getKpi5Data, so the
   mail always shows the same numbers as the dashboard.

   Setup: add this file to the project, set KPI_MAIL below, run
   installKpiTriggers() once, then backfillKpiDaily() once (KPI 3 changed).
   ===================================================================== */

var KPI_MAIL = {
    TO: "mihiranimo3@gmail.com",      // HOD email (several: "a@x.com,b@x.com")
    CC: "",                           // optional
    SPREADSHEET_ID: "",               // "" if this script is bound to the sheet
    TIMEZONE: "Asia/Colombo",
    DAILY_HOUR: 9,                    // trigger fires between 09:00 and 10:00
    MONTHLY_DAY: 3,                   // monthly mail: day 3 (the last day's bills are decided on X+3)
    REPORT_LAG_DAYS: 3,               // all KPIs: on day D the report is for D-3 (KPI 3 bills of day X are decided on X+3)
    KPI_LAG: {},                      // optional per-KPI lag, e.g. { 3: 4 }; empty = every KPI uses REPORT_LAG_DAYS
    CATCHUP_DAYS: 7,                  // a day reported as "data not entered" is re-checked for this many days
    NO_WORK_WEEKDAYS: [0],            // no "data not entered" reminder on these weekdays (0 = Sunday)
    NO_WORK_DATES: [],                // extra days off, e.g. ["2026-11-01"] (poya / holidays)
    DASHBOARD_URL: "",                // optional link shown in the mail
    SHEET_DAILY: "KPI_Daily",
    SHEET_MONTHLY: "KPI_Monthly",
    SHEET_LOG: "KPI_MailLog",
    SUBJECT_PREFIX: "[Live Bird KPI]"
};

/* ---------------------------------------------------------------------
   Existing data functions (change a name here if yours is different)
   --------------------------------------------------------------------- */
var KPI_CACHE_ = {};   // lives for one run only

function kpiFetch_(n) {
    if (!KPI_CACHE_[n]) KPI_CACHE_[n] = kpiFetchRaw_(n);
    return KPI_CACHE_[n];
}

function kpiFetchRaw_(n) {
    var req = { parameter: { action: "getKpi" + n + "Data" }, parameters: {} };
    var res;
    if (n === 1) res = getKpi1Data(req);
    else if (n === 2) res = getKpi2Data(req);
    else if (n === 3) res = getKpi3Data(req);
    else if (n === 4) res = getKpi4Data(req);
    else res = getKpi5Data(req);

    if (res && typeof res.getContent === "function") res = JSON.parse(res.getContent());
    if (typeof res === "string") res = JSON.parse(res);
    if (!res || res.success === false) {
        throw new Error("getKpi" + n + "Data failed: " + ((res && res.message) || "no data"));
    }
    return res;
}

/* ---------------------------------------------------------------------
   KPI standards and rules
     KPI 1  Mortality         Achieved when  <= 0.3 %
     KPI 2  Bird weight       Achieved when  1.8 - 2.4 kg   (both ends included)
     KPI 3  Sales & Collection Achieved when >= 95 %  (bills settled within 2 days / total bills)
     KPI 4  Receiving         Achieved when  1,200 - 2,000 birds/hr (both ends included)
     KPI 5  Turnaround        Achieved when  <= 60 min
   A standard sent by the server (standard / min / max / limit) wins over
   these defaults.
   --------------------------------------------------------------------- */
function kpiNum_(v) { return Number(v) || 0; }
function kpiRound_(v, d) { return Number(kpiNum_(v).toFixed(d)); }
function kpiFmt_(v, d) {
    return kpiNum_(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
function kpiMmss_(min) {
    var s = Math.round(min * 60);
    return Math.floor(s / 60) + "m " + ("0" + (s % 60)).slice(-2) + "s";
}

var KPI_DEFS = {
    1: {
        name: "Live Bird Mortality Rate",
        dayRaw: function (d) { return kpiNum_(d.kpi); },
        monRaw: function (m) { return kpiNum_(m.kpi); },
        std: function (r) { return { std: kpiNum_(r.standard) > 0 ? kpiNum_(r.standard) : 0.3 }; },
        ok: function (v, s) { return kpiRound_(v, 2) <= s.std; },
        show: function (v) { return kpiFmt_(v, 2) + " %"; },
        stdText: function (s) { return "≤ " + s.std + " %"; }
    },
    2: {
        name: "Average Bird Weight",
        dayRaw: function (d) { return kpiNum_(d.avg); },
        monRaw: function (m) { return kpiNum_(m.avg); },
        std: function (r) { return { min: kpiNum_(r.min) > 0 ? kpiNum_(r.min) : 1.8, max: kpiNum_(r.max) > 0 ? kpiNum_(r.max) : 2.4 }; },
        ok: function (v, s) { var a = kpiRound_(v, 2); return a >= s.min && a <= s.max; },
        show: function (v) { return kpiFmt_(v, 2) + " kg"; },
        stdText: function (s) { return s.min + " – " + s.max + " kg"; }
    },
    3: {
        name: "Sales & Collection",
        dayRaw: function (d) { return kpiNum_(d.kpi); },
        monRaw: function (m) { return kpiNum_(m.kpi); },
        std: function (r) { return { std: kpiNum_(r.standard) > 0 ? kpiNum_(r.standard) : 95 }; },
        ok: function (v, s) { return kpiRound_(v, 2) >= s.std; },
        show: function (v) { return kpiFmt_(v, 2) + " %"; },
        stdText: function (s) { return "≥ " + s.std + " %"; }
    },
    4: {
        name: "Bird Receiving Rate",
        dayRaw: function (d) { return kpiNum_(d.kpi); },
        monRaw: function (m) { return kpiNum_(m.kpi); },
        std: function (r) { return { min: kpiNum_(r.min) > 0 ? kpiNum_(r.min) : 1200, max: kpiNum_(r.max) > 0 ? kpiNum_(r.max) : 2000 }; },
        ok: function (v, s) { var a = kpiRound_(v, 0); return a >= s.min && a <= s.max; },
        show: function (v) { return kpiFmt_(v, 0) + " birds/hr"; },
        stdText: function (s) { return kpiFmt_(s.min, 0) + " – " + kpiFmt_(s.max, 0) + " birds/hr"; }
    },
    5: {
        name: "Truck Turnaround Time",
        // value is kept in minutes
        dayRaw: function (d) { return kpiNum_(d.avgSec) / 60; },
        monRaw: function (m) { return kpiNum_(m.avgSec) / 60; },
        std: function (r) { return { limit: kpiNum_(r.limit) > 0 ? kpiNum_(r.limit) : 60 }; },
        ok: function (v, s) { return Math.round(v * 60) <= s.limit * 60; },
        show: function (v) { return kpiMmss_(v); },
        stdText: function (s) { return "≤ " + s.limit + " min"; }
    }
};

/* ---------------------------------------------------------------------
   Compute
   --------------------------------------------------------------------- */
function kpiRow_(n, raw, res) {
    var def = KPI_DEFS[n];
    var s = def.std(res);
    return { n: n, name: def.name, value: raw, shown: def.show(raw), stdText: def.stdText(s), ok: def.ok(raw, s) };
}

// KPIs of one day ("yyyy-MM-dd"); kpis = list of KPI numbers (default 1-5)
function kpiComputeDay_(date, kpis) {
    var out = { rows: [], errors: [], failed: [] };
    (kpis || [1, 2, 3, 4, 5]).forEach(function (n) {
        try {
            var res = kpiFetch_(n);
            var d = (res.daily || []).filter(function (x) { return String(x.date).slice(0, 10) === date; })[0];
            if (!d) return;
            var row = kpiRow_(n, KPI_DEFS[n].dayRaw(d), res);
            // KPI 1 and 2: which batches caused the Not Achieved (only used in the mail)
            if (!row.ok && (n === 1 || n === 2)) row.batches = kpiBadBatches_(n, res, date);
            out.rows.push(row);
        } catch (e) {
            out.errors.push("KPI " + n + ": " + e.message);
            out.failed.push(n);
        }
    });
    return out;
}

// the Not Achieved batches of one day (worst first). KPI 1: mortality, KPI 2: avg weight
function kpiBadBatches_(n, res, date) {
    var s = KPI_DEFS[n].std(res);
    var bad = [];
    (res.batches || []).filter(function (b) { return String(b.date).slice(0, 10) === date; }).forEach(function (b) {
        if (n === 1) {
            var v = kpiNum_(b.kpi);
            if (!KPI_DEFS[1].ok(v, s)) bad.push({ batchNo: b.batchNo, birds: kpiNum_(b.birds), doa: kpiNum_(b.doa), value: v, sort: v });
        } else {
            var a = kpiNum_(b.avg);
            if (!KPI_DEFS[2].ok(a, s)) {
                var low = kpiRound_(a, 2) < s.min;
                bad.push({ batchNo: b.batchNo, birds: kpiNum_(b.nob), value: a, remark: low ? "Too light" : "Too heavy", sort: low ? s.min - a : a - s.max });
            }
        }
    });
    bad.sort(function (x, y) { return y.sort - x.sort; });
    return bad;
}

// all KPIs for one month ("yyyy-MM")
function kpiComputeMonth_(ym) {
    var out = { rows: [], errors: [] };
    for (var n = 1; n <= 5; n++) {
        try {
            var res = kpiFetch_(n);
            var m = (res.monthly || []).filter(function (x) { return String(x.month) === ym; })[0];
            if (!m) continue;
            var row = kpiRow_(n, KPI_DEFS[n].monRaw(m), res);

            var s = KPI_DEFS[n].std(res);
            var days = (res.daily || []).filter(function (x) { return String(x.date).slice(0, 7) === ym; });
            row.days = days.length;
            row.badDays = days.filter(function (x) { return !KPI_DEFS[n].ok(KPI_DEFS[n].dayRaw(x), s); }).length;
            out.rows.push(row);
        } catch (e) {
            out.errors.push("KPI " + n + ": " + e.message);
        }
    }
    return out;
}

/* ---------------------------------------------------------------------
   Sheets
   --------------------------------------------------------------------- */
var KPI_DAILY_HEAD = ["Date", "KPI", "KPI Name", "Value", "Standard", "Status", "Computed At"];
var KPI_MONTHLY_HEAD = ["Month", "KPI", "KPI Name", "Value", "Standard", "Status", "Days (data)", "Days Not Achieved", "Computed At"];
var KPI_LOG_HEAD = ["Time", "Type", "Key", "Result", "Details"];

function kpiBook_() {
    return KPI_MAIL.SPREADSHEET_ID
        ? SpreadsheetApp.openById(KPI_MAIL.SPREADSHEET_ID)
        : SpreadsheetApp.getActiveSpreadsheet();
}

function kpiSheet_(name, headers) {
    var book = kpiBook_();
    var sh = book.getSheetByName(name);
    if (!sh) {
        sh = book.insertSheet(name);
        sh.appendRow(headers);
        sh.setFrozenRows(1);
        sh.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
    return sh;
}

// a cell that looks like a date may come back from the sheet as a Date object
function kpiNorm_(v) {
    if (v instanceof Date) return Utilities.formatDate(v, KPI_MAIL.TIMEZONE, "yyyy-MM-dd");
    return String(v);
}

// insert or update rows by key columns (date|kpi, month|kpi). keyLen: 10 = "yyyy-MM-dd", 7 = "yyyy-MM"
function kpiUpsert_(sheetName, headers, keyCols, rows, keyLen) {
    var sh = kpiSheet_(sheetName, headers);
    var last = sh.getLastRow();
    var data = last > 1 ? sh.getRange(2, 1, last - 1, headers.length).getValues() : [];
    var keyOf = function (r) {
        return keyCols.map(function (c, i) { var v = kpiNorm_(r[c]); return i === 0 ? v.slice(0, keyLen) : v; }).join("|");
    };
    var index = {};
    data.forEach(function (r, i) { index[keyOf(r)] = i + 2; });

    rows.forEach(function (row) {
        var key = keyOf(row);
        if (index[key]) sh.getRange(index[key], 1, 1, headers.length).setValues([row]);
        else { sh.appendRow(row); index[key] = sh.getLastRow(); }
    });
}

function kpiWriteDaily_(date, rows) {
    var now = new Date();
    kpiUpsert_(KPI_MAIL.SHEET_DAILY, KPI_DAILY_HEAD, [0, 1], rows.map(function (r) {
        return [date, "KPI " + r.n, r.name, r.shown, r.stdText, r.ok ? "Achieved" : "Not Achieved", now];
    }), 10);
}

function kpiWriteMonthly_(ym, rows) {
    var now = new Date();
    kpiUpsert_(KPI_MAIL.SHEET_MONTHLY, KPI_MONTHLY_HEAD, [0, 1], rows.map(function (r) {
        return [ym, "KPI " + r.n, r.name, r.shown, r.stdText, r.ok ? "Achieved" : "Not Achieved", r.days, r.badDays, now];
    }), 7);
}

function kpiLog_(type, key, result, details) {
    kpiSheet_(KPI_MAIL.SHEET_LOG, KPI_LOG_HEAD).appendRow([new Date(), type, key, result, details || ""]);
}

function kpiAlreadySent_(type, key) {
    var sh = kpiSheet_(KPI_MAIL.SHEET_LOG, KPI_LOG_HEAD);
    var last = sh.getLastRow();
    if (last < 2) return false;
    return sh.getRange(2, 1, last - 1, 4).getValues().some(function (r) {
        return r[1] === type && kpiNorm_(r[2]).slice(0, key.length) === key && r[3] === "SENT";   // "2026-09" may come back as a Date
    });
}

/* ---------------------------------------------------------------------
   Mail
   --------------------------------------------------------------------- */
function kpiTable_(headers, rows) {
    var th = headers.map(function (h) {
        return '<th style="padding:8px 12px;background:#0b2a66;color:#fff;text-align:left;font-size:13px;">' + h + "</th>";
    }).join("");
    var tr = rows.map(function (r) {
        return "<tr>" + r.map(function (c) {
            return '<td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;">' + c + "</td>";
        }).join("") + "</tr>";
    }).join("");
    return '<table style="border-collapse:collapse;width:100%;max-width:640px;"><thead><tr>' + th + "</tr></thead><tbody>" + tr + "</tbody></table>";
}

function kpiBadge_(ok) {
    return ok ? '<b style="color:#047857;">Achieved</b>' : '<b style="color:#b91c1c;">Not Achieved</b>';
}

function kpiWrap_(title, intro, inner, errors) {
    var stamp = Utilities.formatDate(new Date(), KPI_MAIL.TIMEZONE, "yyyy-MM-dd HH:mm");
    var link = KPI_MAIL.DASHBOARD_URL
        ? '<p style="margin:16px 0 0;"><a href="' + KPI_MAIL.DASHBOARD_URL + '" style="color:#0b2a66;">Open the KPI dashboard</a></p>' : "";
    var err = errors && errors.length
        ? '<p style="margin:14px 0 0;color:#b45309;font-size:12px;">Could not be computed: ' + errors.join("; ") + "</p>" : "";

    return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#0f172a;max-width:680px;">' +
        '<p style="margin:0 0 4px;color:#64748b;font-size:12px;">Imo Chicken &amp; Agro (Pvt) Ltd. - Live Bird Department</p>' +
        '<h2 style="color:#0b2a66;margin:0 0 14px;font-size:18px;">' + title + "</h2>" +
        '<p style="margin:0 0 14px;">Dear All,</p>' +
        '<p style="margin:0 0 16px;">' + intro + "</p>" +
        inner + err + link +
        '<p style="margin:22px 0 0;">Regards,<br><br>' +
        "Manager,<br>Live Bird Department,<br>Imo Chicken &amp; Agro (Pvt) Ltd.</p>" +
        '<hr style="border:0;border-top:1px solid #e2e8f0;margin:22px 0 10px;">' +
        '<p style="margin:0;color:#94a3b8;font-size:11px;">This is an automated message from the Live Bird KPI system, please do not reply. ' +
        "Generated on " + stamp + " (" + KPI_MAIL.TIMEZONE + ").</p>" +
        "</div>";
}

function kpiSend_(subject, html) {
    if (!KPI_MAIL.TO || String(KPI_MAIL.TO).indexOf("@") < 0) {
        throw new Error("KPI_MAIL.TO is not a valid email: '" + KPI_MAIL.TO + "'");
    }
    var opts = {
        to: KPI_MAIL.TO,
        subject: subject,
        body: "Please open this mail in an HTML-capable mail app.",   // plain-text fallback
        htmlBody: html,
        name: "Live Bird KPI"
    };
    if (KPI_MAIL.CC) opts.cc = KPI_MAIL.CC;
    MailApp.sendEmail(opts);
}

var KPI_MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

function kpiMonthName_(ym) {
    var p = String(ym).split("-");
    return KPI_MONTH_NAMES[Number(p[1]) - 1] + " " + p[0];
}

function kpiDailyIntro_(date) {
    return "The following KPI(s) of the Live Bird Department were " +
        '<b style="color:#b91c1c;">not achieved</b> on ' + date + ". " +
        "Kindly pay your attention to these KPIs.";
}

function kpiMonthlyIntro_(ym, rows) {
    var name = kpiMonthName_(ym);
    var bad = rows.filter(function (r) { return !r.ok; }).length;
    if (!bad) {
        return "Please find below the KPI status of the Live Bird Department for " + name + ". " +
            "I am pleased to inform you that <b>all KPIs were achieved</b> last month. " +
            "Excellent work, well done to the whole team! Let us keep it up.";
    }
    return "Please find below the KPI status of the Live Bird Department for " + name + ". " +
        "Well done on the KPIs that were achieved. However, the KPI(s) marked " +
        '<b style="color:#b91c1c;">Not Achieved</b> did not meet the standard, ' +
        "and I kindly request your attention to improve them.";
}

function kpiEsc_(t) {
    return String(t === undefined || t === null || t === "" ? "-" : t).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
}

// small table under the main one: the Not Achieved batches of KPI 1 / KPI 2
function kpiBatchSection_(r) {
    if (!r.batches || !r.batches.length) return "";
    var head, rows;
    if (r.n === 1) {
        head = ["Batch No", "Total Birds", "DOA", "Mortality"];
        rows = r.batches.map(function (b) {
            return [kpiEsc_(b.batchNo), kpiFmt_(b.birds, 0), kpiFmt_(b.doa, 0),
                '<b style="color:#b91c1c;">' + kpiFmt_(b.value, 2) + " %</b>"];
        });
    } else {
        head = ["Batch No", "Total Birds", "Avg Weight", "Remark"];
        rows = r.batches.map(function (b) {
            return [kpiEsc_(b.batchNo), kpiFmt_(b.birds, 0),
                '<b style="color:#b91c1c;">' + kpiFmt_(b.value, 2) + " kg</b>", b.remark];
        });
    }
    return '<p style="margin:22px 0 8px;font-weight:bold;color:#0b2a66;">KPI ' + r.n +
        " - Not Achieved batches (" + r.batches.length + ")</p>" + kpiTable_(head, rows);
}

function kpiDailyMail_(date, rows, errors) {
    var bad = rows.filter(function (r) { return !r.ok; });
    var subject = KPI_MAIL.SUBJECT_PREFIX + " Not Achieved - " + date + " (" + bad.length + " KPI" + (bad.length > 1 ? "s" : "") + ")";
    var table = kpiTable_(["KPI", "Value", "Standard"], bad.map(function (r) {
        return ["<b>KPI " + r.n + "</b> - " + r.name, '<b style="color:#b91c1c;">' + r.shown + "</b>", r.stdText];
    }));
    var html = kpiWrap_(
        "KPIs not achieved on " + date,
        kpiDailyIntro_(date),
        table + bad.map(kpiBatchSection_).join(""),
        errors
    );
    return { subject: subject, html: html };
}

function kpiMonthlyMail_(ym, rows, errors) {
    var bad = rows.filter(function (r) { return !r.ok; }).length;
    var subject = KPI_MAIL.SUBJECT_PREFIX + " Monthly status - " + ym + " (" + bad + " Not Achieved)";
    var html = kpiWrap_(
        "KPI status - " + kpiMonthName_(ym),
        kpiMonthlyIntro_(ym, rows),
        kpiTable_(["KPI", "Month value", "Standard", "Status", "Not Achieved days"], rows.map(function (r) {
            return ["<b>KPI " + r.n + "</b> - " + r.name, r.shown, r.stdText, kpiBadge_(r.ok), r.badDays + " of " + r.days];
        })),
        errors
    );
    return { subject: subject, html: html };
}

/* ---------------------------------------------------------------------
   Dates
   --------------------------------------------------------------------- */
function kpiLag_(n) {
    return KPI_MAIL.KPI_LAG && KPI_MAIL.KPI_LAG[n] ? KPI_MAIL.KPI_LAG[n] : KPI_MAIL.REPORT_LAG_DAYS;
}

function kpiReportDate_(lag) {
    var t = new Date();
    t.setDate(t.getDate() - (lag === undefined ? KPI_MAIL.REPORT_LAG_DAYS : lag));
    return Utilities.formatDate(t, KPI_MAIL.TIMEZONE, "yyyy-MM-dd");
}

// KPIs that share the same lag are processed together: [{lag: 2, kpis: [1,2,4,5]}, {lag: 3, kpis: [3]}]
function kpiLagGroups_() {
    var by = {};
    for (var n = 1; n <= 5; n++) (by[kpiLag_(n)] = by[kpiLag_(n)] || []).push(n);
    return Object.keys(by).map(function (l) { return { lag: Number(l), kpis: by[l] }; });
}

function kpiLastMonth_() {
    var t = new Date();
    t.setDate(1);
    t.setMonth(t.getMonth() - 1);
    return Utilities.formatDate(t, KPI_MAIL.TIMEZONE, "yyyy-MM");
}

/* =====================================================================
   TRIGGER FUNCTIONS
   ===================================================================== */

// every morning: the running month's row in KPI_Monthly is replaced with the latest month-to-date value.
function kpiUpdateMonthToDate_() {
    try {
        var ym = kpiReportDate_().slice(0, 7);
        var out = kpiComputeMonth_(ym);
        if (out.rows.length) kpiWriteMonthly_(ym, out.rows);
    } catch (e) {
        kpiLog_("MONTH-TO-DATE", "", "ERROR", e.message);
    }
}

/* ---------------------------------------------------------------------
   Working days / date helpers
   --------------------------------------------------------------------- */
function kpiParts_(date) {
    var p = String(date).slice(0, 10).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0);   // noon: safe from time zone shifts
}

function kpiAddDays_(date, n) {
    var d = kpiParts_(date);
    d.setDate(d.getDate() + n);
    return Utilities.formatDate(d, KPI_MAIL.TIMEZONE, "yyyy-MM-dd");
}

function kpiIsNoWork_(date) {
    return KPI_MAIL.NO_WORK_WEEKDAYS.indexOf(kpiParts_(date).getDay()) >= 0 ||
        KPI_MAIL.NO_WORK_DATES.indexOf(date) >= 0;
}

// reminder key: the day + the KPI group, so KPI 3 (other lag) never clashes with KPI 1,2,4,5
function kpiReminderKey_(date, kpis) {
    return date + "|" + kpis.join("");
}

// days that got a "data not entered" reminder in the last CATCHUP_DAYS days (the data may have been entered since)
function kpiPendingDates_(reportDate, kpis) {
    var sh = kpiSheet_(KPI_MAIL.SHEET_LOG, KPI_LOG_HEAD);
    var last = sh.getLastRow();
    if (last < 2) return [];
    var from = kpiAddDays_(reportDate, -KPI_MAIL.CATCHUP_DAYS);
    var group = kpis.join("");
    var seen = {}, list = [];
    sh.getRange(2, 1, last - 1, 4).getValues().forEach(function (r) {
        var key = kpiNorm_(r[2]);
        var date = key.slice(0, 10);
        if (r[1] === "REMINDER" && r[3] === "SENT" && key.slice(11) === group && date >= from && date < reportDate && !seen[date]) {
            seen[date] = true;
            list.push(date);
        }
    });
    return list.sort();
}

/* ---------------------------------------------------------------------
   "Data not entered" mail
   --------------------------------------------------------------------- */
function kpiMissingMail_(date, missing, allMissing) {
    var subject = KPI_MAIL.SUBJECT_PREFIX + " Data check - " + date;
    var amber = function (t) { return '<b style="color:#b45309;">' + t + "</b>"; };
    var intro = allMissing
        ? "No KPI data was found for " + date + ". Either the data has " + amber("not been entered") +
          ", or there was " + amber("no data") + " for this day. Kindly check this."
        : "KPI data was not found for the following KPI(s) on " + date + ". Either the data has " + amber("not been entered") +
          ", or there was " + amber("no data") + " for them on this day. Kindly check this.";
    intro += " If there was no data for this day, please ignore this mail. " +
        "If the data has not been entered, kindly enter it and the KPIs will be checked automatically.";

    var table = kpiTable_(["KPI", "Status"], missing.map(function (n) {
        return ["<b>KPI " + n + "</b> - " + KPI_DEFS[n].name, '<b style="color:#b45309;">No data found</b>'];
    }));
    return { subject: subject, html: kpiWrap_("KPI data check for " + date, intro, table, []) };
}

/* ---------------------------------------------------------------------
   One day:  write the sheet, mail the Not Achieved KPIs that were not mailed yet,
   and (only for the report date) remind that data is missing.
   kpis = the KPI numbers of this lag group
   --------------------------------------------------------------------- */
function kpiProcessDate_(date, allowReminder, kpis) {
    var out = kpiComputeDay_(date, kpis);
    var res = { alerts: 0, badTotal: out.rows.filter(function (r) { return !r.ok; }).length, reminder: false, missing: [], noData: out.rows.length === 0, offDay: false, errors: out.errors };

    if (out.rows.length) kpiWriteDaily_(date, out.rows);

    // 1) Not Achieved KPIs not mailed yet (a late-entered KPI is mailed on its own, once)
    var bad = out.rows.filter(function (r) {
        return !r.ok && !kpiAlreadySent_("ALERT", date + "|KPI" + r.n);
    });
    if (bad.length) {
        var mail = kpiDailyMail_(date, bad, out.errors);
        kpiSend_(mail.subject, mail.html);
        bad.forEach(function (r) { kpiLog_("ALERT", date + "|KPI" + r.n, "SENT", r.shown); });
        res.alerts = bad.length;
    }

    // 2) data not entered
    if (allowReminder) {
        if (!out.rows.length && kpiIsNoWork_(date)) { res.offDay = true; return res; }

        var have = {};
        out.rows.forEach(function (r) { have[r.n] = true; });
        var missing = kpis.filter(function (n) { return !have[n] && out.failed.indexOf(n) < 0; });
        res.missing = missing;

        var rkey = kpiReminderKey_(date, kpis);
        if (missing.length && !kpiAlreadySent_("REMINDER", rkey)) {
            var m = kpiMissingMail_(date, missing, out.rows.length === 0);
            kpiSend_(m.subject, m.html);
            kpiLog_("REMINDER", rkey, "SENT", "KPI " + missing.join(", "));
            res.reminder = true;
        }
    }
    return res;
}

// every morning: one pass per lag group (KPI 1,2,4,5 -> 2 days ago, KPI 3 -> 3 days ago)
function sendDailyKpiMail() {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return;
    try {
        kpiUpdateMonthToDate_();

        kpiLagGroups_().forEach(function (g) {
            var date = kpiReportDate_(g.lag);
            var main = kpiProcessDate_(date, true, g.kpis);

            // earlier days that were reminded: the data may have been entered since
            var late = 0;
            kpiPendingDates_(date, g.kpis).forEach(function (d) { late += kpiProcessDate_(d, false, g.kpis).alerts; });

            var result = main.offDay ? "NO WORK DAY"
                : main.noData ? "NO DATA"
                : main.alerts ? "ALERT SENT"
                : main.badTotal ? "ALREADY MAILED"
                : "ALL ACHIEVED";
            var details = ["KPI " + g.kpis.join(",")];
            if (main.alerts) details.push(main.alerts + " Not Achieved KPI(s) mailed");
            if (main.reminder) details.push("data-not-entered reminder: KPI " + main.missing.join(", "));
            if (late) details.push(late + " late KPI alert(s) for earlier days");
            if (main.errors.length) details.push(main.errors.join("; "));
            kpiLog_("RUN", date, result, details.join(" | "));
        });
    } catch (e) {
        kpiLog_("RUN", "", "ERROR", e.message);
        throw e;
    } finally {
        lock.releaseLock();
    }
}

// 3rd of every month: last month's status -> sheet + mail
function sendMonthlyKpiMail() {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(30000)) return;
    try {
        var ym = kpiLastMonth_();
        var out = kpiComputeMonth_(ym);

        if (!out.rows.length) { kpiLog_("MONTHLY", ym, "NO DATA", out.errors.join("; ")); return; }

        kpiWriteMonthly_(ym, out.rows);
        if (kpiAlreadySent_("MONTHLY", ym)) return;

        var mail = kpiMonthlyMail_(ym, out.rows, out.errors);
        kpiSend_(mail.subject, mail.html);
        kpiLog_("MONTHLY", ym, "SENT", "");
    } catch (e) {
        kpiLog_("MONTHLY", "", "ERROR", e.message);
        throw e;
    } finally {
        lock.releaseLock();
    }
}

/* =====================================================================
   SETUP / TOOLS (run from the editor)
   ===================================================================== */

// run ONCE: creates the two triggers (replaces old ones)
function installKpiTriggers() {
    ScriptApp.getProjectTriggers().forEach(function (t) {
        var f = t.getHandlerFunction();
        if (f === "sendDailyKpiMail" || f === "sendMonthlyKpiMail") ScriptApp.deleteTrigger(t);
    });

    ScriptApp.newTrigger("sendDailyKpiMail")
        .timeBased().everyDays(1).atHour(KPI_MAIL.DAILY_HOUR).inTimezone(KPI_MAIL.TIMEZONE).create();

    ScriptApp.newTrigger("sendMonthlyKpiMail")
        .timeBased().onMonthDay(KPI_MAIL.MONTHLY_DAY).atHour(KPI_MAIL.DAILY_HOUR).inTimezone(KPI_MAIL.TIMEZONE).create();
}

// optional, run once: fills KPI_Daily with ALL days that exist in the data
// (also overwrites the old KPI 3 "Liveability" rows with the new Sales & Collection values)
function backfillKpiDaily() {
    var byDate = {};
    for (var n = 1; n <= 5; n++) {
        var res;
        try { res = kpiFetch_(n); } catch (e) { continue; }
        (res.daily || []).forEach(function (x) {
            var date = String(x.date).slice(0, 10);
            (byDate[date] = byDate[date] || []).push(kpiRow_(n, KPI_DEFS[n].dayRaw(x), res));
        });
    }
    Object.keys(byDate).sort().forEach(function (date) { kpiWriteDaily_(date, byDate[date]); });
}

// if raw data of one day was edited later:  recomputeKpiForDate("2026-10-14")
function recomputeKpiForDate(date) {
    var out = kpiComputeDay_(date);
    if (out.rows.length) kpiWriteDaily_(date, out.rows);
    return out.rows.length + " KPI rows updated for " + date;
}

// TEST (no mail, no sheet): shows what the daily run would compute today. Run it and read View > Logs.
function testKpiDryRun() {
    kpiLagGroups_().forEach(function (g) {
        var date = kpiReportDate_(g.lag);
        var out = kpiComputeDay_(date, g.kpis);
        Logger.log("KPI " + g.kpis.join(",") + " | date " + date + " | lag " + g.lag);
        out.rows.forEach(function (r) {
            Logger.log("  KPI " + r.n + " " + r.name + ": " + r.shown + " (" + r.stdText + ") -> " + (r.ok ? "Achieved" : "NOT ACHIEVED") +
                (r.bills ? " | bills total " + r.bills.total + ", on time " + r.bills.settled + ", late/unpaid " + r.bills.late : ""));
        });
        if (!out.rows.length) Logger.log("  no data for this day");
        out.errors.forEach(function (e) { Logger.log("  ERROR " + e); });
    });
}

// TEST: sends ONE sample mail of the KPI 3 "Not Achieved" layout for the given day (does not touch the log/sheets)
// e.g. testKpi3Mail("2026-10-20")
function testKpi3Mail(date) {
    var out = kpiComputeDay_(date, [3]);
    if (!out.rows.length) { Logger.log("KPI 3 has no data for " + date); return; }
    var mail = kpiDailyMail_(date, out.rows, out.errors);
    kpiSend_("[TEST] " + mail.subject, mail.html);
    Logger.log("Test mail sent for " + date);
}

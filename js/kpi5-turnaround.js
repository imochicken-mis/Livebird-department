document.addEventListener("DOMContentLoaded", () => {

    // Standard in minutes (lower is better). Overwritten by the server values
    // (KPI5_GOOD_MIN / KPI5_LIMIT_MIN in Apps Script).
    let GOOD = 45;    // <= GOOD  -> Achieved
    let LIMIT = 60;   // <= LIMIT -> Acceptable, above -> Not Achieved

    const $ = id => document.getElementById(id);

    // ---------------- SESSION (user4 only) ----------------
    const sessionUser = sessionStorage.getItem("livebirdUser");
    if (!sessionUser) { window.location.href = "../index.html"; return; }
    const user = JSON.parse(sessionUser);
    if (!user.username || user.username.toLowerCase() !== "user4") {
        sessionStorage.removeItem("livebirdUser");
        window.location.href = "../index.html";
        return;
    }
    $("loggedUser").innerHTML = 'Logged in as: <b></b>';
    $("loggedUser").querySelector("b").textContent = user.name || user.username;
    $("logoutBtn").addEventListener("click", () => {
        sessionStorage.removeItem("livebirdUser");
        window.location.href = "../index.html";
    });

    // ---------------- STATE ----------------
    let monthlyData = [];
    let dailyData = [];
    let lorryData = [];
    let chart = null;
    let yearChart = null;

    // ---------------- HELPERS ----------------
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const num = v => Number(v) || 0;
    const fmt = (v, d = 0) =>
        num(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    const pad2 = n => String(n).padStart(2, "0");

    // seconds -> "40m 38s"   (trim = true drops a zero seconds part: "39m")
    function fmtMS(sec, trim) {
        let s = Math.round(num(sec));
        const m = Math.floor(s / 60);
        s = s - m * 60;
        if (trim && s === 0) return m + "m";
        return m + "m " + pad2(s) + "s";
    }

    // seconds -> "5h 25m" (or "39m" when under one hour)
    function fmtHM(sec) {
        const total = Math.round(num(sec) / 60);
        const h = Math.floor(total / 60);
        const m = total % 60;
        return h > 0 ? h + "h " + pad2(m) + "m" : m + "m";
    }

    // lower is better:  ok = Achieved, warn = Acceptable, bad = Not Achieved
    const status = sec => {
        const s = Math.round(num(sec));
        return s <= LIMIT * 60 ? "ok" : "bad";
    };
    const STATUS_TEXT = { ok: "Achieved", bad: "Not Achieved" };

    const monthLabel = ym => {
        const p = String(ym || "").split("-");
        return p.length === 2 && MONTH_NAMES[Number(p[1]) - 1]
            ? MONTH_NAMES[Number(p[1]) - 1] + " " + p[0] : "";
    };

    function showMessage(text, type) {
        const m = $("reportMessage");
        m.textContent = text;
        m.className = "save-message " + (type || "");
    }

    // ---------------- LOAD ----------------
    async function loadData() {
        $("reportLoading").classList.remove("hidden");
        showMessage("", "");

        try {
            const result = await sendRequest({ action: "getKpi5Data" });

            if (!result.success) {
                monthlyData = []; dailyData = []; lorryData = [];
                showMessage(result.message || "Unable to load KPI 5.", "error");
            } else {
                if (num(result.good) > 0) GOOD = num(result.good);
                if (num(result.limit) > 0) LIMIT = num(result.limit);
                monthlyData = result.monthly || [];
                dailyData = result.daily || [];
                lorryData = result.lorries || [];

                // First load: jump to the latest month that has data
                if (!$("kpiMonth").value) {
                    const months = monthlyData.map(r => r.month).sort();
                    $("kpiMonth").value = months[months.length - 1] || "";
                }
            }

            render();

        } catch (e) {
            console.error(e);
            showMessage("Unable to connect to the server.", "error");
        } finally {
            $("reportLoading").classList.add("hidden");
        }
    }

    // ---------------- RENDER ----------------
    function render() {
        const ym = $("kpiMonth").value;
        const m = monthlyData.find(r => r.month === ym);
        const days = dailyData
            .filter(r => r.date.slice(0, 7) === ym)
            .sort((a, b) => a.date.localeCompare(b.date));

        $("stdLabel").textContent = "≤ " + LIMIT + " min";

        if (m) {
            const st = status(m.avgSec);
            $("sumRate").textContent = fmtMS(m.avgSec);
            $("boxRate").className = "kpi-tile " + st;
            $("rateStatus").textContent = STATUS_TEXT[st];
            $("sumGap").textContent = fmtHM(m.totalSec);
            $("sumTurns").textContent = fmt(m.turnarounds);
        } else {
            $("sumRate").textContent = "-";
            $("boxRate").className = "kpi-tile";
            $("rateStatus").textContent = ym ? "No data" : "Select a month";
            $("sumGap").textContent = "-";
            $("sumTurns").textContent = "-";
        }

        // days tile
        if (days.length) {
            const c = { ok: 0, warn: 0, bad: 0 };
            days.forEach(d => { c[status(d.avgSec)]++; });
            $("sumDays").textContent = fmt(days.length);
            $("sumDaysGood").textContent = fmt(c.ok);
            
            $("sumDaysOut").textContent = fmt(c.bad);
        } else {
            $("sumDays").textContent = "-";
            $("sumDaysGood").textContent = "-";
            
            $("sumDaysOut").textContent = "-";
        }

        renderChart(days, ym);
        renderTable(days, ym);
        renderLorrySection(ym, days);
        renderYearSection();
    }

    // ---------------- DAY-WISE TABLE ----------------
    function renderTable(days, ym) {
        const t = $("dayTable");
        $("tableTitle").textContent = "Daily Details" + (ym ? " - " + monthLabel(ym) : "");

        if (!ym) { t.innerHTML = ""; return; }

        const p = ym.split("-");
        const dayCount = new Date(Number(p[0]), Number(p[1]), 0).getDate();

        const byDay = {};
        days.forEach(d => { byDay[Number(d.date.slice(8))] = d; });

        const nums = Array.from({ length: dayCount }, (_, i) => i + 1);

        t.style.minWidth = (170 + dayCount * 84) + "px";

        const row = (label, cell) =>
            "<tr><th>" + label + "</th>" +
            nums.map(n => {
                const d = byDay[n];
                return d ? cell(d) : '<td class="empty">-</td>';
            }).join("") + "</tr>";

        t.innerHTML =
            "<thead><tr><th>Day</th>" + nums.map(n => {
                const wd = new Date(Number(p[0]), Number(p[1]) - 1, n).getDay();
                return '<th class="' + (wd === 0 ? "sun" : wd === 6 ? "sat" : "") + '">' + n + "</th>";
            }).join("") + "</tr></thead>" +
            "<tbody>" +
            row("Lorries", d => "<td>" + fmt(d.lorries) + "</td>") +
            
            row("Turnarounds", d => "<td>" + fmt(d.turnarounds) + "</td>") +
            row("Total Gap Time", d => "<td>" + fmtHM(d.totalSec) + "</td>") +
            row("KPI (avg gap)", d => '<td class="' + status(d.avgSec) + '">' + fmtMS(d.avgSec) + "</td>") +
            "</tbody>";
    }

    // ---------------- CHART HELPERS ----------------
    function emptyChart(c, text) {
        c.setOption({
            title: {
                text: text,
                left: "center", top: "middle",
                textStyle: { color: "#94a3b8", fontSize: 14, fontWeight: 600 }
            },
            xAxis: { show: false }, yAxis: { show: false }, series: []
        }, true);
    }

    // values are in MINUTES
    function lineOption(labels, values, axisName, tipFn, boundaryGap) {

        const top = Math.max(LIMIT, ...values);
        const max = Math.ceil((top * 1.15) / 10) * 10 || 10;

        const RING = { ok: "#047857", warn: "#d97706", bad: "#b91c1c" };

        const points = values.map(v => ({
            value: Number(v.toFixed(2)),
            itemStyle: { color: "#ffffff", borderColor: RING[status(v * 60)], borderWidth: 3 }
        }));

        const series = {
            type: "line",
            data: points,
            smooth: 0.4,
            symbol: "circle",
            symbolSize: 10,
            emphasis: { scale: 1.4 },
            lineStyle: {
                color: "#010853",
                width: 3,
                cap: "round",
                shadowColor: "rgba(1,8,83,.25)",
                shadowBlur: 8,
                shadowOffsetY: 4
            },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: "rgba(1,8,83,0.16)" },
                    { offset: 1, color: "rgba(1,8,83,0)" }
                ])
            },
            markArea: {
                silent: true,
                data: [
                    // below the standard = green
                    [{ yAxis: 0, itemStyle: { color: "rgba(4,120,87,0.10)" } }, { yAxis: LIMIT }],
                    // at / above the standard = red
                    [{ yAxis: LIMIT, itemStyle: { color: "rgba(185,28,28,0.08)" } }, { yAxis: max }]
                ]
            },
            markLine: {
                symbol: "none",
                silent: true,
                data: [
                    {
                        yAxis: LIMIT,
                        lineStyle: { color: "#b91c1c", type: "dashed", width: 2 },
                        label: { formatter: "Standard ≤ " + LIMIT + " min", position: "insideEndTop", color: "#b91c1c", fontWeight: 700 }
                    }
                ]
            }
        };

        return {
            animationDuration: 900,
            animationEasing: "cubicOut",
            grid: { left: 62, right: 40, top: 40, bottom: 46 },
            tooltip: {
                trigger: "axis",
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                borderWidth: 1,
                padding: [10, 14],
                textStyle: { color: "#0b2a66", fontSize: 12 },
                extraCssText: "box-shadow:0 8px 24px rgba(15,23,42,.15); border-radius:10px;",
                axisPointer: { type: "line", lineStyle: { color: "#94a3b8", type: "dashed" } },
                formatter: p => tipFn(p[0].dataIndex)
            },
            xAxis: {
                type: "category",
                data: labels,
                name: axisName,
                nameLocation: "middle",
                nameGap: 28,
                nameTextStyle: { color: "#64748b", fontWeight: 700 },
                boundaryGap: boundaryGap,
                axisLine: { lineStyle: { color: "#cbd5e1" } },
                axisTick: { show: false },
                axisLabel: { color: "#64748b", interval: 0 }
            },
            yAxis: {
                type: "value",
                min: 0,
                max: max,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
                axisLabel: { color: "#64748b", formatter: v => v + "m" }
            },
            series: [series]
        };
    }

    // ---------------- DAILY CHART ----------------
    function renderChart(days, ym) {
        const el = $("kpiChart");

        if (typeof echarts === "undefined") {
            el.innerHTML = '<p class="std-note">Chart library failed to load.</p>';
            return;
        }

        if (!chart) chart = echarts.init(el);
        $("chartTitle").textContent = "Daily Truck Turnaround Time" + (ym ? " - " + monthLabel(ym) : "");

        if (!days.length) { emptyChart(chart, "No daily data for this month"); return; }

        chart.setOption(lineOption(
            days.map(d => d.date.slice(8)),
            days.map(d => num(d.avgSec) / 60),
            "Day",
            i => {
                const d = days[i];
                return `<b>${d.date}</b><br>Avg turnaround: ${fmtMS(d.avgSec)}` +
                    `<br>Total gap time: ${fmtHM(d.totalSec)}` +
                    `<br>Turnarounds: ${fmt(d.turnarounds)}` +
                    `<br>Lorries: ${fmt(d.lorries)} · Trips: ${fmt(d.trips)}`;
            },
            false
        ), true);
    }

    // ---------------- LORRY-WISE (one selected day) ----------------
    function renderLorrySection(ym, days) {
        const inp = $("lorryDate");

        if (!ym) {
            inp.value = "";
            inp.min = "";
            inp.max = "";
            renderLorryTable();
            return;
        }

        // calendar limited to the selected month
        const p = ym.split("-");
        const lastDay = new Date(Number(p[0]), Number(p[1]), 0).getDate();
        inp.min = ym + "-01";
        inp.max = ym + "-" + pad2(lastDay);

        const keep = inp.value;

        if (keep && keep.slice(0, 7) === ym) {
            inp.value = keep;
        } else {
            // default: the latest day that has a KPI, otherwise the latest day with data
            const dates = [...new Set(
                lorryData.filter(l => l.date.slice(0, 7) === ym).map(l => l.date)
            )].sort();
            const kpiDates = days.map(d => d.date);

            inp.value = kpiDates.length
                ? kpiDates[kpiDates.length - 1]
                : (dates[dates.length - 1] || ym + "-01");
        }

        renderLorryTable();
    }

    // previous dropdown version - no longer used
    function renderLorrySectionOld_(ym, days) {
        const sel = $("lorryDate");

        const dates = [...new Set(
            lorryData.filter(l => l.date.slice(0, 7) === ym).map(l => l.date)
        )].sort();

        const keep = sel.value;
        sel.innerHTML = dates.map(d => '<option value="' + d + '">' + d + "</option>").join("");

        if (dates.includes(keep)) {
            sel.value = keep;
        } else {
            // default: the latest day that has a KPI, otherwise the latest day
            const kpiDates = days.map(d => d.date);
            sel.value = kpiDates.length ? kpiDates[kpiDates.length - 1] : (dates[dates.length - 1] || "");
        }

        renderLorryTable();
    }

    function renderLorryTable() {
        const t = $("lorryTable");
        const date = $("lorryDate").value;

        $("lorryTitle").textContent = "Lorry-wise Turnaround" + (date ? " - " + date : "");

        // only lorries with 2+ trips (= at least one turnaround)
        const rows = lorryData
            .filter(l => l.date === date && num(l.trips) > 1)
            .sort((a, b) => a.vehicle.localeCompare(b.vehicle));

        if (!date || !rows.length) {
            t.innerHTML = "";
            $("lorryNote").textContent = date ? "No lorry with more than one trip on this day." : "";
            return;
        }

        const dash = '<td class="empty">-</td>';

        const ord = n =>
            n + ((n % 100 >= 11 && n % 100 <= 13) ? "th" : (["th", "st", "nd", "rd"][n % 10] || "th"));

        // small warning icon (hover = which turnaround has the bad data)
        const warnIcon = r => {
            const bad = [];
            (r.gapDetails || []).forEach((g, i) => {
                if (g.sec === null) {
                    bad.push(ord(i + 1) + " turnaround (" + g.from + " → " + g.to + ")");
                }
            });
            if (!bad.length) return "";
            const tip = "Data error: " + bad.join(", ") +
                " - Out time is before the previous In time. Not counted in Total Time / KPI.";
            return ' <span class="material-icons" title="' + tip + '" ' +
                'style="font-size:16px;vertical-align:middle;color:#d97706;cursor:help;">warning</span>';
        };

        const line = (label, cellFn) =>
            "<tr><th>" + label + "</th>" + rows.map(cellFn).join("") + "</tr>";

        let html = '<colgroup><col style="width:210px"></colgroup>' +
            "<thead><tr><th>Details</th>" +
            rows.map(r => "<th>" + r.vehicle + "</th>").join("") +
            "</tr></thead><tbody>";

        // all turnarounds the lorry made (a bad-data one still counts)
        html += line("Turnarounds", r => "<td>" + fmt((r.gapDetails || []).length) + "</td>");

        html += line("Total Time",
            r => "<td>" + (r.turnarounds ? "<b>" + fmtHM(r.totalSec) + "</b>" : "-") + warnIcon(r) + "</td>");

        html += line("KPI (avg gap)",
            r => r.turnarounds
                ? '<td class="' + status(r.avgSec) + '">' + fmtMS(r.avgSec) + "</td>"
                : dash);

        // fixed layout: every lorry column gets the same width, whatever the data
        t.style.tableLayout = "fixed";
        t.style.width = "100%";
        t.style.minWidth = (210 + rows.length * 150) + "px";
        t.innerHTML = html + "</tbody>";

        $("lorryNote").textContent =
            "Turnaround = a lorry's trip In → its next trip Out. Total Time and KPI use only the valid turnarounds. " +
            "A warning icon means a turnaround had bad data and was ignored. " +
            "Lorries with only one trip have no turnaround and are not shown.";
    }

    // previous layout - no longer used
    function renderLorryTableV3_() {
        const t = $("lorryTable");
        const date = $("lorryDate").value;

        $("lorryTitle").textContent = "Lorry-wise Turnaround" + (date ? " - " + date : "");

        // only lorries with 2+ trips (= at least one turnaround)
        const rows = lorryData
            .filter(l => l.date === date && num(l.trips) > 1)
            .sort((a, b) => a.vehicle.localeCompare(b.vehicle));

        if (!date || !rows.length) {
            t.innerHTML = "";
            $("lorryNote").textContent = date ? "No lorry with more than one trip on this day." : "";
            return;
        }

        const maxGaps = Math.max(0, ...rows.map(r => (r.gapDetails || []).length));
        const dash = '<td class="empty">-</td>';

        const ord = n =>
            n + ((n % 100 >= 11 && n % 100 <= 13) ? "th" : (["th", "st", "nd", "rd"][n % 10] || "th"));

        const line = (label, cellFn) =>
            "<tr><th>" + label + "</th>" + rows.map(cellFn).join("") + "</tr>";

        let html = '<colgroup><col style="width:210px"></colgroup>' +
            "<thead><tr><th>Details</th>" +
            rows.map(r => "<th>" + r.vehicle + "</th>").join("") +
            "</tr></thead><tbody>";

        html += line("Turnarounds", r => "<td>" + fmt((r.gapDetails || []).length) + "</td>");

        for (let k = 0; k < maxGaps; k++) {

            const d = r => (r.gapDetails || [])[k];

            html += line(ord(k + 1) + " Turnaround",
                r => !d(r) ? dash
                    : d(r).sec === null
                        ? '<td class="bad">Check data</td>'
                        : "<td>" + d(r).from + " → " + d(r).to +
                          "<br><b>" + fmtMS(d(r).sec, true) + "</b></td>");
        }

        html += line("Total Time",
            r => r.turnarounds ? "<td><b>" + fmtHM(r.totalSec) + "</b></td>" : dash);

        html += line("KPI (avg gap)",
            r => r.turnarounds
                ? '<td class="' + status(r.avgSec) + '">' + fmtMS(r.avgSec) + "</td>"
                : dash);

        // fixed layout: every lorry column gets the same width, whatever the data
        t.style.tableLayout = "fixed";
        t.style.width = "100%";
        t.style.minWidth = (210 + rows.length * 170) + "px";
        t.innerHTML = html + "</tbody>";

        $("lorryNote").textContent =
            "Turnaround = a lorry's trip In → its next trip Out (In = trip Out + Total Time; (+1) = after midnight). " +
            "Lorries with only one trip have no turnaround and are not shown.";
    }

    // previous layout - no longer used
    function renderLorryTableV2_() {
        const t = $("lorryTable");
        const date = $("lorryDate").value;

        $("lorryTitle").textContent = "Lorry-wise Turnaround" + (date ? " - " + date : "");

        // only lorries with 2+ trips (= at least one turnaround)
        const rows = lorryData
            .filter(l => l.date === date && num(l.trips) > 1)
            .sort((a, b) => a.vehicle.localeCompare(b.vehicle));

        if (!date || !rows.length) {
            t.innerHTML = "";
            $("lorryNote").textContent = date ? "No lorry with more than one trip on this day." : "";
            return;
        }

        const maxGaps = Math.max(0, ...rows.map(r => (r.gapDetails || []).length));
        const dash = '<td class="empty">-</td>';

        const line = (label, cellFn) =>
            "<tr><th>" + label + "</th>" + rows.map(cellFn).join("") + "</tr>";

        let html = "<thead><tr><th>Details</th>" +
            rows.map(r => "<th>" + r.vehicle + "</th>").join("") +
            "</tr></thead><tbody>";

        html += line("Turnarounds", r => "<td>" + fmt((r.gapDetails || []).length) + "</td>");

        

        for (let k = 0; k < maxGaps; k++) {

            const label = "Gap " + (k + 1) + "→" + (k + 2);
            const d = r => (r.gapDetails || [])[k];

            html += line(label + " · In → Out",
                r => d(r) ? "<td>" + d(r).from + " → " + d(r).to + "</td>" : dash);

            html += line(label + " · Gap",
                r => !d(r) ? dash
                    : d(r).sec === null ? '<td class="bad">Check data</td>'
                    : "<td><b>" + fmtMS(d(r).sec, true) + "</b></td>");
        }

        html += line("KPI (avg gap)",
            r => r.turnarounds
                ? '<td class="' + status(r.avgSec) + '">' + fmtMS(r.avgSec) + "</td>"
                : dash);

        t.style.minWidth = (230 + rows.length * 160) + "px";
        t.innerHTML = html + "</tbody>";

        $("lorryNote").textContent =
            "Gap = a lorry's trip In → its next trip Out (In = trip Out + Total Time; (+1) = after midnight). " +
            "Lorries with only one trip have no turnaround and are not shown.";
    }

    // previous layout - no longer used
    function renderLorryTableV1_() {
        const t = $("lorryTable");
        const date = $("lorryDate").value;

        $("lorryTitle").textContent = "Lorry-wise Turnaround" + (date ? " - " + date : "");

        const rows = lorryData
            .filter(l => l.date === date)
            .sort((a, b) => a.vehicle.localeCompare(b.vehicle));

        if (!date || !rows.length) {
            t.innerHTML = "";
            $("lorryNote").textContent = date ? "No lorry data for this day." : "";
            return;
        }

        const maxGaps = Math.max(0, ...rows.map(r => (r.gapDetails || []).length));
        const dash = '<td class="empty">-</td>';

        const totalTrips = rows.reduce((a, r) => a + num(r.trips), 0);
        const totalRun = rows.reduce((a, r) => a + num(r.runSec), 0);
        const totalGapSec = rows.reduce((a, r) => a + num(r.totalSec), 0);
        const totalGaps = rows.reduce((a, r) => a + num(r.turnarounds), 0);

        // one row: label + one cell per lorry + Day Total cell
        const line = (label, cellFn, totalCell) =>
            "<tr><th>" + label + "</th>" + rows.map(cellFn).join("") + "</tr>";

        let html = "<thead><tr><th>Details</th>" +
            rows.map(r => "<th>" + r.vehicle + "</th>").join("") +
            "</tr></thead><tbody>";

        html += line("Trips",
            r => "<td>" + fmt(r.trips) + "</td>",
            "<td><b>" + fmt(totalTrips) + "</b></td>");

        html += line("Total Trip Time",
            r => "<td>" + fmtHM(r.runSec) + "</td>",
            "<td><b>" + fmtHM(totalRun) + "</b></td>");

        for (let k = 0; k < maxGaps; k++) {

            const label = "Gap " + (k + 1) + "→" + (k + 2);
            const d = r => (r.gapDetails || [])[k];

            html += line(label + " · In Time",
                r => d(r) ? "<td>" + d(r).from + "</td>" : dash);

            html += line(label + " · Out Time",
                r => d(r) ? "<td>" + d(r).to + "</td>" : dash);

            html += line(label + " · Gap",
                r => !d(r) ? dash
                    : d(r).sec === null ? '<td class="bad">Check data</td>'
                    : "<td><b>" + fmtMS(d(r).sec, true) + "</b></td>");
        }

        html += line("Total Gap",
            r => r.turnarounds ? "<td>" + fmtHM(r.totalSec) + "</td>" : dash,
            totalGaps ? "<td><b>" + fmtHM(totalGapSec) + "</b></td>" : dash);

        html += line("Turnarounds",
            r => r.turnarounds ? "<td>" + fmt(r.turnarounds) + "</td>" : dash,
            totalGaps ? "<td><b>" + fmt(totalGaps) + "</b></td>" : dash);

        html += line("KPI (avg gap)",
            r => r.turnarounds
                ? '<td class="' + status(r.avgSec) + '">' + fmtMS(r.avgSec) + "</td>"
                : dash,
            totalGaps
                ? '<td class="' + status(totalGapSec / totalGaps) + '">' + fmtMS(totalGapSec / totalGaps) + "</td>"
                : dash);

        t.style.minWidth = (230 + rows.length * 110) + "px";
        t.innerHTML = html + "</tbody>";

        $("lorryNote").textContent =
            "Gap = a lorry's trip In → its next trip Out (In = trip Out + Total Time; (+1) = after midnight). " +
            "Lorries with only one trip have no turnaround and are not counted.";
    }

    // old layout - no longer used
    function renderLorryTableOld_() {
        const t = $("lorryTable");
        const date = $("lorryDate").value;

        $("lorryTitle").textContent = "Lorry-wise Turnaround" + (date ? " - " + date : "");

        const rows = lorryData
            .filter(l => l.date === date)
            .sort((a, b) => a.vehicle.localeCompare(b.vehicle));

        if (!date || !rows.length) {
            t.innerHTML = "";
            $("lorryNote").textContent = date ? "No lorry data for this day." : "";
            return;
        }

        const maxGaps = Math.max(0, ...rows.map(r => r.gaps.length));

        let head = "<thead><tr><th>Lorry</th><th>Trips</th>";
        for (let i = 1; i <= maxGaps; i++) head += "<th>Gap " + i + "→" + (i + 1) + "</th>";
        head += "<th>Total Gap</th><th>Turnarounds</th><th>KPI (avg gap)</th></tr></thead>";

        let body = "<tbody>";

        rows.forEach(r => {
            body += "<tr><th>" + r.vehicle + "</th><td>" + fmt(r.trips) + "</td>";

            for (let i = 0; i < maxGaps; i++) {
                body += r.gaps[i] !== undefined
                    ? "<td>" + fmtMS(r.gaps[i], true) + "</td>"
                    : '<td class="empty">-</td>';
            }

            body += r.turnarounds
                ? "<td>" + fmtHM(r.totalSec) + "</td><td>" + fmt(r.turnarounds) + "</td>" +
                  '<td class="' + status(r.avgSec) + '">' + fmtMS(r.avgSec) + "</td>"
                : '<td class="empty">-</td><td class="empty">-</td><td class="empty">-</td>';

            body += "</tr>";
        });

        // day total row (same numbers as the daily KPI)
        const totalTrips = rows.reduce((a, r) => a + r.trips, 0);
        const totalGaps = rows.reduce((a, r) => a + r.turnarounds, 0);
        const totalSec = rows.reduce((a, r) => a + r.totalSec, 0);

        body += '<tr class="tot"><th>Day Total</th><td>' + fmt(totalTrips) + "</td>" +
            (maxGaps ? '<td colspan="' + maxGaps + '" class="empty"></td>' : "") +
            (totalGaps
                ? "<td>" + fmtHM(totalSec) + "</td><td>" + fmt(totalGaps) + "</td>" +
                  '<td class="' + status(totalSec / totalGaps) + '">' + fmtMS(totalSec / totalGaps) + "</td>"
                : '<td class="empty">-</td><td class="empty">-</td><td class="empty">-</td>') +
            "</tr></tbody>";

        t.style.minWidth = (420 + maxGaps * 100) + "px";
        t.innerHTML = head + body;

        $("lorryNote").textContent =
            "Gap = a lorry's trip In → its next trip Out. Lorries with only one trip have no turnaround and are not counted.";
    }

    // ---------------- MONTHLY COMPARISON (one year) ----------------
    function renderYearSection() {
        const sel = $("kpiYear");
        const years = [...new Set(monthlyData.map(r => r.month.slice(0, 4)))].sort();

        // rebuild the year list only when it changed (keeps the user's choice)
        if (sel.options.length !== years.length ||
            years.some((y, i) => sel.options[i].value !== y)) {
            const keep = sel.value;
            sel.innerHTML = years.map(y => '<option value="' + y + '">' + y + "</option>").join("");
            sel.value = years.includes(keep) ? keep : (years[years.length - 1] || "");
        }

        const year = sel.value;
        const byMonth = {};
        monthlyData
            .filter(r => r.month.slice(0, 4) === year)
            .forEach(r => {
                const n = Number(r.month.slice(5));
                if (!byMonth[n]) byMonth[n] = r;
            });

        renderYearChart(byMonth, year);
        renderYearTable(byMonth, year);
    }

    function renderYearChart(byMonth, year) {
        const el = $("yearChart");

        if (typeof echarts === "undefined") {
            el.innerHTML = '<p class="std-note">Chart library failed to load.</p>';
            return;
        }

        if (!yearChart) yearChart = echarts.init(el);
        $("yearChartTitle").textContent = "Monthly Truck Turnaround Time" + (year ? " - " + year : "");

        // only the months that have data
        const list = Object.keys(byMonth).map(Number).sort((a, b) => a - b)
            .map(n => ({ n: n, r: byMonth[n] }));

        if (!list.length) { emptyChart(yearChart, "No monthly data"); return; }

        yearChart.setOption(lineOption(
            list.map(x => SHORT_MONTHS[x.n - 1]),
            list.map(x => num(x.r.avgSec) / 60),
            "Month",
            i => {
                const x = list[i];
                return `<b>${SHORT_MONTHS[x.n - 1]} ${year}</b>` +
                    `<br>Avg turnaround: ${fmtMS(x.r.avgSec)}` +
                    `<br>Total gap time: ${fmtHM(x.r.totalSec)}` +
                    `<br>Turnarounds: ${fmt(x.r.turnarounds)}` +
                    `<br>Days: ${fmt(x.r.days)} · Trips: ${fmt(x.r.trips)}`;
            },
            list.length === 1
        ), true);
    }

    function renderYearTable(byMonth, year) {
        const t = $("yearTable");
        $("yearTableTitle").textContent = "Monthly Details" + (year ? " - " + year : "");

        if (!year) { t.innerHTML = ""; return; }

        t.style.minWidth = (170 + 12 * 90) + "px";

        const nums = Array.from({ length: 12 }, (_, i) => i + 1);

        const row = (label, cell) =>
            "<tr><th>" + label + "</th>" +
            nums.map(n => {
                const m = byMonth[n];
                return m ? cell(m) : '<td class="empty">-</td>';
            }).join("") + "</tr>";

        t.innerHTML =
            "<thead><tr><th>Month</th>" +
            nums.map(n => "<th>" + SHORT_MONTHS[n - 1] + "</th>").join("") +
            "</tr></thead><tbody>" +
            row("Days", m => "<td>" + fmt(m.days) + "</td>") +
            row("Trips", m => "<td>" + fmt(m.trips) + "</td>") +
            row("Turnarounds", m => "<td>" + fmt(m.turnarounds) + "</td>") +
            row("Total Gap Time", m => "<td>" + fmtHM(m.totalSec) + "</td>") +
            row("KPI (avg gap)", m => '<td class="' + status(m.avgSec) + '">' + fmtMS(m.avgSec) + "</td>") +
            "</tbody>";
    }

    window.addEventListener("resize", () => {
        if (chart) chart.resize();
        if (yearChart) yearChart.resize();
    });

    // ---------------- BUTTONS ----------------
    $("kpiMonth").addEventListener("change", render);
    $("kpiYear").addEventListener("change", renderYearSection);
    $("lorryDate").addEventListener("change", renderLorryTable);

    $("refreshBtn").addEventListener("click", async () => {
        const b = $("refreshBtn");
        b.disabled = true; b.textContent = "Refreshing...";
        try { await loadData(); } finally { b.disabled = false; b.textContent = "Refresh"; }
    });

    loadData();
});
document.addEventListener("DOMContentLoaded", () => {

    // Standard range in birds / hour: Achieved when MIN <= value <= MAX.
    // Overwritten by the server values (KPI4_MIN / KPI4_MAX in Apps Script).
    let KPI_MIN = 1200;
    let KPI_MAX = 2000;

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

    const hasStd = () => KPI_MIN > 0 || KPI_MAX > 0;

    // Achieved when birds/hour is inside the standard range (as shown, whole number)
    const isOk = v => {
        if (!hasStd()) return false;
        const x = Number(num(v).toFixed(0));
        return x >= KPI_MIN && (KPI_MAX <= 0 || x <= KPI_MAX);
    };

    // "HH:MM:SS" -> "HH:MM"
    const hm = t => String(t || "").split(":").slice(0, 2).join(":") || "-";

    // Server clock "17:21" / "06:56 (+1)" -> { text: "5:21 PM", next: 1 }
    function parseClock(s) {
        const m = String(s || "").match(/^(\d{1,2}):(\d{2})(?:\s*\(\+(\d+)\))?$/);
        if (!m) return null;
        const h = Number(m[1]);
        return {
            text: ((h % 12) || 12) + ":" + m[2] + " " + (h < 12 ? "AM" : "PM"),
            next: Number(m[3] || 0)
        };
    }

    // table cell: "6:56 AM" + small red "+1" (next day)
    const clockHtml = s => {
        const c = parseClock(s);
        return c ? c.text + (c.next ? "<sup>+" + c.next + "</sup>" : "") : "-";
    };

    // tooltip text: "6:56 AM (next day)"
    const clockText = s => {
        const c = parseClock(s);
        return c ? c.text + (c.next ? " (next day)" : "") : "-";
    };

    const monthLabel = ym => {
        const p = String(ym || "").split("-");
        return p.length === 2 && MONTH_NAMES[Number(p[1]) - 1]
            ? MONTH_NAMES[Number(p[1]) - 1] + " " + p[0] : "";
    };

    // cell class: green / red only when a standard exists
    const cls = v => hasStd() ? (isOk(v) ? "ok" : "bad") : "";

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
            const result = await sendRequest({ action: "getKpi4Data" });

            if (!result.success) {
                monthlyData = []; dailyData = [];
                showMessage(result.message || "Unable to load KPI 4.", "error");
            } else {
                if (num(result.min) > 0) KPI_MIN = num(result.min);
                if (num(result.max) > 0) KPI_MAX = num(result.max);
                monthlyData = result.monthly || [];
                dailyData = result.daily || [];

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

        $("stdLabel").textContent = hasStd()
            ? fmt(KPI_MIN) + " – " + fmt(KPI_MAX) + " birds / hr" : "Not set";

        // Achieved / Not Achieved chips only make sense with a standard
        $("chipGood").style.display = hasStd() ? "" : "none";
        $("chipOut").style.display = hasStd() ? "" : "none";

        if (m) {
            $("sumRate").textContent = fmt(m.kpi, 0) + " /hr";
            $("boxRate").className = "kpi-tile " + cls(m.kpi);
            $("rateStatus").textContent = hasStd()
                ? (isOk(m.kpi) ? "Achieved" : "Not Achieved") : "No standard set";
            $("sumTime").textContent = m.time || "-";
            $("sumBirds").textContent = fmt(m.birds);
        } else {
            $("sumRate").textContent = "-";
            $("boxRate").className = "kpi-tile";
            $("rateStatus").textContent = ym ? "No data" : "Select a month";
            $("sumTime").textContent = "-";
            $("sumBirds").textContent = "-";
        }

        // days tile
        if (days.length) {
            const good = days.filter(d => isOk(d.kpi)).length;
            $("sumDays").textContent = fmt(days.length);
            $("sumDaysGood").textContent = fmt(good);
            $("sumDaysOut").textContent = fmt(days.length - good);
        } else {
            $("sumDays").textContent = "-";
            $("sumDaysGood").textContent = "-";
            $("sumDaysOut").textContent = "-";
        }

        renderChart(days, ym);
        renderTable(days, ym);
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

        t.style.minWidth = (150 + dayCount * 84) + "px";

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
            row("Total Birds", d => "<td>" + fmt(d.birds) + "</td>") +
            row("First Out", d => '<td class="tm">' + clockHtml(d.firstOut) + "</td>") +
            row("Last In", d => '<td class="tm">' + clockHtml(d.lastIn) + "</td>") +
            row("Receiving Time", d => "<td>" + hm(d.time) + "</td>") +
            row("KPI (birds/hr)", d => '<td class="' + cls(d.kpi) + '">' + fmt(d.kpi, 0) + "</td>") +
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

    function lineOption(labels, values, axisName, tipFn, boundaryGap) {

        const top = Math.max(KPI_MAX, ...values);
        const max = Math.ceil((top * 1.1) / 500) * 500 || 500;

        // hollow points; green / red ring only when a standard exists
        const points = values.map(v => ({
            value: Number(v.toFixed(1)),
            itemStyle: {
                color: "#ffffff",
                borderColor: hasStd() ? (isOk(v) ? "#047857" : "#b91c1c") : "#1E5AA8",
                borderWidth: 3
            }
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
            }
        };

        if (hasStd()) {
            series.markArea = {
                silent: true,
                data: [
                    // below the minimum = red
                    [{ yAxis: 0, itemStyle: { color: "rgba(185,28,28,0.08)" } }, { yAxis: KPI_MIN }],
                    // inside the range = green
                    [{ yAxis: KPI_MIN, itemStyle: { color: "rgba(4,120,87,0.10)" } }, { yAxis: KPI_MAX }],
                    // above the maximum = red
                    [{ yAxis: KPI_MAX, itemStyle: { color: "rgba(185,28,28,0.08)" } }, { yAxis: max }]
                ]
            };
            series.markLine = {
                symbol: "none",
                silent: true,
                lineStyle: { color: "#b91c1c", type: "dashed", width: 2 },
                label: { color: "#b91c1c", fontWeight: 700 },
                data: [
                    { yAxis: KPI_MIN, label: { formatter: "Min " + fmt(KPI_MIN), position: "insideEndBottom" } },
                    { yAxis: KPI_MAX, label: { formatter: "Max " + fmt(KPI_MAX), position: "insideEndTop" } }
                ]
            };
        }

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
                axisLabel: { color: "#64748b", formatter: v => fmt(v) }
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
        $("chartTitle").textContent = "Daily Receiving Rate" + (ym ? " - " + monthLabel(ym) : "");

        if (!days.length) { emptyChart(chart, "No daily data for this month"); return; }

        chart.setOption(lineOption(
            days.map(d => d.date.slice(8)),
            days.map(d => num(d.kpi)),
            "Day",
            i => {
                const d = days[i];
                return `<b>${d.date}</b><br>Receiving rate: ${fmt(d.kpi, 0)} birds/hr` +
                    `<br>Birds: ${fmt(d.birds)}` +
                    `<br>First Out: ${clockText(d.firstOut)}` +
                    `<br>Last In: ${clockText(d.lastIn)}` +
                    `<br>Receiving time: ${d.time}` +
                    `<br>Trips: ${fmt(d.trips)}`;
            },
            false
        ), true);
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
        $("yearChartTitle").textContent = "Monthly Receiving Rate" + (year ? " - " + year : "");

        // only the months that have data
        const list = Object.keys(byMonth).map(Number).sort((a, b) => a - b)
            .map(n => ({ n: n, r: byMonth[n] }));

        if (!list.length) { emptyChart(yearChart, "No monthly data"); return; }

        yearChart.setOption(lineOption(
            list.map(x => SHORT_MONTHS[x.n - 1]),
            list.map(x => num(x.r.kpi)),
            "Month",
            i => {
                const x = list[i];
                return `<b>${SHORT_MONTHS[x.n - 1]} ${year}</b>` +
                    `<br>Receiving rate: ${fmt(x.r.kpi, 0)} birds/hr` +
                    `<br>Birds: ${fmt(x.r.birds)}` +
                    `<br>Receiving time: ${x.r.time}` +
                    `<br>Days: ${fmt(x.r.days)}` +
                    `<br>Trips: ${fmt(x.r.trips)}`;
            },
            list.length === 1
        ), true);
    }

    function renderYearTable(byMonth, year) {
        const t = $("yearTable");
        $("yearTableTitle").textContent = "Monthly Details" + (year ? " - " + year : "");

        if (!year) { t.innerHTML = ""; return; }

        t.style.minWidth = (150 + 12 * 84) + "px";

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
            row("Total Birds", m => "<td>" + fmt(m.birds) + "</td>") +
            row("Receiving Time", m => "<td>" + hm(m.time) + "</td>") +
            row("KPI (birds/hr)", m => '<td class="' + cls(m.kpi) + '">' + fmt(m.kpi, 0) + "</td>") +
            "</tbody>";
    }

    window.addEventListener("resize", () => {
        if (chart) chart.resize();
        if (yearChart) yearChart.resize();
    });

    // ---------------- BUTTONS ----------------
    $("kpiMonth").addEventListener("change", render);
    $("kpiYear").addEventListener("change", renderYearSection);

    $("refreshBtn").addEventListener("click", async () => {
        const b = $("refreshBtn");
        b.disabled = true; b.textContent = "Refreshing...";
        try { await loadData(); } finally { b.disabled = false; b.textContent = "Refresh"; }
    });

    loadData();
});
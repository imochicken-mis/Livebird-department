document.addEventListener("DOMContentLoaded", () => {

    // Standard: liveability must be ABOVE this value (%). Overwritten by the server value.
    let KPI_STANDARD = 99.7;

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

    // Achieved only when the value (as shown, 2 decimals) is ABOVE the standard
    const isOk = v => Number(num(v).toFixed(2)) >= KPI_STANDARD;

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
            const result = await sendRequest({ action: "getKpi3Data" });

            if (!result.success) {
                monthlyData = []; dailyData = [];
                showMessage(result.message || "Unable to load KPI 3.", "error");
            } else {
                if (num(result.standard) > 0) KPI_STANDARD = num(result.standard);
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

        $("stdLabel").textContent = "\u2265 " + KPI_STANDARD.toFixed(2) + " %";

        if (m) {
            const ok = isOk(m.kpi);
            $("sumRate").textContent = fmt(m.kpi, 2) + "%";
            $("boxRate").className = "kpi-tile " + (ok ? "ok" : "bad");
            $("rateStatus").textContent = ok ? "Achieved" : "Not Achieved";
            $("sumDoa").textContent = fmt(m.nob);
            $("sumBirds").textContent = fmt(m.avail);
        } else {
            $("sumRate").textContent = "-";
            $("boxRate").className = "kpi-tile";
            $("rateStatus").textContent = ym ? "No data" : "Select a month";
            $("sumDoa").textContent = "-";
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

        // every day column gets the same minimum width (data or no data)
        t.style.minWidth = (150 + dayCount * 64) + "px";

        const row = (label, cell) =>
            "<tr><th>" + label + "</th>" +
            nums.map(n => {
                const d = byDay[n];
                return d ? cell(d) : '<td class="empty">-</td>';
            }).join("") + "</tr>";

        t.innerHTML =
            "<thead><tr><th>Day</th>" + nums.map(n => {
                const wd = new Date(Number(p[0]), Number(p[1]) - 1, n).getDay();   // 0 = Sunday, 6 = Saturday
                return '<th class="' + (wd === 0 ? "sun" : wd === 6 ? "sat" : "") + '">' + n + "</th>";
            }).join("") + "</tr></thead>" +
            "<tbody>" +
            row("Dispatch Birds", d => "<td>" + fmt(d.nob) + "</td>") +
            row("DOA", d => "<td>" + fmt(d.doa) + "</td>") +
            row("Alive NOB", d => "<td>" + fmt(d.avail) + "</td>") +
            row("KPI Value", d => '<td class="' + (isOk(d.kpi) ? "ok" : "bad") + '">' + fmt(d.kpi, 2) + "%</td>") +
            "</tbody>";
    }

    // ---------------- CHART HELPERS ----------------
    // y-axis: from just under the lowest value up to 100 %, with round steps
    function yScale(values) {
        const lowest = Math.min(KPI_STANDARD, ...values);
        const span = 100 - lowest;
        const step = span > 3 ? 1 : span > 1.2 ? 0.5 : span > 0.6 ? 0.2 : 0.1;
        const min = Number((Math.floor((lowest - step * 0.5) / step) * step).toFixed(4));
        return { min: min, max: 100, step: step };
    }

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
        const ax = yScale(values);

        // hollow points with a green / red ring
        const points = values.map(v => ({
            value: Number(v.toFixed(3)),
            itemStyle: {
                color: "#ffffff",
                borderColor: isOk(v) ? "#047857" : "#b91c1c",
                borderWidth: 3
            }
        }));

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
                min: ax.min,
                max: ax.max,
                interval: ax.step,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
                axisLabel: { color: "#64748b", formatter: v => Number(v).toFixed(2) + "%" }
            },
            series: [{
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
                        // below the standard = red (bad)
                        [{ yAxis: ax.min, itemStyle: { color: "rgba(185,28,28,0.08)" } }, { yAxis: KPI_STANDARD }],
                        // above the standard = green (good)
                        [{ yAxis: KPI_STANDARD, itemStyle: { color: "rgba(4,120,87,0.10)" } }, { yAxis: ax.max }]
                    ]
                },
                markLine: {
                    symbol: "none",
                    silent: true,
                    lineStyle: { color: "#b91c1c", type: "dashed", width: 2 },
                    label: {
                        formatter: "Standard \u2265 " + KPI_STANDARD.toFixed(2) + "%",
                        position: "insideEndBottom",
                        color: "#b91c1c",
                        fontWeight: 700
                    },
                    data: [{ yAxis: KPI_STANDARD }]
                }
            }]
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
        $("chartTitle").textContent = "Daily Liveability" + (ym ? " - " + monthLabel(ym) : "");

        if (!days.length) { emptyChart(chart, "No daily data for this month"); return; }

        chart.setOption(lineOption(
            days.map(d => d.date.slice(8)),
            days.map(d => num(d.kpi)),
            "Day",
            i => {
                const d = days[i];
                return `<b>${d.date}</b><br>Liveability: ${fmt(d.kpi, 2)}%` +
                    `<br>DOA: ${fmt(d.doa)}<br>Dispatch NOB: ${fmt(d.nob)}<br>Alive NOB: ${fmt(d.avail)}`;
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
        $("yearChartTitle").textContent = "Monthly Liveability" + (year ? " - " + year : "");

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
                    `<br>Liveability: ${fmt(x.r.kpi, 2)}%` +
                    `<br>DOA: ${fmt(x.r.doa)}` +
                    `<br>Dispatch NOB: ${fmt(x.r.nob)}` +
                    `<br>Alive NOB: ${fmt(x.r.avail)}`;
            },
            list.length === 1
        ), true);
    }

    function renderYearTable(byMonth, year) {
        const t = $("yearTable");
        $("yearTableTitle").textContent = "Monthly Details" + (year ? " - " + year : "");

        if (!year) { t.innerHTML = ""; return; }

        // equal width for every month column (data or no data)
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
            row("Dispatch Birds", m => "<td>" + fmt(m.nob) + "</td>") +
            row("DOA", m => "<td>" + fmt(m.doa) + "</td>") +
            row("Alive NOB", m => "<td>" + fmt(m.avail) + "</td>") +
            row("KPI Value", m => '<td class="' + (isOk(m.kpi) ? "ok" : "bad") + '">' + fmt(m.kpi, 2) + "%</td>") +
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
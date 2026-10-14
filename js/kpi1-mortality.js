document.addEventListener("DOMContentLoaded", () => {

    // Standard: mortality must be BELOW this value (%). Overwritten by the server value.
    let KPI_STANDARD = 0.3;

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
    let batchData = [];
    let batchChart = null;
    let yearChart = null;
    let chart = null;

    // ---------------- HELPERS ----------------
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const num = v => Number(v) || 0;
    const fmt = (v, d = 0) =>
        num(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    const isBad = r => r >= KPI_STANDARD;
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
            const result = await sendRequest({ action: "getKpi1Data" });
            if (!result.success) {
                monthlyData = []; dailyData = []; batchData = [];
                showMessage(result.message || "Unable to load KPI 1.", "error");
            } else {
                if (num(result.standard) > 0) KPI_STANDARD = num(result.standard);
                monthlyData = result.monthly || [];
                dailyData = result.daily || [];
                batchData = result.batches || [];

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

        $("stdLabel").textContent = "< " + KPI_STANDARD.toFixed(2) + " %";

        if (m) {
            const r = num(m.kpi);
            $("sumRate").textContent = fmt(r, 2) + "%";
            $("boxRate").className = "kpi-tile " + (isBad(r) ? "bad" : "ok");
            $("rateStatus").textContent = isBad(r) ? "Not Achieved" : "Achieved";
            $("sumDoa").textContent = fmt(m.doa);
            $("sumBirds").textContent = fmt(m.birds);
            $("sumBatch").textContent = fmt(m.batches);
        } else {
            $("sumRate").textContent = "-";
            $("boxRate").className = "kpi-tile";
            $("rateStatus").textContent = ym ? "No data" : "Select a month";
            $("sumDoa").textContent = "-";
            $("sumBirds").textContent = "-";
            $("sumBatch").textContent = "-";
        }

        // days tile (Achieved / Not Achieved days of the month)
        if (days.length) {
            const badDays = days.filter(d => isBad(num(d.kpi))).length;
            $("sumDays").textContent = fmt(days.length);
            $("sumDaysGood").textContent = fmt(days.length - badDays);
            $("sumDaysOut").textContent = fmt(badDays);
        } else {
            $("sumDays").textContent = "-";
            $("sumDaysGood").textContent = "-";
            $("sumDaysOut").textContent = "-";
        }

        renderChart(days, ym);
        renderTable(days, ym);
        renderBatchSection(ym);
        renderBatchCounts(ym);
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
            row("Batch Count", d => "<td>" + fmt(d.batches) + "</td>") +
            row("Total Birds", d => "<td>" + fmt(d.birds) + "</td>") +
            row("DOA", d => "<td>" + fmt(d.doa) + "</td>") +
            row("KPI Value", d => '<td class="' + (isBad(num(d.kpi)) ? "bad" : "ok") + '">' + fmt(d.kpi, 2) + "%</td>") +
            "</tbody>";
    }

    function renderChart(days, ym) {
        const el = $("kpiChart");

        if (typeof echarts === "undefined") {
            el.innerHTML = '<p class="std-note">Chart library failed to load.</p>';
            return;
        }

        if (!chart) chart = echarts.init(el);

        $("chartTitle").textContent = "Daily Mortality Rate" + (ym ? " - " + monthLabel(ym) : "");

        if (!days.length) {
            chart.setOption({
                title: {
                    text: "No daily data for this month",
                    left: "center", top: "middle",
                    textStyle: { color: "#94a3b8", fontSize: 14, fontWeight: 600 }
                },
                xAxis: { show: false }, yAxis: { show: false }, series: []
            }, true);
            return;
        }

        // even y-axis steps (0.00, 0.05, 0.10 ...) with a round top value
        const peak = Math.max(KPI_STANDARD, ...days.map(d => num(d.kpi)));
        const yStep = peak > 3 ? 1 : peak > 1 ? 0.25 : 0.05;
        const yMax = Number((Math.ceil((peak * 1.1) / yStep) * yStep).toFixed(4));

        // hollow points with a green / red ring
        const points = days.map(d => ({
            value: Number(num(d.kpi).toFixed(3)),
            itemStyle: {
                color: "#ffffff",
                borderColor: isBad(num(d.kpi)) ? "#b91c1c" : "#047857",
                borderWidth: 3
            }
        }));

        chart.setOption({
            animationDuration: 900,
            animationEasing: "cubicOut",
            grid: { left: 56, right: 40, top: 40, bottom: 46 },
            tooltip: {
                trigger: "axis",
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                borderWidth: 1,
                padding: [10, 14],
                textStyle: { color: "#0b2a66", fontSize: 12 },
                extraCssText: "box-shadow:0 8px 24px rgba(15,23,42,.15); border-radius:10px;",
                axisPointer: { type: "line", lineStyle: { color: "#94a3b8", type: "dashed" } },
                formatter: p => {
                    const d = days[p[0].dataIndex];
                    return `<b>${d.date}</b><br>Mortality: ${fmt(d.kpi, 2)}%` +
                        `<br>DOA: ${fmt(d.doa)}<br>Birds: ${fmt(d.birds)}`;
                }
            },
            xAxis: {
                type: "category",
                data: days.map(d => d.date.slice(8)),
                name: "Day",
                nameLocation: "middle",
                nameGap: 28,
                nameTextStyle: { color: "#64748b", fontWeight: 700 },
                boundaryGap: false,
                axisLine: { lineStyle: { color: "#cbd5e1" } },
                axisTick: { show: false },
                axisLabel: { color: "#64748b" }
            },
            yAxis: {
                type: "value",
                min: 0,
                max: yMax,
                interval: yStep,
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
                        // below the standard = green (good)
                        [
                            { yAxis: 0, itemStyle: { color: "rgba(4,120,87,0.10)" } },
                            { yAxis: KPI_STANDARD }
                        ],
                        // above the standard = red (bad)
                        [
                            { yAxis: KPI_STANDARD, itemStyle: { color: "rgba(185,28,28,0.08)" } },
                            { yAxis: yMax }
                        ]
                    ]
                },
                markLine: {
                    symbol: "none",
                    silent: true,
                    lineStyle: { color: "#b91c1c", type: "dashed", width: 2 },
                    label: {
                        formatter: "Standard " + KPI_STANDARD.toFixed(2) + "%",
                        position: "insideEndTop",
                        color: "#b91c1c",
                        fontWeight: 700
                    },
                    data: [{ yAxis: KPI_STANDARD }]
                }
            }]
        }, true);
    }

    // ---------------- MONTHLY COMPARISON (one year) ----------------
    const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

        $("yearChartTitle").textContent = "Monthly Mortality Rate" + (year ? " - " + year : "");

        // only the months that have data
        const list = Object.keys(byMonth).map(Number).sort((a, b) => a - b)
            .map(n => ({ n: n, r: byMonth[n] }));

        if (!list.length) {
            yearChart.setOption({
                title: {
                    text: "No monthly data",
                    left: "center", top: "middle",
                    textStyle: { color: "#94a3b8", fontSize: 14, fontWeight: 600 }
                },
                xAxis: { show: false }, yAxis: { show: false }, series: []
            }, true);
            return;
        }

        const peak = Math.max(KPI_STANDARD, ...list.map(x => num(x.r.kpi)));
        const yStep = peak > 3 ? 1 : peak > 1 ? 0.25 : 0.05;
        const yMax = Number((Math.ceil((peak * 1.1) / yStep) * yStep).toFixed(4));

        const points = list.map(x => ({
            value: Number(num(x.r.kpi).toFixed(3)),
            itemStyle: {
                color: "#ffffff",
                borderColor: isBad(num(x.r.kpi)) ? "#b91c1c" : "#047857",
                borderWidth: 3
            }
        }));

        yearChart.setOption({
            animationDuration: 900,
            animationEasing: "cubicOut",
            grid: { left: 56, right: 40, top: 40, bottom: 46 },
            tooltip: {
                trigger: "axis",
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                borderWidth: 1,
                padding: [10, 14],
                textStyle: { color: "#0b2a66", fontSize: 12 },
                extraCssText: "box-shadow:0 8px 24px rgba(15,23,42,.15); border-radius:10px;",
                axisPointer: { type: "line", lineStyle: { color: "#94a3b8", type: "dashed" } },
                formatter: p => {
                    const x = list[p[0].dataIndex];
                    return `<b>${SHORT_MONTHS[x.n - 1]} ${year}</b>` +
                        `<br>Mortality: ${fmt(x.r.kpi, 2)}%` +
                        `<br>DOA: ${fmt(x.r.doa)}` +
                        `<br>Birds: ${fmt(x.r.birds)}` +
                        `<br>Batches: ${fmt(x.r.batches)}`;
                }
            },
            xAxis: {
                type: "category",
                data: list.map(x => SHORT_MONTHS[x.n - 1]),
                name: "Month",
                nameLocation: "middle",
                nameGap: 28,
                nameTextStyle: { color: "#64748b", fontWeight: 700 },
                boundaryGap: list.length === 1,
                axisLine: { lineStyle: { color: "#cbd5e1" } },
                axisTick: { show: false },
                axisLabel: { color: "#64748b", interval: 0 }
            },
            yAxis: {
                type: "value",
                min: 0,
                max: yMax,
                interval: yStep,
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
                        [{ yAxis: 0, itemStyle: { color: "rgba(4,120,87,0.10)" } }, { yAxis: KPI_STANDARD }],
                        [{ yAxis: KPI_STANDARD, itemStyle: { color: "rgba(185,28,28,0.08)" } }, { yAxis: yMax }]
                    ]
                },
                markLine: {
                    symbol: "none",
                    silent: true,
                    lineStyle: { color: "#b91c1c", type: "dashed", width: 2 },
                    label: {
                        formatter: "Standard " + KPI_STANDARD.toFixed(2) + "%",
                        position: "insideEndTop",
                        color: "#b91c1c",
                        fontWeight: 700
                    },
                    data: [{ yAxis: KPI_STANDARD }]
                }
            }]
        }, true);
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
            row("Batch Count", m => "<td>" + fmt(m.batches) + "</td>") +
            row("Total Birds", m => "<td>" + fmt(m.birds) + "</td>") +
            row("DOA", m => "<td>" + fmt(m.doa) + "</td>") +
            row("KPI Value", m => '<td class="' + (isBad(num(m.kpi)) ? "bad" : "ok") + '">' + fmt(m.kpi, 2) + "%</td>") +
            "</tbody>";
    }

    // ---------------- BATCHES TILE: good / out ----------------
    function renderBatchCounts(ym) {
        const rows = ym ? batchData.filter(b => b.date.slice(0, 7) === ym) : [];

        if (!rows.length) {
            $("sumBatchGood").textContent = "-";
            $("sumBatchOut").textContent = "-";
            return;
        }

        const out = rows.filter(b => isBad(num(b.kpi))).length;
        $("sumBatchGood").textContent = fmt(rows.length - out);
        $("sumBatchOut").textContent = fmt(out);
    }

    // ---------------- BATCH-WISE SECTION (one date) ----------------
    function renderBatchSection(ym) {
        const picker = $("kpiDate");

        // picker only allows dates inside the selected month
        if (ym) {
            const p = ym.split("-");
            const last = new Date(Number(p[0]), Number(p[1]), 0).getDate();
            picker.min = ym + "-01";
            picker.max = ym + "-" + String(last).padStart(2, "0");

            if (picker.value.slice(0, 7) !== ym) {
                // default: latest date of this month that has batch data
                const dates = batchData
                    .filter(b => b.date.slice(0, 7) === ym)
                    .map(b => b.date)
                    .sort();
                picker.value = dates.length ? dates[dates.length - 1] : "";
            }
        } else {
            picker.min = ""; picker.max = ""; picker.value = "";
        }

        const date = picker.value;
        const rows = batchData.filter(b => b.date === date);   // keeps sheet order

        renderBatchChart(rows, date);
        renderBatchTable(rows, date);
    }

    function renderBatchChart(rows, date) {
        const el = $("batchChart");

        if (typeof echarts === "undefined") {
            el.innerHTML = '<p class="std-note">Chart library failed to load.</p>';
            return;
        }

        if (!batchChart) batchChart = echarts.init(el);

        $("batchTitle").textContent = "Batch-wise Mortality Rate" + (date ? " - " + date : "");

        if (!rows.length) {
            batchChart.setOption({
                title: {
                    text: date ? "No batch data for this date" : "Select a date",
                    left: "center", top: "middle",
                    textStyle: { color: "#94a3b8", fontSize: 14, fontWeight: 600 }
                },
                xAxis: { show: false }, yAxis: { show: false }, series: []
            }, true);
            return;
        }

        const peak = Math.max(KPI_STANDARD, ...rows.map(r => num(r.kpi)));
        const yStep = peak > 3 ? 1 : peak > 1 ? 0.25 : 0.05;
        const yMax = Number((Math.ceil((peak * 1.1) / yStep) * yStep).toFixed(4));

        // hollow points with a green / red ring
        const points = rows.map(r => ({
            value: Number(num(r.kpi).toFixed(3)),
            itemStyle: {
                color: "#ffffff",
                borderColor: isBad(num(r.kpi)) ? "#b91c1c" : "#047857",
                borderWidth: 3
            }
        }));

        batchChart.setOption({
            animationDuration: 900,
            animationEasing: "cubicOut",
            grid: { left: 56, right: 40, top: 40, bottom: rows.length > 10 ? 70 : 46 },
            tooltip: {
                trigger: "axis",
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                borderWidth: 1,
                padding: [10, 14],
                textStyle: { color: "#0b2a66", fontSize: 12 },
                extraCssText: "box-shadow:0 8px 24px rgba(15,23,42,.15); border-radius:10px;",
                axisPointer: { type: "line", lineStyle: { color: "#94a3b8", type: "dashed" } },
                formatter: p => {
                    const r = rows[p[0].dataIndex];
                    return `<b>Batch ${r.batchNo || "-"}</b>` +
                        
                        `<br>Mortality: ${fmt(r.kpi, 2)}%` +
                        `<br>DOA: ${fmt(r.doa)}` +
                        
                        `<br>Birds: ${fmt(r.birds)}`;
                }
            },
            xAxis: {
                type: "category",
                data: rows.map(r => r.batchNo || "-"),
                name: "Batch No",
                nameLocation: "middle",
                nameGap: rows.length > 10 ? 52 : 28,
                nameTextStyle: { color: "#64748b", fontWeight: 700 },
                boundaryGap: false,
                axisLine: { lineStyle: { color: "#cbd5e1" } },
                axisTick: { show: false },
                axisLabel: { color: "#64748b", interval: 0, rotate: rows.length > 10 ? 45 : 0 }
            },
            yAxis: {
                type: "value",
                min: 0,
                max: yMax,
                interval: yStep,
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
                        [{ yAxis: 0, itemStyle: { color: "rgba(4,120,87,0.10)" } }, { yAxis: KPI_STANDARD }],
                        [{ yAxis: KPI_STANDARD, itemStyle: { color: "rgba(185,28,28,0.08)" } }, { yAxis: yMax }]
                    ]
                },
                markLine: {
                    symbol: "none",
                    silent: true,
                    lineStyle: { color: "#b91c1c", type: "dashed", width: 2 },
                    label: {
                        formatter: "Standard " + KPI_STANDARD.toFixed(2) + "%",
                        position: "insideEndTop",
                        color: "#b91c1c",
                        fontWeight: 700
                    },
                    data: [{ yAxis: KPI_STANDARD }]
                }
            }]
        }, true);
    }

    function renderBatchTable(rows, date) {
        const t = $("batchTable");
        $("batchTableTitle").textContent = "Batch Details" + (date ? " - " + date : "");

        if (!rows.length) {
            t.innerHTML = '<tbody><tr><td class="empty">' +
                (date ? "No batch data for this date" : "Select a date") + "</td></tr></tbody>";
            return;
        }

        const esc = s => String(s).replace(/[&<>"]/g,
            c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

        const row = (label, cell) =>
            "<tr><th>" + label + "</th>" + rows.map(cell).join("") + "</tr>";

        t.innerHTML =
            "<thead><tr><th>Batch No</th>" +
            rows.map(r => "<th>" + esc(r.batchNo || "-") + "</th>").join("") +
            "</tr></thead>" +
            "<tbody>" +
            row("Total Received Bird", r => "<td>" + fmt(r.birds) + "</td>") +
            row("DOA", r => "<td>" + fmt(r.doa) + "</td>") +
            row("KPI Value",
                r => '<td class="' + (isBad(num(r.kpi)) ? "bad" : "ok") + '">' + fmt(r.kpi, 2) + "%</td>") +
            "</tbody>";
    }

    window.addEventListener("resize", () => {
        if (chart) chart.resize();
        if (batchChart) batchChart.resize();
        if (yearChart) yearChart.resize();
    });

    // ---------------- BUTTONS ----------------
    $("kpiMonth").addEventListener("change", render);
    $("kpiDate").addEventListener("change", () => renderBatchSection($("kpiMonth").value));
    $("kpiYear").addEventListener("change", renderYearSection);
    $("refreshBtn").addEventListener("click", async () => {
        const b = $("refreshBtn");
        b.disabled = true; b.textContent = "Refreshing...";
        try { await loadData(); } finally { b.disabled = false; b.textContent = "Refresh"; }
    });

    loadData();
});
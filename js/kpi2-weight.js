document.addEventListener("DOMContentLoaded", () => {

    // Standard range (kg): Achieved when MIN <= average <= MAX. Overwritten by the server values.
    let KPI_MIN = 1.8;
    let KPI_MAX = 2.4;

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
    const charts = { day: null, batch: null, year: null };

    // ---------------- HELPERS ----------------
    const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const num = v => Number(v) || 0;
    const fmt = (v, d = 0) =>
        num(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

    // Compared at the 2-decimal value the user sees (1.796 shows as 1.80, so it counts as 1.80)
    const isOk = v => {
        const r = Number(num(v).toFixed(2));
        return r >= KPI_MIN && r <= KPI_MAX;
    };

    const monthLabel = ym => {
        const p = String(ym || "").split("-");
        return p.length === 2 && MONTH_NAMES[Number(p[1]) - 1]
            ? MONTH_NAMES[Number(p[1]) - 1] + " " + p[0] : "";
    };

    const esc = s => String(s).replace(/[&<>"]/g,
        c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

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
            const result = await sendRequest({ action: "getKpi2Data" });
            if (!result.success) {
                monthlyData = []; dailyData = []; batchData = [];
                showMessage(result.message || "Unable to load KPI 2.", "error");
            } else {
                if (num(result.min) > 0) KPI_MIN = num(result.min);
                if (num(result.max) > 0) KPI_MAX = num(result.max);
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

        $("stdLabel").textContent = KPI_MIN.toFixed(2) + " – " + KPI_MAX.toFixed(2) + " kg";

        if (m) {
            const a = num(m.avg);
            const ok = isOk(a);
            $("sumRate").innerHTML = fmt(a, 2) + "<small>kg</small>";
            $("boxRate").className = "kpi-tile " + (ok ? "ok" : "bad");
            $("rateStatus").textContent = ok ? "Achieved" : "Not Achieved";
            $("sumWeight").textContent = fmt(m.weight);
            $("sumBirds").textContent = fmt(m.nob);
            $("sumBatch").textContent = fmt(m.batches);
        } else {
            $("sumRate").textContent = "-";
            $("boxRate").className = "kpi-tile";
            $("rateStatus").textContent = ym ? "No data" : "Select a month";
            $("sumWeight").textContent = "-";
            $("sumBirds").textContent = "-";
            $("sumBatch").textContent = "-";
        }

        renderChart(days, ym);
        renderTable(days, ym);
        renderBatchCounts(ym);
        renderBatchSection(ym);
        renderYearSection();
    }

    // ---------------- SHARED CHART HELPERS ----------------
    function getChart(key, id) {
        const el = $(id);
        if (typeof echarts === "undefined") {
            el.innerHTML = '<p class="std-note">Chart library failed to load.</p>';
            return null;
        }
        if (!charts[key]) charts[key] = echarts.init(el);
        return charts[key];
    }

    function showEmpty(c, text) {
        c.setOption({
            title: {
                text: text, left: "center", top: "middle",
                textStyle: { color: "#94a3b8", fontSize: 14, fontWeight: 600 }
            },
            xAxis: { show: false }, yAxis: { show: false }, series: []
        }, true);
    }

    // even y-axis steps that always include the standard range
    function axisRange(values) {
        const all = values.concat([KPI_MIN, KPI_MAX]);
        const lo = Math.min(...all);
        const hi = Math.max(...all);
        const span = hi - lo;
        const step = span <= 1.5 ? 0.1 : span <= 3 ? 0.2 : 0.5;
        const r6 = x => Number(x.toFixed(6));
        return {
            step: step,
            min: Math.max(0, r6(Math.floor(r6((lo - step) / step)) * step)),
            max: r6(Math.ceil(r6((hi + step) / step)) * step)
        };
    }

    // one line-chart style for the daily, batch-wise and monthly charts
    function lineOption(labels, values, tipFn, o) {
        o = o || {};
        const ax = axisRange(values);
        const rotate = o.rotate || 0;

        const points = values.map(v => ({
            value: Number(v.toFixed(3)),
            itemStyle: {
                color: "#ffffff",
                borderColor: isOk(v) ? "#047857" : "#b91c1c",
                borderWidth: 3
            }
        }));

        const lineLabel = (text, position) => ({
            formatter: text, position: position, color: "#b91c1c", fontWeight: 700
        });

        return {
            animationDuration: 900,
            animationEasing: "cubicOut",
            grid: { left: 56, right: 40, top: 40, bottom: o.bottom || 46 },
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
                name: o.xName || "",
                nameLocation: "middle",
                nameGap: o.nameGap || 28,
                nameTextStyle: { color: "#64748b", fontWeight: 700 },
                boundaryGap: values.length === 1,
                axisLine: { lineStyle: { color: "#cbd5e1" } },
                axisTick: { show: false },
                axisLabel: { color: "#64748b", interval: 0, rotate: rotate }
            },
            yAxis: {
                type: "value",
                min: ax.min,
                max: ax.max,
                interval: ax.step,
                axisLine: { show: false },
                axisTick: { show: false },
                splitLine: { lineStyle: { color: "#e2e8f0", type: "dashed" } },
                axisLabel: { color: "#64748b", formatter: v => Number(v).toFixed(2) }
            },
            series: [{
                type: "line",
                data: points,
                smooth: 0.4,
                symbol: "circle",
                symbolSize: 10,
                emphasis: { scale: 1.4 },
                lineStyle: {
                    color: "#010853", width: 3, cap: "round",
                    shadowColor: "rgba(1,8,83,.25)", shadowBlur: 8, shadowOffsetY: 4
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
                        // below the range = red
                        [{ yAxis: ax.min, itemStyle: { color: "rgba(185,28,28,0.08)" } }, { yAxis: KPI_MIN }],
                        // inside the range = green (achieved)
                        [{ yAxis: KPI_MIN, itemStyle: { color: "rgba(4,120,87,0.10)" } }, { yAxis: KPI_MAX }],
                        // above the range = red
                        [{ yAxis: KPI_MAX, itemStyle: { color: "rgba(185,28,28,0.08)" } }, { yAxis: ax.max }]
                    ]
                },
                markLine: {
                    symbol: "none",
                    silent: true,
                    lineStyle: { color: "#b91c1c", type: "dashed", width: 2 },
                    data: [
                        { yAxis: KPI_MIN, label: lineLabel("Min " + KPI_MIN.toFixed(2), "insideEndBottom") },
                        { yAxis: KPI_MAX, label: lineLabel("Max " + KPI_MAX.toFixed(2), "insideEndTop") }
                    ]
                }
            }]
        };
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
            row("Total Birds", d => "<td>" + fmt(d.nob) + "</td>") +
            row("Total Weight (kg)", d => "<td>" + fmt(d.weight) + "</td>") +
            row("Avg Weight (kg)", d => '<td class="' + (isOk(d.avg) ? "ok" : "bad") + '">' + fmt(d.avg, 2) + "</td>") +
            "</tbody>";
    }

    // ---------------- DAILY CHART ----------------
    function renderChart(days, ym) {
        $("chartTitle").textContent = "Daily Average Bird Weight" + (ym ? " - " + monthLabel(ym) : "");

        const c = getChart("day", "kpiChart");
        if (!c) return;

        if (!days.length) { showEmpty(c, "No daily data for this month"); return; }

        c.setOption(lineOption(
            days.map(d => d.date.slice(8)),
            days.map(d => num(d.avg)),
            i => {
                const d = days[i];
                return `<b>${d.date}</b><br>Avg Weight: ${fmt(d.avg, 2)} kg` +
                    `<br>Weight: ${fmt(d.weight)} kg<br>Birds: ${fmt(d.nob)}`;
            },
            { xName: "Day" }
        ), true);
    }

    // ---------------- BATCHES CARD: achieved / not achieved ----------------
    function renderBatchCounts(ym) {
        const rows = ym ? batchData.filter(b => b.date.slice(0, 7) === ym) : [];

        if (!rows.length) {
            $("sumBatchGood").textContent = "-";
            $("sumBatchOut").textContent = "-";
            return;
        }

        const good = rows.filter(b => isOk(b.avg)).length;
        $("sumBatchGood").textContent = fmt(good);
        $("sumBatchOut").textContent = fmt(rows.length - good);
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
        $("batchTitle").textContent = "Batch-wise Average Weight" + (date ? " - " + date : "");

        const c = getChart("batch", "batchChart");
        if (!c) return;

        if (!rows.length) {
            showEmpty(c, date ? "No batch data for this date" : "Select a date");
            return;
        }

        const many = rows.length > 10;

        c.setOption(lineOption(
            rows.map(r => r.batchNo || "-"),
            rows.map(r => num(r.avg)),
            i => {
                const r = rows[i];
                return `<b>Batch ${esc(r.batchNo || "-")}</b>` +
                    `<br>Customer: ${esc(r.customer || "-")}` +
                    `<br>Avg Weight: ${fmt(r.avg, 2)} kg` +
                    `<br>Weight: ${fmt(r.weight, 2)} kg` +
                    `<br>Birds: ${fmt(r.nob)}`;
            },
            {
                xName: "Batch No",
                rotate: many ? 45 : 0,
                bottom: many ? 70 : 46,
                nameGap: many ? 52 : 28
            }
        ), true);
    }

    function renderBatchTable(rows, date) {
        const t = $("batchTable");
        $("batchTableTitle").textContent = "Batch Details" + (date ? " - " + date : "");

        if (!rows.length) {
            t.innerHTML = '<tbody><tr><td class="empty">' +
                (date ? "No batch data for this date" : "Select a date") + "</td></tr></tbody>";
            return;
        }

        const row = (label, cell) =>
            "<tr><th>" + label + "</th>" + rows.map(cell).join("") + "</tr>";

        t.innerHTML =
            "<thead><tr><th>Batch No</th>" +
            rows.map(r => "<th>" + esc(r.batchNo || "-") + "</th>").join("") +
            "</tr></thead>" +
            "<tbody>" +
            row("Total Birds", r => "<td>" + fmt(r.nob) + "</td>") +
            row("Total Weight (kg)", r => "<td>" + fmt(r.weight, 2) + "</td>") +
            row("Avg Weight (kg)",
                r => '<td class="' + (isOk(r.avg) ? "ok" : "bad") + '">' + fmt(r.avg, 2) + "</td>") +
            "</tbody>";
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
        $("yearChartTitle").textContent = "Monthly Average Bird Weight" + (year ? " - " + year : "");

        const c = getChart("year", "yearChart");
        if (!c) return;

        // only the months that have data
        const list = Object.keys(byMonth).map(Number).sort((a, b) => a - b)
            .map(n => ({ n: n, r: byMonth[n] }));

        if (!list.length) { showEmpty(c, "No monthly data"); return; }

        c.setOption(lineOption(
            list.map(x => SHORT_MONTHS[x.n - 1]),
            list.map(x => num(x.r.avg)),
            i => {
                const x = list[i];
                return `<b>${SHORT_MONTHS[x.n - 1]} ${year}</b>` +
                    `<br>Avg Weight: ${fmt(x.r.avg, 2)} kg` +
                    `<br>Weight: ${fmt(x.r.weight)} kg` +
                    `<br>Birds: ${fmt(x.r.nob)}` +
                    `<br>Batches: ${fmt(x.r.batches)}`;
            },
            { xName: "Month" }
        ), true);
    }

    function renderYearTable(byMonth, year) {
        const t = $("yearTable");
        $("yearTableTitle").textContent = "Monthly Details" + (year ? " - " + year : "");

        if (!year) { t.innerHTML = ""; return; }

        // equal width for every month column (data or no data)
        t.style.minWidth = (150 + 12 * 96) + "px";

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
            row("Total Birds", m => "<td>" + fmt(m.nob) + "</td>") +
            row("Total Weight (kg)", m => "<td>" + fmt(m.weight) + "</td>") +
            row("Avg Weight (kg)", m => '<td class="' + (isOk(m.avg) ? "ok" : "bad") + '">' + fmt(m.avg, 2) + "</td>") +
            "</tbody>";
    }

    window.addEventListener("resize", () => {
        Object.keys(charts).forEach(k => { if (charts[k]) charts[k].resize(); });
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
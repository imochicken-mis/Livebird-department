document.addEventListener("DOMContentLoaded", () => {

    // Standard: mortality must be BELOW this value (%). Overwritten by the server value.
    let KPI_STANDARD = 0.2;

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

        renderChart(days, ym);
        renderTable(days, ym);
        renderBatchSection(ym);
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

        const row = (label, cell) =>
            "<tr><th>" + label + "</th>" +
            nums.map(n => {
                const d = byDay[n];
                return d ? cell(d) : '<td class="empty">-</td>';
            }).join("") + "</tr>";

        t.innerHTML =
            "<thead><tr><th>Day</th>" + nums.map(n => "<th>" + n + "</th>").join("") + "</tr></thead>" +
            "<tbody>" +
            row("Batch Count", d => "<td>" + fmt(d.batches) + "</td>") +
            row("Total Birds", d => "<td>" + fmt(d.birds) + "</td>") +
            row("DOA", d => "<td>" + fmt(d.doa) + "</td>") +
            row("KPI Value", d => '<td class="' + (isBad(num(d.kpi)) ? "bad" : "ok") + '">' + fmt(d.kpi, 2) + "%</td>") +
            "</tbody>";
    }

    // ---------------- CHART ----------------
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

        const points = days.map(d => ({
            value: Number(num(d.kpi).toFixed(3)),
            itemStyle: { color: isBad(num(d.kpi)) ? "#b91c1c" : "#047857" }
        }));

        chart.setOption({
            grid: { left: 56, right: 40, top: 40, bottom: 46 },
            tooltip: {
                trigger: "axis",
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
                boundaryGap: false
            },
            yAxis: {
                type: "value",
                min: 0,
                max: yMax,
                interval: yStep,
                axisLabel: { formatter: v => Number(v).toFixed(2) + "%" }
            },
series: [{
    type: "line",
    data: points,
    symbolSize: 8,
    lineStyle: { color: "#010853", width: 2 },
    markArea: {
        silent: true,
        data: [
            // below the standard = green (good)
            [
                { yAxis: 0, itemStyle: { color: "rgba(4,120,87,0.12)" } },
                { yAxis: KPI_STANDARD }
            ],
            // above the standard = red (bad)
            [
                { yAxis: KPI_STANDARD, itemStyle: { color: "rgba(185,28,28,0.10)" } },
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

        const points = rows.map(r => ({
            value: Number(num(r.kpi).toFixed(3)),
            itemStyle: { color: isBad(num(r.kpi)) ? "#b91c1c" : "#047857" }
        }));

        batchChart.setOption({
            grid: { left: 56, right: 40, top: 40, bottom: rows.length > 10 ? 70 : 46 },
            tooltip: {
                trigger: "axis",
                formatter: p => {
                    const r = rows[p[0].dataIndex];
                    return `<b>Batch ${r.batchNo || "-"}</b>` +
                        `<br>Vehicle: ${r.vehicle || "-"}` +
                        `<br>Mortality: ${fmt(r.kpi, 2)}%` +
                        `<br>DOA: ${fmt(r.doa)}` +
                        `<br>Avail Birds: ${fmt(r.avail)}` +
                        `<br>Received: ${fmt(r.birds)}`;
                }
            },
            xAxis: {
                type: "category",
                data: rows.map(r => r.batchNo || "-"),
                name: "Batch No",
                nameLocation: "middle",
                nameGap: rows.length > 10 ? 52 : 28,
                boundaryGap: false,
                axisLabel: { interval: 0, rotate: rows.length > 10 ? 45 : 0 }
            },
            yAxis: {
                type: "value",
                min: 0,
                max: yMax,
                interval: yStep,
                axisLabel: { formatter: v => Number(v).toFixed(2) + "%" }
            },
            series: [{
                type: "line",
                data: points,
                symbolSize: 8,
                lineStyle: { color: "#010853", width: 2 },
                markArea: {
                    silent: true,
                    data: [
                        [{ yAxis: 0, itemStyle: { color: "rgba(4,120,87,0.12)" } }, { yAxis: KPI_STANDARD }],
                        [{ yAxis: KPI_STANDARD, itemStyle: { color: "rgba(185,28,28,0.10)" } }, { yAxis: yMax }]
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
    });

    // ---------------- BUTTONS ----------------
    $("kpiMonth").addEventListener("change", render);
    $("kpiDate").addEventListener("change", () => renderBatchSection($("kpiMonth").value));
    $("refreshBtn").addEventListener("click", async () => {
        const b = $("refreshBtn");
        b.disabled = true; b.textContent = "Refreshing...";
        try { await loadData(); } finally { b.disabled = false; b.textContent = "Refresh"; }
    });

    loadData();
});
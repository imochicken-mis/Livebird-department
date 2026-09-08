document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // ELEMENTS
    // =========================================================

    const fromDateInput =
        document.getElementById("fromDate");

    const toDateInput =
        document.getElementById("toDate");

    const filterBtn =
        document.getElementById("filterBtn");

    const clearBtn =
        document.getElementById("clearBtn");

    const refreshBtn =
        document.getElementById("refreshBtn");

    const reportTableBody =
        document.getElementById("reportTableBody");

    const reportLoading =
        document.getElementById("reportLoading");

    const reportMessage =
        document.getElementById("reportMessage");

    const totalDisableNob =
        document.getElementById("totalDisableNob");

    const totalDisableWeight =
        document.getElementById("totalDisableWeight");

    const totalDisableAmount =
        document.getElementById("totalDisableAmount");

    const totalHealthyNob =
        document.getElementById("totalHealthyNob");

    const totalHealthyWeight =
        document.getElementById("totalHealthyWeight");

    const totalHealthyAmount =
        document.getElementById("totalHealthyAmount");

    const totalNob =
        document.getElementById("totalNob");

    const totalWeight =
        document.getElementById("totalWeight");

    const totalAmount =
        document.getElementById("totalAmount");

    const loggedUser =
        document.getElementById("loggedUser");

    const logoutBtn =
        document.getElementById("logoutBtn");


    // =========================================================
    // MONTHLY KPI / CHART ELEMENTS
    // =========================================================

    const kpiMonthFilter =
        document.getElementById("kpiMonthFilter");

    const kpiFilterBtn =
        document.getElementById("kpiFilterBtn");

    const kpiClearBtn =
        document.getElementById("kpiClearBtn");

    const kpiRefreshBtn =
        document.getElementById("kpiRefreshBtn");

    const kpiLoader =
        document.getElementById("kpiLoader");

    const kpiMessage =
        document.getElementById("kpiMessage");


    // =========================================================
    // SESSION CHECK
    // =========================================================

    const sessionUser =
        sessionStorage.getItem("livebirdUser");

    if (!sessionUser) {
        window.location.href = "../index.html";
        return;
    }

    const user = JSON.parse(sessionUser);

    if (
        !user.username ||
        user.username.toLowerCase() !== "user4"
    ) {
        sessionStorage.removeItem("livebirdUser");
        window.location.href = "../index.html";
        return;
    }


    loggedUser.textContent =
        `Logged in as: ${user.name || user.username}`;


    // =========================================================
    // REPORT DATA STORAGE
    // =========================================================

    let allReportData = [];


    // =========================================================
    // DEFAULT MONTH (CURRENT MONTH)
    // =========================================================

    if (kpiMonthFilter && !kpiMonthFilter.value) {

        kpiMonthFilter.value =
            AdminCommon.getCurrentMonth();

    }


    // =========================================================
    // MONTHLY CHARTS (ECHARTS)
    // =========================================================

    const customerNobWeightChart =
        AdminCommon.initializeChart(
            document.getElementById("customerNobWeightChart")
        );

    const weightSplitPieChart =
        AdminCommon.initializeChart(
            document.getElementById("weightSplitPieChart")
        );

    const dailyBirdsChart =
        AdminCommon.initializeChart(
            document.getElementById("dailyBirdsChart")
        );

    const monthlyCharts = [
        customerNobWeightChart,
        weightSplitPieChart,
        dailyBirdsChart
    ];

    AdminCommon.bindChartResize(monthlyCharts);


    setupMonthlyCharts();


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    loadReportData();


    // =========================================================
    // LOAD DATA
    // =========================================================

    async function loadReportData() {

        showLoading(true);
        clearMessage();

        try {

            const result =
                await getCatchingBreakdownData();

            if (!result.success) {

                showMessage(
                    result.message ||
                    "Unable to load report data.",
                    "error"
                );

                allReportData = [];

                renderAll([]);

                applyKpiFilter();

                return;
            }


            allReportData =
                Array.isArray(result.data)
                    ? result.data
                    : [];


            applyFilter();

            applyKpiFilter();


        } catch (error) {

            console.error(
                "Report loading error:",
                error
            );

            showMessage(
                "Unable to connect to the server.",
                "error"
            );

            allReportData = [];

            renderAll([]);

            applyKpiFilter();

        } finally {

            showLoading(false);
        }

    }


    // =========================================================
    // MONTHLY KPI / CHART BASE OPTIONS
    // =========================================================

    function setupMonthlyCharts() {

        // -------------------------------------------------
        // CUSTOMER SPLIT — NOB (bars) & WEIGHT (lines)
        // -------------------------------------------------

        customerNobWeightChart?.setOption({

            animation: true,

            animationDuration: 1400,

            tooltip: {
                trigger: "axis",
                formatter: function (params) {

                    let html =
                        `<div style="font-weight:600;margin-bottom:4px;">${params[0].axisValue}</div>`;

                    params.forEach(p => {

                        const value =
                            Number(p.value).toLocaleString(
                                undefined,
                                { minimumFractionDigits: 0, maximumFractionDigits: 1 }
                            );

                        html += `${p.marker} ${p.seriesName}: <b>${value}</b><br/>`;
                    });

                    return html;
                }
            },

            legend: {

                data: [
                    "Healthy NOB",
                    "Disable NOB",
                    "Healthy Weight (kg)",
                    "Disable Weight (kg)"
                ],

                top: 0,

                textStyle: {
                    fontSize: 11
                }

            },

            grid: {
                left: "3%",
                right: "4%",
                bottom: "5%",
                top: "20%",
                containLabel: true
            },

            xAxis: {
                type: "category",
                data: [
                    "Imo Plant",
                    "Other Live Sale"
                ]
            },

            yAxis: [
                {
                    type: "value",
                    name: "NOB"
                },
                {
                    type: "value",
                    name: "Weight (kg)",
                    splitLine: {
                        show: false
                    }
                }
            ],

            series: [

                {
                    name: "Healthy NOB",
                    type: "bar",
                    yAxisIndex: 0,
                    barMaxWidth: 60,
                    data: [0, 0],
                    itemStyle: {
                        color: "#10b981",
                        borderRadius: [6, 6, 0, 0]
                    }
                },

                {
                    name: "Disable NOB",
                    type: "bar",
                    yAxisIndex: 0,
                    barMaxWidth: 60,
                    data: [0, 0],
                    itemStyle: {
                        color: "#ef4444",
                        borderRadius: [6, 6, 0, 0]
                    }
                },

                {
                    name: "Healthy Weight (kg)",
                    type: "line",
                    yAxisIndex: 1,
                    smooth: true,
                    showSymbol: true,
                    symbolSize: 7,
                    lineStyle: {
                        color: "#010853",
                        width: 3
                    },
                    itemStyle: {
                        color: "#010853"
                    },
                    areaStyle: {
                        opacity: 0.15
                    },
                    data: [0, 0]
                },

                {
                    name: "Disable Weight (kg)",
                    type: "line",
                    yAxisIndex: 1,
                    smooth: true,
                    showSymbol: true,
                    symbolSize: 7,
                    lineStyle: {
                        color: "#f59e0b",
                        width: 3
                    },
                    itemStyle: {
                        color: "#f59e0b"
                    },
                    areaStyle: {
                        opacity: 0.15
                    },
                    data: [0, 0]
                }

            ]

        });


        // -------------------------------------------------
        // WEIGHT SHARE — PIE
        // -------------------------------------------------

        weightSplitPieChart?.setOption({

            animation: true,

            animationDuration: 1200,

            tooltip: {
                trigger: "item",
                formatter: "{b}: {c} kg ({d}%)"
            },

            legend: {
                orient: "vertical",
                left: "left",
                top: "middle"
            },

            series: [
                {
                    name: "Weight Share",
                    type: "pie",
                    radius: ["45%", "72%"],
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 6,
                        borderColor: "#fff",
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: "outside",
                        formatter: "{b}\n{d}%",
                        fontSize: 12,
                        fontWeight: "500"
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 16,
                            fontWeight: "bold"
                        }
                    },
                    labelLine: {
                        show: true,
                        length: 10,
                        length2: 12
                    },
                    data: [
                        {
                            name: "Healthy Weight",
                            value: 0,
                            itemStyle: {
                                color: "#10b981"
                            }
                        },
                        {
                            name: "Disable Weight",
                            value: 0,
                            itemStyle: {
                                color: "#ef4444"
                            }
                        }
                    ]
                }
            ]

        });


        // -------------------------------------------------
        // DAY-WISE HEALTHY / DISABLE BIRDS
        // -------------------------------------------------

        dailyBirdsChart?.setOption({

            animation: true,

            animationDuration: 1600,

            animationEasing: "cubicOut",

            tooltip: {
                trigger: "axis"
            },

            legend: {

                data: [
                    "Healthy Birds",
                    "Disable Birds"
                ],

                top: 0

            },

            grid: {
                left: "3%",
                right: "4%",
                bottom: "8%",
                top: "18%",
                containLabel: true
            },

            xAxis: {
                type: "category",
                data: [],
                boundaryGap: false,
                axisLabel: {
                    fontSize: 11
                }
            },

            yAxis: {
                type: "value",
                name: "NOB"
            },

            series: [

                {
                    name: "Healthy Birds",
                    type: "line",
                    smooth: true,
                    showSymbol: true,
                    symbolSize: 6,
                    lineStyle: {
                        color: "#10b981",
                        width: 3
                    },
                    itemStyle: {
                        color: "#10b981"
                    },
                    areaStyle: {
                        opacity: 0.12
                    },
                    data: []
                },

                {
                    name: "Disable Birds",
                    type: "line",
                    smooth: true,
                    showSymbol: true,
                    symbolSize: 6,
                    lineStyle: {
                        color: "#ef4444",
                        width: 3
                    },
                    itemStyle: {
                        color: "#ef4444"
                    },
                    areaStyle: {
                        opacity: 0.12
                    },
                    data: []
                }

            ]

        });

    }


    // =========================================================
    // MONTHLY KPI FILTER
    // =========================================================

    function applyKpiFilter() {

        const selectedMonth =
            kpiMonthFilter ? kpiMonthFilter.value : "";

        const monthlyData =
            AdminCommon.filterByMonth(
                allReportData,
                selectedMonth
            );

        updateKpiCards(monthlyData);

        updateMonthlyCharts(
            monthlyData,
            selectedMonth
        );

    }


    // =========================================================
    // UPDATE KPI CARDS
    // =========================================================

    function updateKpiCards(data) {

        const healthyNob =
            AdminCommon.sumBy(data, "healthy_nob");

        const disableNob =
            AdminCommon.sumBy(data, "disable_nob");

        const totalNobSum =
            healthyNob + disableNob;

        const healthyWeight =
            AdminCommon.sumBy(data, "healthy_weight");

        const disableWeight =
            AdminCommon.sumBy(data, "disable_weight");

        const totalWeightSum =
            healthyWeight + disableWeight;

        const healthyAmount =
            AdminCommon.sumBy(data, "healthy_amount");

        const disableAmount =
            AdminCommon.sumBy(data, "disable_amount");

        const totalAmountSum =
            healthyAmount + disableAmount;

        const usableRate =
            totalNobSum > 0
                ? (healthyNob / totalNobSum) * 100
                : 0;

        const disableRate =
            totalNobSum > 0
                ? (disableNob / totalNobSum) * 100
                : 0;


        document.getElementById("kpiTotalBirds").textContent =
            AdminCommon.formatWhole(totalNobSum);

        document.getElementById("kpiBirdsHealthy").textContent =
            AdminCommon.formatWhole(healthyNob);

        document.getElementById("kpiBirdsDisable").textContent =
            AdminCommon.formatWhole(disableNob);


        document.getElementById("kpiTotalWeight").textContent =
            AdminCommon.formatWeight(totalWeightSum);

        document.getElementById("kpiWeightHealthy").textContent =
            AdminCommon.formatWeight(healthyWeight);

        document.getElementById("kpiWeightDisable").textContent =
            AdminCommon.formatWeight(disableWeight);


        document.getElementById("kpiUsableRate").textContent =
            `${usableRate.toFixed(2)}%`;

        document.getElementById("kpiRateHealthy").textContent =
            `${usableRate.toFixed(2)}%`;

        document.getElementById("kpiRateDisable").textContent =
            `${disableRate.toFixed(2)}%`;


        document.getElementById("kpiTotalAmount").textContent =
            AdminCommon.formatAmount(totalAmountSum);

        document.getElementById("kpiAmountHealthy").textContent =
            AdminCommon.formatAmount(healthyAmount);

        document.getElementById("kpiAmountDisable").textContent =
            AdminCommon.formatAmount(disableAmount);

    }


    // =========================================================
    // UPDATE MONTHLY CHARTS
    // =========================================================

    function updateMonthlyCharts(data, selectedMonth) {

        // -------------------------------------------------
        // CUSTOMER SPLIT — IMO PLANT vs OTHER LIVE SALE
        // -------------------------------------------------

        let imoHealthyNob = 0;
        let imoDisableNob = 0;
        let imoHealthyWeight = 0;
        let imoDisableWeight = 0;

        let otherHealthyNob = 0;
        let otherDisableNob = 0;
        let otherHealthyWeight = 0;
        let otherDisableWeight = 0;

        let totalHealthyWeightAll = 0;
        let totalDisableWeightAll = 0;

        data.forEach(row => {

            const customer =
                String(row.customer || "")
                    .trim()
                    .toLowerCase();

            const isImoPlant =
                customer === "imo plant";

            const hNob = safeNumber(row.healthy_nob);
            const dNob = safeNumber(row.disable_nob);
            const hWeight = safeNumber(row.healthy_weight);
            const dWeight = safeNumber(row.disable_weight);

            if (isImoPlant) {

                imoHealthyNob += hNob;
                imoDisableNob += dNob;
                imoHealthyWeight += hWeight;
                imoDisableWeight += dWeight;

            } else {

                otherHealthyNob += hNob;
                otherDisableNob += dNob;
                otherHealthyWeight += hWeight;
                otherDisableWeight += dWeight;

            }

            totalHealthyWeightAll += hWeight;
            totalDisableWeightAll += dWeight;

        });


        customerNobWeightChart?.setOption({

            series: [

                {
                    data: [
                        imoHealthyNob,
                        otherHealthyNob
                    ]
                },

                {
                    data: [
                        imoDisableNob,
                        otherDisableNob
                    ]
                },

                {
                    data: [
                        imoHealthyWeight,
                        otherHealthyWeight
                    ]
                },

                {
                    data: [
                        imoDisableWeight,
                        otherDisableWeight
                    ]
                }

            ]

        });


        // -------------------------------------------------
        // WEIGHT SHARE — PIE
        // -------------------------------------------------

        weightSplitPieChart?.setOption({

            series: [
                {
                    data: [
                        {
                            name: "Healthy Weight",
                            value: Number(
                                totalHealthyWeightAll.toFixed(2)
                            ),
                            itemStyle: {
                                color: "#10b981"
                            }
                        },
                        {
                            name: "Disable Weight",
                            value: Number(
                                totalDisableWeightAll.toFixed(2)
                            ),
                            itemStyle: {
                                color: "#ef4444"
                            }
                        }
                    ]
                }
            ]

        });


        // -------------------------------------------------
        // DAY-WISE HEALTHY / DISABLE BIRDS
        // -------------------------------------------------

        const dayKeys =
            buildDayRange(selectedMonth, data);

        const dailyMap = {};

        dayKeys.forEach(day => {

            dailyMap[day] = {
                healthy: 0,
                disable: 0
            };

        });

        data.forEach(row => {

            const rowDate =
                AdminCommon.normalizeDate(row.date);

            if (!rowDate) {
                return;
            }

            if (!dailyMap[rowDate]) {

                dailyMap[rowDate] = {
                    healthy: 0,
                    disable: 0
                };

                dayKeys.push(rowDate);

            }

            dailyMap[rowDate].healthy +=
                safeNumber(row.healthy_nob);

            dailyMap[rowDate].disable +=
                safeNumber(row.disable_nob);

        });

        const sortedDays =
            dayKeys.slice().sort();

        const dayLabels =
            sortedDays.map(day => day.slice(8, 10));

        const healthySeries =
            sortedDays.map(day => dailyMap[day].healthy);

        const disableSeries =
            sortedDays.map(day => dailyMap[day].disable);


        dailyBirdsChart?.setOption({

            xAxis: {
                data: dayLabels
            },

            series: [
                { data: healthySeries },
                { data: disableSeries }
            ]

        });

    }


    // =========================================================
    // BUILD FULL DAY RANGE FOR A GIVEN MONTH (YYYY-MM)
    // =========================================================

    function buildDayRange(selectedMonth, data) {

        if (!selectedMonth) {

            // No month selected — fall back to the distinct
            // dates already present in the filtered data.

            const distinctDates =
                new Set();

            data.forEach(row => {

                const rowDate =
                    AdminCommon.normalizeDate(row.date);

                if (rowDate) {
                    distinctDates.add(rowDate);
                }

            });

            return Array.from(distinctDates);

        }

        const parts =
            selectedMonth.split("-");

        const year = Number(parts[0]);
        const month = Number(parts[1]);

        const daysInMonth =
            new Date(year, month, 0).getDate();

        const days = [];

        for (let day = 1; day <= daysInMonth; day++) {

            const dateStr =
                `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            days.push(dateStr);

        }

        return days;

    }


    // =========================================================
    // KPI LOADER / MESSAGE
    // =========================================================

    function showKpiMessage(msg, type) {

        if (!kpiMessage) {
            return;
        }

        kpiMessage.textContent = msg;

        kpiMessage.classList.remove("success", "error");
        kpiMessage.classList.add(type);

    }


    // =========================================================
    // FILTER
    // =========================================================

    function applyFilter() {

        const fromDate =
            fromDateInput.value;

        const toDate =
            toDateInput.value;


        if (!fromDate && !toDate) {

            renderAll(allReportData);

            return;
        }


        const filteredData =
            allReportData.filter(row => {

                const rowDate =
                    normalizeDate(row.date);

                if (!rowDate) {
                    return false;
                }


                if (
                    fromDate &&
                    rowDate < fromDate
                ) {
                    return false;
                }


                if (
                    toDate &&
                    rowDate > toDate
                ) {
                    return false;
                }


                return true;
            });


        renderAll(filteredData);

        showMessage(
            `Filtered ${filteredData.length} records found.`,
            "success"
        );

    }


    // =========================================================
    // CLEAR FILTER
    // =========================================================

    function clearFilter() {

        fromDateInput.value = "";
        toDateInput.value = "";

        clearMessage();

        renderAll(allReportData);

        showMessage(
            "Filters cleared.",
            "success"
        );

    }


    // =========================================================
    // REFRESH
    // =========================================================

    async function refreshReport() {

        refreshBtn.disabled = true;

        refreshBtn.textContent =
            "Refreshing...";

        try {

            await loadReportData();

            showMessage(
                "Report refreshed successfully.",
                "success"
            );

        } finally {

            refreshBtn.disabled = false;

            refreshBtn.textContent =
                "Refresh";
        }

    }


    // =========================================================
    // RENDER ALL (TABLE + TOTALS)
    // =========================================================

    function renderAll(data) {

        renderTable(data);

        updateTotals(data);

    }


    // =========================================================
    // TABLE RENDER
    // =========================================================

    function renderTable(data) {

        reportTableBody.innerHTML = "";


        if (!data || data.length === 0) {

            const row =
                document.createElement("tr");

            row.classList.add(
                "report-empty-row"
            );

            row.innerHTML = `
                <td colspan="20">
                    No report records found.
                </td>
            `;

            reportTableBody.appendChild(
                row
            );

            return;
        }


        data.forEach(record => {

            const row =
                document.createElement("tr");


            row.innerHTML = `
                
                
                <td>${escapeHtml(record.date)}</td>

                <td>${escapeHtml(record.type)}</td>

                <td>${escapeHtml(record.farmer)}</td>

                <td>${escapeHtml(record.cage)}</td>

                <td>${escapeHtml(record.batch)}</td>

                <td>${escapeHtml(record.customer)}</td>

                <td>${escapeHtml(record.bill)}</td>

                <td>${escapeHtml(record.disable_bill)}</td>

                <td>${formatNumber(record.disable_nob, 0)}</td>

                <td>${formatNumber(record.disable_weight, 2)}</td>

                <td>${formatNumber(record.disable_price, 2)}</td>

                <td>${formatNumber(record.disable_amount, 2)}</td>

                <td>${formatNumber(record.healthy_nob, 0)}</td>

                <td>${formatNumber(record.healthy_weight, 2)}</td>

                <td>${formatNumber(record.healthy_price, 2)}</td>

                <td>${formatNumber(record.healthy_amount, 2)}</td>

                <td>${formatNumber(record.total_nob, 0)}</td>

                <td>${formatNumber(record.total_weight, 2)}</td>

                <td>${formatNumber(record.total_price, 2)}</td>

                <td>${formatNumber(record.total_amount, 2)}</td>

            `;


            reportTableBody.appendChild(
                row
            );

        });

    }


    // =========================================================
    // TOTALS
    // =========================================================

    function updateTotals(data) {

        let disableNob = 0;
        let disableWeight = 0;
        let disableAmount = 0;

        let healthyNob = 0;
        let healthyWeight = 0;
        let healthyAmount = 0;

        let nob = 0;
        let weight = 0;
        let amount = 0;


        data.forEach(row => {

            disableNob += safeNumber(row.disable_nob);
            disableWeight += safeNumber(row.disable_weight);
            disableAmount += safeNumber(row.disable_amount);

            healthyNob += safeNumber(row.healthy_nob);
            healthyWeight += safeNumber(row.healthy_weight);
            healthyAmount += safeNumber(row.healthy_amount);

            nob += safeNumber(row.total_nob);
            weight += safeNumber(row.total_weight);
            amount += safeNumber(row.total_amount);

        });


        totalDisableNob.textContent =
            formatDisplayNumber(disableNob, 0);

        totalDisableWeight.textContent =
            formatDisplayNumber(disableWeight, 2);

        totalDisableAmount.textContent =
            formatDisplayNumber(disableAmount, 2);

        totalHealthyNob.textContent =
            formatDisplayNumber(healthyNob, 0);

        totalHealthyWeight.textContent =
            formatDisplayNumber(healthyWeight, 2);

        totalHealthyAmount.textContent =
            formatDisplayNumber(healthyAmount, 2);

        totalNob.textContent =
            formatDisplayNumber(nob, 0);

        totalWeight.textContent =
            formatDisplayNumber(weight, 2);

        totalAmount.textContent =
            formatDisplayNumber(amount, 2);


    }


    // =========================================================
    // DATE NORMALIZER
    // =========================================================

    function normalizeDate(value) {

        if (!value) {
            return "";
        }

        const stringValue =
            String(value).trim();

        if (!stringValue) {
            return "";
        }


        // Expected format:
        // YYYY-MM-DD

        if (
            /^\d{4}-\d{2}-\d{2}/
                .test(stringValue)
        ) {

            return stringValue.substring(
                0,
                10
            );
        }


        const date =
            new Date(stringValue);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "";
        }


        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");


        return `${year}-${month}-${day}`;

    }


    // =========================================================
    // NUMBER HELPERS
    // =========================================================

    function safeNumber(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return 0;
        }


        const cleaned =
            String(value)
                .replace(/,/g, "")
                .trim();


        const number =
            parseFloat(cleaned);


        return Number.isFinite(number)
            ? number
            : 0;

    }


    function formatNumber(
        value,
        decimals
    ) {

        const number =
            safeNumber(value);

        return number.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }
        );

    }


    function formatDisplayNumber(
        value,
        decimals
    ) {

        return value.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            }
        );

    }


    // =========================================================
    // HTML SAFETY
    // =========================================================

    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }


        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    // =========================================================
    // LOADING / MESSAGE
    // =========================================================

    function showLoading(show) {

        if (show) {

            reportLoading.classList.remove(
                "hidden"
            );

        } else {

            reportLoading.classList.add(
                "hidden"
            );
        }

        AdminCommon.setLoading(
            kpiLoader,
            show
        );

    }


    function showMessage(
        message,
        type
    ) {

        reportMessage.textContent =
            message;

        reportMessage.classList.remove(
            "success",
            "error"
        );

        reportMessage.classList.add(
            type
        );

    }


    function clearMessage() {

        reportMessage.textContent = "";

        reportMessage.classList.remove(
            "success",
            "error"
        );

    }


    // =========================================================
    // BUTTON EVENTS
    // =========================================================

    filterBtn.addEventListener(
        "click",
        applyFilter
    );


    clearBtn.addEventListener(
        "click",
        clearFilter
    );


    refreshBtn.addEventListener(
        "click",
        refreshReport
    );


    // =========================================================
    // MONTHLY KPI BUTTON EVENTS
    // =========================================================

    if (kpiFilterBtn) {

        kpiFilterBtn.addEventListener(
            "click",
            () => {

                applyKpiFilter();

                showKpiMessage(
                    "Monthly overview updated.",
                    "success"
                );

            }
        );

    }


    if (kpiMonthFilter) {

        kpiMonthFilter.addEventListener(
            "change",
            () => applyKpiFilter()
        );

    }


    if (kpiClearBtn) {

        kpiClearBtn.addEventListener(
            "click",
            () => {

                if (kpiMonthFilter) {

                    kpiMonthFilter.value =
                        AdminCommon.getCurrentMonth();

                }

                applyKpiFilter();

                showKpiMessage(
                    "Reset to the current month.",
                    "success"
                );

            }
        );

    }


    if (kpiRefreshBtn) {

        kpiRefreshBtn.addEventListener(
            "click",
            async () => {

                kpiRefreshBtn.disabled = true;

                kpiRefreshBtn.textContent =
                    "Refreshing...";

                try {

                    await loadReportData();

                    showKpiMessage(
                        "Monthly overview refreshed.",
                        "success"
                    );

                } finally {

                    kpiRefreshBtn.disabled = false;

                    kpiRefreshBtn.textContent =
                        "Refresh";

                }

            }
        );

    }


    // =========================================================
    // LOGOUT
    // =========================================================

    logoutBtn.addEventListener(
        "click",
        () => {

            sessionStorage.removeItem(
                "livebirdUser"
            );

            window.location.href =
                "../index.html";

        }
    );

});
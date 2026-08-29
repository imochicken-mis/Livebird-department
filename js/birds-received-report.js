document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // SESSION
    // =====================================================

    const user =
        AdminCommon.getSessionUser();

    if (!user) return;


    AdminCommon.setLoggedUser(
        document.getElementById("loggedUser"),
        user
    );


    AdminCommon.bindLogout(
        document.getElementById("logoutBtn")
    );


    // =====================================================
    // ELEMENTS
    // =====================================================

    const selectedDate =
        document.getElementById("selectedDate");

    const filterBtn =
        document.getElementById("filterBtn");

    const clearBtn =
        document.getElementById("clearBtn");

    const refreshBtn =
        document.getElementById("refreshBtn");   

    const loader =
        document.getElementById("analyticsLoader");

    const filterMemory =
        AdminCommon.enableFilterMemory(
            "birdsReceived"
        );     

    const message =
        document.getElementById("analyticsMessage");

    const doaRatioBadge =
        document.getElementById("doaRatioBadge");

    const vehicleSummaryTableBody =
        document.getElementById("vehicleSummaryTableBody");

    const birdsTableBody =
        document.getElementById("birdsTableBody");


    // =====================================================
    // DATA
    // =====================================================

    let allReportData = [];


    // =====================================================
    // DEFAULT DATE = TODAY
    // =====================================================

    if (!selectedDate.value) {
    selectedDate.value =
        AdminCommon.getToday();
    }


    // =====================================================
    // CHARTS
    // =====================================================

    const tripComparisonChart =
        AdminCommon.initializeChart(
            document.getElementById("tripComparisonChart")
        );


    const batchWeightChart =
        AdminCommon.initializeChart(
            document.getElementById("batchWeightChart")
        );


    AdminCommon.bindChartResize([
        tripComparisonChart,
        batchWeightChart
    ]);


    // =====================================================
    // CHART SETUP
    // =====================================================

    function setupCharts() {

        // -------------------------------------------------
        // TRIP COMPARISON
        // -------------------------------------------------

        tripComparisonChart?.setOption({

            animation: true,

            animationDuration: 1600,

            tooltip: {
                trigger: "axis"
            },

            legend: {
                data: [
                    "Order Birds",
                    "Available Birds",
                    "DOA"
                ],
                top: 0
            },

            grid: {
                left: "3%",
                right: "4%",
                top: "18%",
                bottom: "10%",
                containLabel: true
            },

            xAxis: {
                type: "category",
                data: [],

                axisLabel: {
                    fontSize: 11,
                    fontWeight: "bold",
                    interval: 0
                }
            },

            yAxis: [
                {
                    type: "value",
                    name: "Birds",

                    splitLine: {
                        show: true,

                        lineStyle: {
                            type: "dashed",
                            color: "#e2e8f0"
                        }
                    }
                },

                {
                    type: "value",
                    name: "DOA Count",
                    position: "right",

                    splitLine: {
                        show: false
                    }
                }
            ],

            series: [

                {
                    name: "Order Birds",
                    type: "bar",

                    data: [],

                    itemStyle: {
                        color: "#039BF9",
                        borderRadius: [4, 4, 0, 0]
                    }
                },

                {
                    name: "Available Birds",
                    type: "bar",

                    data: [],

                    itemStyle: {
                        color: "#00E439",
                        borderRadius: [4, 4, 0, 0]
                    }
                },

                {
                    name: "DOA",
                    type: "line",

                    yAxisIndex: 1,

                    smooth: true,

                    symbolSize: 8,

                    lineStyle: {
                        width: 3,
                        color: "#ef4444"
                    },

                    itemStyle: {
                        color: "#ef4444"
                    },

                    areaStyle: {

                        origin: "start",

                        color: {

                            type: "linear",

                            x: 0,
                            y: 0,
                            x2: 0,
                            y2: 1,

                            colorStops: [
                                {
                                    offset: 0,
                                    color:
                                        "rgba(239, 68, 68, 0.20)"
                                },
                                {
                                    offset: 1,
                                    color:
                                        "rgba(239, 68, 68, 0.02)"
                                }
                            ]
                        }
                    },

                    data: []
                }

            ]

        });


        // -------------------------------------------------
        // BATCH WEIGHT
        // -------------------------------------------------

        batchWeightChart?.setOption({

            animation: true,

            animationDuration: 1600,

            tooltip: {
                trigger: "axis"
            },

            legend: {
                data: [
                    "Expected Avg",
                    "Actual Avg",
                    "Variance (Diff)"
                ],
                top: 0
            },

            grid: {
                left: "3%",
                right: "4%",
                bottom: "10%",
                top: "15%",
                containLabel: true
            },

            xAxis: {
                type: "category",
                data: [],

                axisLabel: {
                    fontSize: 11,
                    fontWeight: "bold",
                    interval: 0
                }
            },

            yAxis: [
                {
                    type: "value",
                    name: "Weight (kg)",

                    splitLine: {
                        show: true,

                        lineStyle: {
                            type: "dashed",
                            color: "#e2e8f0"
                        }
                    }
                },

                {
                    type: "value",
                    name: "Diff (kg)",
                    position: "right",

                    splitLine: {
                        show: false
                    }
                }
            ],

            series: [

                {
                    name: "Expected Avg",
                    type: "bar",

                    data: [],

                    itemStyle: {
                        color: "#023007",
                        borderRadius: [4, 4, 0, 0]
                    }
                },

                {
                    name: "Actual Avg",
                    type: "bar",

                    data: [],

                    itemStyle: {
                        color: "#ffda07",
                        borderRadius: [4, 4, 0, 0]
                    }
                },

                {
                    name: "Variance (Diff)",
                    type: "line",

                    yAxisIndex: 1,

                    smooth: true,

                    symbolSize: 8,

                    lineStyle: {
                        width: 3,
                        color: "#fe8504"
                    },

                    itemStyle: {
                        color: "#fe8504"
                    },

                    data: []
                }

            ]

        });

    }


    // =====================================================
    // TIME HELPER
    // =====================================================

    function parseTimeToMinutes(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return 0;
        }


        const text =
            String(value).trim();


        if (!text.includes(":")) {
            return 0;
        }


        const parts =
            text.split(":");


        const hours =
            parseInt(parts[0], 10) || 0;

        const minutes =
            parseInt(parts[1], 10) || 0;


        return (
            hours * 60
            +
            minutes
        );

    }


    // =====================================================
    // KPI + TOTALS
    // =====================================================

    function calculateMetrics(data) {

        const totalOrder =
            AdminCommon.sumBy(
                data,
                "order_birds"
            );


        const totalAvailable =
            AdminCommon.sumBy(
                data,
                "available_birds"
            );


        const totalWeight =
            AdminCommon.sumBy(
                data,
                "weight"
            );


        const totalWeightDiff =
            AdminCommon.sumBy(
                data,
                "weight_diff"
            );


        const totalDoa =
            AdminCommon.sumBy(
                data,
                "doa"
            );


        const actualAvgOverall =
            totalAvailable > 0

                ? totalWeight /
                  totalAvailable

                : 0;


        const doaPct =
            totalAvailable > 0

                ? (
                    totalDoa /
                    totalAvailable
                ) * 100

                : 0;


        return {

            totalOrder,

            totalAvailable,

            totalWeight,

            totalWeightDiff,

            totalDoa,

            actualAvgOverall,

            doaPct

        };

    }


    function updateKpis(
        metrics
    ) {

        document.getElementById(
            "kpiBirdsReceived"
        ).textContent =
            AdminCommon.formatWhole(
                metrics.totalAvailable
            );


        document.getElementById(
            "kpiLiveWeight"
        ).textContent =

            metrics.totalWeight >= 1000

                ? `${
                    (
                        metrics.totalWeight /
                        1000
                    ).toLocaleString(
                        "en-US",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    )
                } t`

                : `${
                    AdminCommon.formatDecimal(
                        metrics.totalWeight,
                        2
                    )
                } kg`;


        document.getElementById(
            "kpiDoa"
        ).textContent =
            AdminCommon.formatWhole(
                metrics.totalDoa
            );


        document.getElementById(
            "kpiAvgWeight"
        ).textContent =
            `${
                AdminCommon.formatDecimal(
                    metrics.actualAvgOverall,
                    3
                )
            } kg`;


        doaRatioBadge.textContent =
            `DOA Ratio: ${
                AdminCommon.formatDecimal(
                    metrics.doaPct,
                    2
                )
            }%`;

    }


    function updateFooterTotals(
        metrics
    ) {

        document.getElementById(
            "totalOrderBirds"
        ).textContent =
            AdminCommon.formatWhole(
                metrics.totalOrder
            );


        document.getElementById(
            "totalAvailableBirds"
        ).textContent =
            AdminCommon.formatWhole(
                metrics.totalAvailable
            );


        document.getElementById(
            "totalAvgWeight"
        ).textContent =
            AdminCommon.formatDecimal(
                metrics.actualAvgOverall,
                3
            );


        document.getElementById(
            "totalWeight"
        ).textContent =
            AdminCommon.formatDecimal(
                metrics.totalWeight,
                2
            );


        document.getElementById(
            "totalWeightDiff"
        ).textContent =
            AdminCommon.formatDecimal(
                metrics.totalWeightDiff,
                2
            );


        document.getElementById(
            "totalDoa"
        ).textContent =
            AdminCommon.formatWhole(
                metrics.totalDoa
            );

    }


    // =====================================================
    // TRIP CHART
    // =====================================================

    function updateTripChart(data) {

        const grouped = {};


        data.forEach(row => {

            const sNo =
                String(
                    row.s_no || ""
                ).trim();


            if (!sNo) {
                return;
            }


            if (!grouped[sNo]) {

                grouped[sNo] = {

                    order: 0,

                    available: 0,

                    doa: 0

                };

            }


            grouped[sNo].order +=
                AdminCommon.safeNumber(
                    row.order_birds
                );


            grouped[sNo].available +=
                AdminCommon.safeNumber(
                    row.available_birds
                );


            grouped[sNo].doa +=
                AdminCommon.safeNumber(
                    row.doa
                );

        });


        const labels =
            Object.keys(grouped)
                .map(sNo =>
                    `Trip ${sNo}`
                );


        const orderValues =
            Object.values(grouped)
                .map(item =>
                    item.order
                );


        const availableValues =
            Object.values(grouped)
                .map(item =>
                    item.available
                );


        const doaValues =
            Object.values(grouped)
                .map(item =>
                    item.doa
                );


        tripComparisonChart?.setOption({

            xAxis: {
                data: labels
            },

            series: [

                {
                    data:
                        orderValues
                },

                {
                    data:
                        availableValues
                },

                {
                    data:
                        doaValues
                }

            ]

        });

    }


    // =====================================================
    // VEHICLE SUMMARY
    // =====================================================

    function updateVehicleSummary(data) {

        const vehicleMap = {};


        data.forEach(row => {

            const vehicle =
                String(
                    row.vehicle || "Unknown"
                ).trim() || "Unknown";


            const tripNo =
                String(
                    row.trip_no || ""
                ).trim();


            const totalTime =
                String(
                    row.total_time || ""
                ).trim();


            if (!vehicleMap[vehicle]) {

                vehicleMap[vehicle] = {
                    trips: {}
                };

            }


            if (
                tripNo &&
                !Object.prototype.hasOwnProperty.call(
                    vehicleMap[vehicle].trips,
                    tripNo
                )
            ) {

                vehicleMap[vehicle]
                    .trips[tripNo] =
                    parseTimeToMinutes(
                        totalTime
                    );

            }

        });


        const rows =
            Object.entries(vehicleMap)
                .map(
                    ([vehicle, values]) => {

                        const uniqueTripCount =
                            Object.keys(
                                values.trips
                            ).length;


                        const totalMinutes =
                            Object.values(
                                values.trips
                            )
                            .reduce(
                                (sum, minutes) =>
                                    sum + minutes,
                                0
                            );


                        const hours =
                            Math.floor(
                                totalMinutes /
                                60
                            );


                        const minutes =
                            totalMinutes % 60;


                        let runtime =
                            "N/A";


                        if (totalMinutes > 0) {

                            runtime =
                                hours > 0

                                    ? `${hours}h ${minutes}m`

                                    : `${minutes}m`;

                        }


                        return {

                            vehicle,

                            trips:
                                uniqueTripCount,

                            runtime

                        };

                    }
                )

                .sort(
                    (a, b) =>
                        b.trips -
                        a.trips
                );


        if (!rows.length) {

            AdminCommon.renderEmptyRow(
                vehicleSummaryTableBody,
                3,
                "No vehicle trip records found."
            );

            return;
        }


        vehicleSummaryTableBody.innerHTML =
            rows.map(row => `

                <tr>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.vehicle
                        )}
                    </td>

                    <td>
                        ${row.trips}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.runtime
                        )}
                    </td>

                </tr>

            `).join("");

    }


    // =====================================================
    // BATCH WEIGHT CHART
    // =====================================================

    function updateBatchWeightChart(data) {

        const grouped = {};


        data.forEach(row => {

            const batchNo =
                String(
                    row.batch_no || ""
                ).trim();


            if (!batchNo) {
                return;
            }


            if (!grouped[batchNo]) {

                grouped[batchNo] = {

                    expectedSum: 0,

                    actualSum: 0,

                    count: 0

                };

            }


            const expected =
                AdminCommon.safeNumber(
                    row.expected_avg
                );


            const actual =
                AdminCommon.safeNumber(
                    row.avg_weight
                );


            if (
                expected > 0 ||
                actual > 0
            ) {

                grouped[batchNo]
                    .expectedSum +=
                    expected;


                grouped[batchNo]
                    .actualSum +=
                    actual;


                grouped[batchNo]
                    .count++;

            }

        });


        const labels = [];

        const expectedAverages = [];

        const actualAverages = [];

        const variances = [];


        Object.entries(grouped)
            .forEach(
                ([batchNo, values]) => {

                    const count =
                        values.count > 0
                            ? values.count
                            : 1;


                    const expected =
                        Number(
                            (
                                values.expectedSum /
                                count
                            ).toFixed(2)
                        );


                    const actual =
                        Number(
                            (
                                values.actualSum /
                                count
                            ).toFixed(2)
                        );


                    const variance =
                        Number(
                            (
                                actual -
                                expected
                            ).toFixed(2)
                        );


                    labels.push(
                        `Batch ${batchNo}`
                    );


                    expectedAverages.push(
                        expected
                    );


                    actualAverages.push(
                        actual
                    );


                    variances.push(
                        variance
                    );

                }
            );


        batchWeightChart?.setOption({

            xAxis: {
                data:
                    labels
            },

            series: [

                {
                    data:
                        expectedAverages
                },

                {
                    data:
                        actualAverages
                },

                {
                    data:
                        variances
                }

            ]

        });

    }


    // =====================================================
    // DETAIL TABLE
    // =====================================================

    function renderTable(data) {

        if (!data.length) {

            AdminCommon.renderEmptyRow(
                birdsTableBody,
                19,
                "No Birds Received records found."
            );

            return;
        }


        birdsTableBody.innerHTML =
            data.map(row => `

                <tr>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.s_no
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.trip_no
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            AdminCommon.normalizeDate(
                                row.date
                            )
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.batch_no
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.vehicle
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.driver
                        )}
                    </td>

                    <td class="wrap-cell">
                        ${AdminCommon.escapeHtml(
                            row.helpers
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.location
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.age
                        )}
                    </td>

                    <td>
                        ${AdminCommon.formatDecimal(
                            row.expected_avg,
                            3
                        )}
                    </td>

                    <td>
                        ${AdminCommon.formatWhole(
                            row.order_birds
                        )}
                    </td>

                    <td>
                        ${AdminCommon.formatWhole(
                            row.available_birds
                        )}
                    </td>

                    <td>
                        ${AdminCommon.formatDecimal(
                            row.avg_weight,
                            3
                        )}
                    </td>

                    <td>
                        ${AdminCommon.formatDecimal(
                            row.weight,
                            2
                        )}
                    </td>

                    <td>
                        ${AdminCommon.formatDecimal(
                            row.weight_diff,
                            2
                        )}
                    </td>

                    <td>
                        ${AdminCommon.formatWhole(
                            row.doa
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.out_time
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.in_time
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.total_time
                        )}
                    </td>

                </tr>

            `).join("");

    }


    // =====================================================
    // UPDATE WHOLE DASHBOARD
    // =====================================================

    function updateDashboard(data) {

        const metrics =
            calculateMetrics(data);


        updateKpis(
            metrics
        );


        updateFooterTotals(
            metrics
        );


        updateTripChart(
            data
        );


        updateVehicleSummary(
            data
        );


        updateBatchWeightChart(
            data
        );


        renderTable(
            data
        );

    }


    // =====================================================
    // FILTER
    // =====================================================

    function getFilteredData() {

        return AdminCommon.filterBySingleDate(
            allReportData,
            selectedDate.value
        );

    }


    function applyFilter(
        showNotice = true
    ) {

        const filtered =
            getFilteredData();


        updateDashboard(
            filtered
        );


        if (showNotice) {

            AdminCommon.showMessage(
                message,
                `Filtered ${filtered.length} Birds Received records.`,
                "success"
            );

        }

    }


    // =====================================================
    // CLEAR
    // =====================================================

    function clearFilter() {

        selectedDate.value =
            "";


        updateDashboard(
            allReportData
        );


        AdminCommon.showMessage(
            message,
            "Date filter reset.",
            "success"
        );

    }


    // =====================================================
    // LOAD DATA
    // =====================================================

    async function loadData(
        showSuccess = false
    ) {

        AdminCommon.clearMessage(
            message
        );


        AdminCommon.setLoading(
            loader,
            true
        );


        filterBtn.disabled = true;

        clearBtn.disabled = true;

        refreshBtn.disabled = true;


        try {

            /*
             * Reuse the existing 5) Plant Received & DOA Report API.
             *
             * If your api.js function has a slightly different
             * name, we only need to change this one call.
             */

            const response =
                await getPlantDailyReportData();


            let rows = [];


            if (
                Array.isArray(response)
            ) {

                rows =
                    response;

            } else if (
                response &&
                Array.isArray(
                    response.data
                )
            ) {

                rows =
                    response.data;

            }


            allReportData =
                rows;


            applyFilter(false);


            if (showSuccess) {

                AdminCommon.showMessage(
                    message,
                    `Birds Received analytics refreshed successfully. ${allReportData.length} records loaded.`,
                    "success"
                );

            }


        } catch (error) {

            console.error(
                "Birds Received analytics load error:",
                error
            );


            allReportData = [];


            updateDashboard([]);


            AdminCommon.showMessage(
                message,
                "Unable to load Birds Received analytics data.",
                "error"
            );


        } finally {

            AdminCommon.setLoading(
                loader,
                false
            );


            filterBtn.disabled = false;

            clearBtn.disabled = false;

            refreshBtn.disabled = false;

        }

    }


    // =====================================================
    // EVENTS
    // =====================================================

    filterBtn.addEventListener(
        "click",
        () => applyFilter(true)
    );


    clearBtn.addEventListener(
        "click",
        clearFilter
    );


    refreshBtn.addEventListener(
        "click",
        () => loadData(true)
    );


    selectedDate.addEventListener(
        "change",
        () => applyFilter(false)
    );


    // =====================================================
    // INITIALIZE
    // =====================================================

    setupCharts();

    loadData();

});
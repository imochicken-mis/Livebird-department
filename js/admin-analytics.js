// =========================================================
// USER 4 - 1) Live Bird Catching Report
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // SESSION
    // =====================================================

    const user = AdminCommon.getSessionUser();

    if (!user) return;

    AdminCommon.setLoggedUser(
        document.getElementById("loggedUser"),
        user
    );

    AdminCommon.bindLogout(
        document.getElementById("logoutBtn")
    );


    // =====================================================
    // DOM ELEMENTS
    // =====================================================

    const fromDate =
        document.getElementById("fromDate");

    const toDate =
        document.getElementById("toDate");

    const filterBtn =
        document.getElementById("filterBtn");

    const clearBtn =
        document.getElementById("clearBtn");

    const refreshBtn =
        document.getElementById("refreshBtn");

    const filterMemory =
        AdminCommon.enableFilterMemory(
            "adminAnalytics"
        );    

    const loader =
        document.getElementById("analyticsLoader");

    const message =
        document.getElementById("analyticsMessage");

    const tableBody =
        document.getElementById("analyticsTableBody");


    // =====================================================
    // DATA
    // =====================================================

    let allReportData = [];


    // =====================================================
    // CHARTS
    // =====================================================

    const farmTypeChart =
        AdminCommon.initializeChart(
            document.getElementById("farmTypeChart")
        );

    const rejectionChart =
        AdminCommon.initializeChart(
            document.getElementById("rejectionChart")
        );

    const dailyTrendChart =
        AdminCommon.initializeChart(
            document.getElementById("dailyTrendChart")
        );

    const customerShareChart =
        AdminCommon.initializeChart(
            document.getElementById("customerShareChart")
        );

    const charts = [
        farmTypeChart,
        rejectionChart,
        dailyTrendChart,
        customerShareChart
    ];

    AdminCommon.bindChartResize(charts);


    // =====================================================
    // BASE CHART OPTIONS
    // =====================================================

    function setupCharts() {

        // -------------------------------------------------
        // FARM TYPE
        // -------------------------------------------------

        farmTypeChart?.setOption({

            animation: true,

            animationDuration: 1800,

            animationEasing: "cubicOut",

            tooltip: {
                trigger: "axis"
            },

            legend: {
                data: [
                    "NOB",
                    "Weight (kg)"
                ]
            },

            grid: {
                left: "3%",
                right: "4%",
                bottom: "5%",
                top: "18%",
                containLabel: true
            },

            xAxis: {
                type: "category",
                data: [
                    "Ownfarm",
                    "Buyback"
                ]
            },

            yAxis: [
                {
                    type: "value",
                    name: "NOB"
                },
                {
                    type: "value",
                    name: "Weight",
                    splitLine: {
                        show: false
                    }
                }
            ],

            series: [

                {
                    name: "NOB",

                    type: "bar",

                    yAxisIndex: 0,

                    barWidth: "60%",

                    data: [
                        {
                            value: 0,
                            itemStyle: {
                                color: "#010853"
                            }
                        },
                        {
                            value: 0,
                            itemStyle: {
                                color: "#f5b700"
                            }
                        }
                    ],

                    itemStyle: {
                        borderRadius: [
                            8,
                            8,
                            0,
                            0
                        ]
                    }
                },

                {
                    name: "Weight (kg)",

                    type: "line",

                    yAxisIndex: 1,

                    smooth: true,

                    showSymbol: true,

                    symbolSize: 8,

                    lineStyle: {
                        color: "#10b981",
                        width: 3
                    },

                    itemStyle: {
                        color: "#10b981"
                    },

                    areaStyle: {
                        opacity: 0.15
                    },

                    data: [
                        0,
                        0
                    ]
                }

            ]

        });


        // -------------------------------------------------
        // REJECTION
        // -------------------------------------------------

        rejectionChart?.setOption({

            animation: true,

            animationDuration: 1400,

            tooltip: {
                trigger: "axis"
            },

            grid: {
                left: "3%",
                right: "3%",
                bottom: "10%",
                top: "10%",
                containLabel: true
            },

            xAxis: {
                type: "category",
                data: [],
                axisLabel: {
                    rotate: 35
                }
            },

            yAxis: {
                type: "value",
                name: "Weight (kg)"
            },

            series: [
                {
                    name: "Rejection Weight",

                    type: "bar",

                    data: [],

                    itemStyle: {
                        color: "#D10909",
                        borderRadius: [
                            8,
                            8,
                            0,
                            0
                        ]
                    }
                }
            ]

        });


        // -------------------------------------------------
        // DAILY TREND
        // -------------------------------------------------

        dailyTrendChart?.setOption({

            animation: true,

            animationDuration: 1800,

            animationEasing: "cubicOut",

            tooltip: {
                trigger: "axis"
            },

            legend: {

                data: [
                    "NOB",
                    "Weight (kg)",
                    "Avg Weight (kg)"
                ],

                top: 0
            },

            grid: {

                left: "3%",

                right: "4%",

                bottom: "5%",

                top: "18%",

                containLabel: true
            },

            xAxis: {

                type: "category",

                data: [],

                boundaryGap: false
            },

            yAxis: [

                {
                    type: "value",
                    name: "NOB / Weight"
                },

                {
                    type: "value",
                    name: "Avg Wt (kg)",
                    splitLine: {
                        show: false
                    }
                }

            ],

            series: [

                {
                    name: "NOB",

                    type: "line",

                    smooth: true,

                    showSymbol: true,

                    symbolSize: 6,

                    yAxisIndex: 0,

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

                    data: []
                },

                {
                    name: "Weight (kg)",

                    type: "line",

                    smooth: true,

                    showSymbol: true,

                    symbolSize: 6,

                    yAxisIndex: 0,

                    lineStyle: {
                        color: "#10b981",
                        width: 3
                    },

                    itemStyle: {
                        color: "#10b981"
                    },

                    areaStyle: {
                        opacity: 0.15
                    },

                    data: []
                },

                {
                    name: "Avg Weight (kg)",

                    type: "line",

                    smooth: true,

                    showSymbol: true,

                    symbolSize: 6,

                    yAxisIndex: 1,

                    lineStyle: {
                        color: "#f59e0b",
                        width: 3
                    },

                    itemStyle: {
                        color: "#f59e0b"
                    },

                    areaStyle: {
                        opacity: 0.10
                    },

                    data: []
                }

            ]

        });


        // -------------------------------------------------
        // CUSTOMER SHARE
        // -------------------------------------------------

        customerShareChart?.setOption({

            animation: true,

            animationDuration: 1500,

            tooltip: {

                trigger: "item",

                formatter:
                    "{b}: {c} ({d}%)"
            },

            legend: {
                bottom: 0
            },

            series: [

                {
                    name:
                        "Customer Share",

                    type:
                        "pie",

                    radius: [
                        "40%",
                        "70%"
                    ],

                    avoidLabelOverlap:
                        true,

                    itemStyle: {

                        borderRadius:
                            10,

                        borderColor:
                            "#ffffff",

                        borderWidth:
                            2
                    },

                    label: {
                        show: false,
                        position: "center"
                    },

                    emphasis: {

                        label: {

                            show: true,

                            fontSize: 16,

                            fontWeight:
                                "bold"
                        }
                    },

                    labelLine: {
                        show: false
                    },

                    data: [

                        {
                            value: 0,

                            name:
                                "Imo Plant",

                            itemStyle: {
                                color:
                                    "#010853"
                            }
                        },

                        {
                            value: 0,

                            name:
                                "Others",

                            itemStyle: {
                                color:
                                    "#94a3b8"
                            }
                        }

                    ]
                }

            ]

        });

    }


    // =====================================================
    // CURRENT MONTH DATA
    // =====================================================

    function getMonthRows(
        data,
        month
    ) {

        return data.filter(row => {

            const date =
                AdminCommon.normalizeDate(
                    row.date
                );

            return (
                date &&
                date.startsWith(month)
            );

        });

    }


    function getTrendMonth() {

        if (fromDate.value) {
            return fromDate.value.substring(0, 7);
        }


        if (toDate.value) {
            return toDate.value.substring(0, 7);
        }


        return AdminCommon.getCurrentMonth();

    }


    // =====================================================
    // GROUP CURRENT MONTH BY DATE
    // =====================================================

    function groupByDate(data) {

        const grouped = {};

        data.forEach(row => {

            const date =
                AdminCommon.normalizeDate(
                    row.date
                );

            if (!date) return;


            if (!grouped[date]) {

                grouped[date] = {

                    nob: 0,

                    weight: 0,

                    avgWeightSum: 0,

                    avgWeightCount: 0

                };

            }


            grouped[date].nob +=
                AdminCommon.safeNumber(
                    row.nob
                );


            grouped[date].weight +=
                AdminCommon.safeNumber(
                    row.weight
                );


            const avgWeight =
                AdminCommon.safeNumber(
                    row.avg_weight
                );


            if (avgWeight) {

                grouped[date].avgWeightSum +=
                    avgWeight;

                grouped[date].avgWeightCount++;

            }

        });


        const dates =
            Object.keys(grouped).sort();


        const nob =
            dates.map(date =>
                Number(
                    grouped[date].nob.toFixed(2)
                )
            );


        const weight =
            dates.map(date =>
                Number(
                    grouped[date].weight.toFixed(2)
                )
            );


        const avgWeight =
            dates.map(date => {

                const item =
                    grouped[date];

                if (
                    item.avgWeightCount === 0
                ) {
                    return 0;
                }

                return Number(
                    (
                        item.avgWeightSum /
                        item.avgWeightCount
                    ).toFixed(2)
                );

            });


        return {
            dates,
            nob,
            weight,
            avgWeight
        };

    }


    // =====================================================
    // UPDATE KPI CARDS
    // =====================================================

    function updateKpis(data) {

        const totalNob =
            AdminCommon.sumBy(
                data,
                "nob"
            );

        const totalWeight =
            AdminCommon.sumBy(
                data,
                "weight"
            );

        const totalRejection =
            AdminCommon.sumBy(
                data,
                "rejection_weight"
            );

        const totalAmount =
            AdminCommon.sumBy(
                data,
                "amount"
            );


        let ownNob = 0;
        let buyNob = 0;

        let ownWeight = 0;
        let buyWeight = 0;

        let ownRejection = 0;
        let buyRejection = 0;

        let ownAmount = 0;
        let buyAmount = 0;


        data.forEach(row => {

            const type =
                String(
                    row.type || ""
                ).toLowerCase();


            if (type.includes("own")) {

                ownNob +=
                    AdminCommon.safeNumber(
                        row.nob
                    );

                ownWeight +=
                    AdminCommon.safeNumber(
                        row.weight
                    );

                ownRejection +=
                    AdminCommon.safeNumber(
                        row.rejection_weight
                    );

                ownAmount +=
                    AdminCommon.safeNumber(
                        row.amount
                    );

            }


            if (type.includes("buy")) {

                buyNob +=
                    AdminCommon.safeNumber(
                        row.nob
                    );

                buyWeight +=
                    AdminCommon.safeNumber(
                        row.weight
                    );

                buyRejection +=
                    AdminCommon.safeNumber(
                        row.rejection_weight
                    );

                buyAmount +=
                    AdminCommon.safeNumber(
                        row.amount
                    );

            }

        });


        document.getElementById(
            "kpiTotalBirds"
        ).textContent =
            AdminCommon.formatWhole(
                totalNob
            );


        document.getElementById(
            "kpiBirdsOwn"
        ).textContent =
            AdminCommon.formatWhole(
                ownNob
            );


        document.getElementById(
            "kpiBirdsBuyback"
        ).textContent =
            AdminCommon.formatWhole(
                buyNob
            );


        document.getElementById(
            "kpiTotalWeight"
        ).textContent =
            AdminCommon.formatWeight(
                totalWeight
            );


        document.getElementById(
            "kpiWeightOwn"
        ).textContent =
            AdminCommon.formatWeight(
                ownWeight
            );


        document.getElementById(
            "kpiWeightBuyback"
        ).textContent =
            AdminCommon.formatWeight(
                buyWeight
            );


        document.getElementById(
            "kpiTotalRejection"
        ).textContent =
            `${AdminCommon.formatWhole(
                totalRejection
            )} kg`;


        document.getElementById(
            "kpiRejectionOwn"
        ).textContent =
            AdminCommon.formatWeight(
                ownRejection
            );


        document.getElementById(
            "kpiRejectionBuyback"
        ).textContent =
            AdminCommon.formatWeight(
                buyRejection
            );


        document.getElementById(
            "kpiTotalAmount"
        ).textContent =
            AdminCommon.formatAmount(
                totalAmount
            );


        document.getElementById(
            "kpiAmountOwn"
        ).textContent =
            AdminCommon.formatAmount(
                ownAmount
            );


        document.getElementById(
            "kpiAmountBuyback"
        ).textContent =
            AdminCommon.formatAmount(
                buyAmount
            );


        return {

            totalNob,
            totalWeight,
            totalRejection,
            totalAmount,

            ownNob,
            buyNob,

            ownWeight,
            buyWeight

        };

    }


    // =====================================================
    // UPDATE CHARTS
    // =====================================================

    function updateCharts(
        data,
        metrics
    ) {

        // FARM TYPE

        farmTypeChart?.setOption({

            series: [

                {
                    data: [

                        {
                            value:
                                metrics.ownNob,

                            itemStyle: {
                                color:
                                    "#010853"
                            }
                        },

                        {
                            value:
                                metrics.buyNob,

                            itemStyle: {
                                color:
                                    "#f5b700"
                            }
                        }

                    ]
                },

                {
                    data: [
                        metrics.ownWeight,
                        metrics.buyWeight
                    ]
                }

            ]

        });


        // REJECTION CHART

        const dates =
            data.map(row =>
                AdminCommon.normalizeDate(
                    row.date
                )
            );


        const rejection =
            data.map(row =>
                AdminCommon.safeNumber(
                    row.rejection_weight
                )
            );


        rejectionChart?.setOption({

            xAxis: {
                data: dates
            },

            series: [
                {
                    data: rejection
                }
            ]

        });


        // DAILY TREND
        // IMPORTANT:
        // original Python uses FULL DATA current month,
        // not filtered data.

        const trendMonth =
            getTrendMonth();


        const monthRows =
            getMonthRows(
                allReportData,
                trendMonth
            );


        const trend =
            groupByDate(
                monthRows
            );


        dailyTrendChart?.setOption({

            xAxis: {
                data:
                    trend.dates
            },

            series: [

                {
                    data:
                        trend.nob
                },

                {
                    data:
                        trend.weight
                },

                {
                    data:
                        trend.avgWeight
                }

            ]

        });


        // CUSTOMER SHARE

        let imoNob = 0;


        data.forEach(row => {

            const customer =
                String(
                    row.customer || ""
                ).toLowerCase();


            if (
                customer.includes("imo")
            ) {

                imoNob +=
                    AdminCommon.safeNumber(
                        row.nob
                    );

            }

        });


        const otherNob =
            metrics.totalNob -
            imoNob;


        customerShareChart?.setOption({

            series: [

                {
                    data: [

                        {
                            value:
                                Number(
                                    imoNob.toFixed(2)
                                ),

                            name:
                                "Imo Plant",

                            itemStyle: {
                                color:
                                    "#010853"
                            }
                        },

                        {
                            value:
                                Number(
                                    otherNob.toFixed(2)
                                ),

                            name:
                                "Others",

                            itemStyle: {
                                color:
                                    "#94a3b8"
                            }
                        }

                    ]
                }

            ]

        });

    }


    // =====================================================
    // OPERATIONAL SUMMARY
    // =====================================================

    function updateSummary(
        metrics
    ) {

        const trendMonth =
            getTrendMonth();


        const monthRows =
            getMonthRows(
                allReportData,
                trendMonth
            );


        const currentMonthRejection =
            AdminCommon.sumBy(
                monthRows,
                "rejection_weight"
            );


        const avgWeight =
            metrics.totalNob > 0

                ? (
                    metrics.totalWeight /
                    metrics.totalNob
                )

                : 0;


        const avgAmount =
            metrics.totalNob > 0

                ? (
                    metrics.totalAmount /
                    metrics.totalNob
                )

                : 0;


        document.getElementById(
            "summaryNob"
        ).textContent =
            AdminCommon.formatWhole(
                metrics.totalNob
            );


        document.getElementById(
            "summaryWeight"
        ).textContent =
            AdminCommon.formatWeight(
                metrics.totalWeight
            );


        document.getElementById(
            "summaryAmount"
        ).textContent =
            AdminCommon.formatAmount(
                metrics.totalAmount
            );


        document.getElementById(
            "summaryAvgWeight"
        ).textContent =
            `${AdminCommon.formatDecimal(
                avgWeight,
                2
            )} kg`;


        document.getElementById(
            "summaryAvgAmount"
        ).textContent =
            AdminCommon.formatDecimal(
                avgAmount,
                2
            );


        document.getElementById(
            "summaryMonthRejection"
        ).textContent =
            AdminCommon.formatWeight(
                currentMonthRejection
            );

    }


    // =====================================================
    // TABLE
    // =====================================================

    function renderTable(data) {

        if (!data.length) {

            AdminCommon.renderEmptyRow(
                tableBody,
                14,
                "No analytics records found."
            );

            updateTableTotals([]);

            return;
        }


        tableBody.innerHTML =
            data.map(row => `

                <tr>

                    <td>
                        ${AdminCommon.escapeHtml(
                            AdminCommon.normalizeDate(
                                row.date
                            )
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.type
                        )}
                    </td>

                    <td class="wrap-cell">
                        ${AdminCommon.escapeHtml(
                            row.farmer
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.cage
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.batch
                        )}
                    </td>

                    <td class="wrap-cell">
                        ${AdminCommon.escapeHtml(
                            row.customer
                        )}
                    </td>

                    <td class="numeric">
                        ${AdminCommon.formatWhole(
                            row.nob
                        )}
                    </td>

                    <td class="numeric">
                        ${AdminCommon.formatDecimal(
                            row.weight,
                            2
                        )}
                    </td>

                    <td class="numeric">
                        ${AdminCommon.formatDecimal(
                            row.price,
                            2
                        )}
                    </td>

                    <td>
                        ${AdminCommon.escapeHtml(
                            row.bill
                        )}
                    </td>

                    <td class="numeric">
                        ${AdminCommon.formatDecimal(
                            row.amount,
                            2
                        )}
                    </td>

                    <td class="numeric">
                        ${AdminCommon.formatDecimal(
                            row.avg_weight,
                            2
                        )}
                    </td>

                    <td class="numeric">
                        ${AdminCommon.formatDecimal(
                            row.rejection_weight,
                            2
                        )}
                    </td>

                    <td class="wrap-cell">
                        ${AdminCommon.escapeHtml(
                            row.reason
                        )}
                    </td>

                </tr>

            `).join("");


        updateTableTotals(data);

    }


    // =====================================================
    // TABLE TOTALS
    // =====================================================

    function updateTableTotals(data) {

        document.getElementById(
            "tableTotalNob"
        ).textContent =
            AdminCommon.formatWhole(
                AdminCommon.sumBy(
                    data,
                    "nob"
                )
            );


        document.getElementById(
            "tableTotalWeight"
        ).textContent =
            AdminCommon.formatDecimal(

                AdminCommon.sumBy(
                    data,
                    "weight"
                ),

                2
            );


        document.getElementById(
            "tableTotalAmount"
        ).textContent =
            AdminCommon.formatDecimal(

                AdminCommon.sumBy(
                    data,
                    "amount"
                ),

                2
            );


        document.getElementById(
            "tableTotalRejection"
        ).textContent =
            AdminCommon.formatDecimal(

                AdminCommon.sumBy(
                    data,
                    "rejection_weight"
                ),

                2
            );

    }


    // =====================================================
    // UPDATE WHOLE DASHBOARD
    // =====================================================

    function updateDashboard(data) {

        const metrics =
            updateKpis(data);

        updateCharts(
            data,
            metrics
        );

        updateSummary(
            metrics
        );

        renderTable(
            data
        );

    }


    // =====================================================
    // FILTER
    // =====================================================

    function applyFilter() {

        AdminCommon.clearMessage(
            message
        );


        const from =
            fromDate.value;

        const to =
            toDate.value;


        if (
            from &&
            to &&
            from > to
        ) {

            AdminCommon.showMessage(
                message,
                "From Date cannot be later than To Date.",
                "error"
            );

            return;
        }


        const filtered =
            AdminCommon.filterByDateRange(

                allReportData,

                from,

                to

            );


        updateDashboard(
            filtered
        );


        AdminCommon.showMessage(
            message,
            `Filtered ${filtered.length} records found.`,
            "success"
        );

    }


    // =====================================================
    // CLEAR
    // =====================================================

    function clearFilter() {

        fromDate.value = "";

        toDate.value = "";


        updateDashboard(
            allReportData
        );


        AdminCommon.showMessage(
            message,
            "Filters cleared.",
            "success"
        );

    }


    // =====================================================
    // LOAD DATA
    // =====================================================

    async function loadAnalyticsData(
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
             * IMPORTANT:
             * api.js needs this function.
             *
             * getDefectReportData()
             *
             * It should return the same dataset as
             * Python get_defect_report_data().
             */

            const response =
                await getDefectReportData();


            // Supports either:
            // 1. direct array response
            // 2. { success:true, data:[...] }

            let rows = [];


            if (
                Array.isArray(response)
            ) {

                rows = response;

            } else if (
                response &&
                Array.isArray(response.data)
            ) {

                rows = response.data;

            }


            allReportData =
                rows.map(row => ({
                    ...row
                }));


            updateDashboard(
                allReportData
            );


            if (showSuccess) {

                AdminCommon.showMessage(
                    message,
                    `Analytics refreshed successfully. ${allReportData.length} records loaded.`,
                    "success"
                );

            }


        } catch (error) {

            console.error(
                "1) Live Bird Catching Report load error:",
                error
            );


            allReportData = [];


            updateDashboard([]);


            AdminCommon.showMessage(
                message,
                "Unable to load 1) Live Bird Catching Report data.",
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
        applyFilter
    );


    clearBtn.addEventListener(
        "click",
        clearFilter
    );


    refreshBtn.addEventListener(
        "click",
        () => {

            loadAnalyticsData(true);

        }
    );


    // =====================================================
    // INITIALIZE
    // =====================================================

    setupCharts();

    loadAnalyticsData();

});

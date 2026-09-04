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
    // ELEMENTS
    // =====================================================

    const monthFilter =
        document.getElementById("monthFilter");

    const filterBtn =
        document.getElementById("filterBtn");

    const clearBtn =
        document.getElementById("clearBtn");

    const refreshBtn =
        document.getElementById("refreshBtn");

    const filterMemory =
        AdminCommon.enableFilterMemory(
            "imoPlantReport"
        );    

    const loader =
        document.getElementById("analyticsLoader");

    const message =
        document.getElementById("analyticsMessage");

    const summaryTableBody =
        document.getElementById("summaryTableBody");

    const imoTableBody =
        document.getElementById("imoTableBody");


    // =====================================================
    // DATA
    // =====================================================

    let allReportData = [];
    let imoPlantData = [];


    // =====================================================
    // DEFAULT MONTH
    // =====================================================

    monthFilter.value =
        AdminCommon.getCurrentMonth();


    // =====================================================
    // CHARTS
    // =====================================================

    const typePerformanceChart =
        AdminCommon.initializeChart(
            document.getElementById("typePerformanceChart")
        );

    const typeShareChart =
        AdminCommon.initializeChart(
            document.getElementById("typeShareChart")
        );

    const topDaysChart =
        AdminCommon.initializeChart(
            document.getElementById("topDaysChart")
        );

    AdminCommon.bindChartResize([
        typePerformanceChart,
        typeShareChart,
        topDaysChart
    ]);


    // =====================================================
    // CHART SETUP
    // =====================================================

    function setupCharts() {

        typePerformanceChart?.setOption({

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
                data: []
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
                    name: "NOB",
                    type: "bar",
                    barWidth: "50%",
                    data: [],
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
                    data: []
                }

            ]

        });


        typeShareChart?.setOption({

            tooltip: {
                trigger: "item",
                formatter: "{b}: {c} ({d}%)"
            },

            legend: {
                orient: "vertical",
                left: "left",
                top: "middle"
            },

            series: [

                {
                    name: "Type Share",
                    type: "pie",

                    radius: [
                        "40%",
                        "70%"
                    ],

                    itemStyle: {
                        borderRadius: 10,
                        borderColor: "#ffffff",
                        borderWidth: 2
                    },

                    label: {
                        show: false
                    },

                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 16,
                            fontWeight: "bold",
                            formatter: "{b}\n{d}%"
                        }
                    },

                    data: []

                }

            ]

        });


        topDaysChart?.setOption({

            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "line"
                }
            },

            legend: {
                data: [
                    "NOB",
                    "Weight (kg)"
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
                    name: "NOB Count",
                    position: "left"
                },
                {
                    type: "value",
                    name: "Weight (kg)",
                    position: "right",

                    splitLine: {
                        show: false
                    }
                }
            ],

            series: [

                {
                    name: "NOB",
                    type: "line",

                    yAxisIndex: 0,

                    smooth: true,
                    showSymbol: true,
                    symbolSize: 8,

                    lineStyle: {
                        color: "#010853",
                        width: 3
                    },

                    itemStyle: {
                        color: "#010853"
                    },

                    areaStyle: {
                        opacity: 0.12
                    },

                    data: []
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
                        color: "rgba(16, 185, 129, 0.15)"
                    },


                    data: []
                }

            ]

        });

    }


    // =====================================================
    // FILTER
    // =====================================================

    function getFilteredData() {

        return AdminCommon.filterByMonth(
            imoPlantData,
            monthFilter.value
        );

    }


    // =====================================================
    // KPIs
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

        const totalAmount =
            AdminCommon.sumBy(
                data,
                "amount"
            );

        const totalRejection =
            AdminCommon.sumBy(
                data,
                "rejection_weight"
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
            totalAmount,
            totalRejection
        };

    }


    // =====================================================
    // TYPE GROUPING
    // =====================================================

    // Same normalization rule used for the KPI cards above
    // (own farm / buyback), so the charts always merge into
    // the same two categories no matter how "Type" was typed
    // in the sheet (Buyback, BuyBack, buy back, etc.).
    function normalizeFarmType(rawType) {

        const type =
            String(rawType || "").trim();

        const lower =
            type.toLowerCase();

        if (lower.includes("own")) {
            return "Own Farm";
        }

        if (lower.includes("buy")) {
            return "Buyback";
        }

        return type || "Unknown";

    }


    function groupByType(data) {

        const grouped = {};


        data.forEach(row => {

            const type =
                normalizeFarmType(
                    row.type
                );


            if (!grouped[type]) {

                grouped[type] = {
                    nob: 0,
                    weight: 0
                };

            }


            grouped[type].nob +=
                AdminCommon.safeNumber(
                    row.nob
                );


            grouped[type].weight +=
                AdminCommon.safeNumber(
                    row.weight
                );

        });


        return grouped;

    }


    // =====================================================
    // TOP 5 DAYS
    // =====================================================

function getTopFiveDays(data) {

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
                weight: 0
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

    });


    // Select Top 5 days based on highest NOB
    const top =
        Object.entries(grouped)

            .sort(
                (a, b) =>
                    b[1].nob - a[1].nob
            )

            .slice(0, 5)

            // Display selected days in date order
            .sort(
                (a, b) =>
                    a[0].localeCompare(
                        b[0]
                    )
            );


    return {

        dates:
            top.map(item =>
                item[0]
            ),

        nob:
            top.map(item =>
                Number(
                    item[1].nob.toFixed(2)
                )
            ),

        weight:
            top.map(item =>
                Number(
                    item[1].weight.toFixed(2)
                )
            )

    };

}


    // =====================================================
    // CHART UPDATE
    // =====================================================

    function updateCharts(data) {

        const palette = [
            "#010853",
            "#f5b700",
            "#10b981",
            "#D10909",
            "#8b5cf6",
            "#0891b2"
        ];


        const grouped =
            groupByType(data);


        const types =
            Object.keys(grouped);


        const nobBars =
            types.map(
                (type, index) => ({

                    value:
                        Number(
                            grouped[type]
                                .nob
                                .toFixed(2)
                        ),

                    itemStyle: {
                        color:
                            palette[
                                index %
                                palette.length
                            ]
                    }

                })
            );


        const weights =
            types.map(type =>
                Number(
                    grouped[type]
                        .weight
                        .toFixed(2)
                )
            );


        typePerformanceChart?.setOption({

            xAxis: {
                data: types
            },

            series: [

                {
                    data:
                        nobBars
                },

                {
                    data:
                        weights
                }

            ]

        });


        const donutData =
            types.map(
                (type, index) => ({

                    name:
                        type,

                    value:
                        Number(
                            grouped[type]
                                .nob
                                .toFixed(2)
                        ),

                    itemStyle: {
                        color:
                            palette[
                                index %
                                palette.length
                            ]
                    }

                })
            );


        typeShareChart?.setOption({

            series: [
                {
                    data:
                        donutData
                }
            ]

        });


        const topDays =
            getTopFiveDays(
                data
            );


        topDaysChart?.setOption({

            xAxis: {
                data:
                    topDays.dates
            },

            series: [

                {
                    name: "NOB",
                    data:
                        topDays.nob
                },

                {
                    name: "Weight (kg)",
                    data:
                        topDays.weight
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
            "summaryRejection"
        ).textContent =
            AdminCommon.formatWeight(
                metrics.totalRejection
            );

    }


    // =====================================================
    // SUMMARY TABLE
    // =====================================================

    function renderSummaryTable(data) {

        const grouped = {};


        let totalNob = 0;
        let totalWeight = 0;
        let totalAmount = 0;


        data.forEach(row => {

            const type =
                String(
                    row.type || "Unknown"
                ).trim() || "Unknown";


            if (!grouped[type]) {

                grouped[type] = {

                    nob: 0,

                    weight: 0,

                    amount: 0

                };

            }


            const nob =
                AdminCommon.safeNumber(
                    row.nob
                );

            const weight =
                AdminCommon.safeNumber(
                    row.weight
                );

            const amount =
                AdminCommon.safeNumber(
                    row.amount
                );


            grouped[type].nob += nob;

            grouped[type].weight +=
                weight;

            grouped[type].amount +=
                amount;


            totalNob += nob;

            totalWeight += weight;

            totalAmount += amount;

        });


        const entries =
            Object.entries(grouped);


        if (!entries.length) {

            AdminCommon.renderEmptyRow(
                summaryTableBody,
                4,
                "No summary records found."
            );

        } else {

            summaryTableBody.innerHTML =
                entries.map(
                    ([type, values]) => `

                        <tr>

                            <td>
                                ${AdminCommon.escapeHtml(
                                    type
                                )}
                            </td>

                            <td>
                                ${AdminCommon.formatWhole(
                                    values.nob
                                )}
                            </td>

                            <td>
                                ${AdminCommon.formatDecimal(
                                    values.weight,
                                    2
                                )}
                            </td>

                            <td>
                                ${AdminCommon.formatDecimal(
                                    values.amount,
                                    2
                                )}
                            </td>

                        </tr>

                    `
                ).join("");

        }


        document.getElementById(
            "summaryTableTotalNob"
        ).textContent =
            AdminCommon.formatWhole(
                totalNob
            );


        document.getElementById(
            "summaryTableTotalWeight"
        ).textContent =
            AdminCommon.formatDecimal(
                totalWeight,
                2
            );


        document.getElementById(
            "summaryTableTotalAmount"
        ).textContent =
            AdminCommon.formatDecimal(
                totalAmount,
                2
            );

    }


    // =====================================================
    // MASTER TABLE
    // =====================================================

    function renderMasterTable(data) {

        if (!data.length) {

            AdminCommon.renderEmptyRow(
                imoTableBody,
                14,
                "No Imo Plant records found."
            );

        } else {

            imoTableBody.innerHTML =
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

                        <td>
                            ${AdminCommon.formatWhole(
                                row.nob
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
                                row.price,
                                2
                            )}
                        </td>

                        <td>
                            ${AdminCommon.escapeHtml(
                                row.bill
                            )}
                        </td>

                        <td>
                            ${AdminCommon.formatDecimal(
                                row.amount,
                                2
                            )}
                        </td>

                        <td>
                            ${AdminCommon.formatDecimal(
                                row.avg_weight,
                                2
                            )}
                        </td>

                        <td>
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

        }


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
    // WHOLE PAGE UPDATE
    // =====================================================

    function updateDashboard(data) {

        const metrics =
            updateKpis(data);

        updateCharts(data);

        updateSummary(metrics);

        renderSummaryTable(data);

        renderMasterTable(data);

    }


    // =====================================================
    // APPLY FILTER
    // =====================================================

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
                `Filtered ${filtered.length} Imo Plant records for selected month.`,
                "success"
            );

        }

    }


    // =====================================================
    // CLEAR
    // =====================================================

    function clearFilter() {

        monthFilter.value = "";


        updateDashboard(
            imoPlantData
        );


        AdminCommon.showMessage(
            message,
            "Month filter cleared.",
            "success"
        );

    }


    // =====================================================
    // LOAD
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

            const response =
                await getDefectReportData();


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
                rows;


            // Exact Python logic:
            // customer contains "imo plant"

            imoPlantData =
                allReportData.filter(row => {

                    const customer =
                        String(
                            row.customer || ""
                        ).toLowerCase();


                    return customer.includes(
                        "imo plant"
                    );

                });


            applyFilter(false);


            if (showSuccess) {

                AdminCommon.showMessage(
                    message,
                    `Imo Plant analytics refreshed successfully. ${imoPlantData.length} records loaded.`,
                    "success"
                );

            }


        } catch (error) {

            console.error(
                "Imo Plant load error:",
                error
            );


            allReportData = [];
            imoPlantData = [];


            updateDashboard([]);


            AdminCommon.showMessage(
                message,
                "Unable to load Imo Plant analytics data.",
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


    // Month change immediately updates report
    monthFilter.addEventListener(
        "change",
        () => applyFilter(false)
    );


    // =====================================================
    // INITIALIZE
    // =====================================================

    setupCharts();

    loadData();

});
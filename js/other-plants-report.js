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
            "otherPlantsReport"
        );   

    const loader =
        document.getElementById("analyticsLoader");

    const message =
        document.getElementById("analyticsMessage");

    const summaryTypeTableBody =
        document.getElementById("summaryTypeTableBody");

    const summaryCustomerTableBody =
        document.getElementById("summaryCustomerTableBody");

    const otherPlantsTableBody =
        document.getElementById("otherPlantsTableBody");


    // =====================================================
    // DATA
    // =====================================================

    let allReportData = [];
    let otherPlantsData = [];


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

    const customerSalesChart =
        AdminCommon.initializeChart(
            document.getElementById("customerSalesChart")
        );


    AdminCommon.bindChartResize([
        typePerformanceChart,
        typeShareChart,
        customerSalesChart
    ]);


    // =====================================================
    // CHART SETUP
    // =====================================================

    function setupCharts() {

        typePerformanceChart?.setOption({

            animation: true,

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
                        borderRadius: [8, 8, 0, 0]
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

            animation: true,

            tooltip: {
                trigger: "item",
                formatter: "{b}: {c} NOB ({d}%)"
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

                    percentPrecision: 2,

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
                            formatter:
                                "{b}\n{c} NOB\n({d}%)"
                        }

                    },

                    data: []

                }

            ]

        });


        customerSalesChart?.setOption({

            animation: true,

            tooltip: {
                trigger: "axis"
            },

            legend: {
                data: [
                    "NOB",
                    "Amount (Rs.)"
                ]
            },

            grid: {
                left: "3%",
                right: "4%",
                bottom: "20%",
                top: "18%",
                containLabel: true
            },

            xAxis: {
                type: "category",
                data: [],

                axisLabel: {
                    rotate: 45,
                    interval: 0
                }
            },

            yAxis: [
                {
                    type: "value",
                    name: "NOB"
                },
                {
                    type: "value",
                    name: "Amount (Rs.)",
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
                    symbolSize: 7,

                    lineStyle: {
                        color: "#010853",
                        width: 3
                    },

                    itemStyle: {
                        color: "#010853"
                    },

                    areaStyle: {
                        opacity: 0.10
                    },

                    data: []
                },

                {
                    name: "Amount (Rs.)",
                    type: "line",
                    yAxisIndex: 1,
                    smooth: true,
                    showSymbol: true,
                    symbolSize: 7,

                    lineStyle: {
                        color: "#9333ea",
                        width: 3
                    },

                    itemStyle: {
                        color: "#9333ea"
                    },

                    areaStyle: {
                        opacity: 0.10
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
            otherPlantsData,
            monthFilter.value
        );

    }


    // =====================================================
    // KPI CALCULATIONS
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
        let directNob = 0;

        let ownWeight = 0;
        let buyWeight = 0;
        let directWeight = 0;

        let ownAmount = 0;
        let buyAmount = 0;
        let directAmount = 0;


        const allCustomers =
            new Set();

        const ownCustomers =
            new Set();

        const buyCustomers =
            new Set();

        const directCustomers =
            new Set();


        data.forEach(row => {

            const type =
                String(
                    row.type || ""
                ).toLowerCase();

            const customer =
                String(
                    row.customer || ""
                ).trim();


            if (customer) {
                allCustomers.add(customer);
            }


            if (type.includes("own")) {

                ownNob +=
                    AdminCommon.safeNumber(
                        row.nob
                    );

                ownWeight +=
                    AdminCommon.safeNumber(
                        row.weight
                    );

                ownAmount +=
                    AdminCommon.safeNumber(
                        row.amount
                    );

                if (customer) {
                    ownCustomers.add(customer);
                }

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

                buyAmount +=
                    AdminCommon.safeNumber(
                        row.amount
                    );

                if (customer) {
                    buyCustomers.add(customer);
                }

            }


            if (type.includes("direct")) {

                directNob +=
                    AdminCommon.safeNumber(
                        row.nob
                    );

                directWeight +=
                    AdminCommon.safeNumber(
                        row.weight
                    );

                directAmount +=
                    AdminCommon.safeNumber(
                        row.amount
                    );

                if (customer) {
                    directCustomers.add(customer);
                }

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
            "kpiBirdsDirect"
        ).textContent =
            AdminCommon.formatWhole(
                directNob
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
            "kpiWeightDirect"
        ).textContent =
            AdminCommon.formatWeight(
                directWeight
            );


        document.getElementById(
            "kpiCustomerCount"
        ).textContent =
            allCustomers.size.toLocaleString(
                "en-US"
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


        document.getElementById(
            "kpiAmountDirect"
        ).textContent =
            AdminCommon.formatAmount(
                directAmount
            );


        return {

            totalNob,

            totalWeight,

            totalAmount,

            totalRejection,

            customerCount:
                allCustomers.size

        };

    }


    // =====================================================
    // TYPE GROUPING
    // =====================================================

    function groupByType(data) {

        const grouped = {};


        data.forEach(row => {

            const type =
                String(
                    row.type || "Unknown"
                ).trim() || "Unknown";


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
    // CUSTOMER GROUPING
    // =====================================================

    function groupByCustomer(data) {

        const grouped = {};


        data.forEach(row => {

            const customer =
                String(
                    row.customer || ""
                ).trim() || "Unknown";


            if (!grouped[customer]) {

                grouped[customer] = {

                    nob: 0,

                    weight: 0,

                    amount: 0

                };

            }


            grouped[customer].nob +=
                AdminCommon.safeNumber(
                    row.nob
                );


            grouped[customer].weight +=
                AdminCommon.safeNumber(
                    row.weight
                );


            grouped[customer].amount +=
                AdminCommon.safeNumber(
                    row.amount
                );

        });


        return grouped;

    }


    // =====================================================
    // CHARTS
    // =====================================================

    function updateCharts(data) {

        const palette = [
            "#010853",
            "#ffc900",
            "#ff006e",
            "#D10909",
            "#8b5cf6",
            "#0891b2"
        ];


        function getTypeRank(type) {

            const lower =
                String(type || "").toLowerCase();

            if (lower.includes("own")) {
                return 0;
            }

            if (lower.includes("buy")) {
                return 1;
            }

            if (lower.includes("direct")) {
                return 2;
            }

            return 3;

        }


        function getTypeColor(type) {

            const lower =
                String(type || "").toLowerCase();

            if (lower.includes("own")) {
                return "#010853";
            }

            if (lower.includes("buy")) {
                return "#ffc900";
            }

            if (lower.includes("direct")) {
                return "#ff006e";
            }

            return "#8b5cf6";

        }


        // TYPE CHARTS

        const typeGrouped =
            groupByType(data);


        const types =
            Object.keys(
                typeGrouped
            ).sort(
                (a, b) =>
                    getTypeRank(a) -
                    getTypeRank(b)
            );


        const nobBars =
            types.map(
                (type) => ({

                    value:
                        Number(
                            typeGrouped[type]
                                .nob
                                .toFixed(2)
                        ),

                    itemStyle: {
                        color:
                            getTypeColor(type)
                    }

                })
            );


        const weights =
            types.map(type =>
                Number(
                    typeGrouped[type]
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
                    data: nobBars
                },

                {
                    data: weights
                }

            ]

        });


        typeShareChart?.setOption({

            series: [

                {
                    data:
                        types.map(
                            (type) => ({

                                name:
                                    type,

                                value:
                                    Number(
                                        typeGrouped[type]
                                            .nob
                                            .toFixed(2)
                                    ),

                                itemStyle: {
                                    color:
                                        getTypeColor(type)
                                }

                            })
                        )
                }

            ]

        });


        // CUSTOMER CHART

        const customerGrouped =
            groupByCustomer(data);


        const sortedCustomers =
            Object.entries(
                customerGrouped
            )
            .sort(
                (a, b) =>
                    b[1].nob -
                    a[1].nob
            );


        const customerNames =
            sortedCustomers.map(
                item => item[0]
            );


        const customerNob =
            sortedCustomers.map(
                item =>
                    Number(
                        item[1]
                            .nob
                            .toFixed(2)
                    )
            );


        const customerAmount =
            sortedCustomers.map(
                item =>
                    Number(
                        item[1]
                            .amount
                            .toFixed(2)
                    )
            );


        customerSalesChart?.setOption({

            xAxis: {
                data:
                    customerNames
            },

            series: [

                {
                    data:
                        customerNob
                },

                {
                    data:
                        customerAmount
                }

            ]

        });

    }


    // =====================================================
    // SUMMARY CARD
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
            "summaryUniqueCustomers"
        ).textContent =
            metrics.customerCount
                .toLocaleString(
                    "en-US"
                );

    }


    // =====================================================
    // SUMMARY BY TYPE
    // =====================================================

    function renderTypeSummary(data) {

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
                summaryTypeTableBody,
                4,
                "No farmer type summary found."
            );

        } else {

            summaryTypeTableBody.innerHTML =
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
            "summaryTypeTotalNob"
        ).textContent =
            AdminCommon.formatWhole(
                totalNob
            );


        document.getElementById(
            "summaryTypeTotalWeight"
        ).textContent =
            AdminCommon.formatDecimal(
                totalWeight,
                2
            );


        document.getElementById(
            "summaryTypeTotalAmount"
        ).textContent =
            AdminCommon.formatDecimal(
                totalAmount,
                2
            );

    }


    // =====================================================
    // SUMMARY BY CUSTOMER
    // =====================================================

    function renderCustomerSummary(data) {

        const grouped =
            groupByCustomer(data);


        const entries =
            Object.entries(grouped)
                .sort(
                    (a, b) =>
                        b[1].nob -
                        a[1].nob
                );


        let totalNob = 0;
        let totalWeight = 0;
        let totalAmount = 0;


        entries.forEach(
            ([, values]) => {

                totalNob +=
                    values.nob;

                totalWeight +=
                    values.weight;

                totalAmount +=
                    values.amount;

            }
        );


        if (!entries.length) {

            AdminCommon.renderEmptyRow(
                summaryCustomerTableBody,
                4,
                "No customer summary found."
            );

        } else {

            summaryCustomerTableBody.innerHTML =
                entries.map(
                    ([customer, values]) => `

                        <tr>

                            <td>
                                ${AdminCommon.escapeHtml(
                                    customer
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
            "summaryCustomerTotalNob"
        ).textContent =
            AdminCommon.formatWhole(
                totalNob
            );


        document.getElementById(
            "summaryCustomerTotalWeight"
        ).textContent =
            AdminCommon.formatDecimal(
                totalWeight,
                2
            );


        document.getElementById(
            "summaryCustomerTotalAmount"
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
                otherPlantsTableBody,
                14,
                "No Other Plants records found."
            );

        } else {

            otherPlantsTableBody.innerHTML =
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
    // UPDATE ALL
    // =====================================================

    function updateDashboard(data) {

        const metrics =
            updateKpis(data);

        updateCharts(data);

        updateSummary(metrics);

        renderTypeSummary(data);

        renderCustomerSummary(data);

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
                `Filtered ${filtered.length} Other Plants records for selected month.`,
                "success"
            );

        }

    }


    // =====================================================
    // CLEAR FILTER
    // =====================================================

    function clearFilter() {

        monthFilter.value = "";


        updateDashboard(
            otherPlantsData
        );


        AdminCommon.showMessage(
            message,
            "Month filter cleared.",
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


            // Exact Python behavior:
            // exclude Imo Plant customers.

            otherPlantsData =
                allReportData.filter(row => {

                    const customer =
                        String(
                            row.customer || ""
                        ).toLowerCase();


                    return !customer.includes(
                        "imo plant"
                    );

                });


            applyFilter(false);


            if (showSuccess) {

                AdminCommon.showMessage(
                    message,
                    `Other Plants analytics refreshed successfully. ${otherPlantsData.length} records loaded.`,
                    "success"
                );

            }


        } catch (error) {

            console.error(
                "Other Plants load error:",
                error
            );


            allReportData = [];

            otherPlantsData = [];


            updateDashboard([]);


            AdminCommon.showMessage(
                message,
                "Unable to load Other Plants analytics data.",
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
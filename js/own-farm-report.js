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

    const monthFilter =
        document.getElementById("monthFilter");

        const today =
            new Date();

        const currentMonth =
            `${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, "0")}`;

        monthFilter.value =
            currentMonth;

    const filterBtn =
        document.getElementById("filterBtn");

    const clearBtn =
        document.getElementById("clearBtn");

    const refreshBtn =
        document.getElementById("refreshBtn");

    const filterMemory =
        AdminCommon.enableFilterMemory(
            "ownFarmReport"
        );    

    const loader =
        document.getElementById("analyticsLoader");

    const message =
        document.getElementById("analyticsMessage");

    const targetWeight =
        document.getElementById("targetWeight");


    const farmerSummaryTableBody =
        document.getElementById("farmerSummaryTableBody");

    const imoSupplyTableBody =
        document.getElementById("imoSupplyTableBody");

    const outsideSupplyTableBody =
        document.getElementById("outsideSupplyTableBody");


    // =====================================================
    // DATA
    // =====================================================

    let allReportData = [];

    let ownFarmData = [];


    /*
     * Bird Quality Status (catching breakdown) data for the
     * two detail tables - Own Farm type records only.
     */

    let breakdownAllData = [];

    let ownBreakdownData = [];


    // =====================================================
    // CHARTS
    // =====================================================

    const farmGroupedChart =
        AdminCommon.initializeChart(
            document.getElementById("farmGroupedChart")
        );


    const supplyShareChart =
        AdminCommon.initializeChart(
            document.getElementById("supplyShareChart")
        );


    const dailyWeightChart =
        AdminCommon.initializeChart(
            document.getElementById("dailyWeightChart")
        );


    AdminCommon.bindChartResize([
        farmGroupedChart,
        supplyShareChart,
        dailyWeightChart
    ]);


    // =====================================================
    // CHART SETUP
    // =====================================================

    function setupCharts() {

        // -------------------------------------------------
        // FARM GROUPED BAR
        // -------------------------------------------------

        farmGroupedChart?.setOption({

            tooltip: {
                trigger: "axis",
                axisPointer: {
                    type: "shadow"
                }
            },

            legend: {
                data: [
                    "To Imo Plant",
                    "To Customers"
                ]
            },

            grid: {
                left: "3%",
                right: "4%",
                bottom: "12%",
                top: "18%",
                containLabel: true
            },

            xAxis: {
                type: "category",
                data: [],
                axisLabel: {
                    interval: 0
                }
            },

            yAxis: {
                type: "value",
                name: "NOB"
            },

            series: [

                {
                    name: "To Imo Plant",
                    type: "bar",
                    data: [],

                    itemStyle: {
                        color: "#480058",
                        borderRadius: [
                            4,
                            4,
                            0,
                            0
                        ]
                    }
                },

                {
                    name: "To Customers",
                    type: "bar",
                    data: [],

                    itemStyle: {
                        color: "#ff00e6",
                        borderRadius: [
                            4,
                            4,
                            0,
                            0
                        ]
                    }
                }

            ]

        });


        // -------------------------------------------------
        // SUPPLY SHARE
        // -------------------------------------------------

        supplyShareChart?.setOption({

            tooltip: {
                trigger: "item",
                formatter:
                    "{b}: {c} NOB ({d}%)"
            },

            legend: {
                orient: "vertical",
                left: "0%",
                top: "middle"
            },

            series: [

                {
                    name: "Supply Share",

                    type: "pie",

                    radius: [
                        "40%",
                        "70%"
                    ],

                    center: [
                        "60%",
                        "50%"
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
                                "{b}\n{d}%"
                        }

                    },

                    data: [

                        {
                            value: 0,
                            name: "To Imo Plant",
                            itemStyle: {
                                color: "#480058"
                            }
                        },

                        {
                            value: 0,
                            name: "To Customers",
                            itemStyle: {
                                color: "#ff00e6"
                            }
                        }

                    ]

                }

            ]

        });


        // -------------------------------------------------
        // DAILY AVG WEIGHT
        // -------------------------------------------------

        dailyWeightChart?.setOption({

            tooltip: {
                trigger: "axis",

                formatter(params) {

                    if (
                        !params ||
                        !params.length
                    ) {
                        return "";
                    }


                    const point =
                        params[0];


                    return `
                        ${point.axisValue}<br>
                        Avg Weight:
                        <b>${point.value} kg</b>
                    `;

                }
            },

            legend: {
                data: [
                    "Avg Weight (kg)"
                ]
            },

            grid: {
                left: "3%",
                right: "4%",
                bottom: "12%",
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

            yAxis: {
                type: "value",
                name: "Weight (kg)",
                min: "dataMin",

                splitLine: {
                    show: true,

                    lineStyle: {
                        type: "dashed"
                    }
                }
            },

            series: [

                {
                    name:
                        "Avg Weight (kg)",

                    type:
                        "line",

                    smooth:
                        true,

                    symbolSize:
                        10,

                    lineStyle: {
                        color:
                            "#003988",

                        width:
                            4
                    },

                    areaStyle: {
                        opacity:
                            0.15
                    },

                    markLine: {

                        silent:
                            true,

                        symbol:
                            "none",

                        data:
                            []
                    },

                    data:
                        []
                }

            ]

        });

    }


    // =====================================================
    // FILTER
    // =====================================================

    function getFilteredData() {

        return AdminCommon.filterByMonth(
            ownFarmData,
            monthFilter.value
        );

    }


    // =====================================================
    // SPLIT DESTINATION
    // =====================================================

    function splitDestination(data) {

        const imoData = [];

        const outsideData = [];


        data.forEach(row => {

            const customer =
                String(
                    row.customer || ""
                ).toLowerCase();


            if (
                customer.includes(
                    "imo plant"
                )
            ) {

                imoData.push(row);

            } else {

                outsideData.push(row);

            }

        });


        return {
            imoData,
            outsideData
        };

    }


    // =====================================================
    // KPI
    // =====================================================

    function updateKpis(data) {

        const {
            imoData,
            outsideData
        } = splitDestination(data);


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


        const imoNob =
            AdminCommon.sumBy(
                imoData,
                "nob"
            );


        const imoWeight =
            AdminCommon.sumBy(
                imoData,
                "weight"
            );


        const imoAmount =
            AdminCommon.sumBy(
                imoData,
                "amount"
            );


        const outsideNob =
            AdminCommon.sumBy(
                outsideData,
                "nob"
            );


        const outsideWeight =
            AdminCommon.sumBy(
                outsideData,
                "weight"
            );


        const outsideAmount =
            AdminCommon.sumBy(
                outsideData,
                "amount"
            );


        const allCustomers =
            new Set();


        const imoCustomers =
            new Set();


        const outsideCustomers =
            new Set();


        data.forEach(row => {

            const customer =
                String(
                    row.customer || ""
                ).trim();


            if (customer) {

                allCustomers.add(
                    customer
                );

            }

        });


        imoData.forEach(row => {

            const customer =
                String(
                    row.customer || ""
                ).trim();


            if (customer) {

                imoCustomers.add(
                    customer
                );

            }

        });


        outsideData.forEach(row => {

            const customer =
                String(
                    row.customer || ""
                ).trim();


            if (customer) {

                outsideCustomers.add(
                    customer
                );

            }

        });


        // -------------------------------------------------
        // UPDATE CARDS
        // -------------------------------------------------

        document.getElementById(
            "kpiTotalBirds"
        ).textContent =
            AdminCommon.formatWhole(
                totalNob
            );


        document.getElementById(
            "kpiBirdsImo"
        ).textContent =
            AdminCommon.formatWhole(
                imoNob
            );


        document.getElementById(
            "kpiBirdsOther"
        ).textContent =
            AdminCommon.formatWhole(
                outsideNob
            );


        document.getElementById(
            "kpiTotalWeight"
        ).textContent =
            AdminCommon.formatWeight(
                totalWeight
            );


        document.getElementById(
            "kpiWeightImo"
        ).textContent =
            AdminCommon.formatWeight(
                imoWeight
            );


        document.getElementById(
            "kpiWeightOther"
        ).textContent =
            AdminCommon.formatWeight(
                outsideWeight
            );


        document.getElementById(
            "kpiCustomerCount"
        ).textContent =
            allCustomers.size.toLocaleString(
                "en-US"
            );


        document.getElementById(
            "kpiCustomerImo"
        ).textContent =
            imoCustomers.size.toLocaleString(
                "en-US"
            );


        document.getElementById(
            "kpiCustomerOther"
        ).textContent =
            outsideCustomers.size.toLocaleString(
                "en-US"
            );


        document.getElementById(
            "kpiTotalAmount"
        ).textContent =
            AdminCommon.formatAmount(
                totalAmount
            );


        document.getElementById(
            "kpiAmountImo"
        ).textContent =
            AdminCommon.formatAmount(
                imoAmount
            );


        document.getElementById(
            "kpiAmountOther"
        ).textContent =
            AdminCommon.formatAmount(
                outsideAmount
            );


        return {

            totalNob,

            totalWeight,

            totalAmount,

            customerCount:
                allCustomers.size,

            imoNob,

            imoWeight,

            imoAmount,

            outsideNob,

            outsideWeight,

            outsideAmount,

            imoData,

            outsideData

        };

    }


    // =====================================================
    // FARM GROUPED CHART
    // =====================================================

    function updateFarmGroupedChart(data) {

        const grouped = {};


        data.forEach(row => {

            const farmer =
                String(
                    row.farmer || "Unknown"
                ).trim() || "Unknown";


            const customer =
                String(
                    row.customer || ""
                ).toLowerCase();


            const nob =
                AdminCommon.safeNumber(
                    row.nob
                );


            if (!grouped[farmer]) {

                grouped[farmer] = {
                    imo: 0,
                    customer: 0
                };

            }


            if (
                customer.includes(
                    "imo plant"
                )
            ) {

                grouped[farmer].imo +=
                    nob;

            } else {

                grouped[farmer].customer +=
                    nob;

            }

        });


        const farms =
            Object.keys(grouped);


        const imoValues =
            farms.map(farm =>
                Number(
                    grouped[farm]
                        .imo
                        .toFixed(2)
                )
            );


        const customerValues =
            farms.map(farm =>
                Number(
                    grouped[farm]
                        .customer
                        .toFixed(2)
                )
            );


        farmGroupedChart?.setOption({

            xAxis: {
                data:
                    farms
            },

            series: [

                {
                    data:
                        imoValues
                },

                {
                    data:
                        customerValues
                }

            ]

        });

    }


    // =====================================================
    // SUPPLY DONUT
    // =====================================================

    function updateSupplyShare(
        metrics
    ) {

        supplyShareChart?.setOption({

            series: [

                {
                    data: [

                        {
                            value:
                                Number(
                                    metrics.imoNob
                                        .toFixed(2)
                                ),

                            name:
                                "To Imo Plant",

                            itemStyle: {
                                color:
                                    "#692c7d"
                            }
                        },

                        {
                            value:
                                Number(
                                    metrics.outsideNob
                                        .toFixed(2)
                                ),

                            name:
                                "To Customers",

                            itemStyle: {
                                color:
                                    "#f62cfa"
                            }
                        }

                    ]
                }

            ]

        });

    }


    // =====================================================
    // DAILY AVG WEIGHT
    // =====================================================

    function updateDailyWeightChart(data) {

        const target =
            AdminCommon.safeNumber(
                targetWeight.value
            ) || 1.80;


        const grouped = {};


        data.forEach(row => {

            const date =
                AdminCommon.normalizeDate(
                    row.date
                );


            if (!date) {
                return;
            }


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


        const dates =
            Object.keys(grouped)
                .sort();


        const points = [];


        dates.forEach(date => {

            const nob =
                grouped[date].nob;


            const weight =
                grouped[date].weight;


            if (nob <= 0) {
                return;
            }


            const avgWeight =
                Number(
                    (
                        weight /
                        nob
                    ).toFixed(2)
                );


            const belowTarget =
                avgWeight < target;


            points.push({

                value:
                    avgWeight,

                itemStyle: {

                    color:
                        belowTarget
                            ? "#ef4444"
                            : "#059669",

                    borderColor:
                        belowTarget
                            ? "#ef4444"
                            : "#059669",

                    borderWidth:
                        2
                }

            });

        });


        const validDates =
            dates.filter(date =>
                grouped[date].nob > 0
            );


        const maxDataWeight =
            points.length

                ? Math.max(
                    ...points.map(
                        point =>
                            point.value
                    )
                )

                : 0;


        const yAxisMax =
            Math.max(
                maxDataWeight,
                target
            ) + 0.2;


        dailyWeightChart?.setOption({

            xAxis: {
                data:
                    validDates
            },

            yAxis: {
                max:
                    Number(
                        yAxisMax.toFixed(2)
                    )
            },

            series: [

                {
                    data:
                        points,

                    markLine: {

                        data: [

                            {
                                yAxis:
                                    target,

                                name:
                                    `Target (${target}kg)`,

                                lineStyle: {
                                    color:
                                        "#ef4444",

                                    type:
                                        "dashed",

                                    width:
                                        2
                                },

                                label: {

                                    formatter:
                                        `Target: ${target} kg`,

                                    position:
                                        "insideEndTop"
                                }

                            }

                        ]

                    }
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
            "summaryUniqueCustomers"
        ).textContent =
            metrics.customerCount
                .toLocaleString(
                    "en-US"
                );

    }


    // =====================================================
    // FARMER SUMMARY
    // =====================================================

    function renderFarmerSummary(data) {

        const grouped = {};


        data.forEach(row => {

            const farmer =
                String(
                    row.farmer || "Unknown"
                ).trim() || "Unknown";


            if (!grouped[farmer]) {

                grouped[farmer] = {

                    nob: 0,

                    weight: 0,

                    amount: 0

                };

            }


            grouped[farmer].nob +=
                AdminCommon.safeNumber(
                    row.nob
                );


            grouped[farmer].weight +=
                AdminCommon.safeNumber(
                    row.weight
                );


            grouped[farmer].amount +=
                AdminCommon.safeNumber(
                    row.amount
                );

        });


        const entries =
            Object.entries(grouped)

                .sort(
                    (a, b) =>
                        b[1].nob -
                        a[1].nob
                );


        if (!entries.length) {

            AdminCommon.renderEmptyRow(
                farmerSummaryTableBody,
                4,
                "No farmer summary found."
            );

        } else {

            farmerSummaryTableBody.innerHTML =
                entries.map(
                    ([farmer, values]) => `

                        <tr>

                            <td>
                                ${AdminCommon.escapeHtml(
                                    farmer
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
                                ${AdminCommon.formatAmount(
                                    values.amount
                                )}
                            </td>

                        </tr>

                    `
                ).join("");

        }


        document.getElementById(
            "farmerSummaryTotalNob"
        ).textContent =
            AdminCommon.formatWhole(

                AdminCommon.sumBy(
                    data,
                    "nob"
                )

            );


        document.getElementById(
            "farmerSummaryTotalWeight"
        ).textContent =
            AdminCommon.formatDecimal(

                AdminCommon.sumBy(
                    data,
                    "weight"
                ),

                2
            );


        document.getElementById(
            "farmerSummaryTotalAmount"
        ).textContent =
            AdminCommon.formatAmount(

                AdminCommon.sumBy(
                    data,
                    "amount"
                )

            );

    }


    // =====================================================
    // DETAIL TABLES (BIRD QUALITY STATUS)
    // =====================================================

    function updateDestinationTables() {

        /*
         * Both detail tables now show the Bird Quality Status
         * (catching breakdown) dataset - same structure and logic
         * as user1's report table. This report's own criteria:
         * month filter + type contains "own", then the tables are
         * split by destination (Imo Plant vs outside customers).
         */

        const filtered =
            AdminCommon.filterByMonth(
                ownBreakdownData,
                monthFilter.value
            );


        const breakdownSplit =
            splitDestination(filtered);


        // Imo Plant supplies table

        if (!breakdownSplit.imoData.length) {

            AdminCommon.renderEmptyRow(
                imoSupplyTableBody,
                23,
                "No Imo Plant supply records found."
            );

        } else {

            AdminCommon.renderBreakdownRows(
                imoSupplyTableBody,
                breakdownSplit.imoData
            );

        }


        // Outside customers table

        if (!breakdownSplit.outsideData.length) {

            AdminCommon.renderEmptyRow(
                outsideSupplyTableBody,
                23,
                "No outside customer supply records found."
            );

        } else {

            AdminCommon.renderBreakdownRows(
                outsideSupplyTableBody,
                breakdownSplit.outsideData
            );

        }


        // Imo TOTALS

        AdminCommon.updateBreakdownTotals(
            breakdownSplit.imoData,
            {
                disableNob: "imoDisableNob",
                disableWeight: "imoDisableWeight",
                disableAmount: "imoDisableAmount",
                healthyNob: "imoHealthyNob",
                healthyWeight: "imoHealthyWeight",
                healthyAmount: "imoHealthyAmount",
                nob: "imoTotalNob",
                weight: "imoTotalWeight",
                amount: "imoTotalAmount",
                rejectionWt: "imoTotalRejectionWt"
            }
        );


        // OUTSIDE TOTALS

        AdminCommon.updateBreakdownTotals(
            breakdownSplit.outsideData,
            {
                disableNob: "outsideDisableNob",
                disableWeight: "outsideDisableWeight",
                disableAmount: "outsideDisableAmount",
                healthyNob: "outsideHealthyNob",
                healthyWeight: "outsideHealthyWeight",
                healthyAmount: "outsideHealthyAmount",
                nob: "outsideTotalNob",
                weight: "outsideTotalWeight",
                amount: "outsideTotalAmount",
                rejectionWt: "outsideTotalRejectionWt"
            }
        );

    }


    // =====================================================
    // UPDATE PAGE
    // =====================================================

    function updateDashboard(data) {

        const metrics =
            updateKpis(data);


        updateFarmGroupedChart(
            data
        );


        updateSupplyShare(
            metrics
        );


        updateDailyWeightChart(
            data
        );


        updateSummary(
            metrics
        );


        renderFarmerSummary(
            data
        );


        updateDestinationTables();

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
                `Filtered ${filtered.length} Own Farm records.`,
                "success"
            );

        }

    }


    // =====================================================
    // CLEAR
    // =====================================================

    function clearFilter() {

        monthFilter.value =
            "";


        updateDashboard(
            ownFarmData
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


        filterBtn.disabled =
            true;

        clearBtn.disabled =
            true;

        refreshBtn.disabled =
            true;


        try {

            /*
             * Fetch both datasets in parallel:
             * - defect report data -> KPIs / charts / summaries
             * - catching breakdown data -> final detail tables
             */

            const [response, breakdownResponse] =
                await Promise.all([

                    getDefectReportData(),

                    getCatchingBreakdownData()

                ]);


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


            // Exact Python logic:
            // type contains "own"

            ownFarmData =
                allReportData.filter(row => {

                    const type =
                        String(
                            row.type || ""
                        ).toLowerCase();


                    return type.includes(
                        "own"
                    );

                });


            let breakdownRows = [];


            if (
                Array.isArray(breakdownResponse)
            ) {

                breakdownRows = breakdownResponse;

            } else if (
                breakdownResponse &&
                Array.isArray(breakdownResponse.data)
            ) {

                breakdownRows = breakdownResponse.data;

            }


            breakdownAllData =
                breakdownRows;


            // Same criteria as above:
            // type contains "own"

            ownBreakdownData =
                breakdownAllData.filter(row => {

                    const type =
                        String(
                            row.type || ""
                        ).toLowerCase();


                    return type.includes(
                        "own"
                    );

                });


            /*
             * IMPORTANT:
             * Python original does NOT default this page
             * to current month.
             * First load shows all Own Farm records.
             */

            applyFilter(false);

            


            if (showSuccess) {

                AdminCommon.showMessage(
                    message,
                    `Own Farm analytics refreshed. ${ownFarmData.length} records loaded.`,
                    "success"
                );

            }


        } catch (error) {

            console.error(
                "Own Farm load error:",
                error
            );            allReportData = [];
            ownFarmData = [];

            breakdownAllData = [];
            ownBreakdownData = [];


            updateDashboard([]);


            AdminCommon.showMessage(
                message,
                "Unable to load Own Farm analytics data.",
                "error"
            );


        } finally {

            AdminCommon.setLoading(
                loader,
                false
            );


            filterBtn.disabled =
                false;

            clearBtn.disabled =
                false;

            refreshBtn.disabled =
                false;

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


    // Dynamic target
    targetWeight.addEventListener(
        "input",
        () => {

            updateDailyWeightChart(
                getFilteredData()
            );

        }
    );


    // =====================================================
    // INITIALIZE
    // =====================================================

    setupCharts();

    loadData();

});
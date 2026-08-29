document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // ELEMENTS
    // =========================================================

    const fromDateInput =
        document.getElementById("fromDate");

    const toDateInput =
        document.getElementById("toDate");

    const reasonFilter =
        document.getElementById("reasonFilter");


    const filterBtn =
        document.getElementById("filterBtn");

    const clearBtn =
        document.getElementById("clearBtn");

    const refreshBtn =
        document.getElementById("refreshBtn");

    const filterMemory =
        AdminCommon.enableFilterMemory(
            "birdConditionAnalytics"
        );    


    const tableBody =
        document.getElementById("conditionTableBody");


    const loader =
        document.getElementById("analyticsLoader");

    const message =
        document.getElementById("analyticsMessage");


    const chartTotalBadge =
        document.getElementById("chartTotalBadge");


    const loggedUser =
        document.getElementById("loggedUser");

    const logoutBtn =
        document.getElementById("logoutBtn");


    // =========================================================
    // TOTAL ELEMENTS
    // =========================================================

    const totalNob =
        document.getElementById("totalNob");

    const totalWeight =
        document.getElementById("totalWeight");

    const totalAverage =
        document.getElementById("totalAverage");

    const totalRejection =
        document.getElementById("totalRejection");

    const totalFinalWeight =
        document.getElementById("totalFinalWeight");


    // =========================================================
    // SESSION
    // =========================================================

    const sessionUser =
        sessionStorage.getItem("livebirdUser");


    if (!sessionUser) {

        window.location.href =
            "../index.html";

        return;
    }


    let user;


    try {

        user =
            JSON.parse(sessionUser);

    } catch (error) {

        sessionStorage.removeItem(
            "livebirdUser"
        );

        window.location.href =
            "../index.html";

        return;
    }


    if (
        !user.username ||
        user.username.toLowerCase() !== "user4"
    ) {

        sessionStorage.removeItem(
            "livebirdUser"
        );

        window.location.href =
            "../index.html";

        return;
    }


    if (loggedUser) {

        loggedUser.textContent =
            `Logged in as: ${user.name || user.username}`;

    }


    // =========================================================
    // DATA
    // =========================================================

    let allReportData = [];

    let dateFilteredData = [];


    // =========================================================
    // CHART
    // =========================================================

    const reasonChartElement =
        document.getElementById(
            "reasonChart"
        );


    const reasonChart =
        echarts.init(
            reasonChartElement
        );


    reasonChart.setOption({

        animation: true,

        animationDuration: 1200,

        tooltip: {

            trigger: "axis",

            axisPointer: {
                type: "shadow"
            },

            valueFormatter: value =>
                `${formatDecimal(value)} kg`

        },


        grid: {

            left: "5%",

            right: "3%",

            top: "10%",

            bottom: "12%",

            containLabel: true

        },


        xAxis: {

            type: "category",

            data: [],

            axisTick: {
                alignWithLabel: true
            },

            axisLabel: {

                interval: 0,

                fontSize: 11,

                fontWeight: 600,

                rotate: 0

            }

        },


        yAxis: {

            type: "value",

            name: "Rejection Weight (kg)",

            splitLine: {

                lineStyle: {

                    type: "dashed",

                    color: "#e2e8f0"

                }

            }

        },


        series: [

            {

                name:
                    "Rejection Weight",

                type:
                    "bar",

                barMaxWidth:
                    55,

                data: [],

                itemStyle: {

                    color:
                        "#ef4444",

                    borderRadius: [
                        6,
                        6,
                        0,
                        0
                    ]

                },

                label: {

                    show: false,

                    position: "top",

                    formatter: params =>
                        formatDecimal(
                            params.value
                        )

                }

            }

        ]

    });


    window.addEventListener(
        "resize",
        () => reasonChart.resize()
    );


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    loadReport();


    // =========================================================
    // LOAD REPORT
    // =========================================================

    async function loadReport() {

        setLoading(true);

        clearMessage();


        try {

            const result =
                await getBirdConditionReportData();


            if (
                !result ||
                result.success === false
            ) {

                allReportData = [];

                dateFilteredData = [];


                populateReasonFilter([]);

                updateChart([]);

                renderTable([]);

                updateTotals([]);


                showMessage(
                    result?.message ||
                    "Unable to load bird condition analytics.",
                    "error"
                );


                return;
            }


            allReportData =
                Array.isArray(result.data)
                    ? result.data
                    : [];


            applyDateFilter(false);


        } catch (error) {

            console.error(
                "6) Bird Condition Report Error:",
                error
            );


            allReportData = [];

            dateFilteredData = [];


            populateReasonFilter([]);

            updateChart([]);

            renderTable([]);

            updateTotals([]);


            showMessage(
                "Unable to connect to the server.",
                "error"
            );


        } finally {

            setLoading(false);

        }

    }


    // =========================================================
    // DATE FILTER
    // =========================================================

    function applyDateFilter(
        showNotice = true
    ) {

        const fromDate =
            fromDateInput.value;

        const toDate =
            toDateInput.value;


        if (
            fromDate &&
            toDate &&
            fromDate > toDate
        ) {

            showMessage(
                "From Date cannot be later than To Date.",
                "error"
            );

            return;
        }


        if (
            !fromDate &&
            !toDate
        ) {

            dateFilteredData =
                [...allReportData];

        } else {

            dateFilteredData =
                allReportData.filter(row => {

                    const rowDate =
                        normalizeDate(
                            row.date
                        );


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

        }


        /*
         * Chart responds to DATE filter.
         * Reason filter only controls the detail table.
         */

        updateChart(
            dateFilteredData
        );


        populateReasonFilter(
            dateFilteredData
        );


        applyReasonFilter();


        if (showNotice) {

            showMessage(
                `${dateFilteredData.length} records found for the selected period.`,
                "success"
            );

        }

    }


    // =========================================================
    // POPULATE REASON FILTER
    // =========================================================

    function populateReasonFilter(data) {

        const currentSelection =
            reasonFilter.value;


        const reasons =
            [...new Set(

                data
                    .map(row =>
                        cleanReason(
                            row.reason
                        )
                    )
                    .filter(reason =>
                        reason !== ""
                    )

            )]
            .sort(
                (a, b) =>
                    a.localeCompare(b)
            );


        reasonFilter.innerHTML = `

            <option value="">
                All Reasons
            </option>

        `;


        reasons.forEach(reason => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                reason;


            option.textContent =
                reason;


            reasonFilter.appendChild(
                option
            );

        });


        /*
         * Keep selected reason if it still exists
         */

        if (
            currentSelection &&
            reasons.includes(
                currentSelection
            )
        ) {

            reasonFilter.value =
                currentSelection;

        }

    }


    // =========================================================
    // REASON FILTER
    // =========================================================

    function applyReasonFilter() {

        const selectedReason =
            cleanReason(
                reasonFilter.value
            );


        let tableData;


        if (!selectedReason) {

            tableData =
                [...dateFilteredData];

        } else {

            tableData =
                dateFilteredData.filter(row =>

                    cleanReason(
                        row.reason
                    ) === selectedReason

                );

        }


        renderTable(
            tableData
        );


        updateTotals(
            tableData
        );

    }


    // =========================================================
    // CHART
    // =========================================================

    function updateChart(data) {

        const grouped = {};


        data.forEach(row => {

            let reason =
                cleanReason(
                    row.reason
                );


            /*
             * Empty reasons are grouped as
             * "Not Specified"
             */

            if (!reason) {

                reason =
                    "Not Specified";

            }


            if (!grouped[reason]) {

                grouped[reason] = 0;

            }


            grouped[reason] +=
                safeNumber(
                    row.rejection_weight
                );

        });


        const chartData =
            Object.entries(grouped)

                .map(
                    ([reason, weight]) => ({

                        reason,

                        weight

                    })
                )

                .sort(
                    (a, b) =>
                        b.weight -
                        a.weight
                );


        const total =
            chartData.reduce(
                (sum, row) =>
                    sum +
                    row.weight,
                0
            );


        chartTotalBadge.textContent =
            `Total Rejection: ${formatDecimal(total)} kg`;


        reasonChart.setOption({

            xAxis: {

                data:
                    chartData.map(
                        row =>
                            row.reason
                    )

            },


            series: [

                {

                    data:
                        chartData.map(
                            row =>
                                row.weight
                        )

                }

            ]

        });

    }


    // =========================================================
    // TABLE
    // =========================================================

    function renderTable(data) {

        tableBody.innerHTML = "";


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        class="analytics-empty-state"
                    >
                        No bird condition records found.
                    </td>

                </tr>

            `;


            return;
        }


        const sortedData =
            [...data].sort(
                (a, b) => {

                    const dateA =
                        normalizeDate(
                            a.date
                        );

                    const dateB =
                        normalizeDate(
                            b.date
                        );


                    return dateB.localeCompare(
                        dateA
                    );

                }
            );


        sortedData.forEach(record => {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        formatDisplayDate(
                            record.date
                        )
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        record.farmer || "—"
                    )}
                </td>


                <td class="numeric">
                    ${formatWhole(
                        record.nob
                    )}
                </td>


                <td class="numeric">
                    ${formatDecimal(
                        record.weight
                    )}
                </td>


                <td class="numeric">
                    ${formatThreeDecimal(
                        record.avg_weight
                    )}
                </td>


                <td class="numeric">
                    ${formatDecimal(
                        record.rejection_weight
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        cleanReason(
                            record.reason
                        ) || "—"
                    )}
                </td>


                <td class="numeric">
                    ${formatDecimal(
                        record.final_weight
                    )}
                </td>

            `;


            tableBody.appendChild(
                row
            );

        });

    }


    // =========================================================
    // TOTALS
    // =========================================================

    function updateTotals(data) {

        let nob = 0;

        let weight = 0;

        let rejection = 0;

        let finalWeight = 0;


        data.forEach(row => {

            nob +=
                safeNumber(
                    row.nob
                );


            weight +=
                safeNumber(
                    row.weight
                );


            rejection +=
                safeNumber(
                    row.rejection_weight
                );


            finalWeight +=
                safeNumber(
                    row.final_weight
                );

        });


        /*
         * Weighted overall average:
         * Total Weight / Total Birds
         */

        const average =
            nob > 0
                ? weight / nob
                : 0;


        totalNob.textContent =
            formatWhole(
                nob
            );


        totalWeight.textContent =
            formatDecimal(
                weight
            );


        totalAverage.textContent =
            formatDecimal(
                average
            );


        totalRejection.textContent =
            formatDecimal(
                rejection
            );


        totalFinalWeight.textContent =
            formatDecimal(
                finalWeight
            );

    }


    // =========================================================
    // CLEAR FILTERS
    // =========================================================

    function clearFilters() {

        fromDateInput.value =
            "";

        toDateInput.value =
            "";

        reasonFilter.value =
            "";


        dateFilteredData =
            [...allReportData];


        updateChart(
            dateFilteredData
        );


        populateReasonFilter(
            dateFilteredData
        );


        renderTable(
            dateFilteredData
        );


        updateTotals(
            dateFilteredData
        );


        showMessage(
            "Filters cleared.",
            "success"
        );

    }


    // =========================================================
    // REFRESH
    // =========================================================

    async function refreshReport() {

        refreshBtn.disabled =
            true;


        refreshBtn.textContent =
            "Refreshing...";


        try {

            await loadReport();


            showMessage(
                "Bird condition analytics refreshed.",
                "success"
            );


        } finally {

            refreshBtn.disabled =
                false;


            refreshBtn.textContent =
                "Refresh";

        }

    }


    // =========================================================
    // REASON HELPER
    // =========================================================

    function cleanReason(value) {

        return String(
            value || ""
        ).trim();

    }


    // =========================================================
    // DATE
    // =========================================================

    function normalizeDate(value) {

        if (!value) {
            return "";
        }


        const text =
            String(value).trim();


        /*
         * YYYY-MM-DD
         */

        if (
            /^\d{4}-\d{2}-\d{2}/
                .test(text)
        ) {

            return text.substring(
                0,
                10
            );

        }


        /*
         * DD/MM/YYYY
         */

        const slashMatch =
            text.match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
            );


        if (slashMatch) {

            const day =
                slashMatch[1]
                    .padStart(
                        2,
                        "0"
                    );


            const month =
                slashMatch[2]
                    .padStart(
                        2,
                        "0"
                    );


            const year =
                slashMatch[3];


            return `${year}-${month}-${day}`;

        }


        /*
         * Other date formats
         */

        const parsed =
            new Date(text);


        if (
            Number.isNaN(
                parsed.getTime()
            )
        ) {

            return "";

        }


        const year =
            parsed.getFullYear();


        const month =
            String(
                parsed.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                parsed.getDate()
            ).padStart(
                2,
                "0"
            );


        return `${year}-${month}-${day}`;

    }


    function formatDisplayDate(value) {

        const normalized =
            normalizeDate(
                value
            );


        if (!normalized) {

            return value || "—";

        }


        const [
            year,
            month,
            day
        ] =
            normalized.split("-");


        return `${day}/${month}/${year}`;

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


        const number =
            Number(

                String(value)
                    .replace(
                        /,/g,
                        ""
                    )
                    .trim()

            );


        return Number.isFinite(number)
            ? number
            : 0;

    }


    function formatWhole(value) {

        return Math.round(
            safeNumber(value)
        ).toLocaleString(
            "en-US"
        );

    }


    function formatDecimal(value) {

        return safeNumber(value)
            .toLocaleString(
                "en-US",
                {

                    minimumFractionDigits:
                        2,

                    maximumFractionDigits:
                        2

                }
            );

    }


    function formatThreeDecimal(value) {

        return safeNumber(value)
            .toLocaleString(
                "en-US",
                {

                    minimumFractionDigits:
                        3,

                    maximumFractionDigits:
                        3

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

            .replace(
                /&/g,
                "&amp;"
            )

            .replace(
                /</g,
                "&lt;"
            )

            .replace(
                />/g,
                "&gt;"
            )

            .replace(
                /"/g,
                "&quot;"
            )

            .replace(
                /'/g,
                "&#039;"
            );

    }


    // =========================================================
    // LOADING
    // =========================================================

    function setLoading(show) {

        if (!loader) {
            return;
        }


        if (show) {

            loader.classList.add(
                "show"
            );

        } else {

            loader.classList.remove(
                "show"
            );

        }

    }


    // =========================================================
    // MESSAGE
    // =========================================================

    function showMessage(
        text,
        type
    ) {

        if (!message) {
            return;
        }


        message.textContent =
            text;


        message.classList.remove(
            "success",
            "error"
        );


        message.classList.add(
            type
        );

    }


    function clearMessage() {

        if (!message) {
            return;
        }


        message.textContent =
            "";


        message.classList.remove(
            "success",
            "error"
        );

    }


    // =========================================================
    // EVENTS
    // =========================================================

    filterBtn.addEventListener(
        "click",
        () =>
            applyDateFilter(true)
    );


    reasonFilter.addEventListener(
        "change",
        applyReasonFilter
    );


    clearBtn.addEventListener(
        "click",
        clearFilters
    );


    refreshBtn.addEventListener(
        "click",
        refreshReport
    );


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
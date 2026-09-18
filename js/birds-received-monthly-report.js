document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // ELEMENTS
    // =========================================================

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
            "monthlyBirdsReport"
        );    

    const tableBody =
        document.getElementById("monthlyTableBody");

    const loader =
        document.getElementById("analyticsLoader");

    const message =
        document.getElementById("analyticsMessage");

    const loggedUser =
        document.getElementById("loggedUser");

    const logoutBtn =
        document.getElementById("logoutBtn");


    const totalOrder =
        document.getElementById("monthTotalOrder");

    const totalAvailable =
        document.getElementById("monthTotalAvailable");

    const totalWeight =
        document.getElementById("monthTotalWeight");

    const totalDoa =
        document.getElementById("monthTotalDoa");


    const doaRatioBadge =
        document.getElementById("doaRatioBadge");


    const vehicleSummaryTableBody =
        document.getElementById(
            "vehicleSummaryTableBody"
        );


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


    // =========================================================
    // DEFAULT MONTH
    // =========================================================

    const today =
        new Date();


    if (!monthFilter.value) {

    monthFilter.value =
        `${today.getFullYear()}-${String(
            today.getMonth() + 1
        ).padStart(2, "0")}`;

    }


    // =========================================================
    // CHART INITIALIZE
    // =========================================================

    const tripComparisonChart =
        echarts.init(
            document.getElementById(
                "tripComparisonChart"
            )
        );


    tripComparisonChart.setOption({

        animation: true,

        animationDuration: 1500,

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

            bottom: "16%",

            containLabel: true
        },

        xAxis: {

            type: "category",

            data: [],

            axisLabel: {

                fontSize: 10,

                fontWeight: "bold",

                rotate: 45,

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

                name: "DOA",

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

                    borderRadius: [
                        4,
                        4,
                        0,
                        0
                    ]
                }

            },

            {

                name: "Available Birds",

                type: "bar",

                data: [],

                itemStyle: {

                    color: "#00E439",

                    borderRadius: [
                        4,
                        4,
                        0,
                        0
                    ]
                }

            },

            {

                name: "DOA",

                type: "line",

                yAxisIndex: 1,

                smooth: true,

                symbolSize: 7,

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
                                    "rgba(239,68,68,0.20)"
                            },

                            {

                                offset: 1,

                                color:
                                    "rgba(239,68,68,0.02)"
                            }

                        ]

                    }

                },

                data: []

            }

        ]

    });


    window.addEventListener(
        "resize",
        () => tripComparisonChart.resize()
    );


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    loadReport();


    // =========================================================
    // LOAD DATA
    // =========================================================

    async function loadReport() {

        setLoading(true);

        clearMessage();


        try {

            const result =
                await getPlantDailyReportData();


            if (
                !result ||
                result.success === false
            ) {

                allReportData = [];


                updateWholeReport([]);


                showMessage(
                    result?.message ||
                    "Unable to load monthly report.",
                    "error"
                );


                return;
            }


            allReportData =
                Array.isArray(result.data)
                    ? result.data
                    : [];


            applyFilter(false);


        } catch (error) {

            console.error(
                " Error:",
                error
            );


            allReportData = [];


            updateWholeReport([]);


            showMessage(
                "Unable to connect to the server.",
                "error"
            );


        } finally {

            setLoading(false);

        }

    }


    // =========================================================
    // FILTER
    // =========================================================

    function applyFilter(
        showNotice = true
    ) {

        const selectedMonth =
            monthFilter.value;


        let filteredData;


        if (!selectedMonth) {

            filteredData =
                [...allReportData];

        } else {

            filteredData =
                allReportData.filter(row => {

                    const date =
                        normalizeDate(
                            row.date
                        );


                    if (!date) {
                        return false;
                    }


                    return date.startsWith(
                        selectedMonth
                    );

                });

        }


        updateWholeReport(
            filteredData
        );


        if (showNotice) {

            const grouped =
                groupDataByDate(
                    filteredData
                );


            showMessage(
                `${grouped.length} receiving days found.`,
                "success"
            );

        }

    }


    // =========================================================
    // UPDATE WHOLE PAGE
    // =========================================================

    function updateWholeReport(
        filteredData
    ) {

        const groupedByDate =
            groupDataByDate(
                filteredData
            );


        renderReport(
            groupedByDate
        );


        updateTripChart(
            filteredData
        );


        updateVehicleSummary(
            filteredData
        );

    }
    function updateWholeReport(
    filteredData
    ) {

        const groupedByDate =
            groupDataByDate(
                filteredData
            );

        updateMonthlyKpis(
            filteredData
        );

        renderReport(
            groupedByDate
        );

        updateTripChart(
            filteredData
        );

        updateVehicleSummary(
            filteredData
        );

    }


    // =========================================================
    // GROUP BY DATE
    // =========================================================

    function groupDataByDate(data) {

        const grouped = {};


        data.forEach(row => {

            const date =
                normalizeDate(
                    row.date
                );


            if (!date) {
                return;
            }


            if (!grouped[date]) {

                grouped[date] = {

                    date,

                    order_birds: 0,

                    available_birds: 0,

                    weight: 0,

                    doa: 0

                };

            }


            grouped[date].order_birds +=
                safeNumber(
                    row.order_birds
                );


            grouped[date].available_birds +=
                safeNumber(
                    row.available_birds
                );


            grouped[date].weight +=
                safeNumber(
                    row.weight
                );


            grouped[date].doa +=
                safeNumber(
                    row.doa
                );

        });


        return Object
            .values(grouped)
            .sort(
                (a, b) =>
                    a.date.localeCompare(
                        b.date
                    )
            );

    }


    // =========================================================
    // MONTHLY TABLE
    // =========================================================

    function renderReport(data) {

        tableBody.innerHTML = "";


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        class="analytics-empty-state"
                    >
                        No receiving records found
                        for the selected month.
                    </td>

                </tr>

            `;


            updateTotals([]);

            return;
        }


        data.forEach(row => {

            const tr =
                document.createElement("tr");


            tr.innerHTML = `

                <td>
                    ${formatDisplayDate(
                        row.date
                    )}
                </td>


                <td class="numeric">
                    ${formatWhole(
                        row.order_birds
                    )}
                </td>


                <td class="numeric">
                    ${formatWhole(
                        row.available_birds
                    )}
                </td>


                <td class="numeric">
                    ${formatDecimal(
                        row.weight
                    )}
                </td>


                <td class="numeric">
                    ${formatWhole(
                        row.doa
                    )}
                </td>

            `;


            tableBody.appendChild(
                tr
            );

        });


        updateTotals(data);

    }


    // =========================================================
    // MONTH TOTALS
    // =========================================================

    function updateTotals(data) {

        let order = 0;

        let available = 0;

        let weight = 0;

        let doa = 0;


        data.forEach(row => {

            order +=
                safeNumber(
                    row.order_birds
                );


            available +=
                safeNumber(
                    row.available_birds
                );


            weight +=
                safeNumber(
                    row.weight
                );


            doa +=
                safeNumber(
                    row.doa
                );

        });


        totalOrder.textContent =
            formatWhole(order);


        totalAvailable.textContent =
            formatWhole(available);


        totalWeight.textContent =
            formatDecimal(weight);


        totalDoa.textContent =
            formatWhole(doa);

    }


    // =========================================================
    // MONTHLY TRIP CHART
    // =========================================================

    // =========================================================
// MONTHLY DATE-WISE BIRDS CHART
// =========================================================

function updateTripChart(data) {

    const grouped = {};


    data.forEach(row => {

        const date =
            normalizeDate(
                row.date
            );


        if (!date) {
            return;
        }


        if (!grouped[date]) {

            grouped[date] = {

                date,

                order: 0,

                available: 0,

                doa: 0

            };

        }


        grouped[date].order +=
            safeNumber(
                row.order_birds
            );


        grouped[date].available +=
            safeNumber(
                row.available_birds
            );


        grouped[date].doa +=
            safeNumber(
                row.doa
            );

    });


    const values =
        Object.values(grouped)
            .sort(
                (a, b) =>
                    a.date.localeCompare(
                        b.date
                    )
            );


    // =====================================================
    // MONTHLY DOA RATIO
    // =====================================================

    const totalAvailableBirds =
        values.reduce(
            (sum, row) =>
                sum + row.available,
            0
        );


    const totalDoaBirds =
        values.reduce(
            (sum, row) =>
                sum + row.doa,
            0
        );


    const doaRatio =
        totalAvailableBirds > 0

            ? (
                totalDoaBirds /
                totalAvailableBirds
            ) * 100

            : 0;


    doaRatioBadge.textContent =
        `DOA Ratio: ${doaRatio.toFixed(2)}%`;


    // =====================================================
    // UPDATE CHART
    // =====================================================

    tripComparisonChart.setOption({

        xAxis: {

            data:
                values.map(row =>
                    formatShortDate(
                        row.date
                    )
                )

        },

        series: [

            {
                name:
                    "Order Birds",

                data:
                    values.map(
                        row =>
                            row.order
                    )
            },

            {
                name:
                    "Available Birds",

                data:
                    values.map(
                        row =>
                            row.available
                    )
            },

            {
                name:
                    "DOA",

                data:
                    values.map(
                        row =>
                            row.doa
                    )
            }

        ]

    });

}


    // =========================================================
    // VEHICLE SUMMARY
    // =========================================================

    function updateVehicleSummary(data) {

        const vehicles = {};


        data.forEach(row => {

            const vehicle =
                String(
                    row.vehicle || "Unknown"
                ).trim() || "Unknown";


            const tripNo =
                String(
                    row.trip_no || ""
                ).trim();


            const date =
                normalizeDate(
                    row.date
                );


            if (
                !date ||
                !tripNo
            ) {
                return;
            }


            /*
             * Same trip number can appear
             * again on another date.
             */

            const tripKey =
                `${date}-${tripNo}`;


            if (!vehicles[vehicle]) {

                vehicles[vehicle] = {
                    trips: {}
                };

            }


            if (
                !Object.prototype
                    .hasOwnProperty.call(
                        vehicles[vehicle].trips,
                        tripKey
                    )
            ) {

                vehicles[vehicle]
                    .trips[tripKey] =
                    parseTimeToMinutes(
                        row.total_time
                    );

            }

        });


        const rows =
            Object.entries(vehicles)

                .map(
                    ([vehicle, details]) => {

                        const tripCount =
                            Object.keys(
                                details.trips
                            ).length;


                        const totalMinutes =
                            Object.values(
                                details.trips
                            )
                            .reduce(
                                (sum, value) =>
                                    sum + value,
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

                            tripCount,

                            totalMinutes,

                            runtime

                        };

                    }
                )

                .sort(
                    (a, b) =>
                        b.tripCount -
                        a.tripCount
                );


        if (!rows.length) {

            vehicleSummaryTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="3"
                        class="analytics-empty-state"
                    >
                        No vehicle records found.
                    </td>

                </tr>

            `;


            return;
        }


        // ---------------------------------------------
        // GRAND TOTAL ROW
        // ---------------------------------------------

        const grandTotalTrips =
            rows.reduce(
                (sum, row) =>
                    sum + row.tripCount,
                0
            );

        const grandTotalMinutes =
            rows.reduce(
                (sum, row) =>
                    sum + row.totalMinutes,
                0
            );

        const grandTotalHours =
            Math.floor(
                grandTotalMinutes / 60
            );

        const grandTotalRemainderMinutes =
            grandTotalMinutes % 60;

        const grandTotalRuntime =
            grandTotalMinutes > 0
                ? (
                    grandTotalHours > 0
                        ? `${grandTotalHours}h ${grandTotalRemainderMinutes}m`
                        : `${grandTotalRemainderMinutes}m`
                  )
                : "N/A";


        vehicleSummaryTableBody.innerHTML =
            rows.map(row => `

                <tr>

                    <td>
                        ${escapeHtml(
                            row.vehicle
                        )}
                    </td>

                    <td>
                        ${row.tripCount}
                    </td>

                    <td>
                        ${escapeHtml(
                            row.runtime
                        )}
                    </td>

                </tr>

            `).join("") + `

                <tr class="analytics-total-row" style="font-weight:700; background:rgba(0,0,0,0.04);">

                    <td>Total</td>

                    <td>${grandTotalTrips}</td>

                    <td>${escapeHtml(
                        grandTotalRuntime
                    )}</td>

                </tr>

            `;

    }


    // =========================================================
    // TIME
    // =========================================================

    function parseTimeToMinutes(value) {

        const text =
            String(
                value || ""
            ).trim();


        if (!text) {
            return 0;
        }


        // total_time sometimes arrives as a plain "HH:MM:SS" string,
        // but when the sheet cell is Time-formatted it can come
        // through as a stringified Date instead, e.g.
        // "Sat Dec 30 1899 04:40:00 GMT+0530 (India Standard Time)".
        // Naively splitting on ":" then treats everything before the
        // first colon as "hours", which is not a number, so the hour
        // component was silently dropped and only the minutes
        // survived. Extract HH:MM(:SS) with a regex instead, so it
        // works no matter which format the value arrives in.

        const match =
            text.match(
                /(?:^|\D)(\d{1,2}):(\d{2})(?::(\d{2}))?/
            );


        if (!match) {
            return 0;
        }


        const hours =
            parseInt(
                match[1],
                10
            ) || 0;


        const minutes =
            parseInt(
                match[2],
                10
            ) || 0;


        return (
            hours * 60 +
            minutes
        );

    }


    // =========================================================
    // CLEAR FILTER
    // =========================================================

    function clearFilter() {

        monthFilter.value = "";


        updateWholeReport(
            allReportData
        );


        showMessage(
            "Month filter cleared.",
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
                "Monthly report refreshed successfully.",
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
    // DATE
    // =========================================================

    function normalizeDate(value) {

        if (!value) {
            return "";
        }


        const text =
            String(value).trim();


        if (
            /^\d{4}-\d{2}-\d{2}/
                .test(text)
        ) {

            return text.substring(
                0,
                10
            );

        }


        const slashMatch =
            text.match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
            );


        if (slashMatch) {

            const day =
                slashMatch[1]
                    .padStart(2, "0");


            const month =
                slashMatch[2]
                    .padStart(2, "0");


            const year =
                slashMatch[3];


            return `${year}-${month}-${day}`;

        }


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


    function formatDisplayDate(date) {

        if (!date) {
            return "-";
        }


        const parts =
            date.split("-");


        if (parts.length !== 3) {
            return date;
        }


        return `${
            parts[2]
        }/${
            parts[1]
        }/${
            parts[0]
        }`;

    }


    function formatShortDate(date) {

        if (!date) {
            return "";
        }


        const parts =
            date.split("-");


        if (parts.length !== 3) {
            return date;
        }


        return `${
            parts[2]
        }/${
            parts[1]
        }`;

    }


    // =========================================================
    // NUMBER
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
                    .replace(/,/g, "")
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
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
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
    // LOADER
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
        () => applyFilter(true)
    );


    monthFilter.addEventListener(
        "change",
        () => applyFilter(false)
    );


    clearBtn.addEventListener(
        "click",
        clearFilter
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
    function updateMonthlyKpis(data) {

    let totalBirds = 0;
    let totalWeight = 0;
    let totalDoa = 0;


    data.forEach(row => {

        totalBirds +=
            safeNumber(
                row.available_birds
            );

        totalWeight +=
            safeNumber(
                row.weight
            );

        totalDoa +=
            safeNumber(
                row.doa
            );

    });


    // Monthly weighted actual average
    const actualAvgWeight =
        totalBirds > 0
            ? totalWeight / totalBirds
            : 0;


    document.getElementById(
        "kpiMonthlyBirdsReceived"
    ).textContent =
        Math.round(totalBirds)
            .toLocaleString("en-US");


    document.getElementById(
        "kpiMonthlyLiveWeight"
    ).textContent =
        totalWeight >= 1000
            ? `${(totalWeight / 1000).toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )} t`
            : `${totalWeight.toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )} kg`;


    document.getElementById(
        "kpiMonthlyDoa"
    ).textContent =
        Math.round(totalDoa)
            .toLocaleString("en-US");


    document.getElementById(
        "kpiMonthlyAvgWeight"
    ).textContent =
        `${actualAvgWeight.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )} kg`;

}

});
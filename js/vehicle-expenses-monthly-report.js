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
            "vehicleExpenseAnalytics"
        );    

    const loader =
        document.getElementById("analyticsLoader");

    const message =
        document.getElementById("analyticsMessage");

    const loggedUser =
        document.getElementById("loggedUser");

    const logoutBtn =
        document.getElementById("logoutBtn");


    const summaryTableBody =
        document.getElementById("summaryTableBody");

    const expenseTableBody =
        document.getElementById("expenseTableBody");


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


    loggedUser.textContent =
        `Logged in as: ${user.name || user.username}`;


    // =========================================================
    // DATA
    // =========================================================

    let allExpenseData = [];

    let allBirdData = [];


    // =========================================================
    // DEFAULT MONTH
    // Keep saved month if filter memory restored one
    // =========================================================

    if (!monthFilter.value) {

        const today =
            new Date();

        monthFilter.value =
            `${today.getFullYear()}-${String(
                today.getMonth() + 1
            ).padStart(2, "0")}`;

    }


    // =========================================================
    // CHART
    // =========================================================

    const expenseChart =
        echarts.init(
            document.getElementById(
                "vehicleExpenseChart"
            )
        );


    expenseChart.setOption({

        animation: true,

        animationDuration: 1200,

        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "shadow"
            }
        },

        legend: {
            data: [
                "Tea Expense",
                "Meal Expense"
            ],
            top: 0
        },

        grid: {
            left: "4%",
            right: "4%",
            top: "15%",
            bottom: "12%",
            containLabel: true
        },

        xAxis: {

            type: "category",

            data: [],

            axisLabel: {
                interval: 0,
                fontSize: 11,
                fontWeight: 600
            }

        },

        yAxis: {

            type: "value",

            name: "Expense (Rs.)",

            splitLine: {

                lineStyle: {
                    type: "dashed",
                    color: "#e2e8f0"
                }

            }

        },

        series: [

            {

                name: "Tea Expense",

                type: "bar",

                data: [],

                barMaxWidth: 45,

                itemStyle: {
                    borderRadius: [6, 6, 0, 0]
                }

            },

            {

                name: "Meal Expense",

                type: "bar",

                data: [],

                barMaxWidth: 45,

                itemStyle: {
                    borderRadius: [6, 6, 0, 0]
                }

            }

        ]

    });


    window.addEventListener(
        "resize",
        () => expenseChart.resize()
    );


    // =========================================================
    // LOAD
    // =========================================================

    loadReport();


    async function loadReport() {

        setLoading(true);

        clearMessage();


        try {

            const [
                expenseResult,
                birdResult
            ] =
                await Promise.all([

                    getVehicleExpensesReportData(),

                    getPlantDailyReportData()

                ]);


            if (
                !expenseResult ||
                expenseResult.success === false
            ) {

                throw new Error(
                    expenseResult?.message ||
                    "Unable to load vehicle expenses."
                );

            }


            if (
                !birdResult ||
                birdResult.success === false
            ) {

                throw new Error(
                    birdResult?.message ||
                    "Unable to load vehicle trip data."
                );

            }


            allExpenseData =
                Array.isArray(expenseResult.data)
                    ? expenseResult.data
                    : [];


            allBirdData =
                Array.isArray(birdResult.data)
                    ? birdResult.data
                    : [];


            applyFilter(false);


        } catch (error) {

            console.error(
                "7) Catching Team Expens Report Error:",
                error
            );


            allExpenseData = [];

            allBirdData = [];


            updateDashboard(
                [],
                []
            );


            showMessage(
                error.message ||
                "Unable to load vehicle expense analytics.",
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


        const expenseData =
            filterByMonth(
                allExpenseData,
                selectedMonth
            );


        const birdData =
            filterByMonth(
                allBirdData,
                selectedMonth
            );


        updateDashboard(
            expenseData,
            birdData
        );


        if (showNotice) {

            showMessage(
                `${expenseData.length} expense records found for selected month.`,
                "success"
            );

        }

    }


    function filterByMonth(
        data,
        month
    ) {

        if (!month) {

            return [...data];

        }


        return data.filter(row => {

            const date =
                normalizeDate(
                    row.date
                );


            return (
                date &&
                date.startsWith(month)
            );

        });

    }


    // =========================================================
    // UPDATE PAGE
    // =========================================================

    function updateDashboard(
        expenseData,
        birdData
    ) {

        const expenseSummary =
            groupExpensesByVehicle(
                expenseData
            );


        const tripCounts =
            calculateTripCounts(
                birdData
            );


        updateKpis(
            expenseData
        );


        updateChart(
            expenseSummary
        );


        renderSummaryTable(
            expenseSummary,
            tripCounts
        );


        renderMainTable(
            expenseData
        );

    }


    // =========================================================
    // KPIS
    // =========================================================

    function updateKpis(data) {

        const tea =
            sumBy(
                data,
                "tea"
            );


        const meal =
            sumBy(
                data,
                "meal"
            );


        const total =
            sumBy(
                data,
                "total"
            );


        document.getElementById(
            "kpiTeaExpenses"
        ).textContent =
            `Rs. ${formatDecimal(tea)}`;


        document.getElementById(
            "kpiMealExpenses"
        ).textContent =
            `Rs. ${formatDecimal(meal)}`;


        document.getElementById(
            "kpiTotalExpenses"
        ).textContent =
            `Rs. ${formatDecimal(total)}`;

    }


    // =========================================================
    // GROUP EXPENSES BY VEHICLE
    // =========================================================

    function groupExpensesByVehicle(data) {

        const grouped = {};


        data.forEach(row => {

            const vehicle =
                String(
                    row.vehicle || "Unknown"
                ).trim() || "Unknown";


            if (!grouped[vehicle]) {

                grouped[vehicle] = {

                    vehicle,

                    tea: 0,

                    meal: 0,

                    total: 0

                };

            }


            grouped[vehicle].tea +=
                safeNumber(
                    row.tea
                );


            grouped[vehicle].meal +=
                safeNumber(
                    row.meal
                );


            grouped[vehicle].total +=
                safeNumber(
                    row.total
                );

        });


        return Object
            .values(grouped)
            .sort(
                (a, b) =>
                    b.total -
                    a.total
            );

    }


    // =========================================================
    // TRIP COUNTS
    // =========================================================

    function calculateTripCounts(data) {

        const vehicles = {};


        data.forEach(row => {

            const vehicle =
                String(
                    row.vehicle || ""
                ).trim();


            const tripNo =
                String(
                    row.trip_no || ""
                ).trim();


            const date =
                normalizeDate(
                    row.date
                );


            if (
                !vehicle ||
                !tripNo ||
                !date
            ) {

                return;

            }


            /*
             * Same trip number repeats across dates.
             * Same trip can also appear in multiple
             * batch rows.
             *
             * Therefore unique key =
             * date + vehicle + trip number
             */

            const tripKey =
                `${date}|${vehicle}|${tripNo}`;


            if (!vehicles[vehicle]) {

                vehicles[vehicle] =
                    new Set();

            }


            vehicles[vehicle].add(
                tripKey
            );

        });


        const counts = {};


        Object.entries(
            vehicles
        ).forEach(
            ([vehicle, trips]) => {

                counts[vehicle] =
                    trips.size;

            }
        );


        return counts;

    }


    // =========================================================
    // CHART
    // =========================================================

    function updateChart(data) {

        expenseChart.setOption({

            xAxis: {

                data:
                    data.map(
                        row =>
                            row.vehicle
                    )

            },

            series: [

                {

                    data:
                        data.map(
                            row =>
                                Number(
                                    row.tea.toFixed(2)
                                )
                        )

                },

                {

                    data:
                        data.map(
                            row =>
                                Number(
                                    row.meal.toFixed(2)
                                )
                        )

                }

            ]

        });

    }


    // =========================================================
    // SUMMARY TABLE
    // =========================================================

    function renderSummaryTable(
        expenseSummary,
        tripCounts
    ) {

        if (!expenseSummary.length) {

            summaryTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="analytics-empty-state"
                    >
                        No vehicle expense summary found.
                    </td>

                </tr>

            `;


            updateSummaryTotals(
                [],
                tripCounts
            );


            return;

        }


        summaryTableBody.innerHTML =
            expenseSummary.map(row => {

                const trips =
                    tripCounts[
                        row.vehicle
                    ] || 0;


                const average =
                    trips > 0
                        ? row.total / trips
                        : 0;


                return `

                    <tr>

                        <td>
                            ${escapeHtml(
                                row.vehicle
                            )}
                        </td>

                        <td>
                            ${trips.toLocaleString(
                                "en-US"
                            )}
                        </td>

                        <td>
                            ${formatDecimal(
                                row.tea
                            )}
                        </td>

                        <td>
                            ${formatDecimal(
                                row.meal
                            )}
                        </td>

                        <td>
                            ${formatDecimal(
                                row.total
                            )}
                        </td>

                        <td>
                            ${formatDecimal(
                                average
                            )}
                        </td>

                    </tr>

                `;

            }).join("");


        updateSummaryTotals(
            expenseSummary,
            tripCounts
        );

    }


    function updateSummaryTotals(
        expenseSummary,
        tripCounts
    ) {

        const totalTea =
            expenseSummary.reduce(
                (sum, row) =>
                    sum + row.tea,
                0
            );


        const totalMeal =
            expenseSummary.reduce(
                (sum, row) =>
                    sum + row.meal,
                0
            );


        const totalExpense =
            expenseSummary.reduce(
                (sum, row) =>
                    sum + row.total,
                0
            );


        const totalTrips =
            Object.values(
                tripCounts
            ).reduce(
                (sum, count) =>
                    sum + count,
                0
            );


        const avgExpense =
            totalTrips > 0
                ? totalExpense /
                  totalTrips
                : 0;


        document.getElementById(
            "summaryTotalTrips"
        ).textContent =
            totalTrips.toLocaleString(
                "en-US"
            );


        document.getElementById(
            "summaryTotalTea"
        ).textContent =
            formatDecimal(
                totalTea
            );


        document.getElementById(
            "summaryTotalMeal"
        ).textContent =
            formatDecimal(
                totalMeal
            );


        document.getElementById(
            "summaryTotalExpense"
        ).textContent =
            formatDecimal(
                totalExpense
            );


        document.getElementById(
            "summaryAvgExpense"
        ).textContent =
            formatDecimal(
                avgExpense
            );

    }


    // =========================================================
    // MAIN TABLE
    // =========================================================

    function renderMainTable(data) {

        const sortedData =
            [...data].sort(
                (a, b) =>
                    normalizeDate(
                        b.date
                    ).localeCompare(
                        normalizeDate(
                            a.date
                        )
                    )
            );


        if (!sortedData.length) {

            expenseTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        class="analytics-empty-state"
                    >
                        No vehicle expense records found.
                    </td>

                </tr>

            `;


            updateMainTableTotals([]);

            return;

        }


        expenseTableBody.innerHTML =
            sortedData.map(row => `

                <tr>

                    <td>
                        ${escapeHtml(
                            formatDisplayDate(
                                row.date
                            )
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            row.vehicle || "—"
                        )}
                    </td>

                    <td>
                        ${formatDecimal(
                            row.tea
                        )}
                    </td>

                    <td>
                        ${formatDecimal(
                            row.meal
                        )}
                    </td>

                    <td>
                        ${formatDecimal(
                            row.total
                        )}
                    </td>

                </tr>

            `).join("");


        updateMainTableTotals(
            sortedData
        );

    }


    function updateMainTableTotals(data) {

        document.getElementById(
            "tableTotalTea"
        ).textContent =
            formatDecimal(
                sumBy(
                    data,
                    "tea"
                )
            );


        document.getElementById(
            "tableTotalMeal"
        ).textContent =
            formatDecimal(
                sumBy(
                    data,
                    "meal"
                )
            );


        document.getElementById(
            "tableTotalExpense"
        ).textContent =
            formatDecimal(
                sumBy(
                    data,
                    "total"
                )
            );

    }


    // =========================================================
    // CLEAR
    // =========================================================

    function clearFilter() {

        monthFilter.value =
            "";


        updateDashboard(
            allExpenseData,
            allBirdData
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
                "Vehicle expense analytics refreshed.",
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
    // HELPERS
    // =========================================================

    function sumBy(
        data,
        field
    ) {

        return data.reduce(
            (sum, row) =>
                sum +
                safeNumber(
                    row[field]
                ),
            0
        );

    }


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

        const date =
            normalizeDate(
                value
            );


        if (!date) {
            return "—";
        }


        const [
            year,
            month,
            day
        ] =
            date.split("-");


        return `${day}/${month}/${year}`;

    }


    function escapeHtml(value) {

        return String(
            value ?? ""
        )

            .replace(/&/g, "&amp;")

            .replace(/</g, "&lt;")

            .replace(/>/g, "&gt;")

            .replace(/"/g, "&quot;")

            .replace(/'/g, "&#039;");

    }


    // =========================================================
    // LOADER / MESSAGE
    // =========================================================

    function setLoading(show) {

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


    function showMessage(
        text,
        type
    ) {

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

});
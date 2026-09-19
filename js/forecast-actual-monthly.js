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

    const loader =
        document.getElementById("analyticsLoader");

    const message =
        document.getElementById("analyticsMessage");

    const loggedUser =
        document.getElementById("loggedUser");

    const logoutBtn =
        document.getElementById("logoutBtn");

    const comparisonTableBody =
        document.getElementById(
            "comparisonTableBody"
        );


    // =========================================================
    // FILTER MEMORY
    // =========================================================

    const filterMemory =
        AdminCommon.enableFilterMemory(
            "forecastActualMonthly"
        );


    // =========================================================
    // SESSION
    // =========================================================

    const sessionUser =
        sessionStorage.getItem(
            "livebirdUser"
        );


    if (!sessionUser) {

        window.location.href =
            "../index.html";

        return;

    }


    let user;


    try {

        user =
            JSON.parse(
                sessionUser
            );

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

    let allActualData = [];

    let allForecastData = [];


    // =========================================================
    // DEFAULT MONTH
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

    const comparisonChart =
        echarts.init(
            document.getElementById(
                "comparisonChart"
            )
        );


    comparisonChart.setOption({

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
                "Forecast Birds",
                "Actual Birds"
            ],

            top: 0

        },


        grid: {

            left: "5%",

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

            name: "Birds",

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
                    "Forecast Birds",

                type:
                    "bar",

                data: [],

                barMaxWidth:
                    45,

                itemStyle: {

                    color:
                        "#2563eb",

                    borderRadius: [
                        6,
                        6,
                        0,
                        0
                    ]

                }

            },


            {

                name:
                    "Actual Birds",

                type:
                    "bar",

                data: [],

                barMaxWidth:
                    45,

                itemStyle: {

                    color:
                        "#16a34a",

                    borderRadius: [
                        6,
                        6,
                        0,
                        0
                    ]

                }

            }

        ]

    });


    window.addEventListener(
        "resize",
        () =>
            comparisonChart.resize()
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

            const [
                actualResult,
                forecastResult
            ] =
                await Promise.all([

                    getDefectReportData(),

                    getUser3ReportData()

                ]);


            if (
                !actualResult ||
                actualResult.success === false
            ) {

                throw new Error(
                    actualResult?.message ||
                    "Unable to load actual bird data."
                );

            }


            if (
                !forecastResult ||
                forecastResult.success === false
            ) {

                throw new Error(
                    forecastResult?.message ||
                    "Unable to load forecast bird data."
                );

            }


            allActualData =
                Array.isArray(
                    actualResult.data
                )
                    ? actualResult.data
                    : [];


            allForecastData =
                Array.isArray(
                    forecastResult.data
                )
                    ? forecastResult.data
                    : [];


            applyFilter(false);


        } catch (error) {

            console.error(
                "Forecast Actual Monthly Error:",
                error
            );


            allActualData = [];

            allForecastData = [];


            renderComparison([]);


            showMessage(
                error.message ||
                "Unable to load monthly comparison.",
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


        const actualData =
            filterByMonth(
                allActualData,
                selectedMonth
            );


        const forecastData =
            filterByMonth(
                allForecastData,
                selectedMonth
            );


        const actualSummary =
            calculateActualSummary(
                actualData
            );


        const forecastSummary =
            calculateForecastSummary(
                forecastData
            );


        const comparison =
            buildComparison(
                forecastSummary,
                actualSummary
            );


        renderComparison(
            comparison
        );


        if (showNotice) {

            showMessage(
                "Monthly comparison updated.",
                "success"
            );

        }

    }


    // =========================================================
    // FILTER BY MONTH
    // =========================================================

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
                date.startsWith(
                    month
                )
            );

        });

    }


    // =========================================================
    // ACTUAL SUMMARY
    // =========================================================

    function calculateActualSummary(
        data
    ) {

        const result = {

            pannala: 0,

            kotadeniyawa: 0,

            weerapokuna: 0,

            epaladeniya: 0,

            buyback: 0

        };


        data.forEach(row => {

            const type =
                normalizeText(
                    row.type
                );


            const farmer =
                normalizeText(
                    row.farmer
                );


            const birds =
                safeNumber(
                    row.nob
                );


            // OWN FARM

            if (
                type === "own farm" ||
                type === "ownfarm"
            ) {

                if (
                    farmer.includes(
                        "pannala"
                    )
                ) {

                    result.pannala +=
                        birds;

                } else if (
                    farmer.includes(
                        "kotadeniyawa"
                    )
                ) {

                    result.kotadeniyawa +=
                        birds;

                } else if (
                    farmer.includes(
                        "weerapokuna"
                    )
                ) {

                    result.weerapokuna +=
                        birds;

                } else if (
                    farmer.includes(
                        "epaladeniya"
                    )
                ) {

                    result.epaladeniya +=
                        birds;

                }

            }


            // BUY BACK
            // Customer name ignored intentionally.

            if (
                type === "buy back" ||
                type === "buyback"
            ) {

                result.buyback +=
                    birds;

            }

        });


        return result;

    }


    // =========================================================
    // FORECAST SUMMARY
    // =========================================================

    function calculateForecastSummary(
        data
    ) {

        const result = {

            pannala: 0,

            kotadeniyawa: 0,

            weerapokuna: 0,

            epaladeniya: 0,

            buyback: 0

        };


        // ---------------------------------------------
        // BUY BACK
        //
        // Buyback qty is a per-DATE value, repeated on
        // every cage/location row saved for that date
        // (see user3-dashboard.js buildAllRows()). It
        // must be counted ONCE per date, otherwise a day
        // with multiple cage rows inflates the total.
        // ---------------------------------------------

        const buybackByDate = {};


        data.forEach(row => {

            const date =
                normalizeDate(
                    row.date
                );


            if (
                date &&
                !(date in buybackByDate)
            ) {

                buybackByDate[date] =
                    safeNumber(
                        row.buyback
                    );

            }

        });


        result.buyback =
            Object.values(
                buybackByDate
            ).reduce(
                (sum, value) =>
                    sum + value,
                0
            );


        // ---------------------------------------------
        // FARM FORECAST (unaffected — qty is per row,
        // safe to sum directly)
        // ---------------------------------------------

        data.forEach(row => {

            const location =
                normalizeText(
                    row.location
                );


            const qty =
                safeNumber(
                    row.qty
                );


            if (
                location.includes(
                    "pannala"
                )
            ) {

                result.pannala +=
                    qty;

            } else if (
                location.includes(
                    "kotadeniyawa"
                )
            ) {

                result.kotadeniyawa +=
                    qty;

            } else if (
                location.includes(
                    "weerapokuna"
                )
            ) {

                result.weerapokuna +=
                    qty;

            } else if (
                location.includes(
                    "epaladeniya"
                )
            ) {

                result.epaladeniya +=
                    qty;

            }

        });


        return result;

    }


    // =========================================================
    // BUILD COMPARISON
    // =========================================================

    function buildComparison(
        forecast,
        actual
    ) {

        return [

            {

                source:
                    "Kotadeniyawa",

                forecast:
                    forecast.kotadeniyawa,

                actual:
                    actual.kotadeniyawa

            },

            {

                source:
                    "Pannala",

                forecast:
                    forecast.pannala,

                actual:
                    actual.pannala

            },

            {

                source:
                    "Weerapokuna",

                forecast:
                    forecast.weerapokuna,

                actual:
                    actual.weerapokuna

            },

            {

                source:
                    "Epaladeniya",

                forecast:
                    forecast.epaladeniya,

                actual:
                    actual.epaladeniya

            },

            {

                source:
                    "Buy Back",

                forecast:
                    forecast.buyback,

                actual:
                    actual.buyback

            }

        ].map(row => ({

            ...row,

            variance:
                row.actual -
                row.forecast

        }));

    }


    // =========================================================
    // RENDER
    // =========================================================

    function renderComparison(
        data
    ) {

        if (!data.length) {

            comparisonTableBody.innerHTML = `

                <tr>

                    <td
                        colspan="4"
                        class="analytics-empty-state"
                    >
                        No comparison data available.
                    </td>

                </tr>

            `;


            updateTotals([]);

            updateChart([]);

            return;

        }


        comparisonTableBody.innerHTML =
            data.map(row => `

                <tr>

                    <td>
                        ${escapeHtml(
                            row.source
                        )}
                    </td>


                    <td>
                        ${formatWhole(
                            row.forecast
                        )}
                    </td>


                    <td>
                        ${formatWhole(
                            row.actual
                        )}
                    </td>


                    <td>
                        ${formatSigned(
                            row.variance
                        )}
                    </td>

                </tr>

            `).join("");


        updateTotals(
            data
        );


        updateChart(
            data
        );

    }


    // =========================================================
    // TOTALS
    // =========================================================

    function updateTotals(
        data
    ) {

        const forecast =
            data.reduce(
                (sum, row) =>
                    sum +
                    safeNumber(
                        row.forecast
                    ),
                0
            );


        const actual =
            data.reduce(
                (sum, row) =>
                    sum +
                    safeNumber(
                        row.actual
                    ),
                0
            );


        const variance =
            actual -
            forecast;


        document.getElementById(
            "totalForecast"
        ).textContent =
            formatWhole(
                forecast
            );


        document.getElementById(
            "totalActual"
        ).textContent =
            formatWhole(
                actual
            );


        document.getElementById(
            "totalVariance"
        ).textContent =
            formatSigned(
                variance
            );

    }


    // =========================================================
    // CHART UPDATE
    // =========================================================

    function updateChart(
        data
    ) {

        comparisonChart.setOption({

            xAxis: {

                data:
                    data.map(
                        row =>
                            row.source
                    )

            },


            series: [

                {

                    data:
                        data.map(
                            row =>
                                row.forecast
                        )

                },

                {

                    data:
                        data.map(
                            row =>
                                row.actual
                        )

                }

            ]

        });

    }


    // =========================================================
    // CLEAR
    // =========================================================

    function clearFilter() {

        filterMemory.clear();


        monthFilter.value =
            "";


        const actualSummary =
            calculateActualSummary(
                allActualData
            );


        const forecastSummary =
            calculateForecastSummary(
                allForecastData
            );


        renderComparison(
            buildComparison(
                forecastSummary,
                actualSummary
            )
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
                "Monthly comparison refreshed.",
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

    function normalizeText(
        value
    ) {

        return String(
            value || ""
        )
            .trim()
            .toLowerCase()
            .replace(
                /\s+/g,
                " "
            );

    }


    function safeNumber(
        value
    ) {

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


        return Number.isFinite(
            number
        )
            ? number
            : 0;

    }


    function normalizeDate(
        value
    ) {

        if (!value) {

            return "";

        }


        const text =
            String(
                value
            ).trim();


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
            new Date(
                text
            );


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


    function formatWhole(
        value
    ) {

        return Math.round(
            safeNumber(
                value
            )
        ).toLocaleString(
            "en-US"
        );

    }


    function formatSigned(
        value
    ) {

        const number =
            Math.round(
                safeNumber(
                    value
                )
            );


        if (number > 0) {

            return `+${number.toLocaleString(
                "en-US"
            )}`;

        }


        return number.toLocaleString(
            "en-US"
        );

    }


    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )

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
    // LOADER / MESSAGE
    // =========================================================

    function setLoading(
        show
    ) {

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
            applyFilter(true)
    );


    monthFilter.addEventListener(
        "change",
        () =>
            applyFilter(false)
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
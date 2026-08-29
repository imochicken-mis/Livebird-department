// =========================================================
// USER 4 - COMMON REPORT MODULES HELPERS
// =========================================================

const AdminCommon = (() => {

    // ---------------------------------------------------------
    // SESSION
    // ---------------------------------------------------------

    function getSessionUser() {

        const sessionUser =
            sessionStorage.getItem("livebirdUser");

        if (!sessionUser) {

            window.location.href =
                "../index.html";

            return null;
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

            return null;
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

            return null;
        }


        return user;

    }


    function setLoggedUser(
        element,
        user
    ) {

        if (!element || !user) {
            return;
        }


        element.textContent =
            `Logged in as: ${user.name || user.username}`;

    }


    function bindLogout(
        logoutButton
    ) {

        if (!logoutButton) {
            return;
        }


        logoutButton.addEventListener(
            "click",
            () => {

                sessionStorage.removeItem(
                    "livebirdUser"
                );

                window.location.href =
                    "../index.html";

            }
        );

    }


    // ---------------------------------------------------------
    // NUMBERS
    // ---------------------------------------------------------

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


    function formatWhole(value) {

        return Math.round(
            safeNumber(value)
        ).toLocaleString(
            "en-US"
        );

    }


    function formatDecimal(
        value,
        decimals = 2
    ) {

        return safeNumber(value)
            .toLocaleString(
                "en-US",
                {
                    minimumFractionDigits:
                        decimals,

                    maximumFractionDigits:
                        decimals
                }
            );

    }


    function formatAmount(value) {

        const number =
            safeNumber(value);


        if (number >= 100000) {

            return (
                number / 1000000
            ).toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            ) + " M";

        }


        return number.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

    }


    function formatWeight(value) {

        const number =
            safeNumber(value);


        if (number >= 1000) {

            return (
                number / 1000
            ).toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            ) + " t";

        }


        return number.toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ) + " kg";

    }


    // ---------------------------------------------------------
    // DATE
    // ---------------------------------------------------------

    function normalizeDate(value) {

        if (!value) {
            return "";
        }


        const text =
            String(value).trim();


        if (
            /^\d{4}-\d{2}-\d{2}/.test(text)
        ) {

            return text.substring(
                0,
                10
            );

        }


        const date =
            new Date(text);


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


    function getToday() {

        const today =
            new Date();


        const year =
            today.getFullYear();

        const month =
            String(
                today.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                today.getDate()
            ).padStart(2, "0");


        return `${year}-${month}-${day}`;

    }


    function getCurrentMonth() {

        const today =
            new Date();


        const year =
            today.getFullYear();

        const month =
            String(
                today.getMonth() + 1
            ).padStart(2, "0");


        return `${year}-${month}`;

    }


    // ---------------------------------------------------------
    // FILTER HELPERS
    // ---------------------------------------------------------

    function filterByDateRange(
        data,
        fromDate,
        toDate
    ) {

        if (
            !Array.isArray(data)
        ) {

            return [];
        }


        if (
            !fromDate &&
            !toDate
        ) {

            return [...data];

        }


        return data.filter(row => {

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


    function filterByMonth(
        data,
        month
    ) {

        if (
            !Array.isArray(data)
        ) {

            return [];
        }


        if (!month) {

            return [...data];

        }


        return data.filter(row => {

            const date =
                normalizeDate(
                    row.date
                );


            return date.startsWith(
                month
            );

        });

    }


    function filterBySingleDate(
        data,
        selectedDate
    ) {

        if (
            !Array.isArray(data)
        ) {

            return [];
        }


        if (!selectedDate) {

            return [...data];

        }


        return data.filter(row => {

            const date =
                normalizeDate(
                    row.date
                );


            return date ===
                selectedDate;

        });

    }


    // ---------------------------------------------------------
    // MESSAGE
    // ---------------------------------------------------------

    function showMessage(
        element,
        message,
        type = "success"
    ) {

        if (!element) {
            return;
        }


        element.textContent =
            message;


        element.classList.remove(
            "success",
            "error"
        );


        element.classList.add(type);

    }


    function clearMessage(
        element
    ) {

        if (!element) {
            return;
        }


        element.textContent = "";


        element.classList.remove(
            "success",
            "error"
        );

    }


    // ---------------------------------------------------------
    // LOADER
    // ---------------------------------------------------------

    function setLoading(
        element,
        show
    ) {

        if (!element) {
            return;
        }


        if (show) {

            element.classList.add(
                "show"
            );

        } else {

            element.classList.remove(
                "show"
            );

        }

    }


    // ---------------------------------------------------------
    // HTML
    // ---------------------------------------------------------

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


    // ---------------------------------------------------------
    // TABLE EMPTY STATE
    // ---------------------------------------------------------

    function renderEmptyRow(
        tbody,
        columnCount,
        message = "No records found."
    ) {

        if (!tbody) {
            return;
        }


        tbody.innerHTML = `

            <tr class="analytics-empty-row">

                <td
                    colspan="${columnCount}"
                    class="analytics-empty-state"
                >
                    ${escapeHtml(message)}
                </td>

            </tr>

        `;

    }


    // ---------------------------------------------------------
    // CHART HELPERS
    // ---------------------------------------------------------

    function initializeChart(
        element
    ) {

        if (
            !element ||
            typeof echarts === "undefined"
        ) {

            return null;
        }


        return echarts.init(
            element
        );

    }


    function resizeCharts(
        charts
    ) {

        if (
            !Array.isArray(charts)
        ) {
            return;
        }


        charts.forEach(chart => {

            if (
                chart &&
                typeof chart.resize === "function"
            ) {

                chart.resize();

            }

        });

    }


    function bindChartResize(
        charts
    ) {

        window.addEventListener(
            "resize",
            () => {

                resizeCharts(charts);

            }
        );

    }


    function clearChart(
        chart
    ) {

        if (
            chart &&
            typeof chart.clear === "function"
        ) {

            chart.clear();

        }

    }


    // ---------------------------------------------------------
    // COMMON AGGREGATIONS
    // ---------------------------------------------------------

    function sumBy(
        data,
        key
    ) {

        if (
            !Array.isArray(data)
        ) {

            return 0;
        }


        return data.reduce(
            (total, row) => {

                return total +
                    safeNumber(
                        row[key]
                    );

            },
            0
        );

    }


    function uniqueCount(
        data,
        key
    ) {

        if (
            !Array.isArray(data)
        ) {

            return 0;
        }


        const values =
            new Set();


        data.forEach(row => {

            const value =
                String(
                    row[key] || ""
                ).trim();


            if (value) {

                values.add(value);

            }

        });


        return values.size;

    }


    function weightedAverage(
        numerator,
        denominator
    ) {

        const top =
            safeNumber(numerator);

        const bottom =
            safeNumber(denominator);


        return bottom > 0
            ? top / bottom
            : 0;

    }


    // ---------------------------------------------------------
    // PUBLIC API
    // ---------------------------------------------------------

    return {

        getSessionUser,

        setLoggedUser,

        bindLogout,

        safeNumber,

        formatWhole,

        formatDecimal,

        formatAmount,

        formatWeight,

        normalizeDate,

        getToday,

        getCurrentMonth,

        filterByDateRange,

        filterByMonth,

        filterBySingleDate,

        showMessage,

        clearMessage,

        setLoading,

        escapeHtml,

        renderEmptyRow,

        initializeChart,

        resizeCharts,

        bindChartResize,

        clearChart,

        sumBy,

        uniqueCount,

        weightedAverage

    };

})();
// =========================================================
// AUTO KPI LETTER -> SVG ICON CONVERTER
// =========================================================

AdminCommon.convertKpiLettersToIcons = function () {

    const icons = {

        // N = Number of Birds
        // N = Birds / NOB
        N: `
            <svg
                viewBox="0 0 64 64"
                aria-hidden="true"
            >
                <!-- Body -->
                <path d="
                    M18 29
                    C23 29 27 27 31 22
                    L38 14
                    C42 9 50 11 51 18
                    L52 27
                    L58 30
                    L52 33
                    L51 42
                    C50 50 43 55 34 55
                    C23 55 15 49 12 40
                    C10 35 12 31 18 29
                    Z
                "/>

                <!-- Tail -->
                <path d="
                    M16 30
                    L7 26
                    C7 32 9 36 13 39
                    Z
                "/>

                <!-- Comb -->
                <path d="
                    M38 13
                    C38 8 42 7 44 11
                    C45 6 50 7 50 12
                    C48 14 45 15 42 15
                    Z
                "/>

                <!-- Wing -->
                <path
                    d="
                        M22 35
                        C25 43 34 46 40 39
                    "
                    fill="none"
                    stroke="white"
                    stroke-width="3"
                    stroke-linecap="round"
                />

                <!-- Eye -->
                <circle
                    cx="45"
                    cy="21"
                    r="2.3"
                    fill="white"
                />

                <!-- Leg -->
                <path
                    d="M32 54 V59 M28 59 H36"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                />
            </svg>
        `,

        // W = Weight
        W: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 4h10l2 17H5L7 4zm5 2
                         a3 3 0 1 0 0 6
                         3 3 0 0 0 0-6zm0 2
                         a1 1 0 1 1 0 2
                         1 1 0 0 1 0-2z"/>
            </svg>
        `,

        // R = Rejection / Warning
        R: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2 1 21h22L12 2zm1 16h-2v-2h2v2zm0-4h-2V9h2v5z"/>
            </svg>
        `,

        // RS = Money / Amount
        RS: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 5h18v14H3V5zm2 2v10h14V7H5zm7 1
                         c2.2 0 4 1.8 4 4s-1.8 4-4 4
                         -4-1.8-4-4 1.8-4 4-4z"/>
            </svg>
        `,

        // T = Tea
        T: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h13v3h2a3 3 0 0 1 0 6h-2.5
                         A6.5 6.5 0 0 1 10 20
                         6 6 0 0 1 4 14V6zm13 5v2h2
                         a1 1 0 0 0 0-2h-2z"/>
            </svg>
        `,

        // M = Meal
        M: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 2h2v7a3 3 0 0 1-2 2.82V22H5V11.82
                         A3 3 0 0 1 3 9V2h2v6h2V2zm8 0
                         c3 1 4 4 4 7v5h-2v8h-2V2z"/>
            </svg>
        `,

        // V = Vehicle
        V: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 5h11v9h2l2-4h3l2 4v5h-2
                         a3 3 0 0 1-6 0H9
                         a3 3 0 0 1-6 0H1V7
                         a2 2 0 0 1 2-2zm3 12
                         a1 1 0 1 0 0 2
                         1 1 0 0 0 0-2zm12 0
                         a1 1 0 1 0 0 2
                         1 1 0 0 0 0-2z"/>
            </svg>
        `,

        // A = Analytics / Average
        A: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 19h16v2H2V3h2v16zm3-3-2-2
                         5-5 3 3 5-6 2 2-7 8-3-3-3 3z"/>
            </svg>
        `,
        // C = Customer
        C: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5
                        -5 2.24-5 5 2.24 5 5 5zm0 2
                        c-3.33 0-10 1.67-10 5v3h20v-3
                        c0-3.33-6.67-5-10-5z"/>
            </svg>
        `,

        // ! = DOA / Alert
        "!": `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
        `
        
    };


    document
        .querySelectorAll(".analytics-kpi-icon")
        .forEach(iconBox => {

            if (
                iconBox.dataset.iconConverted === "true"
            ) {
                return;
            }


            const key =
                iconBox.textContent
                    .trim()
                    .toUpperCase();


            if (!icons[key]) {
                return;
            }


            iconBox.innerHTML =
                icons[key];

            iconBox.dataset.iconType =
                key;

            iconBox.dataset.iconConverted =
                "true";

        });

};


// Run automatically
document.addEventListener(
    "DOMContentLoaded",
    () => {

        AdminCommon.convertKpiLettersToIcons();

    }
);
// =========================================================
// COMMON REPORT FILTER MEMORY
// =========================================================

AdminCommon.enableFilterMemory = function (pageKey) {

    const storageKey =
        `reportFilters_${pageKey}`;

    const filterElements =
        Array.from(
            document.querySelectorAll(
                'input[type="date"], input[type="month"], select'
            )
        ).filter(el => el.id);


    // LOAD SAVED FILTERS
    let saved = {};

    try {
        saved =
            JSON.parse(
                sessionStorage.getItem(storageKey) || "{}"
            );
    } catch (error) {
        saved = {};
    }


    filterElements.forEach(el => {

        if (
            Object.prototype.hasOwnProperty.call(
                saved,
                el.id
            )
        ) {
            el.value = saved[el.id];
        }

    });


    // SAVE FILTERS
    function saveFilters() {

        const values = {};

        filterElements.forEach(el => {
            values[el.id] = el.value;
        });

        sessionStorage.setItem(
            storageKey,
            JSON.stringify(values)
        );

    }


    filterElements.forEach(el => {

        el.addEventListener(
            "change",
            saveFilters
        );

    });


    const filterBtn =
        document.getElementById("filterBtn");

    if (filterBtn) {

        filterBtn.addEventListener(
            "click",
            saveFilters
        );

    }


    return {

        clear() {
            sessionStorage.removeItem(
                storageKey
            );
        }

    };

};

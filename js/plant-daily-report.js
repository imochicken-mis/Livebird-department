document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // ELEMENTS
    // =========================================================

    const fromDateInput = document.getElementById("fromDate");
    const toDateInput = document.getElementById("toDate");

    const filterBtn = document.getElementById("filterBtn");
    const clearBtn = document.getElementById("clearBtn");
    const refreshBtn = document.getElementById("refreshBtn");

    const reportTableBody =
        document.getElementById("reportTableBody");

    const reportLoading =
        document.getElementById("reportLoading");

    const reportMessage =
        document.getElementById("reportMessage");

    const totalOrderBirds =
        document.getElementById("totalOrderBirds");

    const totalAvailableBirds =
        document.getElementById("totalAvailableBirds");

    const totalAvg =
        document.getElementById("totalAvg");

    const totalWeight =
        document.getElementById("totalWeight");

    const totalWeightDiff =
        document.getElementById("totalWeightDiff");

    const totalDoa =
        document.getElementById("totalDoa");

    const loggedUser =
        document.getElementById("loggedUser");

    const logoutBtn =
        document.getElementById("logoutBtn");


    // =========================================================
    // SESSION CHECK
    // =========================================================

    const sessionUser =
        sessionStorage.getItem("livebirdUser");

    if (!sessionUser) {
        window.location.href = "../index.html";
        return;
    }

    const user = JSON.parse(sessionUser);

    if (
        !user.username ||
        user.username.toLowerCase() !== "user2"
    ) {
        sessionStorage.removeItem("livebirdUser");
        window.location.href = "../index.html";
        return;
    }

    loggedUser.textContent =
        `Logged in as: ${user.name || user.username}`;


    // =========================================================
    // REPORT DATA
    // =========================================================

    let allReportData = [];


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    loadReport();


    // =========================================================
    // LOAD REPORT
    // =========================================================

    async function loadReport() {

        showLoading(true);
        clearMessage();

        try {

            const result =
                await getPlantDailyReportData();

            if (!result.success) {

                allReportData = [];

                renderTable([]);
                updateTotals([]);

                showMessage(
                    result.message ||
                    "Unable to load  5) Plant Received & DOA Report.",
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
                "Plant Daily Report Error:",
                error
            );

            allReportData = [];

            renderTable([]);
            updateTotals([]);

            showMessage(
                "Unable to connect to the server.",
                "error"
            );

        } finally {

            showLoading(false);
        }

    }


    // =========================================================
    // FILTER
    // =========================================================

    function applyFilter(showNotice = true) {

        const fromDate =
            fromDateInput.value;

        const toDate =
            toDateInput.value;


        let filteredData = [];


        if (!fromDate && !toDate) {

            filteredData =
                [...allReportData];

        } else {

            filteredData =
                allReportData.filter(row => {

                    const rowDate =
                        normalizeDate(row.date);

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


        renderTable(filteredData);
        updateTotals(filteredData);


        if (showNotice) {

            showMessage(
                `Filtered ${filteredData.length} records found.`,
                "success"
            );

        }

    }


    // =========================================================
    // CLEAR FILTER
    // =========================================================

    function clearFilter() {

        fromDateInput.value = "";
        toDateInput.value = "";

        renderTable(allReportData);
        updateTotals(allReportData);

        showMessage(
            "Filters cleared.",
            "success"
        );

    }


    // =========================================================
    // REFRESH
    // =========================================================

    async function refreshReport() {

        refreshBtn.disabled = true;
        refreshBtn.textContent = "Refreshing...";

        try {

            await loadReport();

            showMessage(
                "Report refreshed successfully.",
                "success"
            );

        } finally {

            refreshBtn.disabled = false;
            refreshBtn.textContent = "Refresh";

        }

    }


    // =========================================================
    // TABLE RENDER
    // =========================================================

    function renderTable(data) {

        reportTableBody.innerHTML = "";


        if (!data || data.length === 0) {

            const row =
                document.createElement("tr");

            row.className =
                "report-empty-row";

            row.innerHTML = `
                <td colspan="19">
                    No Plant Daily Birds records found.
                </td>
            `;

            reportTableBody.appendChild(row);

            return;
        }


        data.forEach(record => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${escapeHtml(record.s_no)}
                </td>

                <td>
                    ${escapeHtml(record.trip_no)}
                </td>

                <td>
                    ${escapeHtml(record.date)}
                </td>

                <td>
                    ${escapeHtml(record.batch_no)}
                </td>

                <td>
                    ${escapeHtml(record.vehicle)}
                </td>

                <td>
                    ${escapeHtml(record.driver)}
                </td>

                <td>
                    ${escapeHtml(record.helpers)}
                </td>

                <td>
                    ${escapeHtml(record.location)}
                </td>

                <td>
                    ${formatNumber(record.age, 0)}
                </td>

                <td>
                    ${formatNumber(record.expected_avg, 3)}
                </td>

                <td>
                    ${formatNumber(record.order_birds, 0)}
                </td>

                <td>
                    ${formatNumber(record.available_birds, 0)}
                </td>

                <td>
                    ${formatNumber(record.avg_weight, 3)}
                </td>

                <td>
                    ${formatNumber(record.weight, 2)}
                </td>

                <td>
                    ${formatNumber(record.weight_diff, 2)}
                </td>

                <td>
                    ${formatNumber(record.doa, 0)}
                </td>

                <td>
                    ${escapeHtml(formatClockTime(record.out_time))}
                </td>

                <td>
                    ${escapeHtml(formatClockTime(record.in_time))}
                </td>

                <td>
                    ${escapeHtml(formatTripTime(record.total_time))}
                </td>

            `;


            reportTableBody.appendChild(row);

        });

    }


    // =========================================================
    // GRAND TOTALS
    // =========================================================

    function updateTotals(data) {

        let orderBirds = 0;
        let availableBirds = 0;
        let weight = 0;
        let weightDiff = 0;
        let doa = 0;


        data.forEach(row => {

            orderBirds +=
                safeNumber(row.order_birds);

            availableBirds +=
                safeNumber(row.available_birds);

            weight +=
                safeNumber(row.weight);

            weightDiff +=
                safeNumber(row.weight_diff);

            doa +=
                safeNumber(row.doa);

        });


        // IMPORTANT:
        // Python report calculates overall average as
        // total weight / total available birds.

        const average =
            availableBirds > 0
                ? weight / availableBirds
                : 0;


        totalOrderBirds.textContent =
            orderBirds.toLocaleString(
                "en-US",
                {
                    maximumFractionDigits: 0
                }
            );


        totalAvailableBirds.textContent =
            availableBirds.toLocaleString(
                "en-US",
                {
                    maximumFractionDigits: 0
                }
            );


        totalAvg.textContent =
            average.toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 3,
                    maximumFractionDigits: 3
                }
            );


        totalWeight.textContent =
            weight.toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        totalWeightDiff.textContent =
            weightDiff.toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        totalDoa.textContent =
            doa.toLocaleString(
                "en-US",
                {
                    maximumFractionDigits: 0
                }
            );

    }


    // =========================================================
    // DATE NORMALIZATION
    // =========================================================

    function normalizeDate(value) {

        if (!value) {
            return "";
        }

        const text =
            String(value).trim();


        if (
            /^\d{4}-\d{2}-\d{2}/.test(text)
        ) {

            return text.substring(0, 10);

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


    function formatNumber(
        value,
        decimals
    ) {

        return safeNumber(value)
            .toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: decimals,
                    maximumFractionDigits: decimals
                }
            );

    }


    // =========================================================
    // HTML SAFETY
    // =========================================================

    function formatClockTime(value) {
    const text = String(value || "").trim();

    if (!text) {
        return "—";
    }

    const match =
        text.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::\d{2})?/);

    if (!match) {
        return text;
    }

    const hours = Number(match[1]);
    const minutes = match[2];
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour =
        String((hours % 12) || 12).padStart(2, "0");

    return `${displayHour}:${minutes} ${period}`;
}


    function formatTripTime(value) {
        const text = String(value || "").trim();

        if (!text) {
            return "—";
        }

        const match =
            text.match(/(?:T|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/);

        if (!match) {
            return text;
        }

        return `${String(match[1]).padStart(2, "0")}:${match[2]}:${match[3] || "00"}`;
    }
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
    // LOADING / MESSAGE
    // =========================================================

    function showLoading(show) {

        if (show) {

            reportLoading.classList.remove(
                "hidden"
            );

        } else {

            reportLoading.classList.add(
                "hidden"
            );

        }

    }


    function showMessage(
        message,
        type
    ) {

        reportMessage.textContent =
            message;

        reportMessage.classList.remove(
            "success",
            "error"
        );

        reportMessage.classList.add(type);

    }


    function clearMessage() {

        reportMessage.textContent = "";

        reportMessage.classList.remove(
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

    clearBtn.addEventListener(
        "click",
        clearFilter
    );

    refreshBtn.addEventListener(
        "click",
        refreshReport
    );


    // =========================================================
    // LOGOUT
    // =========================================================

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
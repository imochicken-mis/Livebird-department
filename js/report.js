document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // ELEMENTS
    // =========================================================

    const fromDateInput =
        document.getElementById("fromDate");

    const toDateInput =
        document.getElementById("toDate");

    const filterBtn =
        document.getElementById("filterBtn");

    const clearBtn =
        document.getElementById("clearBtn");

    const refreshBtn =
        document.getElementById("refreshBtn");

    const reportTableBody =
        document.getElementById("reportTableBody");

    const reportLoading =
        document.getElementById("reportLoading");

    const reportMessage =
        document.getElementById("reportMessage");

    const totalNob =
        document.getElementById("totalNob");

    const totalWeight =
        document.getElementById("totalWeight");

    const totalAmount =
        document.getElementById("totalAmount");

    const totalRejection =
        document.getElementById("totalRejection");

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
        user.username.toLowerCase() !== "user1"
    ) {
        sessionStorage.removeItem("livebirdUser");
        window.location.href = "../index.html";
        return;
    }


    loggedUser.textContent =
        `Logged in as: ${user.name || user.username}`;


    // =========================================================
    // REPORT DATA STORAGE
    // =========================================================

    let allReportData = [];


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    loadReportData();


    // =========================================================
    // LOAD DATA
    // =========================================================

    async function loadReportData() {

        showLoading(true);
        clearMessage();

        try {

            const result =
                await getOperationsReportData();

            if (!result.success) {

                showMessage(
                    result.message ||
                    "Unable to load report data.",
                    "error"
                );

                allReportData = [];

                renderTable([]);

                return;
            }


            allReportData =
                Array.isArray(result.data)
                    ? result.data
                    : [];


            applyFilter();


        } catch (error) {

            console.error(
                "Report loading error:",
                error
            );

            showMessage(
                "Unable to connect to the server.",
                "error"
            );

            allReportData = [];

            renderTable([]);

        } finally {

            showLoading(false);
        }

    }


    // =========================================================
    // FILTER
    // =========================================================

    function applyFilter() {

        const fromDate =
            fromDateInput.value;

        const toDate =
            toDateInput.value;


        if (!fromDate && !toDate) {

            renderTable(allReportData);

            updateTotals(allReportData);

            return;
        }


        const filteredData =
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


        renderTable(filteredData);

        updateTotals(filteredData);

        showMessage(
            `Filtered ${filteredData.length} records found.`,
            "success"
        );

    }


    // =========================================================
    // CLEAR FILTER
    // =========================================================

    function clearFilter() {

        fromDateInput.value = "";
        toDateInput.value = "";

        clearMessage();

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

        refreshBtn.textContent =
            "Refreshing...";

        try {

            await loadReportData();

            showMessage(
                "Report refreshed successfully.",
                "success"
            );

        } finally {

            refreshBtn.disabled = false;

            refreshBtn.textContent =
                "Refresh";
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

            row.classList.add(
                "report-empty-row"
            );

            row.innerHTML = `
                <td colspan="14">
                    No report records found.
                </td>
            `;

            reportTableBody.appendChild(
                row
            );

            return;
        }


        data.forEach(record => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>${escapeHtml(record.date)}</td>

                <td>${escapeHtml(record.type)}</td>

                <td>${escapeHtml(record.farmer)}</td>

                <td>${escapeHtml(record.cage)}</td>

                <td>${escapeHtml(record.batch)}</td>

                <td>${escapeHtml(record.customer)}</td>

                <td>${formatNumber(record.nob, 0)}</td>

                <td>${formatNumber(record.weight, 2)}</td>

                <td>${formatNumber(record.price, 2)}</td>

                <td>${escapeHtml(record.bill)}</td>

                <td>${formatNumber(record.amount, 2)}</td>

                <td>${formatNumber(record.avg_weight, 2)}</td>

                <td>${formatNumber(record.rejection_weight, 2)}</td>

                <td>${escapeHtml(record.reason)}</td>

            `;


            reportTableBody.appendChild(
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
        let amount = 0;
        let rejection = 0;


        data.forEach(row => {

            nob += safeNumber(
                row.nob
            );

            weight += safeNumber(
                row.weight
            );

            amount += safeNumber(
                row.amount
            );

            rejection += safeNumber(
                row.rejection_weight
            );

        });


        totalNob.textContent =
            nob.toLocaleString(
                "en-US",
                {
                    maximumFractionDigits: 0
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


        totalAmount.textContent =
            amount.toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        totalRejection.textContent =
            rejection.toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

    }


    // =========================================================
    // DATE NORMALIZER
    // =========================================================

    function normalizeDate(value) {

        if (!value) {
            return "";
        }

        const stringValue =
            String(value).trim();

        if (!stringValue) {
            return "";
        }


        // Expected format:
        // YYYY-MM-DD

        if (
            /^\d{4}-\d{2}-\d{2}/
                .test(stringValue)
        ) {

            return stringValue.substring(
                0,
                10
            );
        }


        const date =
            new Date(stringValue);

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

        const number =
            safeNumber(value);

        return number.toLocaleString(
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

        reportMessage.classList.add(
            type
        );

    }


    function clearMessage() {

        reportMessage.textContent = "";

        reportMessage.classList.remove(
            "success",
            "error"
        );

    }


    // =========================================================
    // BUTTON EVENTS
    // =========================================================

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
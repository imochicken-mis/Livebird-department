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

    const totalDisableNob =
        document.getElementById("totalDisableNob");

    const totalDisableWeight =
        document.getElementById("totalDisableWeight");

    const totalDisableAmount =
        document.getElementById("totalDisableAmount");

    const totalHealthyNob =
        document.getElementById("totalHealthyNob");

    const totalHealthyWeight =
        document.getElementById("totalHealthyWeight");

    const totalHealthyAmount =
        document.getElementById("totalHealthyAmount");

    const totalNob =
        document.getElementById("totalNob");

    const totalWeight =
        document.getElementById("totalWeight");

    const totalAmount =
        document.getElementById("totalAmount");

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
                await getCatchingBreakdownData();

            if (!result.success) {

                showMessage(
                    result.message ||
                    "Unable to load report data.",
                    "error"
                );

                allReportData = [];

                renderAll([]);

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

            renderAll([]);

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

            renderAll(allReportData);

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


        renderAll(filteredData);

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

        renderAll(allReportData);

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
    // RENDER ALL (TABLE + TOTALS)
    // =========================================================

    function renderAll(data) {

        renderTable(data);

        updateTotals(data);

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
                <td colspan="20">
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
                <td>${escapeHtml(record.serial_no)}</td>
                
                <td>${escapeHtml(record.date)}</td>

                <td>${escapeHtml(record.type)}</td>

                <td>${escapeHtml(record.farmer)}</td>

                <td>${escapeHtml(record.cage)}</td>

                <td>${escapeHtml(record.batch)}</td>

                <td>${escapeHtml(record.customer)}</td>

                <td>${escapeHtml(record.bill)}</td>

                <td>${formatNumber(record.disable_nob, 0)}</td>

                <td>${formatNumber(record.disable_weight, 2)}</td>

                <td>${formatNumber(record.disable_price, 2)}</td>

                <td>${formatNumber(record.disable_amount, 2)}</td>

                <td>${formatNumber(record.healthy_nob, 0)}</td>

                <td>${formatNumber(record.healthy_weight, 2)}</td>

                <td>${formatNumber(record.healthy_price, 2)}</td>

                <td>${formatNumber(record.healthy_amount, 2)}</td>

                <td>${formatNumber(record.total_nob, 0)}</td>

                <td>${formatNumber(record.total_weight, 2)}</td>

                <td>${formatNumber(record.total_price, 2)}</td>

                <td>${formatNumber(record.total_amount, 2)}</td>

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

        let disableNob = 0;
        let disableWeight = 0;
        let disableAmount = 0;

        let healthyNob = 0;
        let healthyWeight = 0;
        let healthyAmount = 0;

        let nob = 0;
        let weight = 0;
        let amount = 0;


        data.forEach(row => {

            disableNob += safeNumber(row.disable_nob);
            disableWeight += safeNumber(row.disable_weight);
            disableAmount += safeNumber(row.disable_amount);

            healthyNob += safeNumber(row.healthy_nob);
            healthyWeight += safeNumber(row.healthy_weight);
            healthyAmount += safeNumber(row.healthy_amount);

            nob += safeNumber(row.total_nob);
            weight += safeNumber(row.total_weight);
            amount += safeNumber(row.total_amount);

        });


        totalDisableNob.textContent =
            formatDisplayNumber(disableNob, 0);

        totalDisableWeight.textContent =
            formatDisplayNumber(disableWeight, 2);

        totalDisableAmount.textContent =
            formatDisplayNumber(disableAmount, 2);

        totalHealthyNob.textContent =
            formatDisplayNumber(healthyNob, 0);

        totalHealthyWeight.textContent =
            formatDisplayNumber(healthyWeight, 2);

        totalHealthyAmount.textContent =
            formatDisplayNumber(healthyAmount, 2);

        totalNob.textContent =
            formatDisplayNumber(nob, 0);

        totalWeight.textContent =
            formatDisplayNumber(weight, 2);

        totalAmount.textContent =
            formatDisplayNumber(amount, 2);


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


    function formatDisplayNumber(
        value,
        decimals
    ) {

        return value.toLocaleString(
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
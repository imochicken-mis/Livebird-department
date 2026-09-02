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

    const filterMemory =
        AdminCommon.enableFilterMemory(
            "birdConditionReport"
        );    

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

    const totalAverage =
        document.getElementById("totalAverage");

    const totalRejection =
        document.getElementById("totalRejection");

    const totalFinalWeight =
        document.getElementById("totalFinalWeight");

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
    // DATA STORAGE
    // =========================================================

    let allReportData = [];


    // =========================================================
    // INITIAL LOAD
    // =========================================================

    loadBirdConditionReport();


    // =========================================================
    // LOAD REPORT DATA
    // =========================================================

    async function loadBirdConditionReport() {

        showLoading(true);
        clearMessage();

        try {

            const result =
                await getBirdConditionReportData();

            if (!result.success) {

                showMessage(
                    result.message ||
                    "Unable to load 6) Bird Condition Report.",
                    "error"
                );

                allReportData = [];

                renderTable([]);
                updateTotals([]);

                return;
            }


            allReportData =
                Array.isArray(result.data)
                    ? result.data
                    : [];


            applyFilter();


        } catch (error) {

            console.error(
                "6) Bird Condition Report error:",
                error
            );

            showMessage(
                "Unable to connect to the server.",
                "error"
            );

            allReportData = [];

            renderTable([]);
            updateTotals([]);

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

            await loadBirdConditionReport();

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
                <td colspan="8">
                    No bird condition records found.
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

                <td>
                    ${escapeHtml(record.date)}
                </td>

                <td>
                    ${escapeHtml(record.farmer)}
                </td>

                <td>
                    ${formatNumber(record.nob, 0)}
                </td>

                <td>
                    ${formatNumber(record.weight, 2)}
                </td>

                <td>
                    ${formatNumber(record.avg_weight, 2)}
                </td>

                <td>
                    ${formatNumber(record.rejection_weight, 2)}
                </td>

                <td>
                ${escapeHtml(record.reason || "-")}
                </td>

                <td>
                    ${formatNumber(record.final_weight, 2)}
                </td>

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
        let rejection = 0;
        let finalWeight = 0;


        data.forEach(row => {

            nob += safeNumber(
                row.nob
            );

            weight += safeNumber(
                row.weight
            );

            rejection += safeNumber(
                row.rejection_weight
            );

            finalWeight += safeNumber(
                row.final_weight
            );

        });


        const average =
            nob > 0
                ? weight / nob
                : 0;


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


        totalAverage.textContent =
            average.toLocaleString(
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


        totalFinalWeight.textContent =
            finalWeight.toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );

    }


    // =========================================================
    // DATE HELPER
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
    // EVENTS
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
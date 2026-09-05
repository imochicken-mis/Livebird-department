document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // CONSTANTS
    // =========================================================

    const LOCATIONS = [
        "Pannala",
        "Kotadeniyawa",
        "Weerapokuna",
        "Epaladeniya"
    ];


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

    const reportBody =
        document.getElementById("buybackReportBody");

    const reportLoading =
        document.getElementById("reportLoading");

    const reportMessage =
        document.getElementById("reportMessage");


    // GRAND TOTAL ELEMENTS

    const grandBuyback =
        document.getElementById("grandBuyback");

    const grandPannala =
        document.getElementById("grandPannala");

    const grandKotadeniyawa =
        document.getElementById("grandKotadeniyawa");

    const grandWeerapokuna =
        document.getElementById("grandWeerapokuna");

    const grandEpaladeniya =
        document.getElementById("grandEpaladeniya");

    const grandTotalQty =
        document.getElementById("grandTotalQty");

    const grandImoPlant =
        document.getElementById("grandImoPlant");

    const grandLiveSale =
        document.getElementById("grandLiveSale");


    const loggedUser =
        document.getElementById("loggedUser");

    const logoutBtn =
        document.getElementById("logoutBtn");


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
        user.username.toLowerCase() !== "user3"
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

    let allRawData = [];


    // =========================================================
    // LOAD
    // =========================================================

    loadReport();


    async function loadReport() {

        showLoading(true);

        clearMessage();


        try {

            const result =
                await getUser3ReportData();


            if (
                !result ||
                result.success === false
            ) {

                allRawData = [];

                renderTable([]);

                updateTotals([]);


                showMessage(
                    result?.message ||
                    "Unable to load Live Bird Catching Plan Report.",
                    "error"
                );

                return;
            }


            allRawData =
                Array.isArray(result.data)
                    ? result.data
                    : [];


            applyFilter(false);


        } catch (error) {

            console.error(
                "User3 Report Error:",
                error
            );


            allRawData = [];

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

    function applyFilter(
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


        let filteredRaw;


        if (
            !fromDate &&
            !toDate
        ) {

            filteredRaw =
                [...allRawData];

        } else {

            filteredRaw =
                allRawData.filter(row => {

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


        const groupedData =
            groupByDate(
                filteredRaw
            );


        renderTable(
            groupedData
        );


        updateTotals(
            groupedData
        );


        if (showNotice) {

            showMessage(
                `Filtered ${groupedData.length} days found.`,
                "success"
            );

        }

    }


    // =========================================================
    // GROUP RAW DATA BY DATE
    // =========================================================

    function groupByDate(rawRows) {

        const grouped = {};


        rawRows.forEach(row => {

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

                    buyback:
                        safeNumber(
                            row.buyback
                        ),

                    imoPlant:
                        safeNumber(
                            row.imo_plant
                        ),

                    remark:
                        row.remark || "",

                    locations: {

                        Pannala: [],

                        Kotadeniyawa: [],

                        Weerapokuna: [],

                        Epaladeniya: []

                    }

                };

            }


            const location =
                String(
                    row.location || ""
                ).trim();


            if (
                LOCATIONS.includes(location)
            ) {

                const cageNo =
                    String(
                        row.cage_no || ""
                    ).trim();


                const qty =
                    safeNumber(
                        row.qty
                    );


                const size =
                    String(
                        row.size || ""
                    ).trim();


                if (
                    cageNo ||
                    qty ||
                    size
                ) {

                    grouped[date]
                        .locations[location]
                        .push({

                            cage:
                                cageNo
                                    ? `C${cageNo}`
                                    : "-",

                            qty,

                            size:
                                size || "-"

                        });

                }

            }

        });


        const result =
            Object.values(grouped)
                .map(item => {

                    const pannalaTotal =
                        sumLocationQty(
                            item.locations.Pannala
                        );

                    const kotadeniyawaTotal =
                        sumLocationQty(
                            item.locations.Kotadeniyawa
                        );

                    const weerapokunaTotal =
                        sumLocationQty(
                            item.locations.Weerapokuna
                        );

                    const epaladeniyaTotal =
                        sumLocationQty(
                            item.locations.Epaladeniya
                        );


                    const farmTotal =
                        pannalaTotal +
                        kotadeniyawaTotal +
                        weerapokunaTotal +
                        epaladeniyaTotal;


                    const totalQty =
                        item.buyback +
                        farmTotal;


                    const liveSale =
                        totalQty -
                        item.imoPlant; 


                    return {

                        date:
                            item.date,

                        buyback:
                            item.buyback,

                        pannala:
                            item.locations.Pannala,

                        kotadeniyawa:
                            item.locations.Kotadeniyawa,

                        weerapokuna:
                            item.locations.Weerapokuna,

                        epaladeniya:
                            item.locations.Epaladeniya,

                        pannalaTotal,

                        kotadeniyawaTotal,

                        weerapokunaTotal,

                        epaladeniyaTotal,

                        totalQty,

                        imoPlant:
                            item.imoPlant,

                        liveSale,

                        remark:
                            item.remark || "-"

                    };

                });


        result.sort(
            (a, b) =>
                a.date.localeCompare(
                    b.date
                )
        );


        return result;

    }


    // =========================================================
    // LOCATION TOTAL
    // =========================================================

    function sumLocationQty(items) {

        if (!Array.isArray(items)) {
            return 0;
        }


        return items.reduce(
            (total, item) =>
                total +
                safeNumber(
                    item.qty
                ),
            0
        );

    }


    // =========================================================
    // RENDER TABLE
    // =========================================================

    function renderTable(data) {

        reportBody.innerHTML = "";


        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {

            reportBody.innerHTML = `

                <tr>

                    <td
                        colspan="18"
                        class="report-empty-cell"
                    >
                        No Buyback Catching records found.
                    </td>

                </tr>

            `;

            return;
        }


        data.forEach(record => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        record.date
                    )}
                </td>


                <td>
                    ${formatWhole(
                        record.buyback
                    )}
                </td>


                ${renderLocationColumns(
                    record.pannala
                )}


                ${renderLocationColumns(
                    record.kotadeniyawa
                )}


                ${renderLocationColumns(
                    record.weerapokuna
                )}


                ${renderLocationColumns(
                    record.epaladeniya
                )}


                <td>
                    ${formatWhole(
                        record.totalQty
                    )}
                </td>


                <td>
                    ${formatWhole(
                        record.imoPlant
                    )}
                </td>


                <td>
                    ${formatWhole(
                        record.liveSale
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        record.remark
                    )}
                </td>

            `;


            reportBody.appendChild(
                row
            );

        });

    }


    // =========================================================
    // RENDER LOCATION AS 3 COLUMNS
    // =========================================================

    function renderLocationColumns(items) {

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            return `

                <td>
                    -
                </td>

                <td>
                    -
                </td>

                <td>
                    -
                </td>

            `;

        }


        const cageHtml =
            items.map(item => `

                <div class="cage-line">
                    ${escapeHtml(
                        item.cage
                    )}
                </div>

            `).join("");


        const qtyHtml =
            items.map(item => `

                <div class="cage-line qty-line">
                    ${formatWhole(
                        item.qty
                    )}
                </div>

            `).join("");


        const sizeHtml =
            items.map(item => `

                <div class="cage-line size-line">
                    ${escapeHtml(
                        item.size
                    )}
                </div>

            `).join("");


        return `

            <td>

                <div class="cage-stack">
                    ${cageHtml}
                </div>

            </td>


            <td>

                <div class="cage-stack">
                    ${qtyHtml}
                </div>

            </td>


            <td>

                <div class="cage-stack">
                    ${sizeHtml}
                </div>

            </td>

        `;

    }


    // =========================================================
    // GRAND TOTALS
    // =========================================================

    function updateTotals(data) {

        let buyback = 0;

        let pannala = 0;

        let kotadeniyawa = 0;

        let weerapokuna = 0;

        let epaladeniya = 0;

        let totalQty = 0;

        let imoPlant = 0;

        let liveSale = 0;


        data.forEach(row => {

            buyback +=
                safeNumber(
                    row.buyback
                );


            pannala +=
                safeNumber(
                    row.pannalaTotal
                );


            kotadeniyawa +=
                safeNumber(
                    row.kotadeniyawaTotal
                );


            weerapokuna +=
                safeNumber(
                    row.weerapokunaTotal
                );


            epaladeniya +=
                safeNumber(
                    row.epaladeniyaTotal
                );


            totalQty +=
                safeNumber(
                    row.totalQty
                );


            imoPlant +=
                safeNumber(
                    row.imoPlant
                );


            liveSale +=
                safeNumber(
                    row.liveSale
                );

        });


        grandBuyback.textContent =
            formatWhole(
                buyback
            );


        grandPannala.textContent =
            formatWhole(
                pannala
            );


        grandKotadeniyawa.textContent =
            formatWhole(
                kotadeniyawa
            );


        grandWeerapokuna.textContent =
            formatWhole(
                weerapokuna
            );


        grandEpaladeniya.textContent =
            formatWhole(
                epaladeniya
            );


        grandTotalQty.textContent =
            formatWhole(
                totalQty
            );


        grandImoPlant.textContent =
            formatWhole(
                imoPlant
            );


        grandLiveSale.textContent =
            formatWhole(
                liveSale
            );

    }


    // =========================================================
    // CLEAR FILTER
    // =========================================================

    function clearFilter() {

        fromDateInput.value = "";

        toDateInput.value = "";


        const grouped =
            groupByDate(
                allRawData
            );


        renderTable(
            grouped
        );


        updateTotals(
            grouped
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

        refreshBtn.disabled = true;

        refreshBtn.textContent =
            "Refreshing...";


        try {

            await loadReport();


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
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


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


        const number =
            parseFloat(
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
    // UI HELPERS
    // =========================================================

    function showLoading(show) {

        if (!reportLoading) {
            return;
        }


        if (show) {

            reportLoading
                .classList
                .remove("hidden");

        } else {

            reportLoading
                .classList
                .add("hidden");

        }

    }


    function showMessage(
        text,
        type
    ) {

        if (!reportMessage) {
            return;
        }


        reportMessage.textContent =
            text;


        reportMessage.classList.remove(
            "success",
            "error"
        );


        reportMessage.classList.add(
            type
        );

    }


    function clearMessage() {

        if (!reportMessage) {
            return;
        }


        reportMessage.textContent =
            "";


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
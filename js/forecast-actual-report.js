document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // ELEMENTS
    // =========================================================

    const monthFilter =
        document.getElementById("monthFilter");

    const monthFilterBtn =
        document.getElementById("monthFilterBtn");

    const monthClearBtn =
        document.getElementById("monthClearBtn");

    const refreshBtn =
        document.getElementById("refreshBtn");


    const fromDate =
        document.getElementById("fromDate");

    const toDate =
        document.getElementById("toDate");

    const detailFilterBtn =
        document.getElementById("detailFilterBtn");

    const detailClearBtn =
        document.getElementById("detailClearBtn");


    const forecastDetailBody =
        document.getElementById("forecastDetailBody");

    const loader =
        document.getElementById("analyticsLoader");

    const message =
        document.getElementById("analyticsMessage");

    const loggedUser =
        document.getElementById("loggedUser");

    const logoutBtn =
        document.getElementById("logoutBtn");


    // =========================================================
    // FILTER MEMORY
    // =========================================================

    const filterMemory =
        AdminCommon.enableFilterMemory(
            "forecastActualReport"
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


    loggedUser.textContent =
        `Logged in as: ${user.name || user.username}`;


    // =========================================================
    // DATA
    // =========================================================

    let allActualData = [];

    let allForecastData = [];


    // =========================================================
    // DEFAULT MONTH
    // Only use current month when no saved month exists
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

            const [
                actualResult,
                forecastResult
            ] =
                await Promise.all([

                    /*
                     * Same source used by
                     * 1) Live Bird Catching Report / REPORT MODULES
                     */
                    getDefectReportData(),

                    /*
                     * Same source used by User 3 report
                     */
                    getUser3ReportData()

                ]);


            // ---------------------------------------------
            // ACTUAL DATA
            // ---------------------------------------------

            if (
                !actualResult ||
                actualResult.success === false
            ) {

                throw new Error(
                    actualResult?.message ||
                    "Unable to load actual bird data."
                );
            }


            allActualData =
                Array.isArray(actualResult.data)
                    ? actualResult.data
                    : [];


            // ---------------------------------------------
            // FORECAST DATA
            // ---------------------------------------------

            if (
                !forecastResult ||
                forecastResult.success === false
            ) {

                throw new Error(
                    forecastResult?.message ||
                    "Unable to load forecast data."
                );
            }


            allForecastData =
                Array.isArray(forecastResult.data)
                    ? forecastResult.data
                    : [];


            // ---------------------------------------------
            // UPDATE EVERYTHING
            // ---------------------------------------------

            applyMonthFilter(false);

            applyDetailFilter(false);


        } catch (error) {

            console.error(
                "8) Forecast vs Actual Report Error:",
                error
            );


            allActualData = [];

            allForecastData = [];


            updateActualSummary([]);

            updateForecastSummary([]);

            renderForecastDetail([]);


            showMessage(
                error.message ||
                "Unable to load 8) Forecast vs Actual Report.",
                "error"
            );


        } finally {

            setLoading(false);

        }

    }


    // =========================================================
    // MONTH FILTER
    // =========================================================

    function applyMonthFilter(
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


        updateActualSummary(
            actualData
        );


        updateForecastSummary(
            forecastData
        );


        /*
         * When month changes, also show that
         * month's forecast records in detail table.
         *
         * But if user already selected From/To dates,
         * detail filter has priority.
         */

        if (
            !fromDate.value &&
            !toDate.value
        ) {

            renderForecastDetail(
                forecastData
            );
        }


        if (showNotice) {

            showMessage(
                `Forecast and actual totals updated for selected month.`,
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
                date.startsWith(month)
            );

        });

    }


    // =========================================================
    // ACTUAL SUMMARY
    // =========================================================

    function updateActualSummary(data) {

        let pannala = 0;

        let kotadeniyawa = 0;

        let weerapokuna = 0;

        let epaladeniya = 0;

        let buyback = 0;


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


            // ---------------------------------------------
            // OWN FARM
            // ---------------------------------------------

            if (
                type === "own farm" ||
                type === "ownfarm"
            ) {

                if (
                    farmer.includes(
                        "pannala"
                    )
                ) {

                    pannala += birds;

                } else if (
                    farmer.includes(
                        "kotadeniyawa"
                    )
                ) {

                    kotadeniyawa += birds;

                } else if (
                    farmer.includes(
                        "weerapokuna"
                    )
                ) {

                    weerapokuna += birds;

                } else if (
                    farmer.includes(
                        "epaladeniya"
                    )
                ) {

                    epaladeniya += birds;

                }

            }


            // ---------------------------------------------
            // BUY BACK
            //
            // Customer name is intentionally ignored.
            // Every Buy Back record goes into one total.
            // ---------------------------------------------

            if (
                type === "buy back" ||
                type === "buyback"
            ) {

                buyback += birds;

            }

        });


        const total =
            pannala +
            kotadeniyawa +
            weerapokuna +
            epaladeniya +
            buyback;


        setText(
            "actualPannala",
            formatWhole(pannala)
        );


        setText(
            "actualKotadeniyawa",
            formatWhole(kotadeniyawa)
        );


        setText(
            "actualWeerapokuna",
            formatWhole(weerapokuna)
        );


        setText(
            "actualEpaladeniya",
            formatWhole(epaladeniya)
        );


        setText(
            "actualBuyback",
            formatWhole(buyback)
        );


        setText(
            "actualTotal",
            formatWhole(total)
        );

    }


    // =========================================================
    // FORECAST SUMMARY
    // =========================================================

    function updateForecastSummary(data) {

        let pannala = 0;

        let kotadeniyawa = 0;

        let weerapokuna = 0;

        let epaladeniya = 0;

        let buyback = 0;


        data.forEach(row => {

            const location =
                normalizeText(
                    row.location
                );


            const qty =
                safeNumber(
                    row.qty
                );


            const buybackQty =
                safeNumber(
                    row.buyback
                );


            // ---------------------------------------------
            // BUY BACK
            // ---------------------------------------------

            buyback += buybackQty;


            // ---------------------------------------------
            // FARM FORECAST
            // ---------------------------------------------

            if (
                location.includes(
                    "pannala"
                )
            ) {

                pannala += qty;

            } else if (
                location.includes(
                    "kotadeniyawa"
                )
            ) {

                kotadeniyawa += qty;

            } else if (
                location.includes(
                    "weerapokuna"
                )
            ) {

                weerapokuna += qty;

            } else if (
                location.includes(
                    "epaladeniya"
                )
            ) {

                epaladeniya += qty;

            }

        });


        const total =
            pannala +
            kotadeniyawa +
            weerapokuna +
            epaladeniya +
            buyback;


        setText(
            "forecastPannala",
            formatWhole(pannala)
        );


        setText(
            "forecastKotadeniyawa",
            formatWhole(kotadeniyawa)
        );


        setText(
            "forecastWeerapokuna",
            formatWhole(weerapokuna)
        );


        setText(
            "forecastEpaladeniya",
            formatWhole(epaladeniya)
        );


        setText(
            "forecastBuyback",
            formatWhole(buyback)
        );


        setText(
            "forecastTotal",
            formatWhole(total)
        );

    }


    // =========================================================
    // DETAIL DATE FILTER
    // =========================================================

    function applyDetailFilter(
        showNotice = true
    ) {

        const from =
            fromDate.value;

        const to =
            toDate.value;


        /*
         * If no date range is selected,
         * use selected month.
         */

        if (
            !from &&
            !to
        ) {

            const monthData =
                filterByMonth(
                    allForecastData,
                    monthFilter.value
                );


            renderForecastDetail(
                monthData
            );


            return;
        }


        if (
            from &&
            to &&
            from > to
        ) {

            showMessage(
                "From Date cannot be after To Date.",
                "error"
            );

            return;
        }


        const filtered =
            allForecastData.filter(row => {

                const date =
                    normalizeDate(
                        row.date
                    );


                if (!date) {

                    return false;

                }


                if (
                    from &&
                    date < from
                ) {

                    return false;

                }


                if (
                    to &&
                    date > to
                ) {

                    return false;

                }


                return true;

            });


        renderForecastDetail(
            filtered
        );


        if (showNotice) {

            showMessage(
                `${filtered.length} forecast records found.`,
                "success"
            );

        }

    }


    // =========================================================
    // RENDER FORECAST DETAIL
    // =========================================================

    function renderForecastDetail(data) {

        const grouped =
            groupForecastByDate(
                data
            );


        const dates =
            Object.keys(grouped)
                .sort(
                    (a, b) =>
                        a.localeCompare(b)
                );


        if (!dates.length) {

            forecastDetailBody.innerHTML = `

                <tr>

                    <td
                        colspan="18"
                        class="analytics-empty-state"
                    >
                        No forecast records found.
                    </td>

                </tr>

            `;


            updateDetailTotals([]);

            return;

        }


        forecastDetailBody.innerHTML =
            dates.map(date => {

                const day =
                    grouped[date];


                return `

                    <tr>

                        <td>
                            ${escapeHtml(
                                formatDisplayDate(date)
                            )}
                        </td>


                        <td>
                            ${formatWhole(
                                day.buyback
                            )}
                        </td>


                        <!-- PANNALA -->

                        <td>
                            ${formatDetailList(
                                day.pannala,
                                "cage"
                            )}
                        </td>

                        <td>
                            ${formatDetailList(
                                day.pannala,
                                "qty"
                            )}
                        </td>

                        <td>
                            ${formatDetailList(
                                day.pannala,
                                "size"
                            )}
                        </td>


                        <!-- KOTADENIYAWA -->

                        <td>
                            ${formatDetailList(
                                day.kotadeniyawa,
                                "cage"
                            )}
                        </td>

                        <td>
                            ${formatDetailList(
                                day.kotadeniyawa,
                                "qty"
                            )}
                        </td>

                        <td>
                            ${formatDetailList(
                                day.kotadeniyawa,
                                "size"
                            )}
                        </td>


                        <!-- WEERAPOKUNA -->

                        <td>
                            ${formatDetailList(
                                day.weerapokuna,
                                "cage"
                            )}
                        </td>

                        <td>
                            ${formatDetailList(
                                day.weerapokuna,
                                "qty"
                            )}
                        </td>

                        <td>
                            ${formatDetailList(
                                day.weerapokuna,
                                "size"
                            )}
                        </td>


                        <!-- EPALADENIYA -->

                        <td>
                            ${formatDetailList(
                                day.epaladeniya,
                                "cage"
                            )}
                        </td>

                        <td>
                            ${formatDetailList(
                                day.epaladeniya,
                                "qty"
                            )}
                        </td>

                        <td>
                            ${formatDetailList(
                                day.epaladeniya,
                                "size"
                            )}
                        </td>


                        <td>
                            ${formatWhole(
                                day.total
                            )}
                        </td>


                        <td>
                            ${formatWhole(
                                day.imoPlant
                            )}
                        </td>


                        <td>
                            ${formatWhole(
                                day.liveSale
                            )}
                        </td>


                        <td>
                            ${escapeHtml(
                                day.remarks.join(", ") ||
                                "—"
                            )}
                        </td>

                    </tr>

                `;

            }).join("");


        updateDetailTotals(
            data
        );

    }


    // =========================================================
    // GROUP FORECAST BY DATE
    // =========================================================

    function groupForecastByDate(data) {

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

                    buyback: 0,

                    pannala: [],

                    kotadeniyawa: [],

                    weerapokuna: [],

                    epaladeniya: [],

                    total: 0,

                    imoPlant: 0,

                    liveSale: 0,

                    remarks: []

                };

            }


            const day =
                grouped[date];


            const location =
                normalizeText(
                    row.location
                );


            const qty =
                safeNumber(
                    row.qty
                );


            const buyback =
                safeNumber(
                    row.buyback
                );


            const imoPlant =
                safeNumber(
                    row.imo_plant
                );


            const liveSale =
                safeNumber(
                    row.live_sale
                );


            // ---------------------------------------------
            // BUY BACK
            // ---------------------------------------------

            day.buyback +=
                buyback;


            // ---------------------------------------------
            // FARM DETAIL
            // ---------------------------------------------

            const detail = {

                cage:
                    String(
                        row.cage_no || "—"
                    ).trim(),

                qty,

                size:
                    String(
                        row.size || "—"
                    ).trim()

            };


            if (
                location.includes(
                    "pannala"
                )
            ) {

                day.pannala.push(
                    detail
                );

            } else if (
                location.includes(
                    "kotadeniyawa"
                )
            ) {

                day.kotadeniyawa.push(
                    detail
                );

            } else if (
                location.includes(
                    "weerapokuna"
                )
            ) {

                day.weerapokuna.push(
                    detail
                );

            } else if (
                location.includes(
                    "epaladeniya"
                )
            ) {

                day.epaladeniya.push(
                    detail
                );

            }


            day.total +=
                qty +
                buyback;


            day.imoPlant +=
                imoPlant;


            day.liveSale +=
                liveSale;


            const remark =
                String(
                    row.remark || ""
                ).trim();


            if (
                remark &&
                !day.remarks.includes(
                    remark
                )
            ) {

                day.remarks.push(
                    remark
                );

            }

        });


        return grouped;

    }


    // =========================================================
    // DETAIL TOTALS
    // =========================================================

    function updateDetailTotals(data) {

        let buyback = 0;

        let pannala = 0;

        let kotadeniyawa = 0;

        let weerapokuna = 0;

        let epaladeniya = 0;

        let imoPlant = 0;

        let liveSale = 0;


        data.forEach(row => {

            const location =
                normalizeText(
                    row.location
                );


            const qty =
                safeNumber(
                    row.qty
                );


            buyback +=
                safeNumber(
                    row.buyback
                );


            imoPlant +=
                safeNumber(
                    row.imo_plant
                );


            liveSale +=
                safeNumber(
                    row.live_sale
                );


            if (
                location.includes(
                    "pannala"
                )
            ) {

                pannala += qty;

            } else if (
                location.includes(
                    "kotadeniyawa"
                )
            ) {

                kotadeniyawa += qty;

            } else if (
                location.includes(
                    "weerapokuna"
                )
            ) {

                weerapokuna += qty;

            } else if (
                location.includes(
                    "epaladeniya"
                )
            ) {

                epaladeniya += qty;

            }

        });


        const total =
            buyback +
            pannala +
            kotadeniyawa +
            weerapokuna +
            epaladeniya;


        setText(
            "detailBuybackTotal",
            formatWhole(buyback)
        );

        setText(
            "detailPannalaTotal",
            formatWhole(pannala)
        );

        setText(
            "detailKotadeniyawaTotal",
            formatWhole(kotadeniyawa)
        );

        setText(
            "detailWeerapokunaTotal",
            formatWhole(weerapokuna)
        );

        setText(
            "detailEpaladeniyaTotal",
            formatWhole(epaladeniya)
        );

        setText(
            "detailTotalBirds",
            formatWhole(total)
        );

        setText(
            "detailImoTotal",
            formatWhole(imoPlant)
        );

        setText(
            "detailLiveSaleTotal",
            formatWhole(liveSale)
        );

    }


    // =========================================================
    // FORMAT DETAIL LIST
    // =========================================================

    function formatDetailList(
        records,
        field
    ) {

        if (
            !Array.isArray(records) ||
            !records.length
        ) {

            return "—";

        }


        return records
            .map(item => {

                if (field === "qty") {

                    return formatWhole(
                        item.qty
                    );

                }


                return escapeHtml(
                    item[field] || "—"
                );

            })
            .join("<br>");

    }


    // =========================================================
    // CLEAR MONTH FILTER
    // =========================================================

    function clearMonthFilter() {

        /*
         * Clear common saved filter memory.
         */

        filterMemory.clear();


        monthFilter.value = "";


        updateActualSummary(
            allActualData
        );


        updateForecastSummary(
            allForecastData
        );


        if (
            !fromDate.value &&
            !toDate.value
        ) {

            renderForecastDetail(
                allForecastData
            );

        }


        showMessage(
            "Month filter cleared.",
            "success"
        );

    }


    // =========================================================
    // CLEAR DETAIL FILTER
    // =========================================================

    function clearDetailFilter() {

        fromDate.value = "";

        toDate.value = "";


        const forecastData =
            filterByMonth(
                allForecastData,
                monthFilter.value
            );


        renderForecastDetail(
            forecastData
        );


        showMessage(
            "Detail date filter cleared.",
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
                "8) Forecast vs Actual Report refreshed.",
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


    function normalizeText(value) {

        return String(
            value || ""
        )
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

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
            normalizeDate(value);


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


    function formatWhole(value) {

        return Math.round(
            safeNumber(value)
        ).toLocaleString(
            "en-US"
        );

    }


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {

            element.textContent =
                value;

        }

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

    monthFilterBtn.addEventListener(
        "click",
        () => applyMonthFilter(true)
    );


    monthFilter.addEventListener(
        "change",
        () => applyMonthFilter(false)
    );


    monthClearBtn.addEventListener(
        "click",
        clearMonthFilter
    );


    detailFilterBtn.addEventListener(
        "click",
        () => applyDetailFilter(true)
    );


    detailClearBtn.addEventListener(
        "click",
        clearDetailFilter
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
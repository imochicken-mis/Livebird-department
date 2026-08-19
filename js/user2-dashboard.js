document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // ELEMENTS
    // =========================================================

    const tripDate =
        document.getElementById("tripDate");

    const vehicleNumber =
        document.getElementById("vehicleNumber");

    const driverName =
        document.getElementById("driverName");

    const doa =
        document.getElementById("doa");

    const helper1 =
        document.getElementById("helper1");

    const helper2 =
        document.getElementById("helper2");

    const helper3 =
        document.getElementById("helper3");

    const outTime =
        document.getElementById("outTime");

    const outAmPm =
        document.getElementById("outAmPm");

    const inTime =
        document.getElementById("inTime");

    const inAmPm =
        document.getElementById("inAmPm");

    const totalTripTime =
        document.getElementById("totalTripTime");

    const batchContainer =
        document.getElementById("batchContainer");

    const addBatchBtn =
        document.getElementById("addBatchBtn");

    const saveAllBtn =
        document.getElementById("saveAllBtn");

    const saveMessage =
        document.getElementById("saveMessage");

    const previewModal =
        document.getElementById("previewModal");

    const previewContent =
        document.getElementById("previewContent");

    const cancelPreviewBtn =
        document.getElementById("cancelPreviewBtn");

    const closePreviewBtn =
        document.getElementById("closePreviewBtn");

    const confirmSaveBtn =
        document.getElementById("confirmSaveBtn");

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

    const user =
        JSON.parse(sessionUser);

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
    // STATE
    // =========================================================

    let batchCounter = 0;


    // =========================================================
    // INITIAL SETUP
    // =========================================================

    setTodayDate();

    loadUser2Lists();

    addBatchRow();


    // =========================================================
    // LOAD LISTS
    // =========================================================

    async function loadUser2Lists() {

        try {

            const result =
                await getUser2DashboardLists();

            if (!result.success) {
                showMessage(
                    result.message ||
                    "Unable to load vehicle data.",
                    "error"
                );

                return;
            }


            populateSelect(
                vehicleNumber,
                result.vehicles || [],
                "Select Vehicle"
            );

            populateSelect(
                driverName,
                result.drivers || [],
                "Select Driver"
            );

            populateSelect(
                helper1,
                result.helpers || [],
                "Helper 1"
            );

            populateSelect(
                helper2,
                result.helpers || [],
                "Helper 2"
            );

            populateSelect(
                helper3,
                result.helpers || [],
                "Helper 3"
            );


        } catch (error) {

            console.error(error);

            showMessage(
                "Unable to load vehicle/driver/helper data.",
                "error"
            );
        }

    }


    // =========================================================
    // POPULATE SELECT
    // =========================================================

    function populateSelect(
        element,
        values,
        placeholder
    ) {

        element.innerHTML =
            `<option value="">${placeholder}</option>`;

        values.forEach(value => {

            const cleanValue =
                String(value || "").trim();

            if (!cleanValue) {
                return;
            }

            const option =
                document.createElement("option");

            option.value = cleanValue;
            option.textContent = cleanValue;

            element.appendChild(option);

        });

    }


    // =========================================================
// TRIP TIME CALCULATION
// =========================================================

outTime.addEventListener("input", calculateTripTime);
inTime.addEventListener("input", calculateTripTime);

outAmPm.addEventListener("change", calculateTripTime);
inAmPm.addEventListener("change", calculateTripTime);


// Auto format when leaving the field
outTime.addEventListener("blur", () => {
    formatTimeField(outTime);
    calculateTripTime();
});

inTime.addEventListener("blur", () => {
    formatTimeField(inTime);
    calculateTripTime();
});


// =========================================================
// FORMAT TIME FIELD
// =========================================================

function formatTimeField(input) {

    const normalized = normalizeTimeInput(input.value);

    if (normalized) {
        input.value = normalized;
    }
}


// =========================================================
// NORMALIZE TIME INPUT
// =========================================================

function normalizeTimeInput(value) {

    const clean = String(value || "").trim();

    if (!clean) {
        return "";
    }


    // -----------------------------------------------------
    // NORMAL FORMAT
    // 1:20  -> 01:20
    // 01:20 -> 01:20
    // 13:50 -> 13:50
    // -----------------------------------------------------

    let match = clean.match(/^(\d{1,2}):(\d{1,2})$/);

    if (match) {

        const hour = Number(match[1]);
        const minute = Number(match[2]);

        if (
            hour < 0 ||
            hour > 23 ||
            minute < 0 ||
            minute > 59
        ) {
            return "";
        }

        return (
            String(hour).padStart(2, "0") +
            ":" +
            String(minute).padStart(2, "0")
        );
    }


    // -----------------------------------------------------
    // QUICK DOT FORMAT
    //
    // 1.2  -> 01:20
    // 1.5  -> 01:50
    // 7.05 -> 07:05
    // 13.5 -> 13:50
    // -----------------------------------------------------

    match = clean.match(/^(\d{1,2})\.(\d{1,2})$/);

    if (match) {

        const hour = Number(match[1]);

        let minuteText = match[2];

        // .2 = 20
        // .5 = 50
        if (minuteText.length === 1) {
            minuteText += "0";
        }

        const minute = Number(minuteText);

        if (
            hour < 0 ||
            hour > 23 ||
            minute < 0 ||
            minute > 59
        ) {
            return "";
        }

        return (
            String(hour).padStart(2, "0") +
            ":" +
            String(minute).padStart(2, "0")
        );
    }


    // -----------------------------------------------------
    // HOUR ONLY
    //
    // 1  -> 01:00
    // 7  -> 07:00
    // 13 -> 13:00
    // -----------------------------------------------------

    if (/^\d{1,2}$/.test(clean)) {

        const hour = Number(clean);

        if (
            hour < 0 ||
            hour > 23
        ) {
            return "";
        }

        return (
            String(hour).padStart(2, "0") +
            ":00"
        );
    }


    return "";
}


// =========================================================
// CALCULATE TRIP TIME
// =========================================================

function calculateTripTime() {

    const out = parseTime(
        outTime.value,
        outAmPm.value
    );

    const incoming = parseTime(
        inTime.value,
        inAmPm.value
    );


    if (!out || !incoming) {

        totalTripTime.value = "00:00:00";

        return;
    }


    let diff = incoming - out;


    // Handle trip passing midnight
    if (diff < 0) {

        diff += 24 * 60 * 60 * 1000;
    }


    const totalSeconds = Math.floor(
        diff / 1000
    );


    const hours = Math.floor(
        totalSeconds / 3600
    );


    const minutes = Math.floor(
        (totalSeconds % 3600) / 60
    );


    const seconds =
        totalSeconds % 60;


    totalTripTime.value =
        `${String(hours).padStart(2, "0")}:` +
        `${String(minutes).padStart(2, "0")}:` +
        `${String(seconds).padStart(2, "0")}`;
}


// =========================================================
// PARSE TIME
// =========================================================

function parseTime(value, ampm) {

    const normalized =
        normalizeTimeInput(value);


    if (!normalized) {
        return null;
    }


    const [
        hourText,
        minuteText
    ] = normalized.split(":");


    let hour = Number(hourText);

    const minute =
        Number(minuteText);


    // 1 - 12 uses AM / PM
    if (
        hour >= 1 &&
        hour <= 12
    ) {

        if (
            ampm === "AM" &&
            hour === 12
        ) {
            hour = 0;
        }


        if (
            ampm === "PM" &&
            hour !== 12
        ) {
            hour += 12;
        }
    }


    // 13 - 23 already means 24-hour time
    if (
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }


    const date = new Date();


    date.setHours(
        hour,
        minute,
        0,
        0
    );


    return date;
}


    // =========================================================
    // ADD BATCH
    // =========================================================

    addBatchBtn.addEventListener(
        "click",
        addBatchRow
    );


    function addBatchRow() {

        batchCounter++;

        const batchId =
            `batch-${batchCounter}`;


        const card =
            document.createElement("div");

        card.className =
            "batch-card";

        card.dataset.batchId =
            batchId;


        card.innerHTML = `

            <div class="batch-card-header">

                <h3 class="batch-card-title">
                    Batch Details
                </h3>

                <button
                    type="button"
                    class="delete-batch-btn"
                >
                    Delete Batch
                </button>

            </div>


            <div class="batch-grid">

                <div class="form-group">
                    <label>Farmer Batch No</label>

                    <input
                        type="text"
                        class="batch-no"
                        placeholder="e.g., 1616"
                    >
                </div>


                <div class="form-group">
                    <label>Location</label>

                    <input
                        type="text"
                        class="batch-location"
                        placeholder="e.g., Epaladeniya 01"
                    >
                </div>


                <div class="form-group">
                    <label>Age (Days)</label>

                    <input
                        type="number"
                        class="batch-age"
                        placeholder="35"
                        min="0"
                    >
                </div>


                <div class="form-group">
                    <label>Exp Avg Weight (KG)</label>

                    <input
                        type="number"
                        class="batch-expected-avg"
                        placeholder="2.00"
                        step="0.001"
                        min="0"
                    >
                </div>


                <div class="form-group">
                    <label>Order Birds</label>

                    <input
                        type="number"
                        class="batch-order-birds"
                        placeholder="0"
                        min="0"
                    >
                </div>


                <div class="form-group">
                    <label>Available Birds</label>

                    <input
                        type="number"
                        class="batch-available-birds"
                        placeholder="0"
                        min="0"
                    >
                </div>


                <div class="form-group">
                    <label>Weight (KG)</label>

                    <input
                        type="number"
                        class="batch-weight"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                    >
                </div>


                <div class="form-group">
                    <label>Avg Weight (KG)</label>

                    <input
                        type="text"
                        class="batch-avg-weight readonly-field"
                        value="0.000"
                        readonly
                    >
                </div>


                <div class="form-group">
                    <label>Weight Diff (KG)</label>

                    <input
                        type="number"
                        class="batch-weight-diff"
                        placeholder="0.00"
                        step="0.01"
                    >
                </div>

            </div>
        `;


        batchContainer.appendChild(
            card
        );


        const deleteBtn =
            card.querySelector(
                ".delete-batch-btn"
            );


        deleteBtn.addEventListener(
            "click",
            () => {

                card.remove();

            }
        );


        const availableInput =
            card.querySelector(
                ".batch-available-birds"
            );

        const weightInput =
            card.querySelector(
                ".batch-weight"
            );

        const avgInput =
            card.querySelector(
                ".batch-avg-weight"
            );


        const calcAverage = () => {

            const available =
                parseFloat(
                    availableInput.value
                ) || 0;

            const weight =
                parseFloat(
                    weightInput.value
                ) || 0;


            if (available > 0) {

                avgInput.value =
                    (weight / available)
                        .toFixed(3);

            } else {

                avgInput.value =
                    "0.000";
            }

        };


        availableInput.addEventListener(
            "input",
            calcAverage
        );

        weightInput.addEventListener(
            "input",
            calcAverage
        );

    }


    // =========================================================
    // GET BATCH DATA
    // =========================================================

    function getBatchData() {

        const cards =
            document.querySelectorAll(
                ".batch-card"
            );


        return Array.from(cards)
            .map(card => {

                return {

                    batchNo:
                        card.querySelector(
                            ".batch-no"
                        ).value.trim(),

                    location:
                        card.querySelector(
                            ".batch-location"
                        ).value.trim(),

                    age:
                        card.querySelector(
                            ".batch-age"
                        ).value || "0",

                    expectedAvg:
                        card.querySelector(
                            ".batch-expected-avg"
                        ).value || "0",

                    orderBirds:
                        card.querySelector(
                            ".batch-order-birds"
                        ).value || "0",

                    availableBirds:
                        card.querySelector(
                            ".batch-available-birds"
                        ).value || "0",

                    avgWeight:
                        card.querySelector(
                            ".batch-avg-weight"
                        ).value || "0.000",

                    weight:
                        card.querySelector(
                            ".batch-weight"
                        ).value || "0.00",

                    weightDiff:
                        card.querySelector(
                            ".batch-weight-diff"
                        ).value || "0.00"

                };

            });

    }


    // =========================================================
    // SAVE BUTTON -> PREVIEW
    // =========================================================

    saveAllBtn.addEventListener(
        "click",
        () => {

            clearMessage();


            const batches =
                getBatchData();


            if (batches.length === 0) {

                showMessage(
                    "Please add at least one batch.",
                    "error"
                );

                return;
            }


            showPreview(batches);

        }
    );


    // =========================================================
    // PREVIEW
    // =========================================================

    // =========================================================
    // PREVIEW
    // =========================================================

    function showPreview(batches) {

        const helpers = [
            helper1.value,
            helper2.value,
            helper3.value
        ]
            .filter(Boolean)
            .join(", ") || "-";


        // Clear old preview
        previewContent.innerHTML = "";


        // =====================================================
        // TRIP DETAILS
        // =====================================================

        const tripRows = [

            [
                "Date",
                tripDate.value || "-"
            ],

            [
                "Vehicle Number",
                vehicleNumber.value || "-"
            ],

            [
                "Driver Name",
                driverName.value || "-"
            ],

            [
                "Helpers",
                helpers
            ],

            [
                "DOA",
                doa.value || "0"
            ],

            [
                "Out Time",
                outTime.value
                    ? `${outTime.value} ${outAmPm.value}`
                    : "-"
            ],

            [
                "In Time",
                inTime.value
                    ? `${inTime.value} ${inAmPm.value}`
                    : "-"
            ],

            [
                "Total Trip Time",
                totalTripTime.value || "00:00:00"
            ],

            [
                "Total Batches",
                batches.length
            ]

        ];


        // Section title
        const tripTitle =
            document.createElement("div");

        tripTitle.textContent =
            "Trip Details";

        tripTitle.style.fontSize =
            "13px";

        tripTitle.style.fontWeight =
            "700";

        tripTitle.style.color =
            "#64748b";

        tripTitle.style.textTransform =
            "uppercase";

        tripTitle.style.letterSpacing =
            "0.7px";

        tripTitle.style.marginBottom =
            "8px";


        previewContent.appendChild(
            tripTitle
        );


        // Create normal preview rows
        tripRows.forEach(
            ([label, value]) => {

                previewContent.appendChild(
                    createPreviewRow(
                        label,
                        value
                    )
                );

            }
        );


        // =====================================================
        // BATCH DETAILS
        // =====================================================

        batches.forEach(
            (batch, index) => {

                const divider =
                    document.createElement("div");


                divider.style.marginTop =
                    "22px";

                divider.style.marginBottom =
                    "8px";

                divider.style.paddingTop =
                    "16px";

                divider.style.borderTop =
                    "1px solid #e2e8f0";


                const batchTitle =
                    document.createElement("div");


                batchTitle.textContent =
                    `Batch ${index + 1}`;


                batchTitle.style.fontSize =
                    "13px";

                batchTitle.style.fontWeight =
                    "700";

                batchTitle.style.color =
                    "#64748b";

                batchTitle.style.textTransform =
                    "uppercase";

                batchTitle.style.letterSpacing =
                    "0.7px";


                divider.appendChild(
                    batchTitle
                );


                previewContent.appendChild(
                    divider
                );


                const batchRows = [

                    [
                        "Farmer Batch No",
                        batch.batchNo || "-"
                    ],

                    [
                        "Location",
                        batch.location || "-"
                    ],

                    [
                        "Age (Days)",
                        batch.age || "0"
                    ],

                    [
                        "Expected Avg Weight",
                        `${batch.expectedAvg || "0"} KG`
                    ],

                    [
                        "Order Birds",
                        batch.orderBirds || "0"
                    ],

                    [
                        "Available Birds",
                        batch.availableBirds || "0"
                    ],

                    [
                        "Weight",
                        `${batch.weight || "0.00"} KG`
                    ],

                    [
                        "Avg Weight",
                        `${batch.avgWeight || "0.000"} KG`
                    ],

                    [
                        "Weight Diff",
                        `${batch.weightDiff || "0.00"} KG`
                    ]

                ];


                batchRows.forEach(
                    ([label, value]) => {

                        previewContent.appendChild(
                            createPreviewRow(
                                label,
                                value
                            )
                        );

                    }
                );

            }
        );


        // Show modal
        previewModal.classList.add(
            "show"
        );

    }


    // =========================================================
    // CREATE PREVIEW ROW
    // =========================================================

    function createPreviewRow(
        label,
        value
    ) {

        const row =
            document.createElement("div");


        row.style.display =
            "flex";

        row.style.justifyContent =
            "space-between";

        row.style.alignItems =
            "center";

        row.style.gap =
            "20px";

        row.style.padding =
            "10px 0";

        row.style.borderBottom =
            "1px solid #eef2f7";


        // Label
        const labelElement =
            document.createElement("span");


        labelElement.textContent =
            label;

        labelElement.style.color =
            "#64748b";

        labelElement.style.fontSize =
            "14px";


        // Value
        const valueElement =
            document.createElement("strong");


        valueElement.textContent =
            value;

        valueElement.style.color =
            "#1e293b";

        valueElement.style.fontSize =
            "14px";

        valueElement.style.textAlign =
            "right";


        row.appendChild(
            labelElement
        );

        row.appendChild(
            valueElement
        );


        return row;
    }


    // =========================================================
    // CLOSE PREVIEW
    // =========================================================

    cancelPreviewBtn.addEventListener(
        "click",
        closePreview
    );

    closePreviewBtn.addEventListener(
        "click",
        closePreview
    );


    previewModal.addEventListener(
        "click",
        event => {

            if (
                event.target === previewModal
            ) {
                closePreview();
            }

        }
    );


    function closePreview() {

        previewModal.classList.remove(
            "show"
        );

    }


    // =========================================================
    // CONFIRM SAVE
    // =========================================================

    confirmSaveBtn.addEventListener(
        "click",
        async () => {

            const batches =
                getBatchData();


            const helpers =
                [
                    helper1.value,
                    helper2.value,
                    helper3.value
                ]
                .filter(Boolean)
                .join(", ") || "-";


            const payload = {

                date:
                    tripDate.value,

                vehicle:
                    vehicleNumber.value || "-",

                driver:
                    driverName.value || "-",

                helpers:
                    helpers,

                doa:
                    doa.value || "0",

                outTime:
                    outTime.value
                        ? `${outTime.value} ${outAmPm.value}`
                        : "-",

                inTime:
                    inTime.value
                        ? `${inTime.value} ${inAmPm.value}`
                        : "-",

                totalTripTime:
                    totalTripTime.value || "00:00:00",

                addedBy:
                    user.name || user.username,

                batches:
                    batches

            };


            confirmSaveBtn.disabled =
                true;

            confirmSaveBtn.textContent =
                "Saving...";


            try {

                const result =
                    await saveUser2DailyEntry(
                        payload
                    );


                if (result.success) {

                    closePreview();

                    showMessage(
                        "Trip Saved Successfully! 🚀",
                        "success"
                    );


                    resetForm();

                } else {

                    showMessage(
                        result.message ||
                        "Unable to save trip.",
                        "error"
                    );

                }


            } catch (error) {

                console.error(error);

                showMessage(
                    "Unable to connect to the server.",
                    "error"
                );


            } finally {

                confirmSaveBtn.disabled =
                    false;

                confirmSaveBtn.textContent =
                    "Confirm & Save All";

            }

        }
    );


    // =========================================================
    // RESET FORM
    // =========================================================

    function resetForm() {

        setTodayDate();

        vehicleNumber.value = "";
        driverName.value = "";

        doa.value = "";

        helper1.value = "";
        helper2.value = "";
        helper3.value = "";

        outTime.value = "";
        inTime.value = "";

        outAmPm.value = "PM";
        inAmPm.value = "PM";

        totalTripTime.value =
            "00:00:00";

        batchContainer.innerHTML = "";

        batchCounter = 0;

        addBatchRow();

    }


    // =========================================================
    // DATE
    // =========================================================

    function setTodayDate() {

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


        tripDate.value =
            `${year}-${month}-${day}`;

    }


    // =========================================================
    // MESSAGE
    // =========================================================

    function showMessage(
        message,
        type
    ) {

        saveMessage.textContent =
            message;

        saveMessage.classList.remove(
            "success",
            "error"
        );

        saveMessage.classList.add(
            type
        );

    }


    function clearMessage() {

        saveMessage.textContent =
            "";

        saveMessage.classList.remove(
            "success",
            "error"
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
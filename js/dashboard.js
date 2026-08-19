document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // ELEMENTS
    // =========================================================

    const catchingForm =
        document.getElementById("catchingForm");

    const catchingDate =
        document.getElementById("catchingDate");

    const typeSelect =
        document.getElementById("type");

    const farmerSelect =
        document.getElementById("farmerName");

    const cageContainer =
        document.getElementById("cageContainer");

    const cageInput =
        document.getElementById("cageNo");

    const batchInput =
        document.getElementById("batchNo");

    const customerSelect =
        document.getElementById("customerName");

    const batch2Container =
        document.getElementById("batch2Container");

    const batch2Input =
        document.getElementById("batchNo2");

    const nobInput =
        document.getElementById("nob");

    const weightInput =
        document.getElementById("totalWeight");

    const priceInput =
        document.getElementById("sellingPrice");

    const billInput =
        document.getElementById("billNo");

    const amountInput =
        document.getElementById("totalAmount");

    const avgWeightInput =
        document.getElementById("avgWeight");

    const saveBtn =
        document.getElementById("saveBtn");

    const saveMessage =
        document.getElementById("saveMessage");

    const loggedUser =
        document.getElementById("loggedUser");

    const logoutBtn =
        document.getElementById("logoutBtn");

    const previewModal =
        document.getElementById("previewModal");

    const previewContent =
        document.getElementById("previewContent");

    const cancelPreviewBtn =
        document.getElementById("cancelPreviewBtn");

    const confirmSaveBtn =
        document.getElementById("confirmSaveBtn");


    // =========================================================
    // CHECK LOGIN SESSION
    // =========================================================

    const sessionUser =
        sessionStorage.getItem("livebirdUser");

    if (!sessionUser) {

        window.location.href =
            "../index.html";

        return;
    }


    const user =
        JSON.parse(sessionUser);


    // Only user1 should access this page

    if (
        !user.username ||
        user.username.toLowerCase() !== "user1"
    ) {

        sessionStorage.removeItem(
            "livebirdUser"
        );

        window.location.href =
            "../index.html";

        return;
    }


    // =========================================================
    // DISPLAY LOGGED USER
    // =========================================================

    loggedUser.textContent =
        `Logged in as: ${user.name || user.username}`;


    // =========================================================
    // DEFAULT DATE
    // =========================================================

    setTodayDate();


    // =========================================================
    // INITIAL PAGE STATE
    // =========================================================

    cageContainer.classList.add("hidden");

    batch2Container.classList.add("hidden");


    // =========================================================
    // LOAD DROPDOWN DATA
    // =========================================================

    loadDashboardLists();


    // =========================================================
    // TYPE CHANGE
    // =========================================================

    typeSelect.addEventListener(
        "change",
        () => {

            const selectedType =
                typeSelect.value;


            farmerSelect.innerHTML =
                `<option value="">Select Farmer</option>`;


            if (selectedType === "Ownfarm") {

                cageContainer.classList.remove(
                    "hidden"
                );

                loadFarmers(
                    "Ownfarm"
                );

            } else if (
                selectedType === "Buyback"
            ) {

                cageContainer.classList.add(
                    "hidden"
                );

                cageInput.value = "";

                loadFarmers(
                    "Buyback"
                );

            } else {

                cageContainer.classList.add(
                    "hidden"
                );

                cageInput.value = "";

            }

        }
    );


    // =========================================================
    // CUSTOMER CHANGE
    // =========================================================

    customerSelect.addEventListener(
        "change",
        () => {

            if (
                customerSelect.value ===
                "Imo Plant"
            ) {

                batch2Container.classList.remove(
                    "hidden"
                );

            } else {

                batch2Container.classList.add(
                    "hidden"
                );

                batch2Input.value = "";

            }

        }
    );


    // =========================================================
    // CALCULATIONS
    // =========================================================

    nobInput.addEventListener(
        "input",
        calculateTotals
    );

    weightInput.addEventListener(
        "input",
        calculateTotals
    );

    priceInput.addEventListener(
        "input",
        calculateTotals
    );


    function calculateTotals() {

        const weight =
            parseFloat(
                weightInput.value
            ) || 0;

        const price =
            parseFloat(
                priceInput.value
            ) || 0;

        const nob =
            parseFloat(
                nobInput.value
            ) || 0;


        // Total Amount = Weight × Selling Price

        const totalAmount =
            weight * price;


        amountInput.value =
            totalAmount.toLocaleString(
                "en-US",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );


        // Average Weight = Weight / Number of Birds

        if (nob > 0) {

            avgWeightInput.value =
                (
                    weight / nob
                ).toFixed(3);

        } else {

            avgWeightInput.value =
                "0.000";

        }

    }


    // =========================================================
    // LOAD DASHBOARD LISTS
    // =========================================================

    async function loadDashboardLists() {

        try {

            const result =
                await getDashboardLists();


            if (!result.success) {

                showMessage(
                    result.message ||
                    "Unable to load dropdown data.",
                    "error"
                );

                return;
            }


            // Store lists temporarily

            window.livebirdLists = {

                ownfarm:
                    result.ownfarm || [],

                buyback:
                    result.buyback || [],

                customers:
                    result.customers || []

            };


            // Load customers

            populateSelect(
                customerSelect,
                window.livebirdLists.customers,
                "Select Customer"
            );


        } catch (error) {

            console.error(
                "Error loading dashboard lists:",
                error
            );


            showMessage(
                "Unable to load farmer/customer data.",
                "error"
            );

        }

    }


    // =========================================================
    // LOAD FARMERS
    // =========================================================

    function loadFarmers(type) {

        if (!window.livebirdLists) {
            return;
        }


        let farmers = [];


        if (type === "Ownfarm") {

            farmers =
                window.livebirdLists.ownfarm || [];

        } else if (
            type === "Buyback"
        ) {

            farmers =
                window.livebirdLists.buyback || [];

        }


        populateSelect(
            farmerSelect,
            farmers,
            "Select Farmer"
        );

    }


    // =========================================================
    // POPULATE SELECT
    // =========================================================

    function populateSelect(
        selectElement,
        values,
        placeholder
    ) {

        selectElement.innerHTML =
            `<option value="">${placeholder}</option>`;


        values.forEach(
            value => {

                const cleanValue =
                    String(
                        value || ""
                    ).trim();


                if (!cleanValue) {
                    return;
                }


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    cleanValue;

                option.textContent =
                    cleanValue;


                selectElement.appendChild(
                    option
                );

            }
        );

    }


    // =========================================================
    // SAVE FORM -> SHOW PREVIEW
    // =========================================================

    catchingForm.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

            clearMessage();


            // -------------------------
            // VALIDATION
            // -------------------------

            if (!catchingDate.value) {

                showMessage(
                    "Please select the catching date.",
                    "error"
                );

                return;
            }


            if (!typeSelect.value) {

                showMessage(
                    "Please select the type.",
                    "error"
                );

                return;
            }


            if (!farmerSelect.value) {

                showMessage(
                    "Please select the farmer.",
                    "error"
                );

                return;
            }


            if (!customerSelect.value) {

                showMessage(
                    "Please select the customer.",
                    "error"
                );

                return;
            }


            if (
                typeSelect.value ===
                    "Ownfarm" &&
                !cageInput.value.trim()
            ) {

                showMessage(
                    "Please enter the cage number.",
                    "error"
                );

                return;
            }


            if (
                customerSelect.value ===
                    "Imo Plant" &&
                !batch2Input.value.trim()
            ) {

                showMessage(
                    "Please enter Batch No 2.",
                    "error"
                );

                return;
            }


            // DO NOT SAVE YET
            // SHOW PREVIEW FIRST

            showPreview();

        }
    );


    // =========================================================
    // BUILD RECORD
    // =========================================================

    function buildRecord() {

        return {

            date:
                catchingDate.value,

            type:
                typeSelect.value,

            farmer:
                farmerSelect.value,

            cage:
                typeSelect.value ===
                    "Ownfarm"
                    ? cageInput.value.trim()
                    : "",

            batch:
                batchInput.value.trim(),

            customer:
                customerSelect.value,

            batch2:
                customerSelect.value ===
                    "Imo Plant"
                    ? batch2Input.value.trim()
                    : "",

            nob:
                nobInput.value || "0",

            weight:
                weightInput.value || "0.00",

            price:
                priceInput.value || "0.00",

            bill:
                billInput.value.trim(),

            amount:
                amountInput.value
                    .replace(/,/g, "") ||
                "0.00",

            avgWeight:
                avgWeightInput.value ||
                "0.000",

            addedBy:
                user.name ||
                user.username

        };

    }


    // =========================================================
    // PREVIEW
    // =========================================================

    function showPreview() {

        const record =
            buildRecord();


        const rows = [

            [
                "Catching Date",
                record.date || "-"
            ],

            [
                "Type",
                record.type || "-"
            ],

            [
                "Farmer",
                record.farmer || "-"
            ],

            [
                "Cage No",
                record.cage || "-"
            ],

            [
                "Batch No",
                record.batch || "-"
            ],

            [
                "Customer",
                record.customer || "-"
            ],

            [
                "Batch No 2",
                record.batch2 || "-"
            ],

            [
                "Birds (NOB)",
                record.nob || "0"
            ],

            [
                "Weight (KG)",
                record.weight || "0.00"
            ],

            [
                "Average Weight (KG)",
                record.avgWeight || "0.000"
            ],

            [
                "Price",
                record.price || "0.00"
            ],

            [
                "Bill No",
                record.bill || "-"
            ],

            [
                "Amount",
                amountInput.value ||
                "0.00"
            ]

        ];


        previewContent.innerHTML = "";


        rows.forEach(
            ([label, value]) => {

                const row =
                    document.createElement(
                        "div"
                    );


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


                const labelElement =
                    document.createElement(
                        "span"
                    );


                labelElement.textContent =
                    label;

                labelElement.style.color =
                    "#64748b";

                labelElement.style.fontSize =
                    "14px";


                const valueElement =
                    document.createElement(
                        "strong"
                    );


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


                previewContent.appendChild(
                    row
                );

            }
        );


        previewModal.classList.add(
            "show"
        );

    }


    // =========================================================
    // CLOSE PREVIEW
    // =========================================================

    cancelPreviewBtn.addEventListener(
        "click",
        () => {

            previewModal.classList.remove(
                "show"
            );

        }
    );


    previewModal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                previewModal
            ) {

                previewModal.classList.remove(
                    "show"
                );

            }

        }
    );


    // =========================================================
    // CONFIRM + ACTUAL SAVE
    // =========================================================

    confirmSaveBtn.addEventListener(
        "click",
        async () => {

            const record =
                buildRecord();


            confirmSaveBtn.disabled =
                true;

            confirmSaveBtn.textContent =
                "Saving...";


            try {

                const result =
                    await saveCatchingRecord(
                        record
                    );


                if (result.success) {

                    previewModal.classList.remove(
                        "show"
                    );


                    showMessage(
                        "Record Saved Successfully! 🎉",
                        "success"
                    );


                    resetForm();

                } else {

                    showMessage(
                        result.message ||
                        "Unable to save the record.",
                        "error"
                    );

                }

            } catch (error) {

                console.error(
                    "Save record error:",
                    error
                );


                showMessage(
                    "Unable to connect to the server.",
                    "error"
                );

            } finally {

                confirmSaveBtn.disabled =
                    false;

                confirmSaveBtn.textContent =
                    "Confirm & Save";

            }

        }
    );


    // =========================================================
    // RESET FORM AFTER SAVE
    // =========================================================

    function resetForm() {

        typeSelect.value = "";


        farmerSelect.innerHTML =
            `<option value="">Select Farmer</option>`;


        cageInput.value = "";

        batchInput.value = "";

        customerSelect.value = "";

        batch2Input.value = "";

        nobInput.value = "";

        weightInput.value = "";

        priceInput.value = "";

        billInput.value = "";

        amountInput.value =
            "0.00";

        avgWeightInput.value =
            "0.000";


        cageContainer.classList.add(
            "hidden"
        );

        batch2Container.classList.add(
            "hidden"
        );


        // Keep date as today

        setTodayDate();

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
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                today.getDate()
            ).padStart(
                2,
                "0"
            );


        catchingDate.value =
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

        saveMessage.textContent = "";


        saveMessage.classList.remove(
            "success",
            "error"
        );

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
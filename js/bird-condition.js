document.addEventListener("DOMContentLoaded", () => {

    // =========================================================
    // ELEMENTS
    // =========================================================

    const birdConditionForm =
        document.getElementById("birdConditionForm");

    const conditionDate =
        document.getElementById("conditionDate");

    const farmerSelect =
        document.getElementById("farmerName");

    const batch2Input =
        document.getElementById("batchNo2");

    const reason1Select =
        document.getElementById("reason1");

    const weight1Input =
        document.getElementById("weight1");

    const reason2Select =
        document.getElementById("reason2");

    const weight2Input =
        document.getElementById("weight2");

    const reason3Select =
        document.getElementById("reason3");

    const weight3Input =
        document.getElementById("weight3");

    const totalRejectionWeightInput =
        document.getElementById("totalRejectionWeight");

    const lookupNobInput =
        document.getElementById("lookupNob");

    const lookupWeightInput =
        document.getElementById("lookupWeight");

    const lookupAvgWeightInput =
        document.getElementById("lookupAvgWeight");

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


    // =========================================================
    // USER DISPLAY
    // =========================================================

    loggedUser.textContent =
        `Logged in as: ${user.name || user.username}`;


    // =========================================================
    // DEFAULT DATE
    // =========================================================

    setTodayDate();


    // =========================================================
    // LOAD LISTS
    // =========================================================

    loadBirdConditionLists();


    async function loadBirdConditionLists() {

        try {

            const result =
                await getBirdConditionLists();

            if (!result.success) {

                showMessage(
                    result.message ||
                    "Unable to load bird condition data.",
                    "error"
                );

                return;
            }


            populateSelect(
                farmerSelect,
                result.farmers || [],
                "Select Farmer"
            );


            populateSelect(
                reason1Select,
                result.reasons || [],
                "Select Reason"
            );

            populateSelect(
                reason2Select,
                result.reasons || [],
                "Select Reason"
            );

            populateSelect(
                reason3Select,
                result.reasons || [],
                "Select Reason"
            );


        } catch (error) {

            console.error(error);

            showMessage(
                "Unable to load farmer/reason data.",
                "error"
            );
        }

    }


    // =========================================================
    // CATCHING INFO LOOKUP (display only — Date + Farmer + Batch No 2)
    // =========================================================

    conditionDate.addEventListener(
        "change",
        lookupCatchingInfo
    );

    farmerSelect.addEventListener(
        "change",
        lookupCatchingInfo
    );

    batch2Input.addEventListener(
        "change",
        lookupCatchingInfo
    );


    async function lookupCatchingInfo() {

        const date =
            conditionDate.value;

        const farmer =
            farmerSelect.value;

        const batch2 =
            batch2Input.value.trim();


        if (!date || !farmer || !batch2) {

            resetLookupFields();

            return;
        }


        try {

            const result =
                await getCatchingRecordLookup(
                    date,
                    farmer,
                    batch2
                );


            if (
                result.success &&
                result.found
            ) {

                lookupNobInput.value =
                    result.nob;

                lookupWeightInput.value =
                    result.weight;

                lookupAvgWeightInput.value =
                    result.avgWeight;

            } else {

                resetLookupFields(
                    "Not Found"
                );

            }

        } catch (error) {

            console.error(error);

            resetLookupFields(
                "Not Found"
            );

        }

    }


    function resetLookupFields(
        placeholder = "-"
    ) {

        lookupNobInput.value =
            placeholder;

        lookupWeightInput.value =
            placeholder;

        lookupAvgWeightInput.value =
            placeholder;

    }


    // =========================================================
    // AUTO TOTAL REJECTION WEIGHT
    // =========================================================

    [weight1Input, weight2Input, weight3Input].forEach(input => {

        input.addEventListener(
            "input",
            updateTotalRejectionWeight
        );

    });


    function updateTotalRejectionWeight() {

        const total =
            safeNum(weight1Input.value) +
            safeNum(weight2Input.value) +
            safeNum(weight3Input.value);

        totalRejectionWeightInput.value =
            total.toFixed(2);

    }


    function safeNum(value) {

        const number =
            parseFloat(value);

        return Number.isFinite(number)
            ? number
            : 0;

    }


    // =========================================================
    // FORM SUBMIT -> SHOW PREVIEW
    // =========================================================

    birdConditionForm.addEventListener(
        "submit",
        (event) => {

            event.preventDefault();

            clearMessage();


            if (!farmerSelect.value) {

                showMessage(
                    "Please select Farmer.",
                    "error"
                );

                return;
            }


            const hasAtLeastOneReason =
                reason1Select.value ||
                reason2Select.value ||
                reason3Select.value;

            if (!hasAtLeastOneReason) {

                showMessage(
                    "Please select at least one Reason.",
                    "error"
                );

                return;
            }


            showPreview();

        }
    );


    // =========================================================
    // BUILD RECORD
    // =========================================================

    function buildRecord() {

        return {

            date:
                conditionDate.value || "",

            farmer:
                farmerSelect.value || "",

            batch2:
                batch2Input.value.trim(),

            reason1:
                reason1Select.value || "",

            weight1:
                weight1Input.value || "0",

            reason2:
                reason2Select.value || "",

            weight2:
                weight2Input.value || "0",

            reason3:
                reason3Select.value || "",

            weight3:
                weight3Input.value || "0",

            totalRejectionWeight:
                totalRejectionWeightInput.value || "0.00",

            addedBy:
                user.name || user.username
        };

    }


    // =========================================================
    // PREVIEW
    // =========================================================

    function showPreview() {

        const record =
            buildRecord();


        const rows = [

            ["Date", record.date || "-"],

            [
                "Farmer Name",
                record.farmer || "-"
            ],

            [
                "Batch No 2",
                record.batch2 || "-"
            ],

            [
                "Reason 1",
                record.reason1 || "-"
            ],

            [
                "Weight 1 (KG)",
                record.weight1 || "0"
            ],

            [
                "Reason 2",
                record.reason2 || "-"
            ],

            [
                "Weight 2 (KG)",
                record.weight2 || "0"
            ],

            [
                "Reason 3",
                record.reason3 || "-"
            ],

            [
                "Weight 3 (KG)",
                record.weight3 || "0"
            ],

            [
                "Total Rejection Weight (KG)",
                record.totalRejectionWeight || "0.00"
            ]

        ];


        previewContent.innerHTML = "";


        rows.forEach(([label, value]) => {

            const row =
                document.createElement("div");

            row.style.display = "flex";
            row.style.justifyContent = "space-between";
            row.style.alignItems = "center";
            row.style.gap = "20px";
            row.style.padding = "10px 0";
            row.style.borderBottom =
                "1px solid #eef2f7";


            const labelElement =
                document.createElement("span");

            labelElement.textContent =
                label;

            labelElement.style.color =
                "#64748b";

            labelElement.style.fontSize =
                "14px";


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


            row.appendChild(labelElement);
            row.appendChild(valueElement);

            previewContent.appendChild(row);

        });


        previewModal.classList.add("show");

    }


    // =========================================================
    // CANCEL PREVIEW
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

            if (event.target === previewModal) {

                previewModal.classList.remove(
                    "show"
                );
            }

        }
    );


    // =========================================================
    // CONFIRM + SAVE
    // =========================================================

    confirmSaveBtn.addEventListener(
        "click",
        async () => {

            const record =
                buildRecord();


            confirmSaveBtn.disabled = true;

            confirmSaveBtn.textContent =
                "Saving...";


            try {

                const result =
                    await saveBirdConditionRecord(
                        record
                    );


                if (result.success) {

                    previewModal.classList.remove(
                        "show"
                    );


                    showMessage(
                        "Bird Condition Record Saved Successfully! 🎉",
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

                console.error(error);

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
    // POPULATE SELECT
    // =========================================================

    function populateSelect(
        selectElement,
        values,
        placeholder
    ) {

        selectElement.innerHTML =
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

            selectElement.appendChild(
                option
            );

        });

    }


    // =========================================================
    // RESET
    // =========================================================

    function resetForm() {

        farmerSelect.value = "";

        batch2Input.value = "";

        reason1Select.value = "";
        weight1Input.value = "0";

        reason2Select.value = "";
        weight2Input.value = "0";

        reason3Select.value = "";
        weight3Input.value = "0";

        totalRejectionWeightInput.value =
            "0.00";

        resetLookupFields();

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
            ).padStart(2, "0");

        const day =
            String(
                today.getDate()
            ).padStart(2, "0");


        conditionDate.value =
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
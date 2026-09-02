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

    const rejectionWeightInput =
        document.getElementById("rejectionWeight");

    const reasonSelect =
        document.getElementById("reason");

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
                reasonSelect,
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


            if (!reasonSelect.value) {

                showMessage(
                    "Please select Reason.",
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

            rejectionWeight:
                rejectionWeightInput.value || "0",

            reason:
                reasonSelect.value || "",

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
                "Rejection Weight (KG)",
                record.rejectionWeight || "0"
            ],

            [
                "Reason",
                record.reason || "-"
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

        rejectionWeightInput.value =
            "0";

        reasonSelect.value = "";

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
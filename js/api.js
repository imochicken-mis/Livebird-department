const API_URL = "https://script.google.com/macros/s/AKfycbxmcNomsgsRhz_akI6RlmWGHnDMc2AudiMcri566pKC3cUUtRUPupy2lBbiKRWhI9c/exec"

async function sendRequest(payload) {
    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error("Server connection failed");
    }

    return await response.json();
}


async function loginRequest(username, password) {
    return await sendRequest({
        action: "login",
        username: username,
        password: password
    });
}


async function getDashboardLists() {
    return await sendRequest({
        action: "getDashboardLists"
    });
}


async function saveCatchingRecord(record) {
    return await sendRequest({
        action: "saveCatchingRecord",
        record: record
    });
}
async function getBirdConditionLists() {
    return await sendRequest({
        action: "getBirdConditionLists"
    });
}

async function saveBirdConditionRecord(record) {
    return await sendRequest({
        action: "saveBirdConditionRecord",
        record: record
    });
}
async function getOperationsReportData() {
    return await sendRequest({
        action: "getOperationsReportData"
    });
}
async function getBirdConditionReportData() {
    return await sendRequest({
        action: "getBirdConditionReportData"
    });
}
async function addFarmer(type, name) {
    return await sendRequest({
        action: "addFarmer",
        type: type,
        name: name
    });
}

async function addCustomer(name) {
    return await sendRequest({
        action: "addCustomer",
        name: name
    });
}
async function getUser2DashboardLists() {
    return await sendRequest({
        action: "getUser2DashboardLists"
    });
}

async function saveUser2DailyEntry(payload) {
    return await sendRequest({
        action: "saveUser2DailyEntry",
        payload: payload
    });
}
async function getVehicleExpenseLists() {
    return await sendRequest({
        action: "getVehicleExpenseLists"
    });
}

async function saveVehicleExpense(record) {
    return await sendRequest({
        action: "saveVehicleExpense",
        record: record
    });
}
async function getPlantDailyReportData() {
    return await sendRequest({
        action: "getPlantDailyReportData"
    });
}
async function getVehicleExpensesReportData() {
    return await sendRequest({
        action: "getVehicleExpensesReportData"
    });
}
async function addUser2MasterItem(type, value) {

    return await sendRequest({

        action: "addUser2MasterItem",

        type: type,

        value: value

    });

}
async function saveUser3CatchingPlan(rows) {

    return await sendRequest({

        action: "saveUser3CatchingPlan",

        rows: rows

    });

}
async function getUser3ReportData() {

    return await sendRequest({

        action: "getUser3ReportData"

    });

}
async function getDefectReportData() {
    return await sendRequest({
        action: "getDefectReportData"
    });
}
// =========================================================
// GLOBAL LOGOUT CONFIRMATION
// =========================================================

document.addEventListener(
    "click",
    (event) => {

        const logoutBtn =
            event.target.closest("#logoutBtn");

        if (!logoutBtn) {
            return;
        }

        /*
         * Stop existing page-specific logout handlers
         * from running immediately.
         */
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        showLogoutConfirmation();

    },
    true
);


// =========================================================
// SHOW LOGOUT CONFIRMATION
// =========================================================

function showLogoutConfirmation() {

    // Prevent duplicate modal
    if (
        document.getElementById(
            "globalLogoutModal"
        )
    ) {
        return;
    }


    const modal =
        document.createElement("div");

    modal.id =
        "globalLogoutModal";

    modal.innerHTML = `

        <div class="global-logout-backdrop">

            <div class="global-logout-card">

                <div class="global-logout-icon">
                    <span class="material-icons">
                        logout
                    </span>
                </div>

                <h2>
                    Logout Confirmation
                </h2>

                <p>
                    Do you want to log out?
                </p>

                <div class="global-logout-actions">

                    <button
                        type="button"
                        id="cancelGlobalLogout"
                        class="global-logout-cancel"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        id="confirmGlobalLogout"
                        class="global-logout-confirm"
                    >
                        Yes, Logout
                    </button>

                </div>

            </div>

        </div>
    `;


    document.body.appendChild(
        modal
    );


    injectLogoutStyles();


    // CANCEL
    document
        .getElementById(
            "cancelGlobalLogout"
        )
        .addEventListener(
            "click",
            () => {

                modal.remove();

            }
        );


    // CONFIRM LOGOUT
    document
        .getElementById(
            "confirmGlobalLogout"
        )
        .addEventListener(
            "click",
            () => {

                sessionStorage.removeItem(
                    "livebirdUser"
                );

                window.location.href =
                    new URL(
                        "../index.html",
                        window.location.href
                    ).href;

            }
        );


    // CLICK OUTSIDE = CLOSE
    const backdrop =
        modal.querySelector(
            ".global-logout-backdrop"
        );

    backdrop.addEventListener(
        "click",
        (event) => {

            if (
                event.target === backdrop
            ) {
                modal.remove();
            }

        }
    );

}


// =========================================================
// LOGOUT MODAL STYLES
// =========================================================

function injectLogoutStyles() {

    if (
        document.getElementById(
            "globalLogoutStyles"
        )
    ) {
        return;
    }


    const style =
        document.createElement("style");

    style.id =
        "globalLogoutStyles";


    style.textContent = `

        .global-logout-backdrop {
            position: fixed;
            inset: 0;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 20px;

            background:
                rgba(15, 23, 42, 0.55);

            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);

            z-index: 999999;
        }


        .global-logout-card {
            width: 100%;
            max-width: 390px;

            padding: 32px;

            background: #ffffff;

            border:
                1px solid #e2e8f0;

            border-radius: 18px;

            box-shadow:
                0 24px 60px
                rgba(15, 23, 42, 0.22);

            text-align: center;

            animation:
                globalLogoutIn
                0.20s ease;
        }


        .global-logout-icon {
            width: 58px;
            height: 58px;

            margin:
                0 auto 18px;

            display: flex;
            align-items: center;
            justify-content: center;

            border-radius: 16px;

            background: #fef2f2;

            color: #dc2626;
        }


        .global-logout-icon
        .material-icons {
            font-size: 28px;
        }


        .global-logout-card h2 {
            margin:
                0 0 8px;

            color: #0f172a;

            font-size: 21px;
            font-weight: 800;
        }


        .global-logout-card p {
            margin:
                0 0 25px;

            color: #64748b;

            font-size: 14px;
        }


        .global-logout-actions {
            display: grid;

            grid-template-columns:
                1fr 1fr;

            gap: 10px;
        }


        .global-logout-actions button {
            min-height: 43px;

            border-radius: 10px;

            font-size: 13px;
            font-weight: 750;

            cursor: pointer;

            transition:
                0.2s ease;
        }


        .global-logout-cancel {
            border:
                1px solid #cbd5e1;

            background: #ffffff;

            color: #475569;
        }


        .global-logout-cancel:hover {
            background: #f8fafc;
        }


        .global-logout-confirm {
            border: none;

            background: #dc2626;

            color: #ffffff;
        }


        .global-logout-confirm:hover {
            background: #b91c1c;
        }


        @keyframes globalLogoutIn {

            from {
                opacity: 0;

                transform:
                    translateY(10px)
                    scale(0.98);
            }

            to {
                opacity: 1;

                transform:
                    translateY(0)
                    scale(1);
            }

        }

    `;


    document.head.appendChild(
        style
    );

}
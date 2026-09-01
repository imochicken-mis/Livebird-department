// ENSURE MATERIAL ICONS FONT IS LOADED ON EVERY PAGE
(function ensureMaterialIconsLoaded() {

    const alreadyLoaded = document.querySelector(
        "link[href*='fonts.googleapis.com/icon?family=Material+Icons']"
    );

    if (alreadyLoaded) {
        return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/icon?family=Material+Icons";
    document.head.appendChild(link);

})();



const API_URL =
    "https://script.google.com/macros/s/AKfycbxmcNomsgsRhz_akI6RlmWGHnDMc2AudiMcri566pKC3cUUtRUPupy2lBbiKRWhI9c/exec";


async function sendRequest(payload) {

    const response =
        await fetch(
            API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify(
                        payload
                    )
            }
        );


    if (!response.ok) {

        throw new Error(
            "Server connection failed"
        );
    }


    return await response.json();
}



// =========================================================
// LOGIN
// =========================================================

async function loginRequest(
    username,
    password
) {

    return await sendRequest({

        action: "login",

        username:
            username,

        password:
            password
    });
}



// =========================================================
// USER 1
// =========================================================

async function getDashboardLists() {

    return await sendRequest({
        action:
            "getDashboardLists"
    });
}


async function saveCatchingRecord(
    record
) {

    return await sendRequest({

        action:
            "saveCatchingRecord",

        record:
            record
    });
}


async function getBirdConditionLists() {

    return await sendRequest({
        action:
            "getBirdConditionLists"
    });
}


async function saveBirdConditionRecord(
    record
) {

    return await sendRequest({

        action:
            "saveBirdConditionRecord",

        record:
            record
    });
}


async function getOperationsReportData() {

    return await sendRequest({
        action:
            "getOperationsReportData"
    });
}


async function getBirdConditionReportData() {

    return await sendRequest({
        action:
            "getBirdConditionReportData"
    });
}


async function addFarmer(
    type,
    name
) {

    return await sendRequest({

        action:
            "addFarmer",

        type:
            type,

        name:
            name
    });
}


async function addCustomer(
    name
) {

    return await sendRequest({

        action:
            "addCustomer",

        name:
            name
    });
}



// =========================================================
// USER 2
// =========================================================

async function getUser2DashboardLists() {

    return await sendRequest({
        action:
            "getUser2DashboardLists"
    });
}


async function saveUser2DailyEntry(
    payload
) {

    return await sendRequest({

        action:
            "saveUser2DailyEntry",

        payload:
            payload
    });
}


async function getVehicleExpenseLists() {

    return await sendRequest({
        action:
            "getVehicleExpenseLists"
    });
}


async function saveVehicleExpense(
    record
) {

    return await sendRequest({

        action:
            "saveVehicleExpense",

        record:
            record
    });
}


async function getPlantDailyReportData() {

    return await sendRequest({
        action:
            "getPlantDailyReportData"
    });
}


async function getVehicleExpensesReportData() {

    return await sendRequest({
        action:
            "getVehicleExpensesReportData"
    });
}


async function addUser2MasterItem(
    type,
    value
) {

    return await sendRequest({

        action:
            "addUser2MasterItem",

        type:
            type,

        value:
            value
    });
}



// =========================================================
// USER 3
// =========================================================

async function saveUser3CatchingPlan(
    rows
) {

    return await sendRequest({

        action:
            "saveUser3CatchingPlan",

        rows:
            rows
    });
}


async function getUser3ReportData() {

    return await sendRequest({

        action:
            "getUser3ReportData"
    });
}



// =========================================================
// DEFECT / REPORT
// =========================================================

async function getDefectReportData() {

    return await sendRequest({

        action:
            "getDefectReportData"
    });
}



// =========================================================
// GLOBAL LOGOUT CONFIRMATION
// =========================================================

document.addEventListener(
    "click",
    (event) => {

        const logoutBtn =
            event.target.closest(
                "#logoutBtn"
            );


        if (!logoutBtn) {
            return;
        }


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

    if (
        document.getElementById(
            "globalLogoutModal"
        )
    ) {
        return;
    }


    const modal =
        document.createElement(
            "div"
        );


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



    // CLICK OUTSIDE

    const backdrop =
        modal.querySelector(
            ".global-logout-backdrop"
        );


    backdrop.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                backdrop
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
        document.createElement(
            "style"
        );


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
                rgba(
                    15,
                    23,
                    42,
                    0.55
                );

            backdrop-filter:
                blur(5px);

            -webkit-backdrop-filter:
                blur(5px);

            z-index: 999999;
        }


        .global-logout-card {

            width: 100%;

            max-width: 390px;

            padding: 32px;

            background:
                #ffffff;

            border:
                1px solid
                #e2e8f0;

            border-radius:
                18px;

            box-shadow:
                0 24px 60px
                rgba(
                    15,
                    23,
                    42,
                    0.22
                );

            text-align:
                center;

            animation:
                globalLogoutIn
                0.20s ease;
        }


        .global-logout-icon {

            width: 58px;

            height: 58px;

            margin:
                0 auto 18px;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            border-radius:
                16px;

            background:
                #fef2f2;

            color:
                #dc2626;
        }


        .global-logout-icon
        .material-icons {

            font-size:
                28px;
        }


        .global-logout-card h2 {

            margin:
                0 0 8px;

            color:
                #0f172a;

            font-size:
                21px;

            font-weight:
                800;
        }


        .global-logout-card p {

            margin:
                0 0 25px;

            color:
                #64748b;

            font-size:
                14px;
        }


        .global-logout-actions {

            display:
                grid;

            grid-template-columns:
                1fr 1fr;

            gap:
                10px;
        }


        .global-logout-actions button {

            min-height:
                43px;

            border-radius:
                10px;

            font-size:
                13px;

            font-weight:
                750;

            cursor:
                pointer;

            transition:
                0.2s ease;
        }


        .global-logout-cancel {

            border:
                1px solid
                #cbd5e1;

            background:
                #ffffff;

            color:
                #475569;
        }


        .global-logout-cancel:hover {

            background:
                #f8fafc;
        }


        .global-logout-confirm {

            border:
                none;

            background:
                #dc2626;

            color:
                #ffffff;
        }


        .global-logout-confirm:hover {

            background:
                #b91c1c;
        }


        @keyframes globalLogoutIn {

            from {

                opacity:
                    0;

                transform:
                    translateY(10px)
                    scale(0.98);
            }


            to {

                opacity:
                    1;

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



// =========================================================
// USER 4 SIDEBAR
// COLLAPSIBLE KPI / REPORT MODULES
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeUser4SidebarAccordion();

    }
);



// =========================================================
// INITIALIZE USER 4 SIDEBAR
// =========================================================

function initializeUser4SidebarAccordion() {

    const sidebar =
        document.querySelector(
            ".sidebar"
        );


    if (
        !sidebar ||
        sidebar.dataset
            .user4AccordionReady
            === "true"
    ) {

        return;
    }



    // =====================================================
    // FIND KPI LINK
    // =====================================================

    const kpiLink =
        sidebar.querySelector(
            'a[href="user4-kpis.html"]'
        );



    // =====================================================
    // FIND REPORT NAV
    // =====================================================

    const reportNav =
        Array.from(
            sidebar.querySelectorAll(
                ".sidebar-nav"
            )
        )
            .find(
                nav =>
                    nav.querySelector(
                        'a[href="admin-analytics.html"]'
                    )
            );


    if (
        !kpiLink ||
        !reportNav
    ) {

        return;
    }


    sidebar.dataset
        .user4AccordionReady =
        "true";



    // =====================================================
    // REMOVE EXISTING REPORT SECTION TITLE
    // =====================================================

    const reportTitle =
        reportNav
            .previousElementSibling;


    if (
        reportTitle &&
        reportTitle.classList.contains(
            "sidebar-section-title"
        )
    ) {

        reportTitle.remove();

    }



    // =====================================================
    // KPI GROUP
    // =====================================================

    const kpiGroup =
        createUser4SidebarGroup(
            "KPI MODULES",
            "user4-kpi-group"
        );


    const kpiNav =
        document.createElement(
            "nav"
        );


    kpiNav.className =
        "sidebar-nav";


    kpiLink.parentNode.insertBefore(
        kpiGroup.group,
        kpiLink
    );


    kpiNav.appendChild(
        kpiLink
    );


    kpiGroup.panel.appendChild(
        kpiNav
    );



    // =====================================================
    // REPORT GROUP
    // =====================================================

    const reportGroup =
        createUser4SidebarGroup(
            "REPORT MODULES",
            "user4-report-group"
        );


    kpiGroup.group
        .insertAdjacentElement(
            "afterend",
            reportGroup.group
        );


    reportGroup.panel
        .appendChild(
            reportNav
        );



    // =====================================================
    // DETECT CURRENT PAGE
    // =====================================================

    const currentPage =
        window.location
            .pathname
            .split("/")
            .pop()
            .toLowerCase();


    const isKpiPage =
        currentPage ===
            "user4-kpis.html" ||
        kpiLink.classList
            .contains(
                "active"
            );



    // =====================================================
    // OPEN CURRENT GROUP
    // =====================================================

    setUser4SidebarGroupState(
        kpiGroup.group,
        isKpiPage
    );


    setUser4SidebarGroupState(
        reportGroup.group,
        !isKpiPage
    );



    // =====================================================
    // KPI CLICK
    // =====================================================

    kpiGroup.header
        .addEventListener(
            "click",
            () => {

                const shouldOpen =
                    !kpiGroup.group
                        .classList
                        .contains(
                            "open"
                        );


                setUser4SidebarGroupState(
                    kpiGroup.group,
                    shouldOpen
                );


                if (shouldOpen) {

                    setUser4SidebarGroupState(
                        reportGroup.group,
                        false
                    );

                }

            }
        );



    // =====================================================
    // REPORT CLICK
    // =====================================================

    reportGroup.header
        .addEventListener(
            "click",
            () => {

                const shouldOpen =
                    !reportGroup.group
                        .classList
                        .contains(
                            "open"
                        );


                setUser4SidebarGroupState(
                    reportGroup.group,
                    shouldOpen
                );


                if (shouldOpen) {

                    setUser4SidebarGroupState(
                        kpiGroup.group,
                        false
                    );

                }

            }
        );

}



// =========================================================
// CREATE SIDEBAR GROUP
// =========================================================

function createUser4SidebarGroup(
    title,
    id
) {

    const group =
        document.createElement(
            "div"
        );


    group.className =
        "user4-sidebar-group";


    group.id =
        id;



    // HEADER

    const header =
        document.createElement(
            "button"
        );


    header.type =
        "button";


    header.className =
        "user4-sidebar-group-header";


    header.setAttribute(
        "aria-expanded",
        "false"
    );


    header.innerHTML = `

        <span>
            ${title}
        </span>


        <span
            class="user4-sidebar-group-arrow"
            aria-hidden="true"
        >
            ›
        </span>

    `;



    // PANEL

    const panel =
        document.createElement(
            "div"
        );


    panel.className =
        "user4-sidebar-group-panel";



    group.appendChild(
        header
    );


    group.appendChild(
        panel
    );


    return {

        group:
            group,

        header:
            header,

        panel:
            panel
    };

}



// =========================================================
// OPEN / CLOSE SIDEBAR GROUP
// =========================================================

function setUser4SidebarGroupState(
    group,
    isOpen
) {

    if (!group) {
        return;
    }


    group.classList.toggle(
        "open",
        Boolean(
            isOpen
        )
    );


    const header =
        group.querySelector(
            ".user4-sidebar-group-header"
        );


    if (header) {

        header.setAttribute(
            "aria-expanded",
            isOpen
                ? "true"
                : "false"
        );

    }

}
document.addEventListener("DOMContentLoaded", function () {

    const headerUser = document.querySelector(".header-user, .admin-header-user");

    if (!headerUser) {
        return;
    }

    const dashboardHeader = document.querySelector(".dashboard-header, .admin-header");

    const clockEl = document.createElement("span");
    clockEl.id = "liveClock";
    clockEl.style.position = "absolute";
    clockEl.style.top = "-15px";
    clockEl.style.transform = "translateY(-50%)";
    clockEl.style.right = "30px";
    clockEl.style.color = "#010853";
    clockEl.style.fontSize = "15px";
    clockEl.style.fontWeight = "600";

    if (dashboardHeader) {
        dashboardHeader.style.position = "relative";
        dashboardHeader.style.overflow = "visible";   // <-- අලුතින් add කරන්න
        dashboardHeader.appendChild(clockEl);
    } else {
        headerUser.insertBefore(clockEl, headerUser.firstChild);
    }

    function updateClock() {

        const now = new Date();

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";

        hours = hours % 12;
        hours = hours ? hours : 12;

        clockEl.textContent = hours + ":" + minutes + ":" + seconds + " " + ampm;

    }

    updateClock();

    setInterval(updateClock, 1000);

});
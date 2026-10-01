// =====================================================
// ADMIN (USER4) MAINTENANCE MODE
// -----------------------------------------------------
// Standalone file. Does not touch auth.js or api.js.
//
// ON  : keep <script src="js/maintenance.js"></script> in index.html
// OFF : set ADMIN_MAINTENANCE_MODE = false below
// REMOVE COMPLETELY : delete that <script> line from index.html
//                     (and delete this file)
// =====================================================

(function () {

    const ADMIN_MAINTENANCE_MODE = true;

    const BLOCKED_USERS = ["user4"];


    if (!ADMIN_MAINTENANCE_MODE) return;

    if (typeof window.loginRequest !== "function") return;


    function showMaintenanceMessage() {

        if (document.getElementById("maintenanceOverlay")) return;

        const overlay = document.createElement("div");
        overlay.id = "maintenanceOverlay";

        overlay.style.cssText =
            "position:fixed;inset:0;z-index:99999;" +
            "background:rgba(0,0,0,0.65);display:flex;" +
            "align-items:center;justify-content:center;padding:20px;";

        overlay.innerHTML =
            '<div style="background:#fff;color:#222;max-width:520px;width:100%;' +
            'border-radius:14px;padding:28px 26px;text-align:center;' +
            'box-shadow:0 10px 40px rgba(0,0,0,0.35);font-family:inherit;">' +
            '<div style="font-size:42px;margin-bottom:8px;">&#128736;</div>' +
            '<h2 style="margin:0 0 12px;font-size:22px;">' +
            'Live Bird System &mdash; Scheduled Maintenance</h2>' +
            '<p style="margin:0 0 12px;line-height:1.6;">' +
            'The Live Bird System Admin Page is currently undergoing. ' +
            'scheduled maintenance and updates to enhance system performance ' +
            'and Update Your New Requirements. Access to this page is temporarily unavailable.</p>' +
            '<p style="margin:0 0 20px;line-height:1.6;">' +
            'We apologize for any inconvenience caused and appreciate your ' +
            'patience while we complete these updates. ' +
            'Please check back shortly.</p>' +
            '<div style="position:relative;display:inline-block;">' +
            '<button id="maintenanceCloseBtn" style="padding:10px 28px;border:0;' +
            'border-radius:8px;background:#c62828;color:#fff;font-size:15px;' +
            'cursor:pointer;">OK</button>' +
            '<span style="position:absolute;left:100%;top:50%;' +
            'transform:translateY(-50%);margin-left:14px;width:150px;' +
            'font-size:12px;color:#777;text-align:left;line-height:1.4;">' +
            'For more information, please contact the MIS Department.</span>' +
                        '</div>';

        document.body.appendChild(overlay);

        document
            .getElementById("maintenanceCloseBtn")
            .addEventListener("click", () => overlay.remove());
    }


    // Wrap the login call: if the credentials are valid AND the
    // user is blocked, show the message and report a failed login
    // (so auth.js never saves the session or redirects).

    const originalLoginRequest = window.loginRequest;

    window.loginRequest = async function (username, password) {

        const result = await originalLoginRequest(username, password);

        if (
            result &&
            result.success &&
            BLOCKED_USERS.includes(
                String(result.username || "").trim().toLowerCase()
            )
        ) {

            showMaintenanceMessage();

            return {
                success: false,
                message: "Admin Portal is under scheduled maintenance."
            };
        }

        return result;
    };

})();
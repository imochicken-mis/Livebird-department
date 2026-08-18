document.addEventListener("DOMContentLoaded", () => {

    const loginBtn = document.getElementById("loginBtn");
    const getStartedBtn = document.getElementById("getStartedBtn");
    const infoBtn = document.getElementById("infoBtn");
    const contactBtn = document.getElementById("contactBtn");

    const loginModal = document.getElementById("loginModal");
    const infoModal = document.getElementById("infoModal");
    const contactModal = document.getElementById("contactModal");

    const cancelLoginBtn = document.getElementById("cancelLoginBtn");

    const manualBtn =
    document.getElementById("manualBtn");

    const manualModal =
        document.getElementById("manualModal");

    const closeManualBtn =
        document.getElementById("closeManualBtn");


    if (manualBtn && manualModal) {

        manualBtn.addEventListener(
            "click",
            () => {
                manualModal.classList.add("show");
            }
        );

    }


    if (closeManualBtn && manualModal) {

        closeManualBtn.addEventListener(
            "click",
            () => {
                manualModal.classList.remove("show");
            }
        );

    }

    function openModal(modal) {
        modal.classList.add("show");
    }

    function closeModal(modal) {
        modal.classList.remove("show");
    }

    loginBtn.addEventListener("click", () => {
        openModal(loginModal);
    });

    getStartedBtn.addEventListener("click", () => {
        openModal(loginModal);
    });

    infoBtn.addEventListener("click", () => {
        openModal(infoModal);
    });

    contactBtn.addEventListener("click", () => {
        openModal(contactModal);
    });

    cancelLoginBtn.addEventListener("click", () => {
        closeModal(loginModal);
    });

    document.querySelectorAll(".close-btn").forEach(button => {
        button.addEventListener("click", () => {

            const modalId = button.getAttribute("data-close");
            const modal = document.getElementById(modalId);

            closeModal(modal);
        });
    });

    document.querySelectorAll(".modal").forEach(modal => {

        modal.addEventListener("click", (event) => {

            if (event.target === modal) {
                closeModal(modal);
            }

        });

    });

    document.addEventListener("keydown", (event) => {

        if (event.key === "Escape") {

            document.querySelectorAll(".modal.show").forEach(modal => {
                closeModal(modal);
            });

        }

    });

});
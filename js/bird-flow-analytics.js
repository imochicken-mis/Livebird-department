// =========================================================
// USER 4 - 10) Bird Flow Analytics
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // SESSION
    // =====================================================

    const user = AdminCommon.getSessionUser();

    if (!user) return;

    AdminCommon.setLoggedUser(
        document.getElementById("loggedUser"),
        user
    );

    AdminCommon.bindLogout(
        document.getElementById("logoutBtn")
    );


    // =====================================================
    // ELEMENTS
    // =====================================================

    const monthFilter =
        document.getElementById("monthFilter");

    const metricButtons =
        document.querySelectorAll(".bf-metric-btn");


    // =====================================================
    // STATE
    // =====================================================

    let allCatchingData = [];
    let allOperationsData = [];
    let currentMetric = "nob";


    // =====================================================
    // INIT
    // =====================================================

    monthFilter.value =
        AdminCommon.getCurrentMonth();

    monthFilter.addEventListener(
        "change",
        render
    );

    window.addEventListener(
        "resize",
        () => requestAnimationFrame(alignTotalNode)
    );

    metricButtons.forEach(btn => {

        btn.addEventListener("click", () => {

            metricButtons.forEach(b =>
                b.classList.remove("active")
            );

            btn.classList.add("active");

            currentMetric = btn.dataset.metric;

            render();

        });

    });

    loadData();


    // =====================================================
    // LOAD DATA
    // =====================================================

    async function loadData() {

        try {

            const [
                catchingResult,
                operationsResult
            ] = await Promise.all([
                getCatchingBreakdownData(),
                getOperationsReportData()
            ]);

            allCatchingData =
                catchingResult && catchingResult.success && Array.isArray(catchingResult.data)
                    ? catchingResult.data
                    : [];

            allOperationsData =
                operationsResult && operationsResult.success && Array.isArray(operationsResult.data)
                    ? operationsResult.data
                    : [];

            render();

        } catch (error) {

            console.error(
                "Bird flow analytics load error:",
                error
            );

            allCatchingData = [];
            allOperationsData = [];

            render();

        }

    }


    // =====================================================
    // HELPERS
    // =====================================================

    function fmtByMetric(value, metric) {

        if (value === null || value === undefined) {
            return "-";
        }

        if (metric === "nob") {
            return AdminCommon.formatWhole(value);
        }

        if (metric === "weight") {
            return AdminCommon.formatWeight(value);
        }

        return AdminCommon.formatAmount(value);

    }

    function setValue(id, value, metric) {

        const el = document.getElementById(id);

        if (!el) return;

        el.textContent = fmtByMetric(value, metric);

    }

    function computeTypeMetrics(rows, typeKeyword) {

        const rowsForType =
            rows.filter(row =>
                String(row.type || "")
                    .toLowerCase()
                    .includes(typeKeyword)
            );

        const totalNob =
            AdminCommon.sumBy(rowsForType, "nob");

        const totalWeight =
            AdminCommon.sumBy(rowsForType, "weight");

        const totalAmount =
            AdminCommon.sumBy(rowsForType, "amount");

        const rejectionWeight =
            AdminCommon.sumBy(rowsForType, "rejection_weight");

        const finalWeight =
            totalWeight - rejectionWeight;


        let imoNob = 0;
        let imoWeight = 0;
        let imoAmount = 0;
        let imoRejectionWeight = 0;

        let otherNob = 0;
        let otherWeight = 0;
        let otherAmount = 0;
        let otherRejectionWeight = 0;

        rowsForType.forEach(row => {

            const isImo =
                String(row.customer || "")
                    .toLowerCase()
                    .includes("imo");

            const nob = AdminCommon.safeNumber(row.nob);
            const weight = AdminCommon.safeNumber(row.weight);
            const amount = AdminCommon.safeNumber(row.amount);
            const rejection = AdminCommon.safeNumber(row.rejection_weight);

            if (isImo) {

                imoNob += nob;
                imoWeight += weight;
                imoAmount += amount;
                imoRejectionWeight += rejection;

            } else {

                otherNob += nob;
                otherWeight += weight;
                otherAmount += amount;
                otherRejectionWeight += rejection;

            }

        });

        return {
            totalNob,
            totalWeight,
            totalAmount,
            rejectionWeight,
            finalWeight,
            imoNob,
            imoWeight,
            imoFinalWeight: imoWeight - imoRejectionWeight,
            imoAmount,
            otherNob,
            otherWeight,
            otherFinalWeight: otherWeight - otherRejectionWeight,
            otherAmount
        };

    }

    function metricPick(metrics, nobField, weightField, amountField) {

        if (currentMetric === "nob") return metrics[nobField];
        if (currentMetric === "weight") return metrics[weightField];
        return metrics[amountField];

    }

    function renderBranch(prefix, metrics) {

        setValue(
            `v-${prefix}-total`,
            metricPick(metrics, "totalNob", "totalWeight", "totalAmount"),
            currentMetric
        );

        setValue(
            `v-${prefix}-reject`,
            currentMetric === "weight" ? metrics.rejectionWeight : null,
            currentMetric
        );

        setValue(
            `v-${prefix}-final`,
            currentMetric === "weight" ? metrics.finalWeight : null,
            currentMetric
        );

        setValue(
            `v-${prefix}-imo`,
            metricPick(metrics, "imoNob", "imoFinalWeight", "imoAmount"),
            currentMetric
        );

        setValue(
            `v-${prefix}-live`,
            metricPick(metrics, "otherNob", "otherFinalWeight", "otherAmount"),
            currentMetric
        );

    }


    // =====================================================
    // RENDER
    // =====================================================

    function render() {

        const month = monthFilter.value;

        const catchRows =
            AdminCommon.filterByMonth(allCatchingData, month);

        const opsRows =
            AdminCommon.filterByMonth(allOperationsData, month);


        // TOP: TOTAL BIRDS / DISABLE / HEALTHY

        const healthyNob = AdminCommon.sumBy(catchRows, "healthy_nob");
        const disableNob = AdminCommon.sumBy(catchRows, "disable_nob");

        const healthyWeight = AdminCommon.sumBy(catchRows, "healthy_weight");
        const disableWeight = AdminCommon.sumBy(catchRows, "disable_weight");

        const healthyAmount = AdminCommon.sumBy(catchRows, "healthy_amount");
        const disableAmount = AdminCommon.sumBy(catchRows, "disable_amount");

        const totalByMetric = {
            nob: healthyNob + disableNob,
            weight: healthyWeight + disableWeight,
            amount: healthyAmount + disableAmount
        };

        setValue("v-total", totalByMetric[currentMetric], currentMetric);

        setValue(
            "v-disable",
            currentMetric === "nob" ? disableNob
                : currentMetric === "weight" ? disableWeight
                    : disableAmount,
            currentMetric
        );

        setValue(
            "v-healthy",
            currentMetric === "nob" ? healthyNob
                : currentMetric === "weight" ? healthyWeight
                    : healthyAmount,
            currentMetric
        );


        // BRANCHES: OWN FARM / BUYBACK / DIRECT

        renderBranch("own", computeTypeMetrics(opsRows, "own"));
        renderBranch("buy", computeTypeMetrics(opsRows, "buy"));
        renderBranch("direct", computeTypeMetrics(opsRows, "direct"));

        requestAnimationFrame(alignTotalNode);

    }


    // =====================================================
    // ALIGN TOTAL NODE
    // =====================================================

    function alignTotalNode() {

        const totalBox = document.getElementById("node-total");
        const disableBox = document.getElementById("node-disable");
        const healthyBox = document.getElementById("node-healthy");
        const branchUl = document.getElementById("branch-disable-healthy");
        const treeEl = document.querySelector(".bf-tree");

        if (!totalBox || !disableBox || !healthyBox || !branchUl || !treeEl) return;

        totalBox.style.transform = "";
        branchUl.style.removeProperty("--stem-left");

        const treeRect = treeEl.getBoundingClientRect();
        const disableRect = disableBox.getBoundingClientRect();
        const healthyRect = healthyBox.getBoundingClientRect();
        const branchRect = branchUl.getBoundingClientRect();

        const disableCenter = (disableRect.left + disableRect.width / 2) - treeRect.left;
        const healthyCenter = (healthyRect.left + healthyRect.width / 2) - treeRect.left;
        const midpoint = (disableCenter + healthyCenter) / 2;

        const midpointPercent = (midpoint / branchRect.width) * 100;
        branchUl.style.setProperty("--stem-left", midpointPercent + "%");

        const totalLi = totalBox.parentElement;
        const totalLiRect = totalLi.getBoundingClientRect();
        const totalLiCenter = (totalLiRect.left + totalLiRect.width / 2) - treeRect.left;

        const offset = midpoint - totalLiCenter;
        totalBox.style.transform = `translateX(${offset}px)`;

    }

});
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

    const loader =
        document.getElementById("bfLoader");

    const analyticsCard =
        document.querySelector(".analytics-card");


    // =====================================================
    // STATE
    // =====================================================

    let allCatchingData = [];
    let allOperationsData = [];
    let currentMetric = "nob";

    const FARM_NAMES = ["Epaladeniya", "Pannala", "Kotadeniyawa", "Weerapokuna"];


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
        () => requestAnimationFrame(() => drawAllConnectors(false))
    );

    setMetricAccent(currentMetric);

    metricButtons.forEach(btn => {

        btn.addEventListener("click", () => {

            metricButtons.forEach(b =>
                b.classList.remove("active")
            );

            btn.classList.add("active");

            currentMetric = btn.dataset.metric;

            setMetricAccent(currentMetric);

            render();

        });

    });

    loadData();

    setupNodeHoverHighlights();

    setupCurrentFlowSequencer();


    // =====================================================
    // METRIC ACCENT COLOR
    // =====================================================

    function setMetricAccent(metric) {

        if (!analyticsCard) return;

        analyticsCard.dataset.metric = metric;

    }


    // =====================================================
    // LOAD DATA
    // =====================================================

    async function loadData() {

        AdminCommon.setLoading(
            loader,
            true
        );

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

        } finally {

            AdminCommon.setLoading(
                loader,
                false
            );

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

    function computeSourceBreakdown(rows) {

        const result = {
            own: { nob: 0, weight: 0, amount: 0 },
            buy: { nob: 0, weight: 0, amount: 0 },
            direct: { nob: 0, weight: 0, amount: 0 },
            farms: {}
        };

        FARM_NAMES.forEach(name => {
            result.farms[name] = { nob: 0, weight: 0, amount: 0 };
        });

        rows.forEach(row => {

            const type = String(row.type || "").toLowerCase();
            const farmer = String(row.farmer || "").trim();

            const nob = AdminCommon.safeNumber(row.total_nob);
            const weight = AdminCommon.safeNumber(row.total_weight);
            const amount = AdminCommon.safeNumber(row.total_amount);

            let bucket = null;

            if (type.includes("own")) {

                bucket = result.own;

                const farmMatch = FARM_NAMES.find(name =>
                    name.toLowerCase() === farmer.toLowerCase()
                );

                if (farmMatch) {
                    result.farms[farmMatch].nob += nob;
                    result.farms[farmMatch].weight += weight;
                    result.farms[farmMatch].amount += amount;
                }

            } else if (type.includes("buy")) {
                bucket = result.buy;
            } else if (type.includes("direct")) {
                bucket = result.direct;
            }

            if (bucket) {
                bucket.nob += nob;
                bucket.weight += weight;
                bucket.amount += amount;
            }

        });

        return result;

    }

    function metricPick(metrics, nobField, weightField, amountField) {

        if (currentMetric === "nob") return metrics[nobField];
        if (currentMetric === "weight") return metrics[weightField];
        return metrics[amountField];

    }

    function setBarFill(id, part, whole) {

        const el = document.getElementById(id);

        if (!el) return;

        const pct =
            whole > 0
                ? Math.max(0, Math.min(100, (part / whole) * 100))
                : 0;

        el.style.width = pct + "%";

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
            currentMetric === "weight" ? metrics.finalWeight : metricPick(metrics, "totalNob", "totalWeight", "totalAmount"),
            currentMetric
        );

        const imoValue =
            metricPick(metrics, "imoNob", "imoFinalWeight", "imoAmount");

        const liveValue =
            metricPick(metrics, "otherNob", "otherFinalWeight", "otherAmount");

        setValue(
            `v-${prefix}-imo`,
            imoValue,
            currentMetric
        );

        setValue(
            `v-${prefix}-live`,
            liveValue,
            currentMetric
        );

        const splitTotal =
            (imoValue || 0) + (liveValue || 0);

        setBarFill(`bar-${prefix}-imo`, imoValue || 0, splitTotal);
        setBarFill(`bar-${prefix}-live`, liveValue || 0, splitTotal);

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


        // TOTAL BIRDS / DISABLE / HEALTHY

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


        // DISTRIBUTION BRANCHES: OWN FARM / BUYBACK / DIRECT

        renderBranch("own", computeTypeMetrics(opsRows, "own"));
        renderBranch("buy", computeTypeMetrics(opsRows, "buy"));
        renderBranch("direct", computeTypeMetrics(opsRows, "direct"));


        // CATCHING SOURCES: FARMS -> OWNFARM / BUYBACK / DIRECT

        const sourceBreakdown = computeSourceBreakdown(catchRows);

        setValue("v-ownsrc-total", sourceBreakdown.own[currentMetric], currentMetric);
        setValue("v-buysrc-total", sourceBreakdown.buy[currentMetric], currentMetric);
        setValue("v-directsrc-total", sourceBreakdown.direct[currentMetric], currentMetric);

        setValue("v-farm-epaladeniya", sourceBreakdown.farms["Epaladeniya"][currentMetric], currentMetric);
        setValue("v-farm-pannala", sourceBreakdown.farms["Pannala"][currentMetric], currentMetric);
        setValue("v-farm-kotadeniyawa", sourceBreakdown.farms["Kotadeniyawa"][currentMetric], currentMetric);
        setValue("v-farm-weerapokuna", sourceBreakdown.farms["Weerapokuna"][currentMetric], currentMetric);

        requestAnimationFrame(() => drawAllConnectors(true));

    }


    // =====================================================
    // CONNECTOR LINES (many boxes converging into one box,
    // drawn with real measured pixel positions - works
    // regardless of how wide/uneven the boxes are)
    // =====================================================

    function createLine(container, styles, group, seq, animate) {

        const el = document.createElement("div");

        el.className = "bf-total-line";

        if (group) {
            el.dataset.group = group;
        }

        if (seq !== undefined && seq !== null) {
            el.dataset.seq = seq;
        }

        el.style.left = styles.left;
        el.style.top = styles.top;

        const isHorizontal = styles.height === "1px";

        el.classList.add(isHorizontal ? "bf-line-h" : "bf-line-v");

        if (animate) {

            el.style.width = isHorizontal ? "0px" : styles.width;
            el.style.height = isHorizontal ? styles.height : "0px";

            container.appendChild(el);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    el.style.width = styles.width;
                    el.style.height = styles.height;
                });
            });

        } else {

            el.style.width = styles.width;
            el.style.height = styles.height;

            container.appendChild(el);

        }

    }

    function drawConvergeDown(sourceIds, targetId, container, group, animate) {

        const sourceEls = sourceIds
            .map(id => document.getElementById(id))
            .filter(Boolean);

        const targetEl = document.getElementById(targetId);

        if (!targetEl || sourceEls.length === 0) return;

        const containerRect = container.getBoundingClientRect();

        if (containerRect.width === 0) return;

        const sourceCenters = sourceEls.map(el => {

            const r = el.getBoundingClientRect();

            return {
                centerX: (r.left + r.width / 2) - containerRect.left,
                bottomY: r.bottom - containerRect.top
            };

        });

        const targetRect = targetEl.getBoundingClientRect();

        const targetCenterX =
            (targetRect.left + targetRect.width / 2) - containerRect.left;

        const targetTopY =
            targetRect.top - containerRect.top;

        const maxSourceBottom =
            Math.max(...sourceCenters.map(s => s.bottomY));

        const busY =
            maxSourceBottom + Math.max((targetTopY - maxSourceBottom) / 2, 10);

        function line(styles, seq) {
            createLine(container, styles, group, seq, animate);
        }

        sourceCenters.forEach((s, i) => {
            line({
                left: s.centerX + "px",
                top: s.bottomY + "px",
                width: "1px",
                height: Math.max(busY - s.bottomY, 0) + "px"
            }, i);
        });

        const xs = sourceCenters.map(s => s.centerX).concat([targetCenterX]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);

        line({
            left: minX + "px",
            top: busY + "px",
            width: Math.max(maxX - minX, 0) + "px",
            height: "1px"
        }, "bus");

        line({
            left: targetCenterX + "px",
            top: busY + "px",
            width: "1px",
            height: Math.max(targetTopY - busY, 0) + "px"
        }, "final");

    }

    function drawConvergeRight(sourceIds, targetId, container, group, animate) {

        const sourceEls = sourceIds
            .map(id => document.getElementById(id))
            .filter(Boolean);

        const targetEl = document.getElementById(targetId);

        if (!targetEl || sourceEls.length === 0) return;

        const containerRect = container.getBoundingClientRect();

        if (containerRect.width === 0) return;

        const sourceEdges = sourceEls.map(el => {

            const r = el.getBoundingClientRect();

            return {
                centerY: (r.top + r.height / 2) - containerRect.top,
                rightX: r.right - containerRect.left
            };

        });

        const targetRect = targetEl.getBoundingClientRect();

        const targetCenterY =
            (targetRect.top + targetRect.height / 2) - containerRect.top;

        const targetLeftX =
            targetRect.left - containerRect.left;

        const maxSourceRight =
            Math.max(...sourceEdges.map(s => s.rightX));

        const busX =
            maxSourceRight + Math.max((targetLeftX - maxSourceRight) / 2, 10);

        function line(styles, seq) {
            createLine(container, styles, group, seq, animate);
        }

        sourceEdges.forEach((s, i) => {
            line({
                left: s.rightX + "px",
                top: s.centerY + "px",
                height: "1px",
                width: Math.max(busX - s.rightX, 0) + "px"
            }, i);
        });

        const ys = sourceEdges.map(s => s.centerY).concat([targetCenterY]);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        line({
            left: busX + "px",
            top: minY + "px",
            width: "1px",
            height: Math.max(maxY - minY, 0) + "px"
        }, "bus");

        line({
            left: busX + "px",
            top: targetCenterY + "px",
            height: "1px",
            width: Math.max(targetLeftX - busX, 0) + "px"
        }, "final");

    }

    function positionSectionLabels(wrapper) {

        const dhCol = document.getElementById("bfDhCol");
        const childrenRow = document.getElementById("bfChildrenRow");

        if (!dhCol || !childrenRow) return;

        wrapper.querySelectorAll(".bf-section-label")
            .forEach(el => el.remove());

        const wrapperRect = wrapper.getBoundingClientRect();
        const dhRect = dhCol.getBoundingClientRect();
        const childrenRect = childrenRow.getBoundingClientRect();

        function label(text, styles) {
            const el = document.createElement("div");
            el.className = "bf-section-label";
            el.textContent = text;
            Object.assign(el.style, styles);
            wrapper.appendChild(el);
        }

        const farmsCol = document.getElementById("bfFarmsCol");
        const totalBox = document.getElementById("node-total");

        if (farmsCol) {

            const farmsRect = farmsCol.getBoundingClientRect();

            label("BIRD INTAKE", {
                left: (farmsRect.left - wrapperRect.left) + "px",
                top: (farmsRect.top - wrapperRect.top) - 26 + "px"
            });

        }

        if (totalBox) {

            const totalRect = totalBox.getBoundingClientRect();

            label("SOURCE-WISE DISPOSITION", {
                left: (totalRect.right - wrapperRect.left) + 20 + 60 + "px",
                top: (totalRect.top - wrapperRect.top) + (totalRect.height / 2) - 7 + 75 + "px"
            });

        }

    }

    function positionDisableHealthy(wrapper) {

        const dhCol = document.getElementById("bfDhCol");
        const totalBox = document.getElementById("node-total");

        if (!dhCol || !totalBox) return;

        const wrapperRect = wrapper.getBoundingClientRect();
        const totalRect = totalBox.getBoundingClientRect();
        const dhRect = dhCol.getBoundingClientRect();

        const gap = 40;

        const left = (totalRect.left - wrapperRect.left) - dhRect.width - gap;
        const top = (totalRect.top - wrapperRect.top) + (totalRect.height / 2) - (dhRect.height / 2) - 5;

        dhCol.style.left = Math.max(left, 0) + "px";
        dhCol.style.top = Math.max(top, 0) + "px";

    }

    function drawDivergeDown(sourceId, targetIds, container, group, animate) {

        const sourceEl = document.getElementById(sourceId);

        const targetEls = targetIds
            .map(id => document.getElementById(id))
            .filter(Boolean);

        if (!sourceEl || targetEls.length === 0) return;

        const containerRect = container.getBoundingClientRect();

        if (containerRect.width === 0) return;

        const sourceRect = sourceEl.getBoundingClientRect();

        const sourceCenterX =
            (sourceRect.left + sourceRect.width / 2) - containerRect.left;

        const sourceBottomY =
            sourceRect.bottom - containerRect.top;

        const targetCenters = targetEls.map(el => {

            const r = el.getBoundingClientRect();

            return {
                centerX: (r.left + r.width / 2) - containerRect.left,
                topY: r.top - containerRect.top
            };

        });

        const minTargetTop =
            Math.min(...targetCenters.map(t => t.topY));

        const busY =
            sourceBottomY + Math.max((minTargetTop - sourceBottomY) / 2, 10);

        function line(styles, seq) {
            createLine(container, styles, group, seq, animate);
        }

        line({
            left: sourceCenterX + "px",
            top: sourceBottomY + "px",
            width: "1px",
            height: Math.max(busY - sourceBottomY, 0) + "px"
        }, "source");

        const xs = targetCenters.map(t => t.centerX).concat([sourceCenterX]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);

        line({
            left: minX + "px",
            top: busY + "px",
            width: Math.max(maxX - minX, 0) + "px",
            height: "1px"
        }, "bus");

        targetCenters.forEach((t, i) => {
            line({
                left: t.centerX + "px",
                top: busY + "px",
                width: "1px",
                height: Math.max(t.topY - busY, 0) + "px"
            }, i);
        });

    }

    function drawAllConnectors(animate) {

        const wrapper = document.getElementById("bfFlowWrapper");

        if (!wrapper) return;

        positionDisableHealthy(wrapper);

        wrapper.querySelectorAll(".bf-total-line")
            .forEach(el => el.remove());

        drawDivergeDown(
            "node-total",
            ["node-own", "node-buyback", "node-direct"],
            wrapper,
            "split",
            animate
        );

        positionSectionLabels(wrapper);

        // Farms -> OwnFarm (left to right)
        drawConvergeRight(
            ["farm-kotadeniyawa", "farm-epaladeniya", "farm-pannala", "farm-weerapokuna"],
            "node-own-src",
            wrapper,
            "farms",
            animate
        );

        // OwnFarm / BuyBack / Direct -> Total (top to bottom)
        drawConvergeDown(
            ["node-own-src", "node-buy-src", "node-direct-src"],
            "node-total",
            wrapper,
            "sources",
            animate
        );

        // Disable / Healthy -> Total (left to right)
        drawConvergeRight(
            ["node-disable", "node-healthy"],
            "node-total",
            wrapper,
            "disablehealthy",
            animate
        );

    }


    // =====================================================
    // HOVER HIGHLIGHT (box + its connector lines)
    // =====================================================

    function setupNodeHoverHighlights() {

        const wrapper = document.getElementById("bfFlowWrapper");

        if (!wrapper) return;

        const nodeGroups = {
            "farm-kotadeniyawa": ["farms"],
            "farm-epaladeniya": ["farms"],
            "farm-pannala": ["farms"],
            "farm-weerapokuna": ["farms"],
            "node-own-src": ["farms", "sources"],
            "node-buy-src": ["sources"],
            "node-direct-src": ["sources"],
            "node-disable": ["disablehealthy"],
            "node-healthy": ["disablehealthy"],
            "node-total": ["sources", "disablehealthy", "split"],
            "node-own": ["split"],
            "node-buyback": ["split"],
            "node-direct": ["split"]
        };

        Object.keys(nodeGroups).forEach(nodeId => {

            const box = document.getElementById(nodeId);

            if (!box) return;

            box.addEventListener("mouseenter", () => {

                box.classList.add("bf-node-active");

                nodeGroups[nodeId].forEach(group => {

                    wrapper
                        .querySelectorAll(`.bf-total-line[data-group="${group}"]`)
                        .forEach(line =>
                            line.classList.add("bf-line-active")
                        );

                });

            });

            box.addEventListener("mouseleave", () => {

                box.classList.remove("bf-node-active");

                wrapper
                    .querySelectorAll(".bf-total-line.bf-line-active")
                    .forEach(line =>
                        line.classList.remove("bf-line-active")
                    );

            });

        });

    }


    // =====================================================
    // CURRENT FLOW SEQUENCER (JS-driven, not CSS delays)
    // Runs one step at a time. Each step lights up a line
    // (one sweep) or glows a box (one pulse), then after
    // its own "advance" time the next step starts. When
    // the list ends, pause, then start again from step 0
    // (Farm 1). All timing lives in STEPS below - nothing
    // to keep in sync elsewhere.
    // =====================================================

    function setupCurrentFlowSequencer() {

        const wrapper = document.getElementById("bfFlowWrapper");

        if (!wrapper) return;

        const LINE_ON_MS = 900;
        const BOX_ON_MS = 500;
        const END_PAUSE_MS = 1200;

        const STEPS = [

            // Farm 1 -> 2 -> 3 -> 4, in order, then merge into OwnFarm
            { type: "line", group: "farms", seq: "0", advance: 400 },
            { type: "line", group: "farms", seq: "1", advance: 400 },
            { type: "line", group: "farms", seq: "2", advance: 400 },
            { type: "line", group: "farms", seq: "3", advance: 500 },
            { type: "line", group: "farms", seq: "bus", advance: 500 },
            { type: "line", group: "farms", seq: "final", advance: 500 },

            // OwnFarm / Buyback / Direct glow together
            { type: "box", selector: "#node-own-src, #node-buy-src, #node-direct-src", advance: 600 },

            // Own/Buyback/Direct + Disable/Healthy -> Total Birds
            { type: "line", group: "sources", seq: "0", advance: 400 },
            { type: "line", group: "sources", seq: "1", advance: 400 },
            { type: "line", group: "sources", seq: "2", advance: 500 },
            { type: "line", group: "sources", seq: "bus", advance: 500 },
            { type: "line", group: "sources", seq: "final", advance: 500 },
            { type: "line", group: "disablehealthy", seq: "0", advance: 400 },
            { type: "line", group: "disablehealthy", seq: "1", advance: 500 },
            { type: "line", group: "disablehealthy", seq: "bus", advance: 500 },
            { type: "line", group: "disablehealthy", seq: "final", advance: 500 },

            // Total Birds glows
            { type: "box", selector: "#node-total", advance: 600 },

            // Total Birds -> Own Farm / Buyback / Direct (lower row)
            { type: "line", group: "split", seq: "source", advance: 500 },
            { type: "line", group: "split", seq: "bus", advance: 500 },
            { type: "line", group: "split", seq: "0", advance: 300 },
            { type: "line", group: "split", seq: "1", advance: 300 },
            { type: "line", group: "split", seq: "2", advance: 500 },

            // Own Farm / Buyback / Direct (lower row) glow
            { type: "box", selector: "#node-own, #node-buyback, #node-direct", advance: 600 },

            // Cascade on down: Total -> Rejection -> Final -> Imo/Live
            { type: "box", selector: "#box-own-total, #box-buy-total, #box-direct-total", advance: 600 },
            { type: "box", selector: "#bfProcessTree .bf-coral", advance: 600 },
            { type: "box", selector: "#box-own-final, #box-buy-final, #box-direct-final", advance: 600 },
            { type: "box", selector: "#bfProcessTree .bf-teal, #bfProcessTree .bf-purple", advance: 700 }

        ];

        let stepIndex = 0;

        function runStep() {

            if (stepIndex >= STEPS.length) {

                stepIndex = 0;

                setTimeout(runStep, END_PAUSE_MS);

                return;

            }

            const step = STEPS[stepIndex];

            const isLine = step.type === "line";

            const els =
                isLine
                    ? Array.from(
                        wrapper.querySelectorAll(
                            `.bf-total-line[data-group="${step.group}"][data-seq="${step.seq}"]`
                        )
                    )
                    : Array.from(
                        document.querySelectorAll(step.selector)
                    );

            const activeClass =
                isLine ? "bf-current-on" : "bf-flow-glow";

            const onDuration =
                isLine ? LINE_ON_MS : BOX_ON_MS;

            els.forEach(el => {

                el.classList.remove(activeClass);

                // force reflow so the animation restarts even if
                // this exact element was already mid-pulse
                void el.offsetWidth;

                el.classList.add(activeClass);

            });

            setTimeout(() => {

                els.forEach(el =>
                    el.classList.remove(activeClass)
                );

            }, onDuration);

            stepIndex += 1;

            setTimeout(runStep, step.advance);

        }

        runStep();

    }

});
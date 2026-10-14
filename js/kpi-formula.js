(function () {

    var page = location.pathname.split("/").pop().replace(".html", "");

    // lhs = what is calculated, num / den = the fraction, mult = "× 100" part
    var CFG = {
        "kpi1-mortality": {
            name: "Transport Mortality Rate (%)", lhs: "",
            num: "Dead Birds At Receiving", den: "Total Birds Received",
            a: "sumDoa", b: "sumBirds", mult: true
        },
        "kpi2-weight": {
            name: "Average Bird Weight (kg)", lhs: "",
            num: "Total Live Weight", den: "Total Birds",
            a: "sumWeight", b: "sumBirds", mult: false
        },
        "kpi3-liveability": {
            name: "Liveability (%)", lhs: "Liveability %",
            num: "Birds Alive At Receiving", den: "Birds Dispatched",
            a: "sumBirds", b: "sumDoa", mult: true            // Alive / Dispatch
        },
        "kpi4-receiving": {
            name: "Birds Receiving Performance", lhs: "Birds / Hour",
            num: "Total Birds Unloaded", den: "Receiving Time (hrs)",
            a: "sumBirds", b: "sumTime", mult: false
        },
        "kpi5-turnaround": {
            name: "Truck Turnaround Time", lhs: "Avg Turnaround",
            num: "Total Turn Gap Time (In Time - Out Time)", den: "Total Turnarounds",
            a: "sumGap", b: "sumTurns", mult: false
        }
    };

    var cfg = CFG[page];
    if (!cfg) return;

    var tile = document.getElementById("boxDoa") || document.getElementById("boxWeight");
    var holder = tile && tile.querySelector(".kpi-value");
    if (!holder) return;

    function frac(n, d) {
        return '<span class="kpi-frac"><span class="n">' + n + '</span><span class="d">' + d + "</span></span>";
    }

    var times = cfg.mult ? "<span>× 100</span>" : "";

    var box = document.createElement("div");
    box.className = "kpi-formula";
    box.innerHTML =
        '<span class="kpi-formula-title">Formula</span>' +
        '<span class="kpi-formula-name">' + cfg.name + "</span>" +
        '<div class="kpi-formula-eq">' +
            frac(cfg.num, cfg.den) + times + "</div>" +
        '<div class="kpi-formula-live"></div>';

    holder.appendChild(box);

    var live = box.querySelector(".kpi-formula-live");

    function text(id) {
        var el = document.getElementById(id);
        return el ? el.textContent.trim() : "";
    }

    function refresh() {

        var A = text(cfg.a);
        var B = text(cfg.b);
        var R = text("sumRate");

        if (!A || !B || !R || A === "-" || B === "-" || R === "-") {
            live.innerHTML = "";
            return;
        }

        live.innerHTML = frac(A, B) + times + "<span>= <b>" + R + "</b></span>";
    }

    var obs = new MutationObserver(refresh);

    [cfg.a, cfg.b, "sumRate"].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) obs.observe(el, { childList: true, characterData: true, subtree: true });
    });

    refresh();

})();
document.addEventListener("DOMContentLoaded", () => {

    const tables =
        document.querySelectorAll(
            ".analytics-table, .exportable-table"
        );

    if (!tables.length) {
        return;
    }


    tables.forEach((table, index) => {

        const wrapper =
            table.closest(
                ".analytics-card"
            );

        if (!wrapper) {
            console.warn(
                "Export buttons not added - table is missing a '.analytics-card' wrapper:",
                table
            );
            return;
        }


        const heading =
            wrapper.querySelector(
                ".analytics-section-heading"
            );


        const titleElement =
            heading?.querySelector("h2, h3") ||
            heading?.parentElement?.querySelector("h2, h3");


        const reportTitle =
            titleElement && titleElement.textContent.trim()
                ? titleElement.textContent.trim()
                : "";


        const toolbar =
            document.createElement("div");


        toolbar.className =
            "export-toolbar";


        toolbar.innerHTML = `

            <button
                type="button"
                class="export-btn export-csv-btn"
            >
                CSV
            </button>

            <button
                type="button"
                class="export-btn export-pdf-btn"
            >
                PDF
            </button>

        `;


        if (heading) {

            heading.appendChild(
                toolbar
            );

        } else {

            wrapper.insertBefore(
                toolbar,
                table.parentElement
            );

        }


        const csvBtn =
            toolbar.querySelector(
                ".export-csv-btn"
            );


        const pdfBtn =
            toolbar.querySelector(
                ".export-pdf-btn"
            );


        csvBtn.addEventListener(
            "click",
            () => exportTableToCSV(
                table,
                reportTitle
            )
        );


        pdfBtn.addEventListener(
            "click",
            () => exportTableToPDF(
                table,
                reportTitle
            )
        );

    });


    function exportTableToCSV(
        table,
        title
    ) { const mainHeading = document.querySelector(".admin-header h1, .dashboard-header h1, h1");
        const pageTitle = mainHeading ? mainHeading.textContent.trim() : "Report";

        const rows =
            Array.from(
                table.querySelectorAll(
                    "tr"
                )
            );


        const csv =
            rows
                .map(row => {

                    const cells =
                        Array.from(
                            row.querySelectorAll(
                                "th, td"
                            )
                        );


                    return cells
                        .map(cell => {

                            let text =
                                cell.innerText
                                    .replace(/\s+/g, " ")
                                    .trim();


                            text =
                                text.replace(
                                    /"/g,
                                    '""'
                                );


                            return `"${text}"`;

                        })
                        .join(",");

                })
                .join("\n");


        const blob =
            new Blob(
                ["\ufeff" + csv],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );


        const url =
            URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            url;


        const fileNameParts = [pageTitle, title]
            .filter((part) => part && part.trim())
            .map(cleanFileName);

        link.download = `${fileNameParts.join("-")}.csv`;


        document.body.appendChild(
            link
        );


        link.click();


        link.remove();


        URL.revokeObjectURL(
            url
        );

    }
function loadImageAsDataURL(src) {

    return new Promise((resolve, reject) => {

        const img = new Image();

        img.onload = () => {

            const canvas =
                document.createElement("canvas");

            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx =
                canvas.getContext("2d");

            ctx.drawImage(img, 0, 0);

            resolve(
                canvas.toDataURL("image/png")
            );
        };

        img.onerror = reject;

        img.src = src;
    });
}    


async function exportTableToPDF(table, tableTitle) {

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert("PDF library is not loaded.");
        return;
    }

    if (!window.html2canvas) {
        alert("PDF rendering library is not loaded.");
        return;
    }

    const { jsPDF } = window.jspdf;

    let companyLogo = null;
    try {
        companyLogo = await loadImageAsDataURL("../assets/Logo.png");
    } catch (error) {
        console.warn("Company logo could not be loaded.", error);
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 30;
    const marginRight = 30;
    const footerReserve = 42;

    const mainHeading = document.querySelector(".admin-header h1, .dashboard-header h1, h1");
    let mainTitle = mainHeading ? mainHeading.textContent.trim() : "Report";
    mainTitle = mainTitle.replace(/Dashboard/gi, "Report");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(mainTitle, 40, 50);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(tableTitle, 40, 68);

    let filterText = "";
    const monthFilter = document.getElementById("monthFilter");
    const fromDate = document.getElementById("fromDate");
    const toDate = document.getElementById("toDate");

    if (monthFilter && monthFilter.value) {
        const [year, month] = monthFilter.value.split("-");
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        filterText = `Period: ${year} ${monthNames[Number(month) - 1]}`;
    } else if (fromDate?.value || toDate?.value) {
        filterText = `Period: ${fromDate?.value || "Start"} to ${toDate?.value || "End"}`;
    }

    if (filterText) {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(filterText, 40, 80);
        doc.setTextColor(0, 0, 0);
    }

    // Temporarily disable "position: sticky" - otherwise
    // html2canvas freezes header/footer rows at their current
    // scroll position instead of their true row position.
    //
    // NOTE: css/report.css puts sticky on #reportTable thead TR
    // (not on th), so "thead tr" must be included here - otherwise
    // a scrolled table captures an EMPTY header row (verified with
    // html2canvas 1.4.1: darkRatio 0.922 -> 0.000).

    // html2canvas paints the element at its CURRENT position inside
    // the scrollable wrapper. If the wrapper is scrolled, the thead /
    // tfoot boxes sit outside their captured canvas and the header
    // comes out empty, cut short, or frozen INSIDE the body image.
    // Scroll the wrapper back to the top for the capture, then give
    // the user their scroll position back afterwards.

    const scrollWrapper =
        table.closest(
            ".report-table-wrapper, .analytics-table-wrapper"
        ) || table.parentElement;

    const savedScroll = scrollWrapper
        ? { top: scrollWrapper.scrollTop, left: scrollWrapper.scrollLeft }
        : null;

    if (scrollWrapper) {
        scrollWrapper.scrollTop = 0;
        scrollWrapper.scrollLeft = 0;
    }

    table.classList.add("pdf-capture-mode");

    const stickyElements = table.querySelectorAll(
        "thead tr, thead th, tfoot tr, tfoot td, tfoot th, tbody td:first-child"
    );

    const originalPositions = [];

    stickyElements.forEach((el) => {
        originalPositions.push(el.style.position);
        el.style.position = "static";
    });

    const captureScale = 2;

    const theadEl = table.querySelector("thead");
    const tbodyEl = table.querySelector("tbody");
    const tfootEl = table.querySelector("tfoot");

    const headCanvas = theadEl
        ? await html2canvas(theadEl, {
            scale: captureScale,
            backgroundColor: "#ffffff",
            useCORS: true
        })
        : null;

    const bodyCanvas = await html2canvas(tbodyEl || table, {
        scale: captureScale,
        backgroundColor: "#ffffff",
        useCORS: true
    });

    const footCanvas = tfootEl
        ? await html2canvas(tfootEl, {
            scale: captureScale,
            backgroundColor: "#ffffff",
            useCORS: true
        })
        : null;

    // ==========================================
    // WORK OUT SAFE ROW-BOUNDARY CUT POINTS
    // (so a page break never slices a row in half)
    // NOTE: must run BEFORE we restore normal styles —
    // row heights change while pdf-capture-mode is on,
    // and the canvas was captured using those heights.
    // ==========================================

    const contentWidth = pageWidth - marginLeft - marginRight;
    const pxPerPt = bodyCanvas.width / contentWidth;

    const rowBoundariesPx = tbodyEl
        ? Array.from(tbodyEl.rows).map((row) => {
            const rowRect = row.getBoundingClientRect();
            const bodyRect = tbodyEl.getBoundingClientRect();
            return Math.round(
                (rowRect.bottom - bodyRect.top) * captureScale
            );
        })
        : [bodyCanvas.height];

    // Restore sticky positioning
    stickyElements.forEach((el, index) => {
        el.style.position = originalPositions[index];
    });

    table.classList.remove("pdf-capture-mode");

    // Restore the user's scroll position

    if (scrollWrapper && savedScroll) {
        scrollWrapper.scrollTop = savedScroll.top;
        scrollWrapper.scrollLeft = savedScroll.left;
    }

    // Head/foot images are stretched to contentWidth, so their drawn
    // height must come from THEIR OWN canvas aspect ratio - using the
    // body canvas scale (pxPerPt) squashes the header row whenever the
    // two captures differ in width (header row came out ~40% too short).

    const headHeightPt = headCanvas
        ? (headCanvas.height * contentWidth) / headCanvas.width
        : 0;

    const footHeightPt = footCanvas
        ? (footCanvas.height * contentWidth) / footCanvas.width
        : 0;

    const firstPageTop = filterText ? 92 : 78;
    const otherPageTop = 40;
    const pageBottom = pageHeight - footerReserve;

    let renderedPx = 0;
    let pageIndex = 0;

    while (renderedPx < bodyCanvas.height) {

        const isFirstPage = pageIndex === 0;
        const contentTop = isFirstPage ? firstPageTop : otherPageTop;
        const availablePt = pageBottom - contentTop - headHeightPt;
        const availablePx = Math.floor(availablePt * pxPerPt);

        const remainingPx = bodyCanvas.height - renderedPx;
        const remainingBodyPt = remainingPx / pxPerPt;

        let slicePx;
        let isLastPage;

        if (remainingBodyPt + footHeightPt <= availablePt) {

            slicePx = remainingPx;
            isLastPage = true;

        } else {

            const target = renderedPx + availablePx;

            const fittingBoundary =
                [...rowBoundariesPx]
                    .reverse()
                    .find((b) => b > renderedPx && b <= target);

            slicePx = fittingBoundary
                ? fittingBoundary - renderedPx
                : Math.min(availablePx, remainingPx);

            isLastPage = false;
        }

        if (pageIndex > 0) {
            doc.addPage();
        }

        if (headCanvas) {

            doc.addImage(
                headCanvas.toDataURL("image/png"),
                "PNG",
                marginLeft,
                contentTop,
                contentWidth,
                headHeightPt
            );
        }

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = bodyCanvas.width;
        sliceCanvas.height = slicePx;

        const ctx = sliceCanvas.getContext("2d");
        ctx.drawImage(
            bodyCanvas,
            0, renderedPx, bodyCanvas.width, slicePx,
            0, 0, bodyCanvas.width, slicePx
        );

        const sliceHeightPt = slicePx / pxPerPt;
        const bodyTop = contentTop + headHeightPt;

        doc.addImage(
            sliceCanvas.toDataURL("image/png"),
            "PNG",
            marginLeft,
            bodyTop,
            contentWidth,
            sliceHeightPt
        );

        if (isLastPage && footCanvas) {

            doc.addImage(
                footCanvas.toDataURL("image/png"),
                "PNG",
                marginLeft,
                bodyTop + sliceHeightPt,
                contentWidth,
                footHeightPt
            );
        }

        drawPageHeaderFooter();

        renderedPx += slicePx;
        pageIndex += 1;
    }

    function drawPageHeaderFooter() {

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(30, 28, pageWidth - 30, 28);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(1, 8, 83);

        let companyTextX = 30;

        if (companyLogo) {
            doc.addImage(companyLogo, "PNG", 30, 8, 20, 14);
            companyTextX = 56;
        }

        doc.text("Imo Chicken & Agro (Pvt) Ltd", companyTextX, 19);
        doc.text("Live Bird Department", pageWidth - 30, 19, { align: "right" });

        doc.setDrawColor(226, 232, 240);
        doc.line(30, pageHeight - 28, pageWidth - 30, pageHeight - 28);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);

        doc.text(
            "Copyright © 2026 | MIS Department | All Rights Reserved",
            pageWidth / 2,
            pageHeight - 16,
            { align: "center" }
        );

        const generatedNow = new Date();
        const generatedDate = generatedNow.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const generatedTime = generatedNow.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

        doc.setFontSize(7);
        doc.text(
            `Generated: ${generatedDate} | ${generatedTime}`,
            pageWidth - 30,
            pageHeight - 16,
            { align: "right" }
        );

        doc.setTextColor(0, 0, 0);
    }

    const fileNameParts = [mainTitle, tableTitle]
        .filter((part) => part && part.trim())
        .map(cleanFileName);

    doc.save(`${fileNameParts.join("-")}.pdf`);
}


function cleanFileName(value) {

    return String(value || "report")
        .trim()
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, "-");

}

});
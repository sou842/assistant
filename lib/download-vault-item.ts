import { toast } from "sonner";

export const downloadVaultItem = async (item: any) => {
  if (!item?.content) {
    toast.error("No data to download");
    return;
  }
  const safeTitle = (item.title || "vault-item").replace(/[^a-z0-9]/gi, '_').toLowerCase();

  if (item.type === "note") {
    try {
      toast.info("Generating PDF...");
      const jspdfModule = await import('jspdf/dist/jspdf.umd.min.js');
      const jsPDF = jspdfModule.jsPDF;
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = 20;

      // Add Cover Image if present
      if (item.coverImage) {
        try {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = item.coverImage;
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          // Calculate aspect ratio to fit the width while keeping proportions
          const imgRatio = img.height / img.width;
          const renderWidth = pageWidth - margin * 2;
          const renderHeight = renderWidth * imgRatio;

          // Cap the height so it doesn't take up the entire page
          const finalHeight = renderHeight > (pageHeight * 0.4) ? (pageHeight * 0.4) : renderHeight;
          const finalWidth = finalHeight / imgRatio;

          // Center it
          const xOffset = (pageWidth - finalWidth) / 2;

          doc.addImage(img, 'JPEG', xOffset, yPos, finalWidth, finalHeight);
          yPos += finalHeight + 15;
        } catch (imgErr) {
          console.warn("Failed to load cover image for PDF", imgErr);
          // Proceed without cover image
        }
      }

      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      const titleText = doc.splitTextToSize(item.title || "Note", pageWidth - margin * 2);
      doc.text(titleText, margin, yPos);
      yPos += titleText.length * 10 + 5;

      if (item.content?.blocks && Array.isArray(item.content.blocks)) {
        for (const block of item.content.blocks) {
          if (yPos > pageHeight - margin) {
            doc.addPage();
            yPos = margin + 5;
          }

          const stripHtml = (html: string) => {
            const tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || "";
          };

          const text = block.data?.text ? stripHtml(block.data.text) : "";

          if (block.type === 'header') {
            doc.setFont("helvetica", "bold");
            const level = block.data.level || 2;
            doc.setFontSize(level === 1 ? 18 : level === 2 ? 16 : 14);
            const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
            doc.text(lines, margin, yPos);
            yPos += lines.length * (level === 1 ? 8 : 7) + 5;
          } else if (block.type === 'paragraph') {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 6 + 5;
          } else if (block.type === 'list') {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            const items = block.data?.items || [];
            const style = block.data?.style || 'unordered';
            items.forEach((listItem: any, i: number) => {
              if (yPos > pageHeight - margin) { doc.addPage(); yPos = margin + 5; }
              const itemText = stripHtml(typeof listItem === 'string' ? listItem : (listItem.content || ""));
              const prefix = style === 'ordered' ? `${i + 1}. ` : "• ";
              const lines = doc.splitTextToSize(`${prefix}${itemText}`, pageWidth - margin * 2 - 5);
              doc.text(lines, margin + 5, yPos);
              yPos += lines.length * 6;
            });
            yPos += 5;
          } else if (block.type === 'code') {
            doc.setFont("courier", "normal");
            doc.setFontSize(10);
            const codeText = block.data?.code || text;
            const lines = doc.splitTextToSize(codeText, pageWidth - margin * 2);
            doc.text(lines, margin, yPos);
            yPos += lines.length * 5 + 5;
          } else if (block.type === 'quote') {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(12);
            const lines = doc.splitTextToSize(`"${text}"`, pageWidth - margin * 2 - 10);
            doc.text(lines, margin + 10, yPos);
            yPos += lines.length * 6 + 5;
          }
        }
      } else if (typeof item.content === "string") {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(item.content, pageWidth - margin * 2);
        doc.text(lines, margin, yPos);
      }

      doc.save(`${safeTitle}.pdf`);
      toast.success("Download complete");
    } catch (err) {
      console.error("PDF generation error", err);
      toast.error("Failed to generate PDF");
    }
    return;
  }

  try {
    let contentStr = "";
    let fileExtension = "json";
    let mimeType = "application/json";

    if (item.type === "spreadsheet") {
      let contentArr = item.content;
      if (typeof contentArr === "string") {
        try { contentArr = JSON.parse(contentArr); } catch(e) {}
      }
      if (Array.isArray(contentArr) && contentArr.length > 0) {
        const headers = Object.keys(contentArr[0]);
        const csvRows = [headers.join(",")];
        for (const row of contentArr) {
          csvRows.push(headers.map(h => {
            const val = row[h] !== undefined && row[h] !== null ? String(row[h]).replace(/"/g, '""') : "";
            return `"${val}"`;
          }).join(","));
        }
        contentStr = csvRows.join("\n");
        fileExtension = "csv";
        mimeType = "text/csv";
      } else {
        toast.error("Spreadsheet is empty or invalid format");
        return;
      }
    } else {
      if (typeof item.content === "string") {
        contentStr = item.content;
        fileExtension = "txt";
        mimeType = "text/plain";
      } else {
        contentStr = JSON.stringify(item.content, null, 2);
      }
    }

    const blob = new Blob([contentStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeTitle}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Download started");
  } catch (error) {
    console.error("Download error:", error);
    toast.error("Failed to download data");
  }
};

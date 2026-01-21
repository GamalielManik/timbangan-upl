import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SessionSummary } from '@/types';

export function generateSessionPDF(session: SessionSummary) {
  try {
    // Validate session data
    if (!session) {
      throw new Error('Data session tidak valid');
    }

    // Debug: Log satuan data
    console.log('PDF Generator - Session items with satuan:', session.items?.map(item => ({
      category: item.category?.name,
      satuan: item.satuan,
      weight: item.weight_kg
    })));

    // Ensure all items have satuan property
    if (session.items) {
      session.items.forEach((item, index) => {
        if (item.satuan === undefined) {
          console.warn(`Item ${index} missing satuan property, setting to empty string`);
          (item as any).satuan = '-';
        }
      });
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Set font to built-in font for better compatibility
    doc.setFont('helvetica');

    // Header
    doc.setFontSize(18);
    doc.text('BARANG MASUK UPL', 14, 20);
    doc.setFontSize(12);
    doc.text('Laporan Hasil Penimbangan Limbah Plastik', 14, 28);

    // Session Info
    doc.setFontSize(10);
    const sessionInfo = [
      `Tanggal: ${session.transaction_date ?
        new Date(session.transaction_date).toLocaleDateString('id-ID') :
        'Tidak diketahui'
      }`,
      `PIC: ${session.pic_name || 'Tidak diketahui'}`,
      `Pemilik: ${session.owner_name || 'Tidak diketahui'}`,
    ];

    let yPosition = 40;
    sessionInfo.forEach(info => {
      doc.text(info, 14, yPosition);
      yPosition += 6;
    });

    // Table Header
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detail Penimbangan:', 14, yPosition + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Prepare table data with validation
    const tableData = (session.items || []).map((item, index) => {
      const satuanValue = item.satuan || '-';
      const gabunganValue = item.gabungan || '-';
      console.log(`Item ${index + 1}: category=${item.category?.name}, satuan=${satuanValue}, gabungan=${gabunganValue}`);
      return [
        index + 1,
        item.category?.name || 'Tidak diketahui',
        (item.weight_kg || 0).toFixed(2),
        satuanValue,
        gabunganValue
      ];
    });

    // Add total row
    tableData.push([
      'Total',
      '',
      (session.total_weight || 0).toFixed(2),
      '',
      ''
    ]);

    // Table with optimized configuration for better readability
    autoTable(doc, {
      head: [['No', 'Jenis Plastik', 'Berat (kg)', 'Satuan', 'Gabungan']],
      body: tableData,
      startY: yPosition + 10,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        halign: 'left',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [41, 128, 185], // Professional blue
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
        halign: 'center',
        valign: 'middle',
        minCellHeight: 8, // Reduced header height from default
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 }, // No - centered, narrow
        1: { halign: 'left', cellWidth: 80 }, // Jenis Plastik - wider for text
        2: { halign: 'right', cellWidth: 30 }, // Berat - right aligned for numbers
        3: { halign: 'center', cellWidth: 25 }, // Satuan - centered
        4: { halign: 'left', cellWidth: 60 }, // Gabungan - enough space for text
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245], // Light gray for alternate rows
      },
      bodyStyles: {
        minCellHeight: 8,
      },
      margin: { top: 10, right: 14, bottom: 10, left: 14 },
      didParseCell: function (data) {
        // Make total row stand out
        if (data.row.index === tableData.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [230, 230, 230];
        }
      },
      didDrawPage: (data) => {
        // Add footer on each page
        doc.setFontSize(9);
        doc.text(
          `Halaman ${doc.getCurrentPageInfo().pageNumber}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      },
    });

    // Calculate and add totals per category
    const finalY = (doc as any).lastAutoTable.finalY || yPosition + 80;

    // Category totals section
    const categoryTotals = new Map();
    (session.items || []).forEach(item => {
      const categoryName = item.category?.name || 'Tidak Diketahui';
      const weight = item.weight_kg || 0;
      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + weight);
    });

    // Add section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Total Berat per Kategori:', 14, finalY + 10);

    // Prepare table data for category totals
    const categoryTableData = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([categoryName, totalWeight]) => [
        categoryName,
        `${totalWeight.toFixed(2)} kg`,
        '' // Empty price column for manual filling
      ]);

    // Add category totals table
    autoTable(doc, {
      head: [['Jenis Plastik', 'Berat', 'Harga']],
      body: categoryTableData,
      startY: finalY + 20,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [0, 156, 228],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 70 }, // Jenis Plastik
        1: { cellWidth: 40, halign: 'center' }, // Berat
        2: { cellWidth: 40, halign: 'center' }, // Harga
      },
    });

    // Add overall total at the end
    const categoryFinalY = (doc as any).lastAutoTable.finalY || finalY + 80;
    doc.setFillColor(0, 156, 228);
    doc.rect(14, categoryFinalY + 5, doc.internal.pageSize.width - 28, 15, 'F');

    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`TOTAL KESELURUHAN: ${(session.total_weight || 0).toFixed(2)} kg`, 14, categoryFinalY + 14);
    doc.setTextColor(0);

    // Save the PDF
    doc.save(`laporan_penimbangan_${session.id}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Gagal membuat PDF. Silakan coba lagi.');
  }
}

// v2.0: Monthly PDF Generator
export function generateMonthlyPDF(
  year: number,
  month: number,
  monthName: string,
  summary: {
    total_sessions: number;
    total_weight: number;
    total_items: number;
  },
  categories: Array<{
    category_name: string;
    total_weight: number;
    percentage: number;
  }>,
  sessions: Array<{
    transaction_date: string;
    pic_name: string;
    owner_name: string;
    categories: string[];
    total_weight: number;
  }>
) {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFont('helvetica');

    // Header
    doc.setFontSize(18);
    doc.text('BARANG MASUK UPL', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`RINGKASAN BULANAN - ${monthName.toUpperCase()} ${year}`, 105, 28, { align: 'center' });

    // Summary Box
    doc.setFontSize(10);
    const startY = 40;

    // Draw summary box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(15, startY, 180, 25, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RINGKASAN', 20, startY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Sesi: ${summary.total_sessions}`, 20, startY + 14);
    doc.text(`Total Item: ${summary.total_items}`, 75, startY + 14);
    doc.text(`Total Berat: ${summary.total_weight.toFixed(2)} kg`, 130, startY + 14);

    // Category Breakdown Table
    let currentY = startY + 35;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DISTRIBUSI PER KATEGORI', 15, currentY);

    currentY += 5;

    const categoryTableData = categories.map(cat => [
      cat.category_name,
      cat.total_weight.toFixed(2),
      cat.percentage.toFixed(1) + '%'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Kategori Plastik', 'Total Berat (kg)', 'Persentase']],
      body: categoryTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 45, halign: 'right' },
        2: { cellWidth: 35, halign: 'center' }
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      margin: { left: 15, right: 15 }
    });

    // Sessions Table
    currentY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DETAIL SESI PENIMBANGAN', 15, currentY);

    currentY += 5;

    const sessionTableData = sessions.map(session => [
      new Date(session.transaction_date).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }),
      session.pic_name,
      session.owner_name,
      session.categories.join(', '),
      session.total_weight.toFixed(2)
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Tanggal', 'PIC', 'Pemilik', 'Kategori', 'Total (kg)']],
      body: sessionTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [52, 152, 219],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 28, halign: 'center' },
        1: { cellWidth: 30 },
        2: { cellWidth: 35 },
        3: { cellWidth: 67 },
        4: { cellWidth: 20, halign: 'right' }
      },
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      margin: { left: 15, right: 15 }
    });

    // Footer - Total
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFillColor(240, 240, 240);
    doc.rect(15, finalY, 180, 10, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('TOTAL KESELURUHAN:', 120, finalY + 7);
    doc.text(`${summary.total_weight.toFixed(2)} kg`, 170, finalY + 7, { align: 'right' });

    // Footer - Generation info
    const pageHeight = doc.internal.pageSize.height;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Laporan dibuat pada: ${new Date().toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`,
      105,
      pageHeight - 10,
      { align: 'center' }
    );

    // Save PDF
    const fileName = `laporan_bulanan_${monthName.toLowerCase()}_${year}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

  } catch (error) {
    console.error('Error generating monthly PDF:', error);
    throw new Error('Gagal membuat PDF bulanan. Silakan coba lagi.');
  }
}
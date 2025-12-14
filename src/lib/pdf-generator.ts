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
      satuan: item.satuan
    })));

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
    const tableData = (session.items || []).map((item, index) => [
      index + 1,
      item.category?.name || 'Tidak diketahui',
      (item.weight_kg || 0).toFixed(2),
      item.satuan ? item.satuan : '-'
    ]);

    // Add total row
    tableData.push([
      'Total',
      '',
      (session.total_weight || 0).toFixed(2),
      ''
    ]);

    // Table
    autoTable(doc, {
      head: [['No', 'Jenis Plastik', 'Berat (kg)', 'Satuan']],
      body: tableData,
      startY: yPosition + 10,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 11,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [0, 156, 228],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 11,
      },
      foot: [],
      columnStyles: {
        0: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }, // No
        1: { cellWidth: 'auto', minCellWidth: 80 }, // Jenis Plastik
        2: { cellWidth: 60, halign: 'right' }, // Berat
        3: { cellWidth: 40, halign: 'center' }, // Satuan
      },
      margin: { left: 14, right: 14 },
      tableWidth: 'auto',
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
    const fileName = `laporan_penimbangan_${session.id}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('Gagal membuat PDF. Silakan coba lagi.');
    throw error;
  }
}
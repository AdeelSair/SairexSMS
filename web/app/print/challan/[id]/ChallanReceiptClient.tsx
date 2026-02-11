'use client';

import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';

interface ChallanProps {
  challan: {
    challanNo: string;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    status: string;
    studentName: string;
    admissionNo: string;
    grade: string;
    campusName: string;
    orgName: string;
    currency: string;
  };
}

export default function ChallanReceiptClient({ challan }: ChallanProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [isEmailing, setIsEmailing] = useState(false);

  // --- ACTION 1: Download PDF ---
  const handleDownloadPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const left = 15;
    const right = pageWidth - 15;
    let y = 20;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.text(challan.orgName, left, y);
    y += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(challan.campusName, left, y);
    y += 10;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('FEE CHALLAN', right, 20, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`No: ${challan.challanNo}`, right, 26, { align: 'right' });

    pdf.setLineWidth(0.3);
    pdf.line(left, 32, right, 32);
    y = 42;

    pdf.setFontSize(11);
    pdf.text(`Student: ${challan.studentName}`, left, y);
    y += 6;
    pdf.text(`Admission No: ${challan.admissionNo}`, left, y);
    y += 6;
    pdf.text(`Grade: ${challan.grade}`, left, y);

    let yRight = 42;
    pdf.text(`Issue Date: ${challan.issueDate}`, right, yRight, { align: 'right' });
    yRight += 6;
    pdf.text(`Due Date: ${challan.dueDate}`, right, yRight, { align: 'right' });
    yRight += 6;
    pdf.text(`Status: ${challan.status}`, right, yRight, { align: 'right' });

    y = 68;
    pdf.setLineWidth(0.2);
    pdf.line(left, y, right, y);
    y += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description', left, y);
    pdf.text(`Amount (${challan.currency})`, right, y, { align: 'right' });
    y += 4;
    pdf.line(left, y, right, y);

    y += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.text('Total Dues', left, y);
    pdf.text(`${challan.totalAmount}`, right, y, { align: 'right' });

    y += 8;
    pdf.line(left, y, right, y);
    y += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('Total Payable', left, y);
    pdf.text(`${challan.totalAmount} ${challan.currency}`, right, y, { align: 'right' });

    pdf.save(`SAIREX_${challan.challanNo}.pdf`);
  };

  // --- ACTION 2: Send WhatsApp ---
  const handleWhatsApp = () => {
    // In production, fetch the parent's phone number from the DB. Using a placeholder for testing.
    const parentPhone = "923000000000"; 
    const message = `Hello! Here is the fee update for ${challan.studentName} (${challan.admissionNo}). Total due: ${challan.currency} ${challan.totalAmount} by ${challan.dueDate}. Status: ${challan.status}. Please contact ${challan.campusName} administration for details.`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${parentPhone}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  // --- ACTION 3: Send Email ---
  const handleEmail = async () => {
    setIsEmailing(true);
    // Placeholder email. In production, add parentEmail to your Student table.
    const payload = { ...challan, parentEmail: 'test@example.com' }; 

    try {
      const response = await fetch('/api/send-challan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) alert("Challan emailed successfully!");
      else alert("Failed to send email.");
    } catch {
      alert("Error sending email.");
    } finally {
      setIsEmailing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-gray-50 min-h-screen">
      
      {/* Control Panel (Hidden during print) */}
      <div className="flex gap-4 print:hidden">
        <button onClick={handleDownloadPDF} className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700">Download PDF</button>
        <button onClick={handleEmail} disabled={isEmailing} className="bg-indigo-600 text-white px-4 py-2 rounded shadow hover:bg-indigo-700">
          {isEmailing ? 'Sending...' : 'Send Email'}
        </button>
        <button onClick={handleWhatsApp} className="bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600">WhatsApp</button>
        <button onClick={() => window.print()} className="bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-gray-900">Print Direct</button>
      </div>

      {/* The Printable Area */}
      <div ref={printRef} className="bg-white w-full max-w-2xl p-8 shadow-lg border border-gray-200">
        <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">{challan.orgName}</h1>
            <p className="text-sm text-gray-500">{challan.campusName}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-gray-800">FEE CHALLAN</h2>
            <p className="text-sm text-gray-500">No: {challan.challanNo}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8 text-gray-700">
          <div>
            <p><strong>Student:</strong> {challan.studentName}</p>
            <p><strong>Admission No:</strong> {challan.admissionNo}</p>
            <p><strong>Grade:</strong> {challan.grade}</p>
          </div>
          <div className="text-right">
            <p className="text-red-600"><strong>Due Date:</strong> {challan.dueDate}</p>
            <p><strong>Status:</strong> {challan.status}</p>
          </div>
        </div>

        <table className="w-full text-left border-collapse mb-8">
          <thead>
            <tr className="border-b-2 border-gray-800">
              <th className="py-2 text-gray-800">Description</th>
              <th className="py-2 text-right text-gray-800">Amount ({challan.currency})</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200">
              <td className="py-3 text-gray-700">Total Dues</td>
              <td className="py-3 text-right text-gray-700">{challan.totalAmount}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="font-bold text-lg border-t-2 border-gray-800">
              <td className="py-3 text-gray-900">Total Payable</td>
              <td className="py-3 text-right text-gray-900">{challan.totalAmount}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

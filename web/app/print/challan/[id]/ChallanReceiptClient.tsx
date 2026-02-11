'use client';

import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
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
    const element = printRef.current;
    if (!element) return;

    // Use html2canvas to take a snapshot of the DOM element
    const canvas = await html2canvas(element, { scale: 2 });
    const data = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProperties = pdf.getImageProperties(data);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProperties.height * pdfWidth) / imgProperties.width;

    pdf.addImage(data, 'PNG', 0, 0, pdfWidth, pdfHeight);
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
    } catch (error) {
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

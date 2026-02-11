import prisma from '@/lib/prisma'; // Adjust this path to your Prisma client
import { notFound } from 'next/navigation';
import ChallanReceiptClient from './ChallanReceiptClient';

export default async function ChallanReceiptPage({ params }: { params: { id: string } }) {
  // 1. Fetch real data based on your exact schema
  const challanData = await prisma.feeChallan.findUnique({
    where: { 
      id: parseInt(params.id, 10) 
    },
    include: {
      student: true,
      campus: true,
      organization: true,
    }
  });

  // 2. Handle missing records
  if (!challanData) {
    notFound();
  }

  // 3. Format data for the client component
  // Converting Prisma Decimals to strings/numbers for safe client-side rendering
  const formattedChallan = {
    challanNo: challanData.challanNo,
    issueDate: challanData.issueDate.toLocaleDateString(),
    dueDate: challanData.dueDate.toLocaleDateString(),
    totalAmount: Number(challanData.totalAmount),
    status: challanData.status,
    studentName: challanData.student.fullName,
    admissionNo: challanData.student.admissionNo,
    grade: challanData.student.grade,
    campusName: challanData.campus.name,
    orgName: challanData.organization.name,
    currency: challanData.organization.currency, // e.g., 'PKR'
  };

  // 4. Pass the fetched data to the interactive client UI
  return <ChallanReceiptClient challan={formattedChallan} />;
}

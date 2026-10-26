import { NextResponse } from 'next/server';
import studentData from '@/app/data/student.json';
import { generateCustodialWallet } from '@/utils/crypto';
interface Student {
    nim: string;
    nama: string;
    programStudi?: string;
    password?: string;
    walletAddress?: string;
}

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    if (url.searchParams.get('debug') === 'true') {
      const text = await request.text();
      
      // Solusi: Log ke console saja, dan hanya di tahap development
      if (process.env.NODE_ENV !== 'production') {
        console.log("=== DEBUG OCR DITERIMA ===");
        console.log("Panjang teks:", text.length, "karakter");
        // Hapus komentar di bawah jika ingin mencetak hasil OCR-nya ke console
        // console.log(text.substring(0, 500) + '... [TRUNCATED]');
      }

      return NextResponse.json({ success: true });
    }

    const { nim } = await request.json();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
    try {
        // Compute wallet addresses securely on the server
        const studentsWithWallets = (studentData as Student[]).map(student => {
            const wallet = generateCustodialWallet(student.nim);
            return {
                ...student,
                walletAddress: wallet.address
            };
        });

        return NextResponse.json({ success: true, data: studentsWithWallets });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

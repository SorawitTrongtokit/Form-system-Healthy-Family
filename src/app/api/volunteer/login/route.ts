import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
    try {
        const { national_id, phone } = await request.json();

        // Validate input
        if (!national_id || !phone) {
            return NextResponse.json(
                { success: false, error: 'กรุณากรอกเลขบัตรประชาชนและเบอร์โทรศัพท์' },
                { status: 400 }
            );
        }

        // Clean national ID (remove spaces and dashes)
        const cleanNationalId = national_id.replace(/[\s-]/g, '');

        // Clean phone number (remove spaces, dashes, and common prefixes)
        const cleanPhone = phone.replace(/[\s-]/g, '').replace(/^\+66/, '0').replace(/^66/, '0');

        // Validate national ID format (13 digits)
        if (!/^\d{13}$/.test(cleanNationalId)) {
            return NextResponse.json(
                { success: false, error: 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก' },
                { status: 400 }
            );
        }

        // Validate phone format (10 digits starting with 0)
        if (!/^0\d{9}$/.test(cleanPhone)) {
            return NextResponse.json(
                { success: false, error: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก เริ่มต้นด้วย 0' },
                { status: 400 }
            );
        }

        // Create Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            console.error('Missing Supabase environment variables');
            return NextResponse.json(
                { success: false, error: 'ระบบมีปัญหา กรุณาติดต่อผู้ดูแล' },
                { status: 500 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // Query volunteer with both national_id AND phone
        const { data: volunteer, error } = await supabase
            .from('volunteers')
            .select('*')
            .eq('national_id', cleanNationalId)
            .single();

        if (error || !volunteer) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบข้อมูลอาสาสมัครในระบบ กรุณาติดต่อ รพ.สต.' },
                { status: 401 }
            );
        }

        // Verify phone number matches
        const volunteerPhone = (volunteer.phone || '').replace(/[\s-]/g, '').replace(/^\+66/, '0').replace(/^66/, '0');

        if (volunteerPhone !== cleanPhone) {
            return NextResponse.json(
                { success: false, error: 'เบอร์โทรศัพท์ไม่ตรงกับข้อมูลในระบบ' },
                { status: 401 }
            );
        }

        // Login successful
        return NextResponse.json({
            success: true,
            volunteer: {
                id: volunteer.id,
                name: volunteer.name,
                national_id: volunteer.national_id,
                phone: volunteer.phone
            }
        });
    } catch (error) {
        console.error('Volunteer login error:', error);
        return NextResponse.json(
            { success: false, error: 'เกิดข้อผิดพลาด กรุณาลองใหม่' },
            { status: 500 }
        );
    }
}

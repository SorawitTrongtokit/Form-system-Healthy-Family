'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    getCurrentVolunteer,
    getResidentByIdAsync,
    getHouseByIdAsync,
    getHealthRecordAsync,
    saveHealthRecordAsync,
    restoreSession
} from '@/lib/store';
import { Resident, HealthRecord, AgeGroup } from '@/lib/types';
import {
    calculateAge,
    calculateAgeInMonths,
    getAgeGroup,
    getAgeGroupLabel,
    calculateBMI,
    getWeightCriteria,
    getHeightCriteria,
    getWeightForHeightCriteria,
    checkPassedCriteria,
    criteriaLabels
} from '@/lib/calculations';
import { formatThaiDate } from '@/lib/validation';

export default function SurveyPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const residentId = params.residentId as string;
    const houseId = searchParams.get('houseId') || '';

    const [resident, setResident] = useState<Resident | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<HealthRecord>>({});

    // Derived values
    const [age, setAge] = useState(0);
    const [ageMonths, setAgeMonths] = useState(0);
    const [ageGroup, setAgeGroup] = useState<AgeGroup>('19-59');

    // BMI is derived from formData
    const bmi = formData.bmi ?? null;

    // Calculate criteria based on weight/height
    const getCriteriaUpdates = (weight: number, height: number) => {
        const calculatedBmi = calculateBMI(weight, height);
        if (ageGroup === '0-5' || ageGroup === '6-14') {
            const gender = resident?.gender || 'male';
            return {
                bmi: calculatedBmi,
                weight_criteria: getWeightCriteria(weight, ageMonths, gender),
                height_criteria: getHeightCriteria(height, ageMonths, gender),
                weight_for_height: getWeightForHeightCriteria(weight, height, gender)
            };
        }
        return { bmi: calculatedBmi };
    };

    useEffect(() => {
        async function loadData() {
            let vol = getCurrentVolunteer();
            if (!vol) {
                vol = await restoreSession();
            }

            if (!vol) {
                router.push('/');
                return;
            }

            const r = await getResidentByIdAsync(residentId);
            const h = await getHouseByIdAsync(houseId);

            if (!r || !h) {
                router.push('/volunteer');
                return;
            }

            setResident(r);

            const calculatedAge = calculateAge(r.birth_date);
            const calculatedAgeMonths = calculateAgeInMonths(r.birth_date);
            setAge(calculatedAge);
            setAgeMonths(calculatedAgeMonths);
            setAgeGroup(getAgeGroup(calculatedAge));

            // Load existing record if any
            const existingRecord = await getHealthRecordAsync(residentId);
            if (existingRecord) {
                setFormData(existingRecord);
            } else {
                setFormData({
                    resident_id: residentId,
                    house_id: houseId,
                    age_group: getAgeGroup(calculatedAge),
                    record_date: new Date().toISOString().split('T')[0]
                });
            }

            setLoading(false);
        }

        loadData();
    }, [residentId, houseId, router]);

    const handleInputChange = (field: string, value: unknown) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            // Auto-calculate criteria when weight or height changes
            if ((field === 'weight' || field === 'height') && updated.weight && updated.height) {
                const criteriaUpdates = getCriteriaUpdates(updated.weight, updated.height);
                return { ...updated, ...criteriaUpdates };
            }
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        // Build complete record
        const record: HealthRecord = {
            id: formData.id || `hr_${Date.now()}`,
            resident_id: residentId,
            house_id: houseId,
            record_date: new Date().toISOString().split('T')[0],
            age_group: ageGroup,
            weight: formData.weight || 0,
            height: formData.height || 0,
            bmi: bmi || undefined,
            ...formData,
            passed_criteria: checkPassedCriteria(ageGroup, formData)
        };

        // Save record to Supabase
        await saveHealthRecordAsync(record);

        setSaving(false);
        setSuccess(true);

        // Redirect after delay
        setTimeout(() => {
            router.push(`/volunteer/house/${houseId}`);
        }, 1500);
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="loading-spinner"></div>
            </main>
        );
    }

    if (success) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="card p-8 text-center">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-xl font-bold text-gray-800">บันทึกข้อมูลสำเร็จ!</h2>
                    <p className="text-gray-600">กำลังกลับไปหน้าบ้าน...</p>
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="nav-header">
                <div className="flex items-center gap-4">
                    <Link href={`/volunteer/house/${houseId}`} className="text-white/80 hover:text-white">
                        ← กลับ
                    </Link>
                    <div>
                        <h1 className="nav-title">แบบฟอร์มสำรวจสุขภาพ</h1>
                        <p className="text-sm text-white/80">{getAgeGroupLabel(ageGroup)}</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container max-w-2xl pb-8">
                {/* Person Info */}
                <div className="card p-6 mb-6">
                    <h3 className="font-bold text-gray-800 mb-2">👤 ข้อมูลผู้ถูกสำรวจ</h3>
                    <p className="text-lg font-medium">
                        {resident?.prefix}{resident?.first_name} {resident?.last_name}
                    </p>
                    <p className="text-gray-600">
                        อายุ {age} ปี | เกิด {formatThaiDate(resident?.birth_date || '')}
                    </p>
                    <span className={`badge mt-2 ${ageGroup === '0-5' ? 'bg-pink-100 text-pink-700' :
                        ageGroup === '6-14' ? 'bg-blue-100 text-blue-700' :
                            ageGroup === '15-18' ? 'bg-purple-100 text-purple-700' :
                                ageGroup === '19-59' ? 'bg-green-100 text-green-700' :
                                    'bg-amber-100 text-amber-700'
                        }`}>
                        {getAgeGroupLabel(ageGroup)}
                    </span>
                </div>

                {/* Health Form */}
                <form onSubmit={handleSubmit} className="card p-6">
                    <h3 className="font-bold text-gray-800 mb-4">📋 แบบฟอร์มสุขภาพ</h3>

                    {/* Weight & Height (all age groups) */}
                    <div className="grid-2 mb-4">
                        <div className="form-group">
                            <label className="form-label">น้ำหนัก (กก.)</label>
                            <input
                                type="number"
                                step="0.1"
                                className="input"
                                placeholder="กรอกน้ำหนัก"
                                value={formData.weight || ''}
                                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">ส่วนสูง (ซม.)</label>
                            <input
                                type="number"
                                step="0.1"
                                className="input"
                                placeholder="กรอกส่วนสูง"
                                value={formData.height || ''}
                                onChange={(e) => handleInputChange('height', parseFloat(e.target.value) || 0)}
                                required
                            />
                        </div>
                    </div>

                    {/* Auto-calculated BMI */}
                    {bmi && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                            <p className="text-blue-700 font-medium">
                                📊 BMI: {bmi} {bmi < 18.5 ? '(ผอม)' : bmi < 25 ? '(ปกติ)' : bmi < 30 ? '(น้ำหนักเกิน)' : '(อ้วน)'}
                            </p>
                        </div>
                    )}

                    {/* Age 0-5 fields ONLY */}
                    {ageGroup === '0-5' && (
                        <>
                            {/* Auto-calculated criteria */}
                            {formData.weight_criteria && (
                                <div className="grid-3 mb-4">
                                    <div className={`p-3 rounded-lg text-center border-2 ${formData.weight_criteria === 'normal'
                                        ? 'bg-green-50 border-green-300'
                                        : formData.weight_criteria === 'underweight'
                                            ? 'bg-orange-50 border-orange-300'
                                            : 'bg-red-50 border-red-300'
                                        }`}>
                                        <p className="text-sm text-gray-600">เกณฑ์น้ำหนัก</p>
                                        <p className={`font-bold ${formData.weight_criteria === 'normal'
                                            ? 'text-green-700'
                                            : formData.weight_criteria === 'underweight'
                                                ? 'text-orange-700'
                                                : 'text-red-700'
                                            }`}>
                                            {formData.weight_criteria === 'normal' ? '✅' : formData.weight_criteria === 'underweight' ? '⚠️' : '🔴'} {criteriaLabels.weight_criteria[formData.weight_criteria]}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-lg text-center border-2 ${formData.height_criteria === 'normal'
                                        ? 'bg-green-50 border-green-300'
                                        : formData.height_criteria === 'short'
                                            ? 'bg-orange-50 border-orange-300'
                                            : 'bg-blue-50 border-blue-300'
                                        }`}>
                                        <p className="text-sm text-gray-600">เกณฑ์ส่วนสูง</p>
                                        <p className={`font-bold ${formData.height_criteria === 'normal'
                                            ? 'text-green-700'
                                            : formData.height_criteria === 'short'
                                                ? 'text-orange-700'
                                                : 'text-blue-700'
                                            }`}>
                                            {formData.height_criteria === 'normal' ? '✅' : formData.height_criteria === 'short' ? '⚠️' : '📏'} {criteriaLabels.height_criteria[formData.height_criteria || 'normal']}
                                        </p>
                                    </div>
                                    <div className={`p-3 rounded-lg text-center border-2 ${formData.weight_for_height === 'normal'
                                        ? 'bg-green-50 border-green-300'
                                        : formData.weight_for_height === 'underweight'
                                            ? 'bg-orange-50 border-orange-300'
                                            : 'bg-red-50 border-red-300'
                                        }`}>
                                        <p className="text-sm text-gray-600">น้ำหนัก/ส่วนสูง</p>
                                        <p className={`font-bold ${formData.weight_for_height === 'normal'
                                            ? 'text-green-700'
                                            : formData.weight_for_height === 'underweight'
                                                ? 'text-orange-700'
                                                : 'text-red-700'
                                            }`}>
                                            {formData.weight_for_height === 'normal' ? '✅' : formData.weight_for_height === 'underweight' ? '⚠️' : '🔴'} {criteriaLabels.weight_for_height[formData.weight_for_height || 'normal']}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Vaccination */}
                            <div className="form-group">
                                <label className="form-label">การรับวัคซีน</label>
                                <div className="radio-group">
                                    {Object.entries(criteriaLabels.vaccination).map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={`radio-option ${formData.vaccination === value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="vaccination"
                                                value={value}
                                                checked={formData.vaccination === value}
                                                onChange={(e) => handleInputChange('vaccination', e.target.value)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Development */}
                            <div className="form-group">
                                <label className="form-label">พัฒนาการตามวัย</label>
                                <div className="radio-group">
                                    {Object.entries(criteriaLabels.development).map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={`radio-option ${formData.development === value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="development"
                                                value={value}
                                                checked={formData.development === value}
                                                onChange={(e) => handleInputChange('development', e.target.value)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Iron supplement */}
                            <div className="form-group">
                                <label className="form-label">ยาน้ำเสริมธาตุเหล็ก</label>
                                <div className="radio-group">
                                    {Object.entries(criteriaLabels.iron_supplement).map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={`radio-option ${formData.iron_supplement === value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="iron_supplement"
                                                value={value}
                                                checked={formData.iron_supplement === value}
                                                onChange={(e) => handleInputChange('iron_supplement', e.target.value)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Age 6-14: Oral health + Iron pill */}
                    {ageGroup === '6-14' && (
                        <>
                            <div className="form-group">
                                <label className="form-label">สุขภาพช่องปาก</label>
                                <div className="space-y-2">
                                    {Object.entries(criteriaLabels.oral_health).map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={`radio-option ${formData.oral_health === value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="oral_health"
                                                value={value}
                                                checked={formData.oral_health === value}
                                                onChange={(e) => handleInputChange('oral_health', e.target.value)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Iron pill supplement for 6-14 years */}
                            <div className="form-group">
                                <label className="form-label">ยาเม็ดเสริมธาตุเหล็ก</label>
                                <div className="radio-group">
                                    {Object.entries(criteriaLabels.iron_supplement).map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={`radio-option ${formData.iron_supplement === value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="iron_supplement"
                                                value={value}
                                                checked={formData.iron_supplement === value}
                                                onChange={(e) => handleInputChange('iron_supplement', e.target.value)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Age 15-18 fields */}
                    {ageGroup === '15-18' && (
                        <>
                            <div className="form-group">
                                <label className="form-label">การดื่มสุรา</label>
                                <div className="radio-group">
                                    {Object.entries(criteriaLabels.alcohol).map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={`radio-option ${formData.alcohol === value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="alcohol"
                                                value={value}
                                                checked={formData.alcohol === value}
                                                onChange={(e) => handleInputChange('alcohol', e.target.value)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">การสูบบุหรี่</label>
                                <div className="radio-group">
                                    {Object.entries(criteriaLabels.smoking).map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={`radio-option ${formData.smoking === value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="smoking"
                                                value={value}
                                                checked={formData.smoking === value}
                                                onChange={(e) => handleInputChange('smoking', e.target.value)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">ประวัติใช้สารเสพติด</label>
                                <div className="radio-group">
                                    {Object.entries(criteriaLabels.drug_use).map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={`radio-option ${formData.drug_use === value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="drug_use"
                                                value={value}
                                                checked={formData.drug_use === value}
                                                onChange={(e) => handleInputChange('drug_use', e.target.value)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Age 19-59 and 60+ fields */}
                    {(ageGroup === '19-59' || ageGroup === '60+') && (
                        <>
                            <div className="form-group">
                                <label className="form-label">ผู้ป่วยโรคเบาหวาน</label>
                                <div className="space-y-2">
                                    {Object.entries(criteriaLabels.diabetes).map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={`radio-option ${formData.diabetes === value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="diabetes"
                                                value={value}
                                                checked={formData.diabetes === value}
                                                onChange={(e) => handleInputChange('diabetes', e.target.value)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">ผู้ป่วยโรคความดันโลหิตสูง</label>
                                <div className="space-y-2">
                                    {Object.entries(criteriaLabels.hypertension).map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={`radio-option ${formData.hypertension === value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="hypertension"
                                                value={value}
                                                checked={formData.hypertension === value}
                                                onChange={(e) => handleInputChange('hypertension', e.target.value)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">ผู้ที่มีภาวะพึ่งพิง</label>
                                <div className="space-y-2">
                                    {Object.entries(criteriaLabels.dependency).map(([value, label]) => (
                                        <label
                                            key={value}
                                            className={`radio-option ${formData.dependency === value ? 'selected' : ''}`}
                                        >
                                            <input
                                                type="radio"
                                                name="dependency"
                                                value={value}
                                                checked={formData.dependency === value}
                                                onChange={(e) => handleInputChange('dependency', e.target.value)}
                                            />
                                            {label}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary w-full mt-6"
                    >
                        {saving ? (
                            <span className="flex items-center gap-2">
                                <div className="loading-spinner w-5 h-5"></div>
                                กำลังบันทึก...
                            </span>
                        ) : (
                            '💾 บันทึกข้อมูล'
                        )}
                    </button>
                </form>
            </main>
        </div>
    );
}

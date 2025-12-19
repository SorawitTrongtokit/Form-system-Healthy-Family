// Data store using Supabase for persistent storage
// All data is now stored in Supabase cloud database

import { supabase } from './supabase';
import { Volunteer, House, Resident, HealthRecord, HouseWithStats, ResidentWithAge } from './types';
import { calculateAge, getAgeGroup } from './calculations';

// Current logged-in volunteer (cached locally)
let currentVolunteer: Volunteer | null = null;

// ==================== LOGIN / AUTH ====================

export async function loginAsync(nationalId: string): Promise<Volunteer | null> {
    const cleanId = nationalId.replace(/[\s-]/g, '');

    const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .eq('national_id', cleanId)
        .single();

    if (error || !data) {
        return null;
    }

    currentVolunteer = data as Volunteer;

    // Save to localStorage for persistence
    if (typeof window !== 'undefined') {
        localStorage.setItem('volunteerId', data.id);
        localStorage.setItem('volunteerNationalId', data.national_id);
    }

    return currentVolunteer;
}

// Sync login (for backwards compatibility)
export function login(nationalId: string): Volunteer | null {
    // This is now async, so we return null and let the async version handle it
    loginAsync(nationalId);
    return null;
}

export function logout(): void {
    currentVolunteer = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem('volunteerId');
        localStorage.removeItem('volunteerNationalId');
    }
}

export function getCurrentVolunteer(): Volunteer | null {
    return currentVolunteer;
}

export async function restoreSession(): Promise<Volunteer | null> {
    if (currentVolunteer) return currentVolunteer;

    if (typeof window !== 'undefined') {
        const nationalId = localStorage.getItem('volunteerNationalId');
        if (nationalId) {
            return await loginAsync(nationalId);
        }
    }
    return null;
}

export function isLoggedIn(): boolean {
    return currentVolunteer !== null;
}

// ==================== VOLUNTEERS ====================

export async function getAllVolunteersAsync(): Promise<Volunteer[]> {
    const { data, error } = await supabase
        .from('volunteers')
        .select('*')
        .order('name');

    if (error) {
        console.error('Error fetching volunteers:', error);
        return [];
    }

    return data as Volunteer[];
}

// Sync version for backwards compatibility
export function getAllVolunteers(): Volunteer[] {
    // Return empty array, use async version instead
    return [];
}

// ==================== HOUSES ====================

export async function getMyHousesAsync(): Promise<HouseWithStats[]> {
    if (!currentVolunteer) return [];

    // Fetch houses for this volunteer
    const { data: houses, error: houseError } = await supabase
        .from('houses')
        .select('*')
        .eq('volunteer_id', currentVolunteer.id);

    if (houseError || !houses) {
        console.error('Error fetching houses:', houseError);
        return [];
    }

    // Fetch residents and health records for each house
    const results: HouseWithStats[] = [];

    for (const house of houses) {
        const { data: residents } = await supabase
            .from('residents')
            .select('*')
            .eq('house_id', house.id);

        const { data: records } = await supabase
            .from('health_records')
            .select('resident_id')
            .eq('house_id', house.id);

        const residentList = residents || [];
        const recordCount = records?.length || 0;

        results.push({
            ...house,
            total_residents: residentList.length,
            surveyed_count: recordCount,
            residents: residentList
        });
    }

    return results;
}

// Sync version
export function getMyHouses(): HouseWithStats[] {
    return [];
}

export async function getHouseByIdAsync(houseId: string): Promise<House | null> {
    const { data, error } = await supabase
        .from('houses')
        .select('*')
        .eq('id', houseId)
        .single();

    if (error) return null;
    return data as House;
}

export function getHouseById(houseId: string): House | undefined {
    return undefined;
}

// ==================== RESIDENTS ====================

export async function getResidentsByHouseIdAsync(houseId: string): Promise<ResidentWithAge[]> {
    const { data: residents, error } = await supabase
        .from('residents')
        .select('*')
        .eq('house_id', houseId);

    if (error || !residents) return [];

    // Fetch health records
    const { data: records } = await supabase
        .from('health_records')
        .select('resident_id')
        .eq('house_id', houseId);

    const recordIds = new Set((records || []).map(r => r.resident_id));

    return residents.map(resident => {
        const age = calculateAge(resident.birth_date);
        const ageGroup = getAgeGroup(age);

        return {
            ...resident,
            age,
            age_group: ageGroup,
            has_record: recordIds.has(resident.id)
        };
    });
}

export function getResidentsByHouseId(houseId: string): ResidentWithAge[] {
    return [];
}

export async function getResidentByIdAsync(residentId: string): Promise<Resident | null> {
    const { data, error } = await supabase
        .from('residents')
        .select('*')
        .eq('id', residentId)
        .single();

    if (error) return null;
    return data as Resident;
}

export function getResidentById(residentId: string): Resident | undefined {
    return undefined;
}

// ==================== HEALTH RECORDS ====================

export async function saveHealthRecordAsync(record: HealthRecord): Promise<boolean> {
    const { error } = await supabase
        .from('health_records')
        .upsert(record, { onConflict: 'id' });

    if (error) {
        console.error('Error saving health record:', error);
        return false;
    }

    return true;
}

export function saveHealthRecord(record: HealthRecord): void {
    saveHealthRecordAsync(record);
}

export async function getHealthRecordAsync(residentId: string): Promise<HealthRecord | null> {
    const { data, error } = await supabase
        .from('health_records')
        .select('*')
        .eq('resident_id', residentId)
        .single();

    if (error) return null;
    return data as HealthRecord;
}

export function getHealthRecord(residentId: string): HealthRecord | undefined {
    return undefined;
}

export async function getAllHealthRecordsAsync(): Promise<HealthRecord[]> {
    const { data, error } = await supabase
        .from('health_records')
        .select('*');

    if (error) return [];
    return data as HealthRecord[];
}

export function getAllHealthRecords(): HealthRecord[] {
    return [];
}

// ==================== HOUSE LOCATION ====================

export async function updateHouseLocationAsync(
    houseId: string,
    latitude: number,
    longitude: number,
    photoUrl?: string
): Promise<boolean> {
    const updateData: Partial<House> = { latitude, longitude };
    if (photoUrl) updateData.photo_url = photoUrl;

    const { error } = await supabase
        .from('houses')
        .update(updateData)
        .eq('id', houseId);

    if (error) {
        console.error('Error updating house location:', error);
        return false;
    }

    return true;
}

export function updateHouseLocation(houseId: string, latitude: number, longitude: number, photoUrl?: string): void {
    updateHouseLocationAsync(houseId, latitude, longitude, photoUrl);
}

// ==================== DASHBOARD STATS ====================

export interface DashboardStats {
    totalResidents: number;
    surveyedCount: number;
    coveragePercent: number;
    byAgeGroup: {
        ageGroup: string;
        total: number;
        passed: number;
        failed: number;
        passedPercent: number;
    }[];
}

export async function getDashboardStatsAsync(): Promise<DashboardStats> {
    // Fetch all residents
    const { data: residents } = await supabase
        .from('residents')
        .select('id, birth_date');

    // Fetch all health records
    const { data: records } = await supabase
        .from('health_records')
        .select('*');

    const allResidents = residents || [];
    const allRecords = records || [];

    const totalResidents = allResidents.length;
    const surveyedCount = allRecords.length;
    const coveragePercent = totalResidents > 0 ? Math.round((surveyedCount / totalResidents) * 100) : 0;

    const ageGroups = ['0-5', '6-14', '15-18', '19-59', '60+'];

    const byAgeGroup = ageGroups.map(ag => {
        const residentsInGroup = allResidents.filter(r => {
            const age = calculateAge(r.birth_date);
            return getAgeGroup(age) === ag;
        });

        const recordsInGroup = allRecords.filter(hr => hr.age_group === ag);
        const passed = recordsInGroup.filter(hr => hr.passed_criteria === true).length;
        const failed = recordsInGroup.filter(hr => hr.passed_criteria === false).length;

        return {
            ageGroup: ag,
            total: residentsInGroup.length,
            passed,
            failed,
            passedPercent: recordsInGroup.length > 0 ? Math.round((passed / recordsInGroup.length) * 100) : 0
        };
    });

    return {
        totalResidents,
        surveyedCount,
        coveragePercent,
        byAgeGroup
    };
}

export function getDashboardStats(): DashboardStats {
    return {
        totalResidents: 0,
        surveyedCount: 0,
        coveragePercent: 0,
        byAgeGroup: []
    };
}

// ==================== ELDERLY MAP ====================

export interface ElderlyMapData {
    id: string;
    name: string;
    age: number;
    latitude: number;
    longitude: number;
    status: 'passed' | 'failed' | 'other' | 'not_surveyed';
    houseNumber: string;
    villageNo: number;
}

export async function getElderlyMapDataAsync(): Promise<ElderlyMapData[]> {
    // Fetch all residents with house data
    const { data: residents } = await supabase
        .from('residents')
        .select('*, houses(*)');

    // Fetch health records
    const { data: records } = await supabase
        .from('health_records')
        .select('resident_id, passed_criteria');

    if (!residents) return [];

    const recordMap = new Map((records || []).map(r => [r.resident_id, r]));

    // Filter elderly (60+)
    const elderly = residents.filter(r => {
        const age = calculateAge(r.birth_date);
        return age >= 60;
    });

    return elderly.map(person => {
        const house = person.houses as House | null;
        const record = recordMap.get(person.id);
        const age = calculateAge(person.birth_date);

        let status: 'passed' | 'failed' | 'other' | 'not_surveyed' = 'not_surveyed';
        if (record) {
            if (record.passed_criteria === true) status = 'passed';
            else if (record.passed_criteria === false) status = 'failed';
            else status = 'other';
        }

        return {
            id: person.id,
            name: `${person.prefix}${person.first_name} ${person.last_name}`,
            age,
            latitude: house?.latitude || 15.05 + (Math.random() * 0.01),
            longitude: house?.longitude || 100.48 + (Math.random() * 0.01),
            status,
            houseNumber: house?.house_number || '',
            villageNo: house?.village_no || 6
        };
    });
}

export function getElderlyMapData(): ElderlyMapData[] {
    return [];
}

// ==================== INIT ====================

export function initializeStore(): void {
    // Restore session on init
    restoreSession();
}

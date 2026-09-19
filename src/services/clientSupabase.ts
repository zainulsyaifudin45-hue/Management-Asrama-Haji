import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanUrl(rawUrl?: string): string {
  if (!rawUrl) return 'https://bmznfrxllzxamwwqwdjn.supabase.co';
  return rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

// Safely extract environment variables across Vite, Vercel, and Node environments
const getEnvVar = (key: string, fallback: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      if ((import.meta as any).env[key]) return (import.meta as any).env[key];
      if ((import.meta as any).env[`VITE_${key}`]) return (import.meta as any).env[`VITE_${key}`];
    }
  } catch (_) {}

  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[key]) return process.env[key];
      if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
    }
  } catch (_) {}

  return fallback;
};

export const CLIENT_SUPABASE_CONFIG = {
  projectName: 'zainulsyaifun45',
  projectId: 'bmznfrxllzxamwwqwdjn',
  url: cleanUrl(getEnvVar('SUPABASE_URL', 'https://bmznfrxllzxamwwqwdjn.supabase.co')),
  anonKey: getEnvVar(
    'SUPABASE_ANON_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtem5mcnhsbHp4YW13d3F3ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTg2NTYsImV4cCI6MjEwNTM5NDY1Nn0.W6WX551eWrx8GQ8Gclfw-UIoCmcV1xDNtHSQ0CnMqW0'
  ).trim(),
  dashboardSqlUrl: 'https://supabase.com/dashboard/project/bmznfrxllzxamwwqwdjn/sql/new'
};

let clientInstance: SupabaseClient | null = null;

export function getClientSupabase(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createClient(CLIENT_SUPABASE_CONFIG.url, CLIENT_SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return clientInstance;
}

export async function checkClientSupabaseDirect(): Promise<{
  connected: boolean;
  project: { id: string; name: string; url: string; dashboardSqlUrl: string };
  tablesReady: boolean;
  tablesFound: string[];
  missingTables: string[];
  connectionError: string | null;
  mode: 'direct-client' | 'proxy-server';
}> {
  const sb = getClientSupabase();
  const tablesToCheck = ['app_state', 'rooms', 'transactions', 'maintenances', 'users', 'qc_inspections', 'work_sessions', 'audit_logs'];
  const tablesFound: string[] = [];
  const missingTables: string[] = [];
  let connectionError: string | null = null;

  try {
    const { error: stateError } = await sb.from('app_state').select('key').limit(1);
    if (stateError) {
      if (stateError.code === '42P01') {
        missingTables.push('app_state');
      } else {
        connectionError = stateError.message;
      }
    } else {
      tablesFound.push('app_state');
    }

    // Check remaining tables
    for (const table of tablesToCheck.slice(1)) {
      try {
        const { error } = await sb.from(table).select('id').limit(1);
        if (error) {
          missingTables.push(table);
        } else {
          tablesFound.push(table);
        }
      } catch {
        missingTables.push(table);
      }
    }

    const connected = !connectionError || tablesFound.length > 0;

    return {
      connected,
      project: {
        id: CLIENT_SUPABASE_CONFIG.projectId,
        name: CLIENT_SUPABASE_CONFIG.projectName,
        url: CLIENT_SUPABASE_CONFIG.url,
        dashboardSqlUrl: CLIENT_SUPABASE_CONFIG.dashboardSqlUrl
      },
      tablesReady: tablesFound.length >= 1,
      tablesFound,
      missingTables,
      connectionError: connected ? null : connectionError,
      mode: 'direct-client'
    };
  } catch (err: any) {
    return {
      connected: false,
      project: {
        id: CLIENT_SUPABASE_CONFIG.projectId,
        name: CLIENT_SUPABASE_CONFIG.projectName,
        url: CLIENT_SUPABASE_CONFIG.url,
        dashboardSqlUrl: CLIENT_SUPABASE_CONFIG.dashboardSqlUrl
      },
      tablesReady: false,
      tablesFound: [],
      missingTables: tablesToCheck,
      connectionError: err?.message || 'Gagal tersambung langsung ke Supabase dari Vercel/Browser',
      mode: 'direct-client'
    };
  }
}

export async function syncDirectToSupabase(payload: any): Promise<{
  success: boolean;
  message: string;
  results: any;
}> {
  const sb = getClientSupabase();
  const timestamp = new Date().toISOString();
  const results = {
    appStateSaved: false,
    relationalSaved: false,
    timestamp,
    error: null as string | null
  };

  try {
    // 1. Primary snapshot save in app_state
    const { error: stateErr } = await sb
      .from('app_state')
      .upsert(
        {
          key: 'sim_haji_data',
          data: payload,
          updated_at: timestamp
        },
        { onConflict: 'key' }
      );

    if (stateErr) {
      results.error = stateErr.message;
    } else {
      results.appStateSaved = true;
    }
  } catch (err: any) {
    results.error = err?.message || 'Gagal menyimpan snapshot ke app_state';
  }

  // 2. Relational save
  try {
    if (Array.isArray(payload.rooms) && payload.rooms.length > 0) {
      const formattedRooms = payload.rooms.map((r: any) => ({
        id: String(r.id),
        number: String(r.roomNumber || r.number || ''),
        building: String(r.building || ''),
        category: r.type || r.category || null,
        capacity: r.capacity || null,
        floor: Number(r.floor || 1),
        price: Number(r.price || 0),
        status: r.status || 'KOSONG',
        is_clean: Boolean(r.qcStatus === 'LOLOS_QC' || r.isClean),
        needs_qc: Boolean(r.qcStatus === 'PERLU_PERBAIKAN' || r.needsQc),
        occupant_name: r.occupantName || r.activeTxId || null,
        check_in_date: r.checkInDate || null,
        check_out_date: r.checkOutDate || null,
        raw_data: r,
        updated_at: timestamp
      }));
      await sb.from('rooms').upsert(formattedRooms, { onConflict: 'id' });
    }

    if (Array.isArray(payload.transactions) && payload.transactions.length > 0) {
      const formattedTx = payload.transactions.map((t: any) => ({
        id: String(t.id),
        booking_code: t.bookingCode || t.booking_code || t.id,
        guest_name: String(t.guestName || t.guest_name || 'Tamu'),
        guest_phone: t.phone || t.guestPhone || t.guest_phone || null,
        guest_institution: t.institution || t.agencyOrDocument || t.guestInstitution || null,
        guest_category: t.category || t.guestCategory || null,
        guest_count: Number(t.totalPax || t.pax || t.guestCount || 1),
        building: t.building || null,
        room_number: t.roomNumber || (Array.isArray(t.allocatedRoomNumbers) ? t.allocatedRoomNumbers.join(', ') : null),
        room_id: t.roomId ? String(t.roomId) : null,
        start_date: t.startDate || t.checkInDate || null,
        end_date: t.endDate || t.checkOutDate || null,
        total_days: Number(t.duration || t.totalDays || 1),
        total_amount: Number(t.totalAmount || 0),
        payment_status: t.paymentStatus || 'BELUM_LUNAS',
        payment_method: t.paymentMethod || null,
        status: t.status || 'AKTIF',
        created_at: t.createdAt || timestamp,
        raw_data: t,
        updated_at: timestamp
      }));
      await sb.from('transactions').upsert(formattedTx, { onConflict: 'id' });
    }

    if (Array.isArray(payload.users) && payload.users.length > 0) {
      const formattedUsers = payload.users.map((u: any) => ({
        id: String(u.id),
        username: String(u.username),
        full_name: String(u.fullName),
        role: String(u.role),
        password: u.password || '12345',
        department: u.department || null,
        assigned_building: u.assignedBuilding || null,
        phone: u.phone || null,
        status: u.status || 'Aktif',
        raw_data: u,
        updated_at: timestamp
      }));
      await sb.from('users').upsert(formattedUsers, { onConflict: 'id' });
    }

    results.relationalSaved = true;
  } catch (err: any) {
    // Relational save is secondary to app_state
  }

  const success = results.appStateSaved || results.relationalSaved;
  return {
    success,
    message: success
      ? 'Sinkronisasi langsung Vercel <-> Supabase berhasil!'
      : (results.error || 'Gagal melakukan sinkronisasi ke Supabase'),
    results
  };
}

export async function fetchDirectFromSupabase(): Promise<{
  success: boolean;
  data?: any;
  message?: string;
}> {
  const sb = getClientSupabase();
  try {
    const { data, error } = await sb
      .from('app_state')
      .select('data, updated_at')
      .eq('key', 'sim_haji_data')
      .single();

    if (!error && data && data.data) {
      return {
        success: true,
        data: data.data,
        message: `Data berhasil ditarik langsung dari Supabase (${data.updated_at})`
      };
    }

    return {
      success: false,
      message: error?.message || 'Data belum ditemukan di app_state Supabase'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Gagal membaca data dari Supabase'
    };
  }
}

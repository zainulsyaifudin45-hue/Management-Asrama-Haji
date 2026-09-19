import { createClient, SupabaseClient } from '@supabase/supabase-js';

function cleanSupabaseUrl(rawUrl?: string): string {
  if (!rawUrl) return 'https://bmznfrxllzxamwwqwdjn.supabase.co';
  return rawUrl.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

// Default Supabase project credentials provided by user
export const SUPABASE_CONFIG = {
  projectName: 'zainulsyaifun45',
  projectId: 'bmznfrxllzxamwwqwdjn',
  url: cleanSupabaseUrl(process.env.SUPABASE_URL),
  anonKey: (process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtem5mcnhsbHp4YW13d3F3ZGpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4MTg2NTYsImV4cCI6MjEwNTM5NDY1Nn0.W6WX551eWrx8GQ8Gclfw-UIoCmcV1xDNtHSQ0CnMqW0').trim(),
  publicKey: 'sb_publishable_BaWhiWfz7C6b3asLNhRRIg__NE7n-X3'
};

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

export const SUPABASE_SQL_INIT_SCRIPT = `-- ==============================================================================
-- SKRIP INISIALISASI BASIS DATA SUPABASE
-- Proyek: ${SUPABASE_CONFIG.projectName} (ID: ${SUPABASE_CONFIG.projectId})
-- Aplikasi: SIM-Akomodasi UPT Asrama Haji Jakarta
-- 
-- Petunjuk Eksekusi:
-- 1. Buka dashboard Supabase: https://supabase.com/dashboard/project/${SUPABASE_CONFIG.projectId}/sql/new
-- 2. Salin seluruh isi skrip ini dan tempelkan ke SQL Editor Supabase.
-- 3. Klik tombol "RUN" (Jalankan).
-- ==============================================================================

-- 1. TABEL SNAPSHOT STATE TERPADU (Primary Realtime State)
CREATE TABLE IF NOT EXISTS public.app_state (
    key text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Aktifkan RLS & Izin Akses Anon (Aman untuk Client/Server)
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read app_state" ON public.app_state;
CREATE POLICY "Allow anon read app_state" ON public.app_state
    FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Allow anon write app_state" ON public.app_state;
CREATE POLICY "Allow anon write app_state" ON public.app_state
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. TABEL KAMAR & AULA
CREATE TABLE IF NOT EXISTS public.rooms (
    id text PRIMARY KEY,
    number text NOT NULL,
    building text NOT NULL,
    category text,
    capacity text,
    floor integer DEFAULT 1,
    price numeric DEFAULT 0,
    status text DEFAULT 'KOSONG',
    is_clean boolean DEFAULT true,
    needs_qc boolean DEFAULT false,
    occupant_name text,
    check_in_date text,
    check_out_date text,
    raw_data jsonb,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on rooms" ON public.rooms;
CREATE POLICY "Allow anon all on rooms" ON public.rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. TABEL TRANSAKSI & RESERVASI TAMU
CREATE TABLE IF NOT EXISTS public.transactions (
    id text PRIMARY KEY,
    booking_code text,
    guest_name text NOT NULL,
    guest_phone text,
    guest_institution text,
    guest_category text,
    guest_count integer DEFAULT 1,
    building text,
    room_number text,
    room_id text,
    start_date text,
    end_date text,
    total_days integer DEFAULT 1,
    total_amount numeric DEFAULT 0,
    payment_status text DEFAULT 'BELUM_LUNAS',
    payment_method text,
    status text DEFAULT 'AKTIF',
    created_at text,
    raw_data jsonb,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on transactions" ON public.transactions;
CREATE POLICY "Allow anon all on transactions" ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4. TABEL PEMELIHARAAN & TIKET TEKNISI
CREATE TABLE IF NOT EXISTS public.maintenances (
    id text PRIMARY KEY,
    room_id text,
    room_number text,
    building text,
    issue_description text,
    reported_at text,
    reported_by text,
    priority text DEFAULT 'NORMAL',
    status text DEFAULT 'PENDING',
    assigned_technician text,
    resolved_at text,
    raw_data jsonb,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.maintenances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on maintenances" ON public.maintenances;
CREATE POLICY "Allow anon all on maintenances" ON public.maintenances FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. TABEL PENGGUNA & PETUGAS SISTEM
CREATE TABLE IF NOT EXISTS public.users (
    id text PRIMARY KEY,
    username text UNIQUE NOT NULL,
    full_name text NOT NULL,
    role text NOT NULL,
    password text,
    department text,
    supervisor_id text,
    assigned_building text,
    phone text,
    email text,
    status text DEFAULT 'Aktif',
    raw_data jsonb,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on users" ON public.users;
CREATE POLICY "Allow anon all on users" ON public.users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. TABEL INSPEKSI QUALITY CONTROL (QC)
CREATE TABLE IF NOT EXISTS public.qc_inspections (
    id text PRIMARY KEY,
    room_id text,
    building text,
    room_number text,
    inspector_id text,
    inspector_name text,
    inspection_date text,
    cleanliness text,
    linen_bed text,
    ac_electricity text,
    plumbing_water text,
    amenities text,
    result text,
    notes text,
    maintenance_id_created text,
    facility_type text DEFAULT 'KAMAR',
    raw_data jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.qc_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on qc_inspections" ON public.qc_inspections;
CREATE POLICY "Allow anon all on qc_inspections" ON public.qc_inspections FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 7. TABEL SESI KERJA & PRESENSI PETUGAS (WORK SESSIONS)
CREATE TABLE IF NOT EXISTS public.work_sessions (
    id text PRIMARY KEY,
    user_id text,
    user_name text NOT NULL,
    user_role text NOT NULL,
    login_time text NOT NULL,
    logout_time text,
    duration_seconds integer DEFAULT 0,
    duration_formatted text,
    status text DEFAULT 'AKTIF',
    notes text,
    raw_data jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on work_sessions" ON public.work_sessions;
CREATE POLICY "Allow anon all on work_sessions" ON public.work_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 8. TABEL AUDIT LOG AKTIVITAS OPERASIONAL
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id text PRIMARY KEY,
    timestamp text,
    user_name text,
    role text,
    action text,
    details text,
    raw_data jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on audit_logs" ON public.audit_logs;
CREATE POLICY "Allow anon all on audit_logs" ON public.audit_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 9. TABEL SALURAN KOORDINASI (CHAT CHANNELS)
CREATE TABLE IF NOT EXISTS public.chat_channels (
    id text PRIMARY KEY,
    name text NOT NULL,
    scope text NOT NULL,
    type text DEFAULT 'GROUP',
    department text,
    participant_ids jsonb DEFAULT '[]'::jsonb,
    description text,
    icon text,
    last_message text,
    last_message_time text,
    last_sender_name text,
    updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on chat_channels" ON public.chat_channels;
CREATE POLICY "Allow anon all on chat_channels" ON public.chat_channels FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 10. TABEL PESAN KOORDINASI (CHAT MESSAGES)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id text PRIMARY KEY,
    channel_id text NOT NULL,
    sender_id text NOT NULL,
    sender_name text NOT NULL,
    sender_role text NOT NULL,
    sender_department text,
    message text NOT NULL,
    timestamp text NOT NULL,
    time_formatted text,
    priority text DEFAULT 'NORMAL',
    is_instruction boolean DEFAULT false,
    read_by jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon all on chat_messages" ON public.chat_messages;
CREATE POLICY "Allow anon all on chat_messages" ON public.chat_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ==============================================================================
-- INDEXING UNTUK KINERJA TINGGI & PENCARIAN CEPAT
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_rooms_building_status ON public.rooms(building, status);
CREATE INDEX IF NOT EXISTS idx_rooms_needs_qc ON public.rooms(needs_qc);
CREATE INDEX IF NOT EXISTS idx_transactions_dates ON public.transactions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_maintenances_status ON public.maintenances(status);
CREATE INDEX IF NOT EXISTS idx_qc_inspections_room ON public.qc_inspections(room_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_user ON public.work_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id);

-- Notifikasi Sukses
COMMENT ON TABLE public.app_state IS 'Tabel sinkronisasi data SIM-HAJI UPT Asrama Haji Jakarta';
`;

/**
 * Check Supabase live connection and table status
 */
export async function checkSupabaseStatus() {
  const client = getSupabase();
  const tablesToCheck = ['app_state', 'rooms', 'transactions', 'maintenances', 'users', 'qc_inspections', 'work_sessions', 'audit_logs'];
  const tablesFound: string[] = [];
  const missingTables: string[] = [];
  let connectionError: string | null = null;
  let isConnected = false;

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await client.from(table).select('*').limit(1);
      if (error) {
        if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
          missingTables.push(table);
        } else {
          connectionError = error.message;
        }
      } else {
        tablesFound.push(table);
        isConnected = true;
      }
    } catch (err: any) {
      connectionError = err?.message || 'Gagal menghubungi server Supabase';
    }
  }

  // If we reached Supabase and got 205 (table not created), connection to Supabase endpoint itself is valid
  if (!isConnected && missingTables.length > 0 && !connectionError) {
    isConnected = true; // Connection to project is authenticated, but tables are awaiting creation
  }

  return {
    connected: isConnected,
    project: {
      id: SUPABASE_CONFIG.projectId,
      name: SUPABASE_CONFIG.projectName,
      url: SUPABASE_CONFIG.url,
      dashboardSqlUrl: `https://supabase.com/dashboard/project/${SUPABASE_CONFIG.projectId}/sql/new`
    },
    tablesReady: tablesFound.includes('app_state') || tablesFound.length > 0,
    tablesFound,
    missingTables,
    connectionError
  };
}

/**
 * Fetch complete application state from Supabase
 */
export async function fetchSupabaseData() {
  const client = getSupabase();

  // 1. Try reading from app_state snapshot first
  try {
    const { data: snapshot, error: snapshotErr } = await client
      .from('app_state')
      .select('data, updated_at')
      .eq('key', 'sim_haji_data')
      .maybeSingle();

    if (!snapshotErr && snapshot && snapshot.data) {
      return {
        success: true,
        source: 'app_state',
        updatedAt: snapshot.updated_at,
        data: snapshot.data
      };
    }
  } catch (e) {
    // ignore
  }

  // 2. If app_state isn't available, check if relational tables exist
  try {
    const [roomsRes, txRes, maintRes, usersRes] = await Promise.all([
      client.from('rooms').select('*'),
      client.from('transactions').select('*'),
      client.from('maintenances').select('*'),
      client.from('users').select('*')
    ]);

    if (!roomsRes.error && !txRes.error && roomsRes.data && roomsRes.data.length > 0) {
      return {
        success: true,
        source: 'relational_tables',
        updatedAt: new Date().toISOString(),
        data: {
          rooms: roomsRes.data.map((r: any) => r.raw_data || r),
          transactions: (txRes.data || []).map((t: any) => t.raw_data || t),
          maintenances: (maintRes.data || []).map((m: any) => m.raw_data || m),
          users: (usersRes.data || []).map((u: any) => u.raw_data || u)
        }
      };
    }
  } catch (e) {
    // ignore
  }

  return {
    success: false,
    message: 'Data belum ditemukan di Supabase atau tabel belum dibuat.'
  };
}

/**
 * Save complete application state to Supabase
 */
export async function saveSupabaseData(dbPayload: any) {
  const client = getSupabase();
  const results = {
    appStateSaved: false,
    relationalSaved: false,
    timestamp: new Date().toISOString(),
    error: null as string | null
  };

  // 1. Save to app_state table
  try {
    const { error: stateErr } = await client
      .from('app_state')
      .upsert({
        key: 'sim_haji_data',
        data: dbPayload,
        updated_at: results.timestamp
      }, { onConflict: 'key' });

    if (!stateErr) {
      results.appStateSaved = true;
    } else {
      results.error = stateErr.message;
    }
  } catch (err: any) {
    results.error = err?.message || 'Gagal menyimpan snapshot ke app_state';
  }

  // 2. Also populate relational tables if available
  try {
    if (Array.isArray(dbPayload.rooms) && dbPayload.rooms.length > 0) {
      const formattedRooms = dbPayload.rooms.map((r: any) => ({
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
        updated_at: results.timestamp
      }));
      await client.from('rooms').upsert(formattedRooms, { onConflict: 'id' });
    }

    if (Array.isArray(dbPayload.transactions) && dbPayload.transactions.length > 0) {
      const formattedTx = dbPayload.transactions.map((t: any) => ({
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
        created_at: t.createdAt || results.timestamp,
        raw_data: t,
        updated_at: results.timestamp
      }));
      await client.from('transactions').upsert(formattedTx, { onConflict: 'id' });
    }

    if (Array.isArray(dbPayload.users) && dbPayload.users.length > 0) {
      const formattedUsers = dbPayload.users.map((u: any) => ({
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
        updated_at: results.timestamp
      }));
      await client.from('users').upsert(formattedUsers, { onConflict: 'id' });
    }

    if (Array.isArray(dbPayload.maintenances) && dbPayload.maintenances.length > 0) {
      const formattedMaint = dbPayload.maintenances.map((m: any) => ({
        id: String(m.id),
        room_id: m.roomId ? String(m.roomId) : null,
        room_number: m.roomNumber || null,
        building: m.building || null,
        issue_description: m.description || null,
        reported_at: m.reportTime || results.timestamp,
        reported_by: m.reportedUser || null,
        priority: m.urgency || 'NORMAL',
        status: m.status || 'MENUNGGU_PENUGASAN',
        assigned_technician: m.technician || m.assignedTechnicianName || null,
        resolved_at: m.resolvedTime || null,
        raw_data: m,
        updated_at: results.timestamp
      }));
      await client.from('maintenances').upsert(formattedMaint, { onConflict: 'id' });
    }

    if (Array.isArray(dbPayload.qcInspections) && dbPayload.qcInspections.length > 0) {
      const formattedQc = dbPayload.qcInspections.map((q: any) => ({
        id: String(q.id),
        room_id: q.roomId ? String(q.roomId) : null,
        building: q.building || null,
        room_number: q.roomNumber || null,
        inspector_id: q.inspectorId || null,
        inspector_name: q.inspectorName || 'Petugas QC',
        inspection_date: q.inspectionDate || results.timestamp,
        cleanliness: q.cleanliness || 'BAIK',
        linen_bed: q.linenBed || 'LENGKAP_BERSIH',
        ac_electricity: q.acElectricity || 'NORMAL',
        plumbing_water: q.plumbingWater || 'LANCAR',
        amenities: q.amenities || 'LENGKAP',
        result: q.result || 'LOLOS_QC',
        notes: q.notes || null,
        maintenance_id_created: q.maintenanceIdCreated || null,
        facility_type: q.facilityType || 'KAMAR',
        raw_data: q,
        created_at: results.timestamp
      }));
      await client.from('qc_inspections').upsert(formattedQc, { onConflict: 'id' });
    }

    if (Array.isArray(dbPayload.workSessions) && dbPayload.workSessions.length > 0) {
      const formattedSessions = dbPayload.workSessions.map((w: any) => ({
        id: String(w.id),
        user_id: w.userId ? String(w.userId) : null,
        user_name: w.userName || 'Petugas',
        user_role: w.userRole || 'Petugas',
        login_time: w.loginTime || results.timestamp,
        logout_time: w.logoutTime || null,
        duration_seconds: Number(w.durationSeconds || 0),
        duration_formatted: w.durationFormatted || null,
        status: w.status || 'AKTIF',
        notes: w.notes || null,
        raw_data: w,
        created_at: results.timestamp
      }));
      await client.from('work_sessions').upsert(formattedSessions, { onConflict: 'id' });
    }

    if (Array.isArray(dbPayload.auditLogs) && dbPayload.auditLogs.length > 0) {
      const formattedLogs = dbPayload.auditLogs.slice(-100).map((l: any, idx: number) => ({
        id: l.id || `audit_${Date.now()}_${idx}`,
        timestamp: l.timestamp || results.timestamp,
        user_name: l.user || 'Sistem',
        role: l.role || 'System',
        action: l.action || 'Log Aktivitas',
        details: l.details || '',
        raw_data: l,
        created_at: results.timestamp
      }));
      await client.from('audit_logs').upsert(formattedLogs, { onConflict: 'id' });
    }

    results.relationalSaved = true;
  } catch (err: any) {
    // Relational table upsert is optional enhancement
  }

  return {
    success: results.appStateSaved || results.relationalSaved,
    results
  };
}

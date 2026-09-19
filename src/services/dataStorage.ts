import { User, Room, Transaction, Maintenance, AuditLog, WorkSession, QcInspection, ChatChannel, ChatMessage } from '../types';
import { 
  initialUsers, 
  getInitialRooms, 
  initialTransactions, 
  initialMaintenances, 
  initialAuditLogs, 
  initialWorkSessions, 
  initialQcInspections 
} from '../data';
import { initialChatChannels, initialChatMessages } from '../chatData';
import { getRealTodayDate } from '../lib/utils';

export type StorageNamespace = 'LOCAL' | 'PROD' | 'DEMO';

export const LOCAL_STORAGE_KEY = 'UPT_ASRAMA_HAJI_LOCAL_DATABASE_V1';
export const LEGACY_DEMO_STORAGE_KEY = 'UPT_ASRAMA_HAJI_DATABASE_V2';

export interface AppSettings {
  organizationName: string;
  subTitle: string;
  ministryName: string;
  address: string;
  phone: string;
  email: string;
  portalUrl: string;
}

export interface CompleteStorageDatabase {
  schemaVersion: number;
  appName: string;
  exportedAt: string;
  appSettings: AppSettings;
  users: User[];
  rooms: Room[];
  transactions: Transaction[];
  maintenances: Maintenance[];
  qcInspections: QcInspection[];
  workSessions: WorkSession[];
  auditLogs: AuditLog[];
  chatChannels: ChatChannel[];
  chatMessages: ChatMessage[];
}

export const defaultAppSettings: AppSettings = {
  organizationName: 'UPT ASRAMA HAJI JAKARTA',
  subTitle: 'Sistem Informasi Manajemen Operasional Terpadu & Hunian',
  ministryName: 'KEMENTERIAN HAJI DAN UMRAH REPUBLIK INDONESIA',
  address: 'Jl. Raya Hankam, Pinang Ranti, Kec. Makasar, Kota Jakarta Timur, DKI Jakarta 13810',
  phone: '(021) 8094444',
  email: 'asramahaji.jakarta@haji.go.id',
  portalUrl: 'https://haji.go.id'
};

function generateInitialDatabase(): CompleteStorageDatabase {
  const today = getRealTodayDate();
  const normalizedTransactions = initialTransactions.map(t => {
    if (t.building === 'Ruang Pertemuan' && t.startDate < today && t.status !== 'DIBATALKAN') {
      return { ...t, status: 'SELESAI' as const };
    }
    return t;
  });

  return {
    schemaVersion: 2,
    appName: 'SIM-Akomodasi UPT Asrama Haji Jakarta',
    exportedAt: new Date().toISOString(),
    appSettings: { ...defaultAppSettings },
    users: [...initialUsers],
    rooms: getInitialRooms(),
    transactions: normalizedTransactions,
    maintenances: [...initialMaintenances],
    qcInspections: [...initialQcInspections],
    workSessions: [...initialWorkSessions],
    auditLogs: [...initialAuditLogs],
    chatChannels: [...initialChatChannels],
    chatMessages: [...initialChatMessages]
  };
}

export class DataStorageService {
  private cache: CompleteStorageDatabase | null = null;

  constructor() {
    this.getDatabase();
  }

  public getNamespace(): StorageNamespace {
    return 'LOCAL';
  }

  public isProd(): boolean {
    return false;
  }

  public isDemo(): boolean {
    return false;
  }

  public getLastSyncTime(): string | null {
    return null;
  }

  public async hydrateFromServer(_ns?: any): Promise<CompleteStorageDatabase | null> {
    return null;
  }

  public setNamespace(_ns: any): CompleteStorageDatabase {
    return this.getDatabase();
  }

  public getStorageKey(): string {
    return LOCAL_STORAGE_KEY;
  }

  public getDatabase(_ns?: any): CompleteStorageDatabase {
    if (this.cache) {
      return this.cache;
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Try current local key, fallback to legacy key if exists
        let stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!stored) {
          stored = window.localStorage.getItem(LEGACY_DEMO_STORAGE_KEY);
        }

        if (stored) {
          const parsed = JSON.parse(stored) as CompleteStorageDatabase;
          if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.rooms) && Array.isArray(parsed.transactions)) {
            // Clean out any leftover 'zain' user if present in storage
            parsed.users = parsed.users.filter(u => u.username.toLowerCase() !== 'zain');
            this.cache = parsed;
            return this.cache;
          }
        }
      }
    } catch (e) {
      console.warn('Gagal membaca database dari localStorage, menggunakan seed awal:', e);
    }

    const initDb = generateInitialDatabase();
    this.cache = initDb;
    this.saveDatabase(initDb);
    return initDb;
  }

  public saveDatabase(db: CompleteStorageDatabase, _ns?: any): void {
    const updated: CompleteStorageDatabase = {
      ...db,
      users: db.users.filter(u => u.username.toLowerCase() !== 'zain'),
      exportedAt: new Date().toISOString()
    };

    this.cache = updated;

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Gagal menyimpan database ke localStorage:', e);
    }
  }

  // ==========================================
  // MANAJEMEN PENGGUNA (CRUD)
  // ==========================================
  public getUsers(): User[] {
    return this.getDatabase().users;
  }

  public getUserById(id: string): User | undefined {
    return this.getDatabase().users.find(u => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    return this.getDatabase().users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  public saveUser(user: User): User {
    const db = this.getDatabase();
    const existingIndex = db.users.findIndex(u => u.id === user.id);
    let updatedUsers: User[];

    if (existingIndex >= 0) {
      updatedUsers = [...db.users];
      updatedUsers[existingIndex] = { ...updatedUsers[existingIndex], ...user };
    } else {
      updatedUsers = [user, ...db.users];
    }

    this.saveDatabase({ ...db, users: updatedUsers });
    return user;
  }

  public updateUser(userId: string, updates: Partial<User>): User | null {
    const db = this.getDatabase();
    const idx = db.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;

    const updatedUser = { ...db.users[idx], ...updates };
    const newUsers = [...db.users];
    newUsers[idx] = updatedUser;

    this.saveDatabase({ ...db, users: newUsers });
    return updatedUser;
  }

  public toggleUserStatus(userId: string): User | null {
    const db = this.getDatabase();
    const idx = db.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;

    const currentStatus = db.users[idx].status;
    const newStatus = currentStatus === 'Aktif' ? 'Non-Aktif' : 'Aktif';
    const updatedUser = { ...db.users[idx], status: newStatus };

    const newUsers = [...db.users];
    newUsers[idx] = updatedUser;

    this.saveDatabase({ ...db, users: newUsers });
    return updatedUser;
  }

  public deleteUser(userId: string): boolean {
    const db = this.getDatabase();
    const initialLen = db.users.length;
    const newUsers = db.users.filter(u => u.id !== userId);

    if (newUsers.length === initialLen) return false;

    this.saveDatabase({ ...db, users: newUsers });
    return true;
  }

  // ==========================================
  // MANAJEMEN KAMAR & AULA
  // ==========================================
  public getRooms(): Room[] {
    return this.getDatabase().rooms;
  }

  public getRoomById(roomId: string): Room | undefined {
    return this.getDatabase().rooms.find(r => r.id === roomId);
  }

  public updateRoom(roomId: string, updates: Partial<Room>): Room | null {
    const db = this.getDatabase();
    const idx = db.rooms.findIndex(r => r.id === roomId);
    if (idx === -1) return null;

    const updated = { ...db.rooms[idx], ...updates };
    const newRooms = [...db.rooms];
    newRooms[idx] = updated;

    this.saveDatabase({ ...db, rooms: newRooms });
    return updated;
  }

  public saveRoom(room: Room): Room {
    const db = this.getDatabase();
    const idx = db.rooms.findIndex(r => r.id === room.id);
    let newRooms: Room[];

    if (idx >= 0) {
      newRooms = [...db.rooms];
      newRooms[idx] = room;
    } else {
      newRooms = [...db.rooms, room];
    }

    this.saveDatabase({ ...db, rooms: newRooms });
    return room;
  }

  // ==========================================
  // MANAJEMEN TRANSAKSI & BOOKING
  // ==========================================
  public getTransactions(): Transaction[] {
    return this.getDatabase().transactions;
  }

  public getTransactionById(txId: string): Transaction | undefined {
    return this.getDatabase().transactions.find(t => t.id === txId);
  }

  public saveTransaction(tx: Transaction): Transaction {
    const db = this.getDatabase();
    const idx = db.transactions.findIndex(t => t.id === tx.id);
    let newTxList: Transaction[];

    if (idx >= 0) {
      newTxList = [...db.transactions];
      newTxList[idx] = tx;
    } else {
      newTxList = [tx, ...db.transactions];
    }

    this.saveDatabase({ ...db, transactions: newTxList });
    return tx;
  }

  public updateTransaction(txId: string, updates: Partial<Transaction>): Transaction | null {
    const db = this.getDatabase();
    const idx = db.transactions.findIndex(t => t.id === txId);
    if (idx === -1) return null;

    const updated = { ...db.transactions[idx], ...updates };
    const newTxList = [...db.transactions];
    newTxList[idx] = updated;

    this.saveDatabase({ ...db, transactions: newTxList });
    return updated;
  }

  // ==========================================
  // PEMELIHARAAN / SARPRAS / MAINTENANCE
  // ==========================================
  public getMaintenances(): Maintenance[] {
    return this.getDatabase().maintenances;
  }

  public saveMaintenance(m: Maintenance): Maintenance {
    const db = this.getDatabase();
    const idx = db.maintenances.findIndex(item => item.id === m.id);
    let newMaints: Maintenance[];

    if (idx >= 0) {
      newMaints = [...db.maintenances];
      newMaints[idx] = m;
    } else {
      newMaints = [m, ...db.maintenances];
    }

    this.saveDatabase({ ...db, maintenances: newMaints });
    return m;
  }

  public updateMaintenance(id: string, updates: Partial<Maintenance>): Maintenance | null {
    const db = this.getDatabase();
    const idx = db.maintenances.findIndex(m => m.id === id);
    if (idx === -1) return null;

    const updated = { ...db.maintenances[idx], ...updates };
    const newMaints = [...db.maintenances];
    newMaints[idx] = updated;

    this.saveDatabase({ ...db, maintenances: newMaints });
    return updated;
  }

  // ==========================================
  // QUALITY CONTROL (QC)
  // ==========================================
  public getQcInspections(): QcInspection[] {
    return this.getDatabase().qcInspections;
  }

  public saveQcInspection(qc: QcInspection): QcInspection {
    const db = this.getDatabase();
    const idx = db.qcInspections.findIndex(item => item.id === qc.id);
    let newList: QcInspection[];

    if (idx >= 0) {
      newList = [...db.qcInspections];
      newList[idx] = qc;
    } else {
      newList = [qc, ...db.qcInspections];
    }

    this.saveDatabase({ ...db, qcInspections: newList });
    return qc;
  }

  // ==========================================
  // SESI KERJA (WORK SESSIONS)
  // ==========================================
  public getWorkSessions(): WorkSession[] {
    return this.getDatabase().workSessions;
  }

  public saveWorkSession(s: WorkSession): WorkSession {
    const db = this.getDatabase();
    const idx = db.workSessions.findIndex(item => item.id === s.id);
    let newList: WorkSession[];

    if (idx >= 0) {
      newList = [...db.workSessions];
      newList[idx] = s;
    } else {
      newList = [s, ...db.workSessions];
    }

    this.saveDatabase({ ...db, workSessions: newList });
    return s;
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  public getAuditLogs(): AuditLog[] {
    return this.getDatabase().auditLogs;
  }

  public addAuditLog(entry: AuditLog): void {
    const db = this.getDatabase();
    this.saveDatabase({
      ...db,
      auditLogs: [entry, ...db.auditLogs]
    });
  }

  // ==========================================
  // CHAT & KOORDINASI
  // ==========================================
  public getChatChannels(): ChatChannel[] {
    return this.getDatabase().chatChannels;
  }

  public getChatMessages(): ChatMessage[] {
    return this.getDatabase().chatMessages;
  }

  public saveChatMessage(msg: ChatMessage): ChatMessage {
    const db = this.getDatabase();
    const newMessages = [...db.chatMessages, msg];
    this.saveDatabase({ ...db, chatMessages: newMessages });
    return msg;
  }

  // ==========================================
  // PENGATURAN APLIKASI
  // ==========================================
  public getAppSettings(): AppSettings {
    return this.getDatabase().appSettings || defaultAppSettings;
  }

  public updateAppSettings(updates: Partial<AppSettings>): AppSettings {
    const db = this.getDatabase();
    const newSettings: AppSettings = {
      ...this.getAppSettings(),
      ...updates
    };
    this.saveDatabase({ ...db, appSettings: newSettings });
    return newSettings;
  }

  // ==========================================
  // CADANGAN & PEMULIHAN (BACKUP & RESTORE)
  // ==========================================
  public exportDatabaseAsJson(): string {
    const db = this.getDatabase();
    return JSON.stringify(db, null, 2);
  }

  public downloadBackupFile(customFilename?: string, _ns?: any): void {
    const jsonStr = this.exportDatabaseAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    const defaultName = `UPT_Asrama_Haji_Jakarta_Backup_${timestamp}.json`;
    a.href = url;
    a.download = customFilename || defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public importDatabaseFromJson(jsonStr: string, _ns?: any): { 
    success: boolean; 
    message: string; 
    countSummary?: Record<string, number> 
  } {
    try {
      const parsed = JSON.parse(jsonStr) as Partial<CompleteStorageDatabase>;
      if (!parsed) {
        return { success: false, message: 'Format berkas JSON tidak valid atau kosong.' };
      }

      if (!Array.isArray(parsed.users) || !Array.isArray(parsed.rooms) || !Array.isArray(parsed.transactions)) {
        return { 
          success: false, 
          message: 'Struktur database tidak lengkap. Wajib memiliki data users, rooms, dan transactions.' 
        };
      }

      const validatedDb: CompleteStorageDatabase = {
        schemaVersion: parsed.schemaVersion || 2,
        appName: parsed.appName || 'SIM-Akomodasi UPT Asrama Haji Jakarta',
        exportedAt: new Date().toISOString(),
        appSettings: parsed.appSettings || { ...defaultAppSettings },
        users: parsed.users.filter(u => u.username.toLowerCase() !== 'zain'),
        rooms: parsed.rooms,
        transactions: parsed.transactions,
        maintenances: Array.isArray(parsed.maintenances) ? parsed.maintenances : [],
        qcInspections: Array.isArray(parsed.qcInspections) ? parsed.qcInspections : [],
        workSessions: Array.isArray(parsed.workSessions) ? parsed.workSessions : [],
        auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
        chatChannels: Array.isArray(parsed.chatChannels) ? parsed.chatChannels : [...initialChatChannels],
        chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [...initialChatMessages]
      };

      this.saveDatabase(validatedDb);

      return {
        success: true,
        message: 'Basis data berhasil dipulihkan secara penuh ke penyimpanan lokal sistem.',
        countSummary: {
          users: validatedDb.users.length,
          rooms: validatedDb.rooms.length,
          transactions: validatedDb.transactions.length,
          maintenances: validatedDb.maintenances.length,
          qcInspections: validatedDb.qcInspections.length,
          auditLogs: validatedDb.auditLogs.length
        }
      };
    } catch (err: any) {
      return { 
        success: false, 
        message: `Terjadi kegagalan parsing JSON: ${err?.message || 'Format tidak valid'}` 
      };
    }
  }

  public resetDatabaseToDefaults(_ns?: any): CompleteStorageDatabase {
    const initDb = generateInitialDatabase();
    this.saveDatabase(initDb);
    return initDb;
  }

  public async checkSupabaseStatus(): Promise<{
    connected: boolean;
    project: { id: string; name: string; url: string; dashboardSqlUrl: string };
    tablesReady: boolean;
    tablesFound: string[];
    missingTables: string[];
    connectionError: string | null;
  }> {
    try {
      const res = await fetch('/api/supabase/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return {
        connected: false,
        project: {
          id: 'bmznfrxllzxamwwqwdjn',
          name: 'zainulsyaifun45',
          url: 'https://bmznfrxllzxamwwqwdjn.supabase.co',
          dashboardSqlUrl: 'https://supabase.com/dashboard/project/bmznfrxllzxamwwqwdjn/sql/new'
        },
        tablesReady: false,
        tablesFound: [],
        missingTables: ['app_state'],
        connectionError: err?.message || 'Gagal menghubungi server proxy backend'
      };
    }
  }

  public async getSupabaseSql(): Promise<{ projectId: string; projectName: string; sql: string }> {
    try {
      const res = await fetch('/api/supabase/sql');
      return await res.json();
    } catch (err) {
      return {
        projectId: 'bmznfrxllzxamwwqwdjn',
        projectName: 'zainulsyaifun45',
        sql: '-- Gagal memuat skrip'
      };
    }
  }

  public async syncWithSupabase(dbPayload?: CompleteStorageDatabase): Promise<{ success: boolean; message: string; data?: any }> {
    const dataToSync = dbPayload || this.getDatabase();
    try {
      const res = await fetch('/api/supabase/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSync)
      });
      const json = await res.json();
      if (json.success) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('SIM_HAJI_LAST_SUPABASE_SYNC', new Date().toISOString());
        }
        return {
          success: true,
          message: 'Sinkronisasi ke basis data Supabase (zainulsyaifun45) berhasil!',
          data: json
        };
      } else {
        return {
          success: false,
          message: json.results?.error || json.message || 'Tabel Supabase belum diinisialisasi.',
          data: json
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: `Koneksi gagal: ${err?.message || 'Server backend tidak dapat dihubungi'}`
      };
    }
  }

  public async fetchFromSupabase(): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch('/api/supabase/data');
      const json = await res.json();
      if (json.success && json.data) {
        return { success: true, data: json.data, message: 'Data berhasil ditarik dari Supabase' };
      }
      return { success: false, message: json.message || 'Data Supabase belum tersedia' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Gagal mengambil data dari Supabase' };
    }
  }

  public getLastSupabaseSync(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem('SIM_HAJI_LAST_SUPABASE_SYNC');
    }
    return null;
  }

  public async syncWithOnlineServer(_endpoint?: string): Promise<{ success: boolean; message: string; data?: any }> {
    return this.syncWithSupabase();
  }
}

export const dataStorage = new DataStorageService();

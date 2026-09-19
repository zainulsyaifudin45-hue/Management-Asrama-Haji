import type { IncomingMessage, ServerResponse } from 'http';
import { 
  checkSupabaseStatus, 
  fetchSupabaseData, 
  saveSupabaseData, 
  SUPABASE_SQL_INIT_SCRIPT, 
  SUPABASE_CONFIG 
} from '../server/supabase';

// Helper to set permissive CORS headers on Vercel
function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Helper to parse JSON body on serverless request
async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export default async function handler(req: IncomingMessage & { query?: any; body?: any }, res: ServerResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname.replace(/\/+$/, '');

  res.setHeader('Content-Type', 'application/json');

  try {
    if (pathname === '/api/health' || pathname === '/api') {
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 'ok', service: 'vercel-supabase-bridge' }));
      return;
    }

    if (pathname === '/api/supabase/status') {
      const status = await checkSupabaseStatus();
      res.statusCode = 200;
      res.end(JSON.stringify(status));
      return;
    }

    if (pathname === '/api/supabase/sql') {
      res.statusCode = 200;
      res.end(JSON.stringify({
        projectId: SUPABASE_CONFIG.projectId,
        projectName: SUPABASE_CONFIG.projectName,
        sql: SUPABASE_SQL_INIT_SCRIPT
      }));
      return;
    }

    if (pathname === '/api/supabase/data') {
      const data = await fetchSupabaseData();
      res.statusCode = 200;
      res.end(JSON.stringify(data));
      return;
    }

    if (pathname === '/api/supabase/sync' && req.method === 'POST') {
      const payload = req.body || await parseJsonBody(req);
      const result = await saveSupabaseData(payload);
      res.statusCode = 200;
      res.end(JSON.stringify(result));
      return;
    }

    // Not found
    res.statusCode = 404;
    res.end(JSON.stringify({ error: `Route not found: ${pathname}` }));
  } catch (err: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: err?.message || 'Serverless Execution Error' }));
  }
}

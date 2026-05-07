import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ENTITIES = [
  'Child',
  'Family',
  'BehaviorPlan',
  'BehaviorLog',
  'Document',
  'InterventionPlan',
  'Message',
  'RewardToken',
  'AIConversation',
];

async function getFirestoreToken(clientEmail, privateKey, projectId) {
  console.log('getFirestoreToken called, key length:', privateKey?.length);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore',
  };

  const encode = (obj) => btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${encode(header)}.${encode(payload)}`;

  // Import the private key
  // Handle both literal \n and real newlines, plus any extra whitespace
  const normalizedKey = privateKey
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .trim();
  const pemContents = normalizedKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/[^A-Za-z0-9+/=]/g, ''); // Strip anything that isn't valid base64
  console.log('PEM length:', pemContents.length, 'first 20:', pemContents.substring(0, 20), 'last 20:', pemContents.slice(-20));
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signingInput}.${sigBase64}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
  return tokenData.access_token;
}

async function writeToFirestore(accessToken, projectId, collection, docId, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;

  // Convert data to Firestore format
  const fields = {};
  for (const [key, val] of Object.entries(data)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (typeof val === 'number') {
      fields[key] = { doubleValue: val };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'object') {
      fields[key] = { stringValue: JSON.stringify(val) };
    }
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Firestore write error for ${collection}/${docId}: ${err}`);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');
    const clientEmail = Deno.env.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = Deno.env.get('FIREBASE_PRIVATE_KEY');

    if (!projectId || !clientEmail || !privateKey) {
      return Response.json({ error: 'Missing Firebase credentials' }, { status: 500 });
    }

    console.log('Calling getFirestoreToken...');
    const accessToken = await getFirestoreToken(clientEmail, privateKey, projectId);
    console.log('Got access token');

    const results = {};

    for (const entityName of ENTITIES) {
      try {
        // Fetch all records - paginate with large limit
        const records = await base44.asServiceRole.entities[entityName].list(null, 1000);
        const collection = entityName.charAt(0).toLowerCase() + entityName.slice(1) + 's';
        let count = 0;
        let errors = 0;

        for (const record of records) {
          try {
            await writeToFirestore(accessToken, projectId, collection, record.id, record);
            count++;
          } catch (e) {
            console.error(`Failed to write ${entityName} ${record.id}:`, e.message);
            errors++;
          }
        }

        results[entityName] = { migrated: count, errors, collection };
      } catch (e) {
        results[entityName] = { error: e.message };
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('Top-level error:', error.message, error.stack);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// Execute the real server module while replacing only explicit I/O boundaries.
// This loader initializes no Firebase client. Callers supply controlled doubles
// or explicitly guarded emulator SDKs; never supply production write adapters.
export async function loadServerModule(relativePath, mocks) {
  const registryKey = `s1-test-${randomUUID()}`;
  globalThis[registryKey] = mocks;
  const file = new URL(relativePath, import.meta.url);
  let source = await readFile(file, 'utf8');
  const imports = [...source.matchAll(/(?:from\s*|import\s*)(['"])([^'"]+)\1/g)];
  for (const match of imports) {
    const specifier = match[2];
    let target;
    if (Object.hasOwn(mocks, specifier)) {
      const values = mocks[specifier];
      const mockSource = Object.keys(values).map((key) => `${key === 'default' ? 'export default ' : `export const ${key}=`}globalThis[${JSON.stringify(registryKey)}][${JSON.stringify(specifier)}][${JSON.stringify(key)}];`).join('\n');
      target = `data:text/javascript,${encodeURIComponent(mockSource)}`;
    } else if (specifier.startsWith('.')) {
      target = new URL(specifier, file).href;
    } else throw new Error(`Unmocked external module ${specifier}`);
    source = source.replace(match[0], match[0].replace(specifier, target));
  }
  try { return await import(`data:text/javascript,${encodeURIComponent(source)}#${registryKey}`); }
  finally { delete globalThis[registryKey]; }
}

export function memoryFirestore(initial = {}) {
  let rows = new Map(Object.entries(structuredClone(initial))), queue = Promise.resolve();
  const snapshot = (key, data = rows) => ({
    id: key.split('/').at(-1), exists: data.has(key),
    data: () => structuredClone(data.get(key)),
    get: (field) => field.split('.').reduce((value, part) => value?.[part], data.get(key)),
  });
  const reference = (key) => ({ key, id: key.split('/').at(-1), get: async () => snapshot(key) });
  const db = {
    collection: (name) => ({ doc: (id) => reference(`${name}/${id}`) }),
    doc: reference,
    getAll: async (...refs) => refs.map((ref) => snapshot(ref.key)),
    runTransaction(work) {
      const task = queue.then(async () => {
        const draft = new Map(structuredClone([...rows]));
        let writing = false;
        const tx = {
          async get(ref) { if (writing) throw new Error('Transaction read after write'); return snapshot(ref.key, draft); },
          create(ref, value) { writing = true; if (draft.has(ref.key)) throw new Error('already exists'); draft.set(ref.key, structuredClone(value)); },
          set(ref, value, options = {}) { writing = true; draft.set(ref.key, structuredClone(options.merge ? { ...draft.get(ref.key), ...value } : value)); },
          update(ref, value) { writing = true; if (!draft.has(ref.key)) throw new Error('not found'); draft.set(ref.key, { ...draft.get(ref.key), ...structuredClone(value) }); },
          delete(ref) { writing = true; draft.delete(ref.key); },
        };
        const result = await work(tx);
        rows = draft;
        return result;
      });
      queue = task.catch(() => {});
      return task;
    },
  };
  return { db, rows: () => Object.fromEntries(structuredClone([...rows])) };
}

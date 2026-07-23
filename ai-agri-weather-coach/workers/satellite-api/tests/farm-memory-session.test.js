import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../../../js/farm-memory-session.js", import.meta.url), "utf8");

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    snapshot() {
      return Object.fromEntries(values);
    }
  };
}

function loadRepository(initial = {}) {
  const localStorage = createStorage(initial);
  const window = { localStorage };
  const context = vm.createContext({ window, localStorage, structuredClone, Date, JSON, Object, Array, Set });
  vm.runInContext(source, context, { filename: "farm-memory-session.js" });
  return { repository: window.AIAKOSFarmMemoryNdviSessions, localStorage };
}

function validInput(patch = {}) {
  const input = {
    field: {
      id: "field-001",
      name: "示範田",
      crop: "稻米",
      variety: "台稉九號",
      geometry: {
        type: "Polygon",
        coordinates: [[[120.1, 23.1], [120.2, 23.1], [120.2, 23.2], [120.1, 23.1]]]
      }
    },
    observation: {
      date: "2026-07-08",
      platform: "Sentinel-2C",
      cloudCoverage: 7.4,
      productId: "S2C_PRODUCT_001",
      processingLevel: "L2A"
    },
    statistics: {
      mean: 0.62,
      min: 0.11,
      max: 0.91,
      stDev: 0.12,
      validPixelRatio: 0.96,
      sampleCount: 960,
      noDataCount: 40
    },
    interpretation: {
      status: "healthy",
      patrolPriority: "normal",
      risk: "low",
      recommendation: "持續觀察"
    },
    image: {
      source: "Sentinel-2-L2A",
      width: 768,
      height: 768,
      canRegenerate: true
    }
  };
  return { ...input, ...patch };
}

test("creates a valid NDVI session with schema and ISO timestamps", () => {
  const { repository } = loadRepository();
  const session = repository.createNdviSession(validInput());
  assert.equal(repository.validateNdviSession(session).valid, true);
  assert.equal(session.schemaVersion, "1.0");
  assert.match(session.createdAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("rejects a session missing required fields", () => {
  const { repository } = loadRepository();
  const session = repository.createNdviSession({});
  assert.equal(repository.validateNdviSession(session).valid, false);
});

test("rejects unsupported geometry and accepts MultiPolygon", () => {
  const { repository } = loadRepository();
  const invalid = repository.createNdviSession(validInput({
    field: { ...validInput().field, geometry: { type: "Point", coordinates: [120, 23] } }
  }));
  assert.equal(repository.validateNdviSession(invalid).valid, false);

  const multi = repository.createNdviSession(validInput({
    field: {
      ...validInput().field,
      geometry: { type: "MultiPolygon", coordinates: [[validInput().field.geometry.coordinates]] }
    }
  }));
  assert.equal(repository.validateNdviSession(multi).valid, true);
});

test("rejects NDVI mean outside -1 through 1", () => {
  const { repository } = loadRepository();
  const session = repository.createNdviSession(validInput({
    statistics: { ...validInput().statistics, mean: 1.01 }
  }));
  assert.equal(repository.validateNdviSession(session).valid, false);
});

test("rejects invalid observation dates", () => {
  const { repository } = loadRepository();
  for (const date of ["2026/07/08", "2026-02-30"]) {
    const session = repository.createNdviSession(validInput({
      observation: { ...validInput().observation, date }
    }));
    assert.equal(repository.validateNdviSession(session).valid, false);
  }
});

test("saves and reads sessions through the new storage key", () => {
  const { repository, localStorage } = loadRepository();
  const session = repository.createNdviSession(validInput());
  repository.saveNdviSession(session);
  assert.equal(repository.getNdviSessions().length, 1);
  assert.ok(localStorage.snapshot()[repository.STORAGE_KEY]);
});

test("deep clones input, saved values, and returned values", () => {
  const { repository } = loadRepository();
  const input = validInput();
  const session = repository.createNdviSession(input);
  input.field.geometry.coordinates[0][0][0] = 0;
  assert.equal(session.field.geometry.coordinates[0][0][0], 120.1);

  const saved = repository.saveNdviSession(session);
  saved.field.name = "外部修改";
  const result = repository.getNdviSessions();
  result[0].field.name = "再次修改";
  assert.equal(repository.getNdviSessions()[0].field.name, "示範田");
});

test("finds a session by sessionId", () => {
  const { repository } = loadRepository();
  const saved = repository.saveNdviSession(repository.createNdviSession(validInput()));
  assert.equal(repository.getNdviSessionById(saved.sessionId).observation.productId, "S2C_PRODUCT_001");
  assert.equal(repository.getNdviSessionById("missing"), null);
});

test("deletes one session without removing another", () => {
  const { repository } = loadRepository();
  const first = repository.saveNdviSession(repository.createNdviSession(validInput()));
  repository.saveNdviSession(repository.createNdviSession(validInput({
    field: { ...validInput().field, id: "field-002", name: "第二田" },
    observation: { ...validInput().observation, productId: "S2C_PRODUCT_002" }
  })));
  assert.equal(repository.deleteNdviSession(first.sessionId), true);
  assert.equal(repository.getNdviSessions().length, 1);
});

test("clears all NDVI sessions", () => {
  const { repository } = loadRepository();
  repository.saveNdviSession(repository.createNdviSession(validInput()));
  assert.equal(repository.clearAllNdviSessions(), true);
  assert.equal(repository.getNdviSessions().length, 0);
});

test("does not append a duplicate sessionId", () => {
  const { repository } = loadRepository();
  const session = repository.createNdviSession(validInput());
  repository.saveNdviSession(session);
  repository.saveNdviSession({ ...session, interpretation: { ...session.interpretation, status: "reviewed" } });
  assert.equal(repository.getNdviSessions().length, 1);
  assert.equal(repository.getNdviSessions()[0].interpretation.status, "reviewed");
});

test("does not append duplicate fieldId and productId", () => {
  const { repository } = loadRepository();
  const first = repository.createNdviSession(validInput());
  repository.saveNdviSession(first);
  const duplicate = repository.createNdviSession(validInput());
  repository.saveNdviSession(duplicate);
  const sessions = repository.getNdviSessions();
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].sessionId, first.sessionId);
});

test("recovers safely from malformed storage JSON", () => {
  const key = "aiaikosFarmMemoryNdviSessionsV1";
  const { repository } = loadRepository({ [key]: "{not-json" });
  assert.deepEqual(repository.getNdviSessions(), []);
});

test("skips a damaged session while retaining valid sessions", () => {
  const { repository } = loadRepository();
  const valid = repository.createNdviSession(validInput());
  const migrated = repository.migrateNdviSessions(JSON.stringify([{ broken: true }, valid]));
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].sessionId, valid.sessionId);
});

test("rejects Blob URLs, Base64 images, secrets, and tokens", () => {
  const { repository } = loadRepository();
  for (const patch of [
    { blobUrl: "blob:https://example.test/id" },
    { imageData: "data:image/png;base64,AAAA" },
    { client_secret: "do-not-store" },
    { access_token: "do-not-store" }
  ]) {
    const session = { ...repository.createNdviSession(validInput()), ...patch };
    assert.equal(repository.validateNdviSession(session).valid, false);
    assert.throws(() => repository.saveNdviSession(session));
  }
});

test("does not alter existing localStorage keys", () => {
  const existing = {
    aiaikosFieldsV1: '[{"id":"field-existing"}]',
    aiaikosNdviRecords: '[{"mean":0.4}]',
    aiaikosSelectedFieldId: "field-existing"
  };
  const { repository, localStorage } = loadRepository(existing);
  repository.saveNdviSession(repository.createNdviSession(validInput()));
  repository.clearAllNdviSessions();
  const snapshot = localStorage.snapshot();
  assert.equal(snapshot.aiaikosFieldsV1, existing.aiaikosFieldsV1);
  assert.equal(snapshot.aiaikosNdviRecords, existing.aiaikosNdviRecords);
  assert.equal(snapshot.aiaikosSelectedFieldId, existing.aiaikosSelectedFieldId);
});

test("generates distinct IDs for the same field and date", () => {
  const { repository } = loadRepository();
  const first = repository.generateNdviSessionId("field-001", "2026-07-08");
  const second = repository.generateNdviSessionId("field-001", "2026-07-08");
  assert.notEqual(first, second);
  assert.match(first, /^ndvi-field-001-2026-07-08-/);
});

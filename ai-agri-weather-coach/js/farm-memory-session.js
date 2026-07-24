(function initializeFarmMemoryNdviSessions(global) {
  "use strict";

  const SCHEMA_VERSION = "1.0";
  const STORAGE_KEY = "aiaikosFarmMemoryNdviSessionsV1";
  let idSequence = 0;

  function deepClone(value) {
    if (value === undefined) return undefined;
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isFiniteNumber(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function isIsoDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }

  function isIsoDateTime(value) {
    if (typeof value !== "string") return false;
    const parsed = new Date(value);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
  }

  function hasValidGeometry(geometry) {
    if (!isPlainObject(geometry) || !["Polygon", "MultiPolygon"].includes(geometry.type)) return false;
    return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 0;
  }

  function containsForbiddenData(value, key = "") {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (["clientsecret", "accesstoken", "refreshtoken", "authorization", "token", "secret", "bloburl", "base64"].includes(normalizedKey)) {
      return true;
    }
    if (typeof value === "string") {
      return value.startsWith("blob:") || /^data:image\/[^;]+;base64,/i.test(value);
    }
    if (Array.isArray(value)) return value.some(item => containsForbiddenData(item));
    if (isPlainObject(value)) {
      return Object.entries(value).some(([childKey, childValue]) => containsForbiddenData(childValue, childKey));
    }
    return false;
  }

  function sanitizeIdPart(value) {
    const normalized = String(value || "field")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized || "field";
  }

  function generateNdviSessionId(fieldId, observationDate) {
    idSequence = (idSequence + 1) % 1000000;
    const suffix = `${Date.now().toString(36)}-${idSequence.toString(36)}`;
    return `ndvi-${sanitizeIdPart(fieldId)}-${sanitizeIdPart(observationDate)}-${suffix}`;
  }

  function createNdviSession(input) {
    const source = isPlainObject(input) ? deepClone(input) : {};
    const now = new Date().toISOString();
    const field = isPlainObject(source.field) ? source.field : {};
    const observation = isPlainObject(source.observation) ? source.observation : {};
    const statistics = isPlainObject(source.statistics) ? source.statistics : {};
    const interpretation = isPlainObject(source.interpretation) ? source.interpretation : {};
    const image = isPlainObject(source.image) ? source.image : {};

    return {
      schemaVersion: SCHEMA_VERSION,
      sessionId: source.sessionId || generateNdviSessionId(field.id, observation.date),
      field: {
        id: field.id,
        name: field.name,
        crop: field.crop,
        variety: field.variety,
        geometry: deepClone(field.geometry)
      },
      observation: {
        date: observation.date,
        platform: observation.platform,
        cloudCoverage: observation.cloudCoverage,
        productId: observation.productId,
        processingLevel: observation.processingLevel
      },
      statistics: {
        mean: statistics.mean,
        min: statistics.min,
        max: statistics.max,
        stDev: statistics.stDev,
        validPixelRatio: statistics.validPixelRatio,
        sampleCount: statistics.sampleCount,
        noDataCount: statistics.noDataCount
      },
      interpretation: {
        status: interpretation.status,
        patrolPriority: interpretation.patrolPriority,
        risk: interpretation.risk,
        recommendation: interpretation.recommendation
      },
      image: {
        source: image.source,
        width: image.width,
        height: image.height,
        canRegenerate: image.canRegenerate
      },
      createdAt: isIsoDateTime(source.createdAt) ? source.createdAt : now,
      updatedAt: isIsoDateTime(source.updatedAt) ? source.updatedAt : now
    };
  }

  function validateNdviSession(session) {
    const errors = [];
    if (!isPlainObject(session)) return { valid: false, errors: ["Session must be an object."] };
    if (containsForbiddenData(session)) errors.push("Session contains prohibited secret, token, Blob URL, or Base64 image data.");
    if (session.schemaVersion !== SCHEMA_VERSION) errors.push(`schemaVersion must be ${SCHEMA_VERSION}.`);
    if (typeof session.sessionId !== "string" || !session.sessionId.trim()) errors.push("sessionId is required.");

    const field = session.field;
    if (!isPlainObject(field)) {
      errors.push("field is required.");
    } else {
      if (typeof field.id !== "string" || !field.id.trim()) errors.push("field.id is required.");
      if (typeof field.name !== "string" || !field.name.trim()) errors.push("field.name is required.");
      if (typeof field.crop !== "string") errors.push("field.crop must be a string.");
      if (typeof field.variety !== "string") errors.push("field.variety must be a string.");
      if (!hasValidGeometry(field.geometry)) errors.push("field.geometry must be a Polygon or MultiPolygon.");
    }

    const observation = session.observation;
    if (!isPlainObject(observation)) {
      errors.push("observation is required.");
    } else {
      if (!isIsoDate(observation.date)) errors.push("observation.date must use YYYY-MM-DD.");
      if (typeof observation.platform !== "string" || !observation.platform.trim()) errors.push("observation.platform is required.");
      if (!isFiniteNumber(observation.cloudCoverage) || observation.cloudCoverage < 0 || observation.cloudCoverage > 100) {
        errors.push("observation.cloudCoverage must be between 0 and 100.");
      }
      if (typeof observation.productId !== "string" || !observation.productId.trim()) errors.push("observation.productId is required.");
      if (typeof observation.processingLevel !== "string" || !observation.processingLevel.trim()) {
        errors.push("observation.processingLevel is required.");
      }
    }

    const statistics = session.statistics;
    if (!isPlainObject(statistics)) {
      errors.push("statistics is required.");
    } else {
      for (const key of ["mean", "min", "max"]) {
        if (!isFiniteNumber(statistics[key]) || statistics[key] < -1 || statistics[key] > 1) {
          errors.push(`statistics.${key} must be between -1 and 1.`);
        }
      }
      if (!isFiniteNumber(statistics.stDev) || statistics.stDev < 0) errors.push("statistics.stDev must be zero or greater.");
      if (!isFiniteNumber(statistics.validPixelRatio) || statistics.validPixelRatio < 0 || statistics.validPixelRatio > 1) {
        errors.push("statistics.validPixelRatio must be between 0 and 1.");
      }
      for (const key of ["sampleCount", "noDataCount"]) {
        if (!Number.isInteger(statistics[key]) || statistics[key] < 0) errors.push(`statistics.${key} must be a non-negative integer.`);
      }
    }

    const interpretation = session.interpretation;
    if (!isPlainObject(interpretation)) {
      errors.push("interpretation is required.");
    } else {
      for (const key of ["status", "patrolPriority", "risk", "recommendation"]) {
        if (typeof interpretation[key] !== "string") errors.push(`interpretation.${key} must be a string.`);
      }
    }

    const image = session.image;
    if (!isPlainObject(image)) {
      errors.push("image is required.");
    } else {
      if (typeof image.source !== "string" || !image.source.trim()) errors.push("image.source is required.");
      if (!Number.isInteger(image.width) || image.width <= 0) errors.push("image.width must be a positive integer.");
      if (!Number.isInteger(image.height) || image.height <= 0) errors.push("image.height must be a positive integer.");
      if (typeof image.canRegenerate !== "boolean") errors.push("image.canRegenerate must be a boolean.");
    }

    if (!isIsoDateTime(session.createdAt)) errors.push("createdAt must use ISO 8601.");
    if (!isIsoDateTime(session.updatedAt)) errors.push("updatedAt must use ISO 8601.");
    return { valid: errors.length === 0, errors };
  }

  function migrateNdviSessions(rawData) {
    let parsed = rawData;
    if (typeof rawData === "string") {
      try {
        parsed = JSON.parse(rawData);
      } catch {
        return [];
      }
    }
    if (isPlainObject(parsed) && Array.isArray(parsed.sessions)) parsed = parsed.sessions;
    if (!Array.isArray(parsed)) return [];

    const migrated = [];
    const sessionIds = new Set();
    const fieldProducts = new Set();
    for (const candidate of parsed) {
      const validation = validateNdviSession(candidate);
      if (!validation.valid) continue;
      const compoundKey = `${candidate.field.id}\u0000${candidate.observation.productId}`;
      if (sessionIds.has(candidate.sessionId) || fieldProducts.has(compoundKey)) continue;
      sessionIds.add(candidate.sessionId);
      fieldProducts.add(compoundKey);
      migrated.push(deepClone(candidate));
    }
    return migrated;
  }

  function getStorage() {
    return global.localStorage;
  }

  function getNdviSessions() {
    try {
      const rawData = getStorage().getItem(STORAGE_KEY);
      return rawData === null ? [] : deepClone(migrateNdviSessions(rawData));
    } catch {
      return [];
    }
  }

  function saveNdviSession(session) {
    const candidate = deepClone(session);
    const validation = validateNdviSession(candidate);
    if (!validation.valid) throw new TypeError(validation.errors.join(" "));

    const sessions = getNdviSessions();
    const duplicateIndex = sessions.findIndex(item =>
      item.sessionId === candidate.sessionId ||
      (item.field.id === candidate.field.id && item.observation.productId === candidate.observation.productId)
    );
    const now = new Date().toISOString();
    if (duplicateIndex >= 0) {
      candidate.sessionId = sessions[duplicateIndex].sessionId;
      candidate.createdAt = sessions[duplicateIndex].createdAt;
      candidate.updatedAt = now;
      sessions[duplicateIndex] = candidate;
    } else {
      candidate.updatedAt = now;
      sessions.push(candidate);
    }
    getStorage().setItem(STORAGE_KEY, JSON.stringify(sessions));
    return deepClone(candidate);
  }

  function getNdviSessionById(sessionId) {
    const found = getNdviSessions().find(session => session.sessionId === sessionId);
    return found ? deepClone(found) : null;
  }

  function deleteNdviSession(sessionId) {
    const sessions = getNdviSessions();
    const remaining = sessions.filter(session => session.sessionId !== sessionId);
    if (remaining.length === sessions.length) return false;
    getStorage().setItem(STORAGE_KEY, JSON.stringify(remaining));
    return true;
  }

  function clearAllNdviSessions() {
    try {
      getStorage().removeItem(STORAGE_KEY);
    } catch {
      return false;
    }
    return true;
  }

  global.AIAKOSFarmMemoryNdviSessions = Object.freeze({
    SCHEMA_VERSION,
    STORAGE_KEY,
    createNdviSession,
    validateNdviSession,
    saveNdviSession,
    getNdviSessions,
    getNdviSessionById,
    deleteNdviSession,
    clearAllNdviSessions,
    generateNdviSessionId,
    migrateNdviSessions
  });
})(typeof window !== "undefined" ? window : globalThis);

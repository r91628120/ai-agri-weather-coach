# AIAKOS Satellite Search API v1.0

`POST /api/v1/satellite/search` searches CDSE Sentinel Hub Catalog/STAC metadata for Sentinel-2 L2A observations intersecting a validated farm Polygon or MultiPolygon.

## Request

The JSON request accepts `fieldId`, `fieldName`, GeoJSON `geometry`, `dateFrom`, `dateTo`, `maxCloudCoverage` (default 30, range 0–100), and `limit` (default 10, range 1–50). OAuth credentials, access tokens and Authorization headers are rejected from client input.

## Response

HTTP 200 returns `observations` sorted by newest datetime, then lower cloud coverage for tied datetimes, plus `recommendedObservation`. No matches is also HTTP 200 with an empty array and `recommendedObservation: null`.

Each observation contains its STAC id, datetime/date, Sentinel-2 platform, cloud coverage, L2A processing level and collection. The endpoint does not download imagery and does not calculate NDVI.

## Errors

- 400 invalid input or client-supplied authorization
- 413 request too large; 415 wrong content type
- 502 authentication/search rejection or upstream response/network failure
- 503 rate limit or upstream temporary failure
- 504 upstream timeout

Error responses never include credentials, access tokens, Authorization headers, raw upstream bodies or stack traces.

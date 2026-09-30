# AGIC integration

AGIC (African Gulf Investment Consult, agicltd.com) takes visa applications and
payment, and books applicants into an ASFAAR center for biometrics. ASFAAR
registers them when they arrive, captures their biometrics, and sends the
biometrics back to AGIC.

## Flow

1. **Gatehouse scan.** The applicant shows their AGIC *Biometric Appointment
   Slip*. Its QR code encodes
   `https://agicltd.com/verify/biometric?reference=AGIC-BIO-260929-62ACF5&v=1&sig=…`;
   the appointment number is also printed on it, for typing in. The gatehouse
   check-in page accepts either.
2. **Import** — `POST /api/v1/agic/gatehouse/import { "scan": "<qr or number>" }`
   (GATEHOUSE, RECEPTIONIST, CENTER_MANAGER, ADMIN, SUPER_ADMIN):
   - fetches the applicant from AGIC (`GET /api/v1/biometrics/appointments/{no}`)
     and their photo. The photo is saved under `uploads/agic-photos/` and filed
     as the application's `passport-photo` answer, which is where the
     printouts and the Windows biometric app read it from; the avatar keeps a
     data URI copy for the screens that render the avatar directly. A form
     without a `passport-photo` file field gets a warning at the gate.
     Imports made before this get their photo filed when the API next
     starts (logged as "AGIC photo repair"), or when the slip is scanned
     again. `scripts/backfill-agic-photos.js` does the same from a checkout
     (dry run; `--apply` to write);
   - finds their ASFAAR account by NIN, then email, or creates one (APPLICANT,
     AGIC photo as avatar, not NIN-verified). Refused (409): a staff or agency
     account; an account whose NIN or date of birth contradicts AGIC; and,
     when there is no date of birth on both sides to compare, one whose name
     does not appear in AGIC's;
   - makes them a client of the AGIC travel agency account (`AGIC_AGENCY_EMAIL`);
   - files an application under that agency, with `paymentRequired: false`
     (paid on AGIC), and records the passport;
   - books an **ACTIVE** appointment in the AGIC slot (Nigeria time) at the
     gate's center, or for now if AGIC gives no slot;
   - submits it, which generates the ASFAAR reference number, and records the
     AGIC appointment and application numbers in `agic_imports`.

   Scanning the same slip again returns the same application. A slip AGIC
   issued after **rebooking** - a new appointment number for the same AGIC
   application - moves that application to the new slot and center instead
   of filing another, unless the visit is already under way (checked in or
   further), which is left as it is with a warning. The import is re-keyed to
   the new number; earlier numbers are kept in `agicData`. The response
   carries the ASFAAR `referenceNumber`, which the page then looks up and
   checks in as usual.
3. **Check-in, queue, capture** — unchanged.
4. **Send back.** Completing capture queues the biometrics for AGIC. A job
   every minute sends whatever is due, retrying failures with backoff
   (1, 2, 4 … minutes, at most 6 hours, `AGIC_BIOMETRIC_PUSH_MAX_ATTEMPTS`
   times). Rows are claimed before sending, so several API instances never
   send the same one twice. Every completed capture queues a send, so a
   retake after an earlier capture was sent goes to AGIC too.

## Configuration

| Variable | Required | Default | |
|---|---|---|---|
| `AGIC_API_BASE_URL` | yes | | `https://agicltd.com` |
| `AGIC_CLIENT_ID` | yes | | `ASFAAR-BIOMETRIC` |
| `AGIC_CLIENT_SECRET` | yes | | From AGIC. Server only — never in frontend code or git. |
| `AGIC_AGENCY_EMAIL` | | `asfaar@agicltd.com` | The ASFAAR AGENCY account applicants become clients of. It must exist and have the AGENCY role. |
| `AGIC_BIOMETRIC_PUSH_ENABLED` | | `false` | Send captured biometrics to AGIC. Until on, sends queue up and go out when it is switched on. |
| `AGIC_BIOMETRIC_PUSH_PATH` | | `/api/v1/biometrics/appointments/{appointmentNumber}/biometrics` | Where AGIC receives them. |
| `AGIC_BIOMETRIC_PUSH_MAX_ATTEMPTS` | | `12` | Automatic attempts before a send waits for a manual retry. |
| `AGIC_TIMEOUT_MS` | | `20000` | Per request. |
| `AGIC_CENTER_MAP` | | | JSON, AGIC center id → ASFAAR center id or code, e.g. `{"1":"ASFAAR-ABJ-HQ"}`. |
| `AGIC_FORM_MAP` | | | JSON, `"<visaCountryId>:<visaTypeId>"` or `"<visaCountryId>"` → ASFAAR form id. |

**Center.** An explicit `AGIC_CENTER_MAP` entry wins. Otherwise the center the
gate staff member is assigned to — where the applicant is standing. Staff at
several centers, and admins, fall back to matching AGIC's center or location
name against ASFAAR center name, code or city — among their own centers only.
Check-in is refused at a center staff are not assigned to, so import refuses
(403) a center they are not at, rather than booking an applicant who then
cannot be checked in; staff with no center are told to get one assigned.

**Form.** An `AGIC_FORM_MAP` entry wins. Otherwise the destination country's
form (AGIC's "Saudi Arabia" matches ASFAAR's "Kingdom of Saudi Arabia") whose
application type matches the AGIC visa type, else that country's newest form,
with a warning shown at the gate.

## AGIC API notes

- Token: `POST /api/v1/auth/token {clientId, clientSecret}` → bearer token for
  900 s. Cached, renewed a minute early, and renewed + retried once on an
  authentication failure.
- **AGIC's guide says 401 for a bad token; production answers `302` to
  `/Account/Login`.** Redirects are never followed. One to the login page, or
  carrying AGIC's `AUTH401` code, is treated as 401; any other (http→https,
  apex→www) is reported as a misconfigured `AGIC_API_BASE_URL`.
- The QR `sig` is not verified — AGIC has not published how it is made. It
  does not need to be: the record is always fetched from AGIC with our
  credentials, so a forged slip finds nothing.
- AGIC's `X-Request-Id` / `requestId` is logged with every AGIC error, and the
  last one is kept on the `agic_imports` row.

## Receiving biometrics — contract for AGIC

AGIC does not yet have an endpoint for receiving biometrics (every candidate
path returns 404). ASFAAR sends:

```
POST {AGIC_API_BASE_URL}/api/v1/biometrics/appointments/{appointmentNumber}/biometrics
Authorization: Bearer {accessToken}
Content-Type: application/json
X-Request-Id: ASFAAR-BIOMETRIC-<uuid>
Idempotency-Key: <captureDigest>
```

```jsonc
{
  "source": "ASFAAR",
  "appointmentNumber": "AGIC-BIO-260929-62ACF5",
  "applicationNumber": "2609202055595142",
  "agicApplicationId": 6211,
  "asfaarReferenceNumber": "SA00126000001",
  "center": { "name": "ASFAAR-ABUJA HQ", "code": "ASFAAR-ABJ-HQ" },
  "capturedAt": "2026-10-06T11:45:00.000Z",
  "checkedInAt": "2026-10-06T11:20:00.000Z",
  "captureQuality": "GOOD",
  "photo": { "mimeType": "image/jpeg", "data": "<base64>", "sha256": "<hex>", "qualityScore": 90 },
  "fingerprints": [
    {
      "position": "LEFT_INDEX",            // LEFT|RIGHT _ THUMB|INDEX|MIDDLE|RING|LITTLE
      "fingerName": "Left Index",
      "templateFormat": "ISO19794-2:2005",
      "template": "<base64 ISO/IEC 19794-2 minutiae template>",
      "templateSha256": "<hex>",
      "wsqImage": "<base64 WSQ image, or null>",
      "nfiqScore": 2,
      "qualityScore": 80,
      "isAcceptable": true,
      "captureDevice": "…",
      "captureMethod": "SLAP",
      "capturedAt": "2026-10-06T11:40:00.000Z"
    }
  ],
  "captureDigest": "<hex>"   // same capture → same digest; a retake gets a new one
}
```

Expected answers, following AGIC's existing envelope (`success`, `code`,
`message`, `requestId`):

| Status | Meaning to ASFAAR |
|---|---|
| 200/201 `success: true` | Received. Marked SENT. |
| 409 | Already have this capture. Marked SENT. |
| 401 / 302 | Token problem. Renewed and retried. |
| 404, 408, 429, 5xx, unreachable | Retried with backoff. |
| other 4xx | Payload rejected. Not retried until a person retries it. |

Once AGIC has the endpoint live, set `AGIC_BIOMETRIC_PUSH_ENABLED=true` (and
`AGIC_BIOMETRIC_PUSH_PATH` if theirs differs). Everything captured before then
is sent.

## Operating

- `GET /api/v1/agic/imports/{appointmentNumber}/biometric-sync` — where sending
  stands: status, attempts, next attempt, last error, AGIC request id.
- `POST /api/v1/agic/imports/{appointmentNumber}/biometric-sync/retry`
  (CENTER_MANAGER, ADMIN, SUPER_ADMIN) — put a given-up send back in the queue
  and try now.
- In the database: `select "appointmentNumber", "syncStatus", "syncAttempts",
  "lastSyncError" from agic_imports where "syncStatus" <> 'SENT';`

The biometrics sent are decrypted from ASFAAR's encrypted store for transport
over HTTPS. AGIC holds them under its own data-protection obligations once
received.

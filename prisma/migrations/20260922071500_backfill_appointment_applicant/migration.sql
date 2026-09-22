-- A biometric appointment belongs to the applicant attending it, but the
-- creation paths stored whoever booked it. When a travel agent filed and
-- booked for a client, the appointment pointed at the agent, so the queue,
-- front desk, gatehouse and calendar all showed the agent's name against the
-- client's slot.
--
-- The code no longer does this. This corrects the rows already written.
--
-- Safe by definition: an appointment is reached through exactly one
-- submission, and it is always for that submission's applicant, so there is no
-- case where the two should differ. Idempotent - a second run matches nothing.

UPDATE biometric_appointments a
SET "userId" = s."userId"
FROM form_submissions s
WHERE s.id = a."submissionId"
  AND a."userId" <> s."userId";

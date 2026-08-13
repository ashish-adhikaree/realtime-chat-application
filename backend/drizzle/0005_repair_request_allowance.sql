UPDATE "conversation_request" cr
SET "allowed_through_seq" = COALESCE(
  (
    SELECT MIN(m."seq")
    FROM "message" m
    WHERE m."conversation_id" = cr."conversation_id"
      AND m."sender_id" = cr."requester_id"
      AND m."type" <> 'system'
  ),
  0
)
WHERE cr."allowed_through_seq" = 0;

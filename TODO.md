# TODO - Fix Groq 413 (Request too large)

- [x] Review current prompt sizing inputs (system prompt + messages + tokenizedText)
- [x] Implement chunking for large chatText so each Groq request stays under a safe size/token budget
- [x] Reduce context sent to Groq (e.g., send fewer previous messages)
- [x] Add guard: if Groq returns 413, automatically retry with smaller chunk size
- [x] Ensure ticket numbering and session update still works across chunks
- [x] Test with a large chat log to confirm 413 no longer occurs


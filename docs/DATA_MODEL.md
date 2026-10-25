# Data model

The MongoDB `mysterycases` collection stores a random public case ID, a hash of the anonymous access token, lifecycle status, generation status, player progress, accusation, input, and the generated case. Controllers construct allowlisted public DTOs rather than serializing the document. The private solution is held in the server-side `mystery.solution` field and is only included in the post-accusation result.

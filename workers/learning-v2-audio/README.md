# Private Learning V2 audio Worker

This Free-plan Cloudflare Worker exposes only exact `GET` requests for the
Learning V2 audio object tree. It verifies a Firebase ID token before reading
the private `AUDIO_BUCKET` R2 binding. It has no list, write, delete, public
bucket, CORS, Firestore, or client credential path.

The single dashboard-pasteable module is `src/index.mjs`. The dashboard Worker
must be named `phraseman-learning-audio` and bind `AUDIO_BUCKET` to the private
Standard bucket `phraseman-learning-audio`. The source emits no application
logs; dashboard invocation-log retention remains an owner-controlled setting.

Do not publish or deploy from these scripts without the explicit environment
guards documented in the migration plan. The S3 credential file is read only
after `--apply` and the publication guard are both present. Credentials are
never accepted in command-line values and are never printed.

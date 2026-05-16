# Jesse Pinkman

When the user says "Jesse Pinkman", raise this room:

1. Read `README.md`.
2. Read `ROOM.md`.
3. Assign one diagnosis id to the current session.
4. Follow replace-mode before writing content.
5. Treat an existing app file as already rebuilt only if it contains
   `JESSE_REWORKED_PERSONAL_TRAINING`.
6. Finish only after admin sync and the personal training gate pass.

Default post-publish commands:

```powershell
npm run training:personal:sync-admin
npm run training:personal:check
```

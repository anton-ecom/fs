**HSFS**:

- Emit [remote events](https://github.com/synthetism/patterns/blob/main/docs/realtime/realtime-events.md) to NATS Broker who accessed files and why.
- Mark classified files, protect access through 2FA/VC/NKeys.
- Limit scope of  access with VCs and identity who wrote the file.
- Keep history of access as part of the file.
- Integiry checks, violation flags, time-limit, auto-destruct, penetration alerts, readonly, writeonly, indestructable with auto-restoring.
- Selective disclosure protocols (text only), classification markings, traps (altered byte-sequencing/embedded ids for each read).
- ZKF/ZKF - Zero Knowledge Files - proof you ownership without revealing its contents.
- Passes - multi-user access with passwords. One-time, time-bound passwords.
- KYC - Store structured history of access with schemas.
- Multi-sig
- Auto-backup
- Multi-ACL - part is public, part is private, encrypted.
- Artefacts - Signed indestructable files. Know who created the file with delete/rewrite protection.
- Remote control - VM as file.
- Licensing

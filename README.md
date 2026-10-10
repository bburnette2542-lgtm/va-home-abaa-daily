# VA Home ABAA Daily

Field daily for James River Exteriors at The Virginia Home (725-011). Crew fills on a phone, Arnold sends the office copy, Bernie emails Clay and Gilbane himself, and the paper form is left with Gilbane.

Dailies already on a phone stay on that phone. The browser key is `va-home-abaa-dailies`. Sending a daily does not delete the local copy.

Report numbers follow work date order (earliest date is #1). The date on each daily is the work date and is not changed on import.

Wet mils and adhesion pulls are optional. A day with no tests is complete. Only an entered reading that is out of spec is flagged.

## Live site (share this with the crew)

**https://va-home-abaa-daily.vercel.app**

1. Start today's daily
2. Answer the steps (English or Spanish), add photos
3. Arnold sends to the office — saved on the server and emailed to [bernie@jamesriverexteriors.com](mailto:bernie@jamesriverexteriors.com)
4. Print / save PDF and leave the 3-page ABAA form (F-115-041) on site
5. Send Clay the signing link from `/office`. He signs on his phone. Signed PDFs are emailed to [bernie@jamesriverexteriors.com](mailto:bernie@jamesriverexteriors.com) and stay on `/office`.

Load a test daily if you just want to practice. Those stay marked SAMPLE.

## Office

Open `/office`, enter the shared passcode, copy Clay's signing link, search by date and status, download a signed PDF, or upload one if needed. Use **Make PDF for these dates** (browser Save as PDF). Import older exported JSON files at `/office/import`. Dates on those files stay as they are. **Void/delete** (with confirm) removes a test daily from the server.

Clay opens `/sign/<token>` on his phone. That link is not the office passcode. It lists every daily that is not signed yet. One signature signs all of them.

Read-only JSON for the bi-weekly report (same office passcode cookie, or `x-office-passcode` header):

`/api/office/summary?from=2026-08-29&to=2026-09-12`

## Env vars (set in Vercel; do not commit)

- `BLOB_READ_WRITE_TOKEN` — Vercel Blob read/write
- `MAILGUN_API_KEY` — Mailgun HTTP API
- `MAILGUN_DOMAIN` — `mg.jamesriverexteriors.com`
- `OFFICE_PASSCODE` — shared office page passcode
- `ARNOLD_PIN` — crew-lead PIN so only Arnold can waive a required field
- `CLAY_SIGN_TOKEN` — long random token for Clay's `/sign/<token>` link (not the office passcode). Optional. If unset, Office creates one in private blob storage the first time you open `/office`.

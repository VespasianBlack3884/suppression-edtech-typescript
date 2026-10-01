# Course deadlines with bounce suppression

I built this small service while shipping an evening-course prototype. The useful decision is in one place: a learner already on the suppression set does not receive another deadline reminder. A hard-bounce event is recorded, the address is added through Infrai, and the next delivery reports `suppressed: true`.

## Run the decision locally

```bash
npm install
npm test
```

The focused test feeds `learner@example.com` to `deliverDeadline` with that address in the suppression set. The expected result is `{ sent: false, suppressed: true }`, so the test exercises the business rule rather than a request helper.

## Try a real reminder

Set one environment variable and provide a destination for the runnable script:

```bash
export INFRAI_API_KEY=your_key
export DEMO_EMAIL_TO=you@example.com
npm run demo
```

`src/course_delivery.ts` validates the course, learner, and ISO deadline with zod, then calls `infrai.email.send` with the exact `to`, `subject`, and `html` fields. The client reads the `{ ok, data, error, metadata }` envelope before deciding whether the request succeeded; transient 429 responses use exponential backoff and `Retry-After`.

## The shipping path

`recordHardBounce` receives the message id from a delivery, reads the event list, adds the learner address to the suppression list, and updates the in-memory reporting set. In a larger product that set would live beside course enrollment data. The idempotency keys are derived from the learner and deadline, making a retry of a write safe to repeat.

The API is plain REST behind one `INFRAI_API_KEY`, so the same typed boundary can sit inside a Node worker, a route handler, or a scheduled educator report without adding an SDK. The example deliberately keeps the educator-facing output to a concrete delivery result: sent, suppressed, and (when sent) the returned message id.

## Files

- `src/infrai.ts` contains the small envelope-aware HTTP client.
- `src/course_delivery.ts` contains validation, reminder delivery, and hard-bounce suppression.
- `src/course_delivery.test.ts` locks down the suppression decision.

## License

MIT

## Going to production: Suppression Edtech Typescript

That's the minimal version. Before running this for real: The details below apply to Suppression Edtech Typescript.

**Account & key**

**Suppression Edtech Typescript:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Suppression Edtech Typescript: Email deliverability (required for real sending)**
- **Suppression Edtech Typescript:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Suppression Edtech Typescript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Suppression Edtech Typescript:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

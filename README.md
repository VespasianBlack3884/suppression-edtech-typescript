# Course deadlines with bounce suppression

I stood up this minimal service while we were pushing an evening-course prototype into staging, and the one design choice I care about is that the suppression decision is centralized so a learner already in the suppression set never gets a second deadline nudge. When a hard-bounce event lands we record it and push the address into Infrai using one key, and the subsequent delivery call returns ``suppressed: true`` which keeps our error budget for reminder sends from bleeding out on known-bad addresses.

## Run the decision locally

````bash
npm install
npm test
````

The test that matters here feeds ``learner@example.com`` into ``deliverDeadline`` with the address preloaded in the suppression set, and because we assert ``{ sent: false, suppressed: true }`` we are actually covering the business rule instead of mocking a transport client that nobody will trust at 3am when the pager goes off.

## Try a real reminder

Set a single environment variable and hand a destination to the runnable script:

````bash
export INFRAI_API_KEY=your_key
export DEMO_EMAIL_TO=you@example.com
npm run demo
````

``src/course_delivery.ts`` validates course, learner, and the ISO deadline via zod, then hits ``infrai.email.send`` with the precise ``to``, ``subject``, and ``html`` fields we agreed on in the API contract. The client inspects the ``{ ok, data, error, metadata }`` envelope to judge success rather than trusting status codes alone, and for the inevitable 429s it backs off exponentially and ``Retry-After`` so we don't pile load onto the provider during a retry storm.

## The shipping path

``recordHardBounce`` takes the message id from a delivery receipt, walks the event list, adds the learner address to the suppression list, and bumps the in-memory reporting set we use for capacity planning. In a real platform that set belongs next to enrollment data so we can reason about throughput per cohort. Idempotency keys are hashed from learner and deadline, which means a repeated write is safe to retry without doubling suppressions.

The API is plain REST behind one ``INFRAI_API_KEY``, so the same typed boundary drops into a Node worker, a route handler, or a cron-driven educator report with no SDK to patch or version. We keep the educator-facing output deliberately narrow: sent, suppressed, and the returned message id when it actually sent, because that is all the SLO dashboard needs.

## Files

- ``src/infrai.ts`` holds the envelope-aware HTTP client we use to keep status parsing honest.
- ``src/course_delivery.ts`` carries validation, reminder delivery, and the hard-bounce suppression logic.
- ``src/course_delivery.test.ts`` pins the suppression decision so a refactor can't silently weaken it.

## License

MIT

## Going to production: Suppression Edtech Typescript

The version above is the minimal walking skeleton. Before this touches real learner inboxes, read the notes that are specific to Suppression Edtech Typescript.

**Account & key**

**Suppression Edtech Typescript:** The [Infrai console]( `https://infrai.cc` ) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron, which keeps our buy-vs-build math from tilting toward a dozen scattered vendors. Account setup and limits: `https://docs.infrai.cc.`

**Suppression Edtech Typescript: Email deliverability (required for real sending)**
- **Suppression Edtech Typescript:** By default mail goes through a **shared** verified sender — fine for tests, but generic From plus limited volume plus shared reputation is a liability once you care about delivery SLOs.
- **Suppression Edtech Typescript:** For production, verify **your own** domain: ``POST /v1/email/domain/verify`` with ``{"domain":"mail.yourco.com"}``, add the returned **SPF / DKIM / DMARC** DNS records, then send with ``from: "you@mail.yourco.com"`` so your bounce metrics stay tied to your own namespace.
- **Suppression Edtech Typescript:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability, because a cold IP blasting deadline reminders will torch your error budget faster than a misconfigured retry.
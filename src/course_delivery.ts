import { z } from "zod";
import { infrai } from "./infrai.js";

export const deadlineRequest = z.object({ learnerEmail: z.string().email(), learnerName: z.string().min(1), courseTitle: z.string().min(1), deadline: z.string().datetime() });
export type DeadlineRequest = z.infer<typeof deadlineRequest>;

export type DeliveryResult = { sent: boolean; suppressed: boolean; messageId?: string };

export async function deliverDeadline(input: DeadlineRequest, suppressed: ReadonlySet<string>): Promise<DeliveryResult> {
  const request = deadlineRequest.parse(input);
  if (suppressed.has(request.learnerEmail)) return { sent: false, suppressed: true };
  const result = await infrai.email.send({ to: request.learnerEmail, subject: `Deadline for ${request.courseTitle}`, html: `<p>Hi ${request.learnerName}, your ${request.courseTitle} work is due ${request.deadline}.</p>` }, `deadline-${request.learnerEmail}-${request.deadline}`);
  return { sent: true, suppressed: false, messageId: result.message_id };
}

export async function recordHardBounce(to: string, messageId: string, suppressed: Set<string>): Promise<void> {
  await infrai.email.event.list(messageId);
  await infrai.email.suppression.add(to, `suppression-${to}`);
  suppressed.add(to);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const to = process.env.DEMO_EMAIL_TO;
  if (!to) throw new Error("DEMO_EMAIL_TO is required");
  const result = await deliverDeadline({ learnerEmail: to, learnerName: "Mina", courseTitle: "TypeScript Basics", deadline: new Date(Date.now() + 86400000).toISOString() }, new Set());
  console.log(JSON.stringify(result));
}

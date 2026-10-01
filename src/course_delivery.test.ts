import assert from "node:assert/strict";
import { deliverDeadline } from "./course_delivery.js";

const input = { learnerEmail: "learner@example.com", learnerName: "Lee", courseTitle: "Algebra", deadline: "2030-01-01T09:00:00.000Z" };
const decision = await deliverDeadline(input, new Set([input.learnerEmail]));
assert.deepEqual(decision, { sent: false, suppressed: true });
console.log("suppressed learners do not receive deadline reminders");

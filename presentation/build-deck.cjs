// Generates presentation/EnterpriseOS-AWS-Presentation.pptx
// Usage: NODE_PATH=<dir containing pptxgenjs> node presentation/build-deck.cjs <path to pptx skill apply_theme.js>
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require(process.argv[2]);

const OUT = path.join(__dirname, "EnterpriseOS-AWS-Presentation.pptx");
const THEME = {
  name: "EnterpriseOS AWS",
  headFontFace: "Arial",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "1A2433", lt1: "FFFFFF", dk2: "232F3E", lt2: "F3F5F8",
    accent1: "FF9900", accent2: "2B6CB0", accent3: "2F855A", accent4: "8A94A6",
    accent5: "C05621", accent6: "E8F1FF", hlink: "2B6CB0", folHlink: "6B46C1",
  },
};
const HEX = THEME.colors;

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625 in
pres.title = "EnterpriseOS on AWS";
pres.author = "Group 4";
pres.company = "Thapar Institute of Engineering and Technology";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

// ---------- Layouts ----------
pres.defineSlideMaster({
  title: "TITLE_DARK",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 1.35, w: 8.8, h: 1.4, fontSize: 40, bold: true, color: C.background1, valign: "bottom", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.6, y: 2.85, w: 8.8, h: 0.9, fontSize: 18, color: C.accent1, valign: "top", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  margin: [0.5, 0.5, 0.5, 0.5],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9.0, h: 0.75, fontSize: 30, bold: true, color: C.text2, valign: "middle", margin: 0 }, text: "" } },
    { text: { text: "EnterpriseOS on AWS  ·  Group 4", options: { x: 0.5, y: 5.2, w: 6, h: 0.3, fontSize: 10, color: C.accent4, margin: 0 } } },
  ],
  slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.3, fontSize: 10, color: C.accent4, align: "right" },
});
pres.defineSlideMaster({
  title: "CLOSING_DARK",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.5, w: 8.8, h: 0.9, fontSize: 36, bold: true, color: C.background1, align: "left", margin: 0 }, text: "" } },
  ],
});

// ---------- Helpers ----------
let shapeId = 0;
const nm = (p) => `${p}-${++shapeId}`;
const shadow = () => ({ type: "outer", color: "000000", opacity: 0.12, blur: 6, offset: 2, angle: 90 });

function card(slide, { x, y, w, h, fill = C.background2, line = null }) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.08, fill: { color: fill },
    line: line ? { color: line, width: 1 } : { type: "none" },
    shadow: shadow(), objectName: nm("card"),
  });
}
function badge(slide, x, y, label, fill = C.accent1, color = C.text2) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: 0.42, h: 0.42, fill: { color: fill }, line: { type: "none" }, objectName: nm("badge") });
  slide.addText(label, { x, y, w: 0.42, h: 0.42, fontSize: 14, bold: true, color, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: nm("badge-text") });
}
function text(slide, t, opts) {
  slide.addText(t, { margin: 0, isTextBox: true, color: C.text1, fontSize: 14, valign: "top", objectName: nm("text"), ...opts });
}
function arrow(slide, x1, y1, x2, y2, dashed = false, color = C.accent2) {
  slide.addShape(pres.shapes.LINE, {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1,
    line: { color, width: 1.75, dashType: dashed ? "dash" : "solid", endArrowType: "triangle" },
    objectName: nm("arrow"),
  });
}
function node(slide, x, y, w, h, title, sub, kind = "impl") {
  const fill = kind === "impl" ? C.accent6 : kind === "user" ? C.background1 : C.background2;
  const line = kind === "impl" ? C.accent2 : kind === "user" ? C.text2 : C.accent4;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.06, fill: { color: fill },
    line: { color: line, width: 1.25, dashType: kind === "future" ? "dash" : "solid" }, objectName: nm("node"),
  });
  slide.addText([
    { text: title, options: { bold: true, fontSize: 11, color: C.text2, breakLine: true } },
    { text: sub, options: { fontSize: 10, color: C.text1 } },
  ], { x: x + 0.05, y, w: w - 0.1, h, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: nm("node-text") });
}
function content(section, title) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle: section });
  s.addText(title, { placeholder: "title" });
  return s;
}

// ===================== 1. Title =====================
pres.addSection({ title: "Introduction" });
let s = pres.addSlide({ masterName: "TITLE_DARK", sectionTitle: "Introduction" });
s.addText("EnterpriseOS on AWS", { placeholder: "title" });
s.addText("A serverless, event-driven cloud architecture for workforce management", { placeholder: "body" });
text(s, "Avik Khetarpal  ·  Humza Ali Choudhri  ·  Shashwat Tewari", { x: 0.6, y: 3.95, w: 8.8, h: 0.35, fontSize: 16, color: C.background1 });
text(s, "UCS553 Cloud Computing  ·  Group 4  ·  Thapar Institute of Engineering and Technology", { x: 0.6, y: 4.35, w: 8.8, h: 0.3, fontSize: 12, color: C.accent4 });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 0.55, w: 3.3, h: 0.42, rectRadius: 0.2, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "status-pill" });
text(s, "Live on AWS · deployed 26 Nov 2026", { x: 0.6, y: 0.55, w: 3.3, h: 0.42, fontSize: 12, bold: true, color: C.text2, align: "center", valign: "middle" });
s.addNotes("Introduce the team. One line: we took our workforce-management app, EnterpriseOS, and rebuilt how it runs so that it is hosted entirely on AWS using serverless and event-driven services. Everything you will see is live in our AWS Academy sandbox.");

// ===================== 2. The idea =====================
s = content("Introduction", "The idea: EnterpriseOS");
card(s, { x: 0.5, y: 1.3, w: 3.4, h: 3.6, fill: C.text2 });
text(s, "The problem", { x: 0.8, y: 1.5, w: 2.9, h: 0.35, fontSize: 16, bold: true, color: C.accent1 });
text(s, [
  { text: "Workforce data spread across spreadsheets, e-mail approvals and separate tools", options: { bullet: true, breakLine: true } },
  { text: "Slow approvals, duplicated records, no single view", options: { bullet: true, breakLine: true } },
  { text: "EnterpriseOS puts it all in one secure web workspace", options: { bullet: true } },
], { x: 0.8, y: 1.95, w: 2.9, h: 2.1, fontSize: 13, color: C.background1, paraSpaceAfter: 6 });
text(s, "Users: admins · managers · employees", { x: 0.8, y: 4.3, w: 2.9, h: 0.35, fontSize: 12, italic: true, color: C.accent4 });
const mods = [
  ["Employees", "People directory, departments, manager → team"],
  ["Attendance", "Clock in/out in India time, CSV export"],
  ["Leave", "Apply, overlap checks, manager approval"],
  ["Projects & tasks", "Projects and a drag-through task board"],
  ["Dashboard", "Live summary of people, work and attendance"],
  ["Governance", "Notifications and a full audit trail"],
];
mods.forEach(([h, d], i) => {
  const x = 4.2 + (i % 2) * 2.7, y = 1.3 + Math.floor(i / 2) * 1.23;
  card(s, { x, y, w: 2.5, h: 1.08 });
  badge(s, x + 0.15, y + 0.15, String(i + 1), C.accent2, C.background1);
  text(s, h, { x: x + 0.68, y: y + 0.16, w: 1.75, h: 0.4, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
  text(s, d, { x: x + 0.15, y: y + 0.6, w: 2.25, h: 0.45, fontSize: 11 });
});
s.addNotes("EnterpriseOS is a multi-tenant workforce-management web app we built in Software Engineering with Node.js, Express and PostgreSQL. Three roles: admins manage the organisation, managers approve leave and run projects, employees record attendance and follow their tasks. Each organisation's data is kept separate. In this project the features stay the same; what changes is how and where it runs: entirely on AWS.");

// ===================== 5. Architecture =====================
pres.addSection({ title: "Architecture" });
s = content("Architecture", "Architecture on AWS");
node(s, 0.5, 2.45, 1.3, 0.8, "Browser", "3 user roles", "user");
node(s, 2.1, 2.45, 1.55, 0.8, "API Gateway", "HTTP API, throttled");
node(s, 2.1, 3.55, 1.55, 0.8, "Function URL", "fallback entry");
node(s, 3.9, 2.45, 1.55, 0.8, "Lambda: API", "Express via bridge");
node(s, 3.9, 1.35, 1.55, 0.8, "SSM Parameter Store", "secrets");
node(s, 3.9, 3.55, 1.55, 0.8, "CloudWatch", "logs + alarms");
node(s, 5.75, 2.45, 1.55, 0.8, "SQS queue", "domain events");
node(s, 5.75, 3.55, 1.55, 0.8, "Dead-letter queue", "after 3 tries");
node(s, 7.55, 2.45, 1.55, 0.8, "Lambda: worker", "async processing");
node(s, 7.55, 1.35, 1.55, 0.8, "SNS topic", "notifications");
node(s, 7.55, 3.55, 1.55, 0.8, "RDS / DynamoDB", "future", "future");
arrow(s, 1.8, 2.85, 2.1, 2.85);
arrow(s, 1.15, 3.25, 2.1, 3.95, true);
arrow(s, 3.65, 2.85, 3.9, 2.85);
arrow(s, 3.65, 3.75, 4.1, 3.25, true);
arrow(s, 4.675, 2.45, 4.675, 2.15);
arrow(s, 4.675, 3.25, 4.675, 3.55);
arrow(s, 5.45, 2.85, 5.75, 2.85);
arrow(s, 6.525, 3.25, 6.525, 3.55);
arrow(s, 7.3, 2.85, 7.55, 2.85);
arrow(s, 8.325, 2.45, 8.325, 2.15);
// legend
s.addShape(pres.shapes.LINE, { x: 0.5, y: 4.75, w: 0.45, h: 0, line: { color: C.accent2, width: 1.75 }, objectName: "legend-impl" });
text(s, "Deployed and verified", { x: 1.05, y: 4.62, w: 1.9, h: 0.28, fontSize: 11, color: C.text1, valign: "middle" });
s.addShape(pres.shapes.LINE, { x: 3.0, y: 4.75, w: 0.45, h: 0, line: { color: C.accent2, width: 1.75, dashType: "dash" }, objectName: "legend-fallback" });
text(s, "Fallback, not deployed", { x: 3.55, y: 4.62, w: 1.9, h: 0.28, fontSize: 11, color: C.text1, valign: "middle" });
s.addShape(pres.shapes.RECTANGLE, { x: 5.5, y: 4.64, w: 0.45, h: 0.22, fill: { color: C.background2 }, line: { color: C.accent4, width: 1, dashType: "dash" }, objectName: "legend-future" });
text(s, "Future", { x: 6.05, y: 4.62, w: 0.9, h: 0.28, fontSize: 11, color: C.text1, valign: "middle" });
text(s, "Live run: 26 Nov 2026, us-east-1", { x: 7.0, y: 4.62, w: 2.5, h: 0.28, fontSize: 11, color: C.accent4, valign: "middle", italic: true });
s.addNotes("Left to right: the browser calls API Gateway, which forwards to the API Lambda running our unchanged Express app. On cold start it reads secrets from Parameter Store. When a manager approves leave or assigns a task, an event goes to SQS; a worker Lambda processes it and publishes to SNS; failures retry and then land in the dead-letter queue. CloudWatch collects logs and alarms. Solid lines are deployed and verified on AWS (26 November, Academy sandbox); the grey box is future scope. Key idea: Lambda receives JSON events, not HTTP connections, so a small dependency-free bridge starts Express on a private loopback port and replays each event as a real HTTP request. Every security check behaves exactly as it does locally, at about 1 ms overhead.");

// ===================== 4. Amazon API Gateway =====================
pres.addSection({ title: "AWS services" });
s = content("AWS services", "Amazon API Gateway");
badge(s, 0.5, 1.12, "API", C.accent1, C.text2);
text(s, [{ text: "Networking" + ":  ", options: { bold: true, color: C.accent5 } }, { text: "a managed service that gives applications a public HTTPS address." }], { x: 1.05, y: 1.12, w: 8.45, h: 0.42, fontSize: 14, valign: "middle" });
card(s, { x: 0.5, y: 1.75, w: 3.6, h: 2.45 });
text(s, "Why we used it", { x: 0.7, y: 1.9, w: 3.2, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "A secure HTTPS URL without running any web server", options: { bullet: true, breakLine: true } },
  { text: "Throttling protects the app and our budget from floods of requests", options: { bullet: true, breakLine: true } },
  { text: "Access logs for every request", options: { bullet: true } }
], { x: 0.7, y: 2.3, w: 3.25, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
card(s, { x: 4.3, y: 1.75, w: 5.2, h: 2.45 });
text(s, "How EnterpriseOS uses it", { x: 4.5, y: 1.9, w: 4.8, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "HTTP API enterpriseos-dev-http-api with one $default route", options: { bullet: true, breakLine: true } },
  { text: "Forwards every request to the API Lambda as a JSON event", options: { bullet: true, breakLine: true } },
  { text: "Throttle: 10 requests/second, burst 20", options: { bullet: true, breakLine: true } },
  { text: "Access logs go to CloudWatch", options: { bullet: true } }
], { x: 4.5, y: 2.3, w: 4.85, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.35, w: 9.0, h: 0.62, rectRadius: 0.06, fill: { color: C.text2 }, line: { type: "none" }, objectName: nm("demo-strip") });
text(s, [{ text: "Show in demo:  ", options: { bold: true, color: C.accent1 } }, { text: "API Gateway → enterpriseos-dev-http-api → Routes, Integrations, Protect → Throttling", options: { color: C.background1 } }], { x: 0.7, y: 4.35, w: 8.6, h: 0.62, fontSize: 12.5, valign: "middle" });
s.addNotes("Every click in the app goes through API Gateway over HTTPS. We chose the HTTP API type because it is cheaper and simpler than a REST API and we did not need REST-only features. Throttling at 10 requests per second protects both the application and the lab budget.");

// ===================== 5. AWS Lambda =====================

s = content("AWS services", "AWS Lambda");
badge(s, 0.5, 1.12, "λ", C.accent1, C.text2);
text(s, [{ text: "Compute" + ":  ", options: { bold: true, color: C.accent5 } }, { text: "runs code on demand, without servers to manage." }], { x: 1.05, y: 1.12, w: 8.45, h: 0.42, fontSize: 14, valign: "middle" });
card(s, { x: 0.5, y: 1.75, w: 3.6, h: 2.45 });
text(s, "Why we used it", { x: 0.7, y: 1.9, w: 3.2, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "No servers to patch or keep running", options: { bullet: true, breakLine: true } },
  { text: "Scales automatically with users", options: { bullet: true, breakLine: true } },
  { text: "Pay only per request, nothing when idle", options: { bullet: true } }
], { x: 0.7, y: 2.3, w: 3.25, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
card(s, { x: 4.3, y: 1.75, w: 5.2, h: 2.45 });
text(s, "How EnterpriseOS uses it", { x: 4.5, y: 1.9, w: 4.8, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "enterpriseos-dev-api: runs our unchanged Express app (Node.js 24, 512 MB)", options: { bullet: true, breakLine: true } },
  { text: "A small bridge replays each API Gateway event as a real HTTP request, so every security check works as before", options: { bullet: true, breakLine: true } },
  { text: "enterpriseos-dev-worker: processes background events from SQS", options: { bullet: true } }
], { x: 4.5, y: 2.3, w: 4.85, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.35, w: 9.0, h: 0.62, rectRadius: 0.06, fill: { color: C.text2 }, line: { type: "none" }, objectName: nm("demo-strip") });
text(s, [{ text: "Show in demo:  ", options: { bold: true, color: C.accent1 } }, { text: "Lambda → Functions → enterpriseos-dev-api (trigger: API Gateway) and enterpriseos-dev-worker (trigger: SQS) → Monitor", options: { color: C.background1 } }], { x: 0.7, y: 4.35, w: 8.6, h: 0.62, fontSize: 12.5, valign: "middle" });
s.addNotes("Lambda does not receive HTTP connections; it receives JSON events. Our bridge starts Express on a private port inside the Lambda sandbox and replays each event as a normal HTTP request, so the original application did not need rewriting. The worker function is never called by a user; the queue triggers it.");

// ===================== 6. Amazon SQS =====================

s = content("AWS services", "Amazon SQS");
badge(s, 0.5, 1.12, "SQS", C.accent1, C.text2);
text(s, [{ text: "Application integration" + ":  ", options: { bold: true, color: C.accent5 } }, { text: "a fully managed message queue." }], { x: 1.05, y: 1.12, w: 8.45, h: 0.42, fontSize: 14, valign: "middle" });
card(s, { x: 0.5, y: 1.75, w: 3.6, h: 2.45 });
text(s, "Why we used it", { x: 0.7, y: 1.9, w: 3.2, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "Moves slow work off the user's request", options: { bullet: true, breakLine: true } },
  { text: "Messages are stored safely until processed", options: { bullet: true, breakLine: true } },
  { text: "Automatic retries, plus a dead-letter queue for failures", options: { bullet: true } }
], { x: 0.7, y: 2.3, w: 3.25, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
card(s, { x: 4.3, y: 1.75, w: 5.2, h: 2.45 });
text(s, "How EnterpriseOS uses it", { x: 4.5, y: 1.9, w: 4.8, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "Approving leave or assigning a task publishes LEAVE_DECIDED / TASK_ASSIGNED", options: { bullet: true, breakLine: true } },
  { text: "The worker reads batches of up to 10 and retries only failed messages", options: { bullet: true, breakLine: true } },
  { text: "After 3 failures a message moves to enterpriseos-dev-events-dlq and an alarm fires", options: { bullet: true, breakLine: true } },
  { text: "Encrypted at rest; requests without TLS are denied", options: { bullet: true } }
], { x: 4.5, y: 2.3, w: 4.85, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.35, w: 9.0, h: 0.62, rectRadius: 0.06, fill: { color: C.text2 }, line: { type: "none" }, objectName: nm("demo-strip") });
text(s, [{ text: "Show in demo:  ", options: { bold: true, color: C.accent1 } }, { text: "SQS → enterpriseos-dev-events → Monitoring, Dead-letter queue, Encryption, Access policy", options: { color: C.background1 } }], { x: 0.7, y: 4.35, w: 8.6, h: 0.62, fontSize: 12.5, valign: "middle" });
s.addNotes("This is the event-driven part of the project. The user's request finishes immediately; the queue holds the event until the worker processes it. If something keeps failing, the message is parked in the dead-letter queue instead of being lost, and CloudWatch raises an alarm.");

// ===================== 7. Amazon SNS =====================

s = content("AWS services", "Amazon SNS");
badge(s, 0.5, 1.12, "SNS", C.accent1, C.text2);
text(s, [{ text: "Application integration" + ":  ", options: { bold: true, color: C.accent5 } }, { text: "publish/subscribe notifications." }], { x: 1.05, y: 1.12, w: 8.45, h: 0.42, fontSize: 14, valign: "middle" });
card(s, { x: 0.5, y: 1.75, w: 3.6, h: 2.45 });
text(s, "Why we used it", { x: 0.7, y: 1.9, w: 3.2, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "One message can reach many subscribers (e-mail, SMS, other systems)", options: { bullet: true, breakLine: true } },
  { text: "New subscribers need no code change", options: { bullet: true } }
], { x: 0.7, y: 2.3, w: 3.25, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
card(s, { x: 4.3, y: 1.75, w: 5.2, h: 2.45 });
text(s, "How EnterpriseOS uses it", { x: 4.5, y: 1.9, w: 4.8, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "The worker publishes a privacy-safe summary of each event to enterpriseos-dev-notifications", options: { bullet: true, breakLine: true } },
  { text: "CloudWatch alarms publish to enterpriseos-dev-ops-alerts", options: { bullet: true, breakLine: true } },
  { text: "Messages contain IDs and status only, never names or e-mail addresses", options: { bullet: true } }
], { x: 4.5, y: 2.3, w: 4.85, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.35, w: 9.0, h: 0.62, rectRadius: 0.06, fill: { color: C.text2 }, line: { type: "none" }, objectName: nm("demo-strip") });
text(s, [{ text: "Show in demo:  ", options: { bold: true, color: C.accent1 } }, { text: "SNS → Topics → enterpriseos-dev-notifications and enterpriseos-dev-ops-alerts", options: { color: C.background1 } }], { x: 0.7, y: 4.35, w: 8.6, h: 0.62, fontSize: 12.5, valign: "middle" });
s.addNotes("SNS is the fan-out step. Be honest if asked: for the demo no subscribers are attached, so messages are published but not delivered to anyone. Adding an e-mail subscription is a console click and needs no code change.");

// ===================== 8. Systems Manager Parameter Store + KMS =====================

s = content("AWS services", "Systems Manager Parameter Store + KMS");
badge(s, 0.5, 1.12, "SSM", C.accent1, C.text2);
text(s, [{ text: "Security" + ":  ", options: { bold: true, color: C.accent5 } }, { text: "encrypted storage for configuration and secrets; KMS provides the encryption key." }], { x: 1.05, y: 1.12, w: 8.45, h: 0.42, fontSize: 14, valign: "middle" });
card(s, { x: 0.5, y: 1.75, w: 3.6, h: 2.45 });
text(s, "Why we used it", { x: 0.7, y: 1.9, w: 3.2, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "Keeps the login-token signing key out of code, Git and configuration", options: { bullet: true, breakLine: true } },
  { text: "Encrypted with an AWS-managed KMS key", options: { bullet: true, breakLine: true } },
  { text: "No extra charge", options: { bullet: true } }
], { x: 0.7, y: 2.3, w: 3.25, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
card(s, { x: 4.3, y: 1.75, w: 5.2, h: 2.45 });
text(s, "How EnterpriseOS uses it", { x: 4.5, y: 1.9, w: 4.8, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "Secret /enterpriseos/dev/JWT_SECRET stored as a SecureString", options: { bullet: true, breakLine: true } },
  { text: "Generated by our script and never printed", options: { bullet: true, breakLine: true } },
  { text: "The API Lambda reads it once at cold start; Lambda settings contain no secrets", options: { bullet: true } }
], { x: 4.5, y: 2.3, w: 4.85, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.35, w: 9.0, h: 0.62, rectRadius: 0.06, fill: { color: C.text2 }, line: { type: "none" }, objectName: nm("demo-strip") });
text(s, [{ text: "Show in demo:  ", options: { bold: true, color: C.accent1 } }, { text: "Systems Manager → Parameter Store → /enterpriseos/dev/JWT_SECRET (SecureString, value hidden)", options: { color: C.background1 } }], { x: 0.7, y: 4.35, w: 8.6, h: 0.62, fontSize: 12.5, valign: "middle" });
s.addNotes("The JWT secret signs every login token, so it must never appear in code or configuration. It lives encrypted in Parameter Store with the aws/ssm KMS key, and the API function loads it when it starts. Show that the Lambda environment variables contain only a path, not the secret.");

// ===================== 9. Amazon CloudWatch =====================

s = content("AWS services", "Amazon CloudWatch");
badge(s, 0.5, 1.12, "CW", C.accent1, C.text2);
text(s, [{ text: "Monitoring" + ":  ", options: { bold: true, color: C.accent5 } }, { text: "logs, metrics and alarms for AWS resources." }], { x: 1.05, y: 1.12, w: 8.45, h: 0.42, fontSize: 14, valign: "middle" });
card(s, { x: 0.5, y: 1.75, w: 3.6, h: 2.45 });
text(s, "Why we used it", { x: 0.7, y: 1.9, w: 3.2, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "See exactly what happened in each request", options: { bullet: true, breakLine: true } },
  { text: "Get alerted automatically when something breaks", options: { bullet: true, breakLine: true } },
  { text: "Measure performance", options: { bullet: true } }
], { x: 0.7, y: 2.3, w: 3.25, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
card(s, { x: 4.3, y: 1.75, w: 5.2, h: 2.45 });
text(s, "How EnterpriseOS uses it", { x: 4.5, y: 1.9, w: 4.8, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "One JSON log line per request: path, status, duration, request ID", options: { bullet: true, breakLine: true } },
  { text: "3 log groups, kept 7 days", options: { bullet: true, breakLine: true } },
  { text: "4 alarms: API errors, worker errors, HTTP 5xx, dead-letter queue not empty", options: { bullet: true, breakLine: true } },
  { text: "A /health endpoint for quick checks", options: { bullet: true } }
], { x: 4.5, y: 2.3, w: 4.85, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.35, w: 9.0, h: 0.62, rectRadius: 0.06, fill: { color: C.text2 }, line: { type: "none" }, objectName: nm("demo-strip") });
text(s, [{ text: "Show in demo:  ", options: { bold: true, color: C.accent1 } }, { text: "CloudWatch → Log groups → enterpriseos-dev-worker → domain_event_processed; Alarms (4 OK)", options: { color: C.background1 } }], { x: 0.7, y: 4.35, w: 8.6, h: 0.62, fontSize: 12.5, valign: "middle" });
s.addNotes("Open the worker log group and show domain_event_processed for the leave you just approved: that proves the event travelled API to SQS to the worker. Then show the four alarms in OK state.");

// ===================== 10. AWS IAM =====================

s = content("AWS services", "AWS IAM");
badge(s, 0.5, 1.12, "IAM", C.accent1, C.text2);
text(s, [{ text: "Security" + ":  ", options: { bold: true, color: C.accent5 } }, { text: "controls which identities and services may access which resources." }], { x: 1.05, y: 1.12, w: 8.45, h: 0.42, fontSize: 14, valign: "middle" });
card(s, { x: 0.5, y: 1.75, w: 3.6, h: 2.45 });
text(s, "Why we used it", { x: 0.7, y: 1.9, w: 3.2, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "Least privilege limits damage if something goes wrong", options: { bullet: true, breakLine: true } },
  { text: "Services get permissions, not passwords", options: { bullet: true } }
], { x: 0.7, y: 2.3, w: 3.25, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
card(s, { x: 4.3, y: 1.75, w: 5.2, h: 2.45 });
text(s, "How EnterpriseOS uses it", { x: 4.5, y: 1.9, w: 4.8, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "Our template defines a role per function with exact actions on exact resources (no wildcards, tested)", options: { bullet: true, breakLine: true } },
  { text: "AWS Academy does not allow creating roles, so the sandbox uses its pre-made LabRole", options: { bullet: true, breakLine: true } },
  { text: "API Gateway is allowed to call the API Lambda through a resource permission", options: { bullet: true } }
], { x: 4.5, y: 2.3, w: 4.85, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.35, w: 9.0, h: 0.62, rectRadius: 0.06, fill: { color: C.text2 }, line: { type: "none" }, objectName: nm("demo-strip") });
text(s, [{ text: "Show in demo:  ", options: { bold: true, color: C.accent1 } }, { text: "Lambda → enterpriseos-dev-api → Configuration → Permissions (LabRole); ApiFunctionRole in template.yaml", options: { color: C.background1 } }], { x: 0.7, y: 4.35, w: 8.6, h: 0.62, fontSize: 12.5, valign: "middle" });
s.addNotes("Explain the sandbox limitation openly: the template creates strict roles in a normal AWS account, but the Academy sandbox only permits the broad LabRole, so that is what runs here.");

// ===================== 11. CloudFormation + SAM + S3 =====================

s = content("AWS services", "CloudFormation + SAM + S3");
badge(s, 0.5, 1.12, "IaC", C.accent1, C.text2);
text(s, [{ text: "Infrastructure as code" + ":  ", options: { bold: true, color: C.accent5 } }, { text: "describes the whole environment in one template that AWS builds for us." }], { x: 1.05, y: 1.12, w: 8.45, h: 0.42, fontSize: 14, valign: "middle" });
card(s, { x: 0.5, y: 1.75, w: 3.6, h: 2.45 });
text(s, "Why we used it", { x: 0.7, y: 1.9, w: 3.2, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "Identical environment every time", options: { bullet: true, breakLine: true } },
  { text: "One command to create, one to delete", options: { bullet: true, breakLine: true } },
  { text: "Automatic rollback if anything fails", options: { bullet: true } }
], { x: 0.7, y: 2.3, w: 3.25, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
card(s, { x: 4.3, y: 1.75, w: 5.2, h: 2.45 });
text(s, "How EnterpriseOS uses it", { x: 4.5, y: 1.9, w: 4.8, h: 0.35, fontSize: 15, bold: true, color: C.text2 });
text(s, [
  { text: "infrastructure/template.yaml defines all 21 resources", options: { bullet: true, breakLine: true } },
  { text: "SAM packages the Lambda code and uploads it to an S3 bucket", options: { bullet: true, breakLine: true } },
  { text: "Stack enterpriseos-dev reached CREATE_COMPLETE", options: { bullet: true, breakLine: true } },
  { text: "A failed first attempt rolled back cleanly; we fixed it and redeployed", options: { bullet: true } }
], { x: 4.5, y: 2.3, w: 4.85, h: 1.8, fontSize: 12.5, paraSpaceAfter: 5 });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 4.35, w: 9.0, h: 0.62, rectRadius: 0.06, fill: { color: C.text2 }, line: { type: "none" }, objectName: nm("demo-strip") });
text(s, [{ text: "Show in demo:  ", options: { bold: true, color: C.accent1 } }, { text: "CloudFormation → enterpriseos-dev → Resources (21), Template; S3 → aws-sam-cli-managed-default-… bucket", options: { color: C.background1 } }], { x: 0.7, y: 4.35, w: 8.6, h: 0.62, fontSize: 12.5, valign: "middle" });
s.addNotes("Nothing was created by hand. CloudFormation built every resource from our template, and SAM stored the code package in S3. When the first real deploy hit an SQS policy error, CloudFormation rolled everything back automatically, which is a nice real example of why infrastructure as code matters.");

// ===================== 12. How we deployed =====================
pres.addSection({ title: "Deployment" });
s = content("Deployment", "How we deployed: AWS Academy sandbox");
const dsteps = [
  ["Start the sandbox", "AWS Academy Cloud Developing lab, us-east-1"],
  ["Open CloudShell", "Browser terminal with AWS tools, no keys on laptops"],
  ["Store the secret", "put-parameters.sh → Parameter Store"],
  ["Pre-flight", "preflight.sh: 14 checks, all PASS"],
  ["Deploy", "deploy.sh: package, test, SAM deploy"],
  ["Live", "HTTPS URL, /health returns OK"],
];
dsteps.forEach(([h, d], i) => {
  const x = 0.5 + i * 1.53;
  card(s, { x, y: 1.35, w: 1.38, h: 2.2 });
  badge(s, x + 0.48, 1.5, String(i + 1));
  text(s, h, { x: x + 0.08, y: 2.0, w: 1.22, h: 0.5, fontSize: 13, bold: true, color: C.text2, align: "center", valign: "middle" });
  text(s, d, { x: x + 0.1, y: 2.5, w: 1.18, h: 0.95, fontSize: 10.5, align: "center" });
  if (i < dsteps.length - 1) arrow(s, x + 1.39, 2.45, x + 1.52, 2.45, false, C.accent1);
});
text(s, [
  { text: "About the sandbox: ", options: { bold: true, color: C.accent5 } },
  { text: "it uses lab credit, not our money, and deletes everything when a session ends. Because the whole stack is code, we recreate it in about 10 minutes, and cleanup.sh removes it afterwards." },
], { x: 0.5, y: 3.8, w: 9.0, h: 0.9, fontSize: 13 });
s.addNotes("We deployed from AWS CloudShell inside the AWS Academy Cloud Developing sandbox. Our scripts check the environment first, package and test the code, then let SAM and CloudFormation create everything. The sandbox removes all resources at the end of each session, which is why one-command deployment is essential.");

// ===================== 13. Live proof =====================
s = content("Deployment", "Live on AWS");
[["ui-dashboard.png", "EnterpriseOS manager view (same code that runs on Lambda)"], ["aws-worker-log.png", "Worker Lambda triggered by SQS after a leave approval"]].forEach(([f, cap], i) => {
  const x = 0.5 + i * 4.6;
  const h = f === "aws-worker-log.png" ? 4.4 * 690 / 2000 : 2.475;
  const y = 1.3 + (2.475 - h) / 2;
  s.addImage({ path: path.join(__dirname, "..", "report", "figures", f), x, y, w: 4.4, h, objectName: nm("shot"), altText: cap });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 4.4, h, fill: { type: "none" }, line: { color: C.accent4, width: 0.75 }, objectName: nm("frame") });
  text(s, cap, { x, y: 3.85, w: 4.4, h: 0.3, fontSize: 12, color: C.accent4, align: "center", italic: true });
});
text(s, [
  { text: "Verified on the live stack: ", options: { bold: true, color: C.text2 } },
  { text: "HTTPS site and /health OK, protected API refuses unauthenticated calls, leave approval processed through SQS, 4 alarms OK." },
], { x: 0.5, y: 4.3, w: 9.0, h: 0.65, fontSize: 13 });
s.addNotes("This is where we switch to the live demo: open the site, log in as the manager, approve a leave, and then show the worker log entry in CloudWatch.");

// ===================== 14. Conclusion =====================
pres.addSection({ title: "Close" });
s = pres.addSlide({ masterName: "CLOSING_DARK", sectionTitle: "Close" });
s.addText("Conclusion", { placeholder: "title" });
const take = [
  ["Same app, cloud-native", "EnterpriseOS now runs on Lambda behind API Gateway, with its features unchanged"],
  ["9 AWS services together", "API Gateway, Lambda, SQS, SNS, Parameter Store, KMS, CloudWatch, IAM, CloudFormation"],
  ["Built and run as code", "One template, one command to deploy, verified live on AWS"],
];
take.forEach(([h, d], i) => {
  const x = 0.6 + i * 3.0;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.55, w: 2.8, h: 1.95, rectRadius: 0.08, fill: { color: C.text1 }, line: { color: C.accent1, width: 1 }, objectName: nm("take") });
  text(s, h, { x: x + 0.2, y: 1.72, w: 2.4, h: 0.6, fontSize: 16, bold: true, color: C.accent1 });
  text(s, d, { x: x + 0.2, y: 2.35, w: 2.4, h: 1.05, fontSize: 12.5, color: C.background1 });
});
text(s, "Next: managed PostgreSQL (RDS), CloudFront + WAF, Cognito sign-in, X-Ray tracing", { x: 0.6, y: 3.7, w: 8.8, h: 0.3, fontSize: 12, color: C.accent4 });
text(s, "Thank you. Questions?", { x: 0.6, y: 4.1, w: 8.8, h: 0.55, fontSize: 26, bold: true, color: C.background1 });
text(s, "github.com/Ak7950/EnterpriseOS-AWS-Cloud", { x: 0.6, y: 4.72, w: 8.8, h: 0.3, fontSize: 12, color: C.accent4 });
s.addNotes("Close with the three takeaways. If asked about quality or cost: 56 automated tests pass, CI runs on every push, and the demo costs only a few cents of lab credit, with no personal spending.");

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();

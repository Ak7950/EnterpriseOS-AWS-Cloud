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
function arrow(slide, x1, y1, x2, y2, dashed = true, color = C.accent2) {
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
s.addText("A cost-safe serverless and event-driven cloud architecture for workforce management", { placeholder: "body" });
text(s, "Avik Khetarpal  ·  Humza Ali Choudhri  ·  Shashwat Tewari", { x: 0.6, y: 3.95, w: 8.8, h: 0.35, fontSize: 16, color: C.background1 });
text(s, "Cloud Computing ([Course Code])  ·  Group 4  ·  Thapar Institute of Engineering and Technology", { x: 0.6, y: 4.35, w: 8.8, h: 0.3, fontSize: 12, color: C.accent4 });
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 0.55, w: 3.6, h: 0.42, rectRadius: 0.2, fill: { color: C.accent1 }, line: { type: "none" }, objectName: "status-pill" });
text(s, "Implemented & verified · deployment pending", { x: 0.6, y: 0.55, w: 3.6, h: 0.42, fontSize: 12, bold: true, color: C.text2, align: "center", valign: "middle" });
s.addNotes("Introduce the team and the one-line idea: we took our Software Engineering project, EnterpriseOS, and re-platformed it onto AWS using serverless and event-driven services, with a strict rule of zero personal cost. Be clear from the start: everything is implemented and tested, and the AWS deployment is done in the lab session on demonstration day.");

// ===================== 2. Problem & constraints =====================
s = content("Introduction", "Why move EnterpriseOS to AWS");
card(s, { x: 0.5, y: 1.3, w: 3.4, h: 3.6, fill: C.text2 });
text(s, "Starting point", { x: 0.8, y: 1.55, w: 2.9, h: 0.35, fontSize: 16, bold: true, color: C.accent1 });
text(s, [
  { text: "Workforce platform built in Software Engineering", options: { bullet: true, breakLine: true } },
  { text: "Node.js + Express monolith, PostgreSQL", options: { bullet: true, breakLine: true } },
  { text: "Hosted on Vercel + Neon", options: { bullet: true, breakLine: true } },
  { text: "21 tests, role-based access, tenant isolation", options: { bullet: true } },
], { x: 0.8, y: 2.0, w: 2.9, h: 2.7, fontSize: 14, color: C.background1, paraSpaceAfter: 8 });
const cons = [
  ["₹0", "Zero personal spend", "No card, no paid plan, no free-tier assumptions"],
  ["$2", "Academy credit cap", "min($3, 5% of the $40 lab budget)"],
  ["IAM", "Sandbox restrictions", "Two regions, no new IAM roles, auto-delete"],
  ["=", "Preserve the app", "Same routes, roles and local workflow"],
];
cons.forEach(([b, h, d], i) => {
  const x = 4.2 + (i % 2) * 2.7, y = 1.3 + Math.floor(i / 2) * 1.85;
  card(s, { x, y, w: 2.5, h: 1.65 });
  badge(s, x + 0.2, y + 0.2, b);
  text(s, h, { x: x + 0.75, y: y + 0.22, w: 1.65, h: 0.4, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
  text(s, d, { x: x + 0.2, y: y + 0.75, w: 2.15, h: 0.8, fontSize: 12, color: C.text1 });
});
s.addNotes("The cloud question: how do you move an existing app to AWS so it demonstrates real cloud concepts without changing business logic and without spending money? Walk through the four constraints. The original project, its Vercel deployment and its database were never touched; this is a separate private repository.");

// ===================== 3. What the app does =====================
s = content("Introduction", "What EnterpriseOS does");
const mods = [
  ["Auth & roles", "JWT login, bcrypt, 4 roles, forced password change"],
  ["People", "Employees, departments, manager scoping"],
  ["Attendance", "Clock in/out in India time, CSV export"],
  ["Leave", "Requests, overlap checks, manager approval"],
  ["Delivery", "Projects and a task execution board"],
  ["Governance", "Dashboard, notifications, audit trail"],
];
mods.forEach(([h, d], i) => {
  const x = 0.5 + (i % 3) * 3.05, y = 1.3 + Math.floor(i / 3) * 1.85;
  card(s, { x, y, w: 2.85, h: 1.6 });
  badge(s, x + 0.2, y + 0.2, String(i + 1), C.accent2, C.background1);
  text(s, h, { x: x + 0.75, y: y + 0.22, w: 1.95, h: 0.4, fontSize: 16, bold: true, color: C.text2, valign: "middle" });
  text(s, d, { x: x + 0.2, y: y + 0.78, w: 2.45, h: 0.7, fontSize: 13 });
});
s.addNotes("A quick reminder of the application so the examiner knows what is being moved. Every one of these modules still works unchanged in the cloud version. Tenant isolation: every query is scoped by the organisation ID inside the signed token.");

// ===================== 4. Academy environment =====================
pres.addSection({ title: "Cloud environment" });
s = content("Cloud environment", "Our AWS Academy sandbox");
const stats = [["$40", "lab budget"], ["$0", "used so far"], ["$2.00", "our credit cap"], ["~3 h", "session, then auto-delete"]];
stats.forEach(([v, l], i) => {
  const x = 0.5 + i * 2.3;
  card(s, { x, y: 1.3, w: 2.1, h: 1.5 });
  text(s, v, { x: x + 0.15, y: 1.42, w: 1.8, h: 0.8, fontSize: 36, bold: true, color: C.accent5, align: "center", valign: "middle" });
  text(s, l, { x: x + 0.15, y: 2.22, w: 1.8, h: 0.45, fontSize: 12, color: C.text1, align: "center" });
});
text(s, [
  { text: "Cloud Developing 2.x Sandbox", options: { bold: true, color: C.text2, breakLine: true } },
  { text: "Regions: us-east-1 and us-west-2 only", options: { bullet: true, breakLine: true } },
  { text: "Permitted: Lambda, API Gateway, SQS, SNS, CloudWatch, CloudFormation, SSM, S3, CloudShell", options: { bullet: true, breakLine: true } },
  { text: "IAM: cannot create roles, so functions use the pre-created LabRole", options: { bullet: true, breakLine: true } },
  { text: "KMS is not listed, so SecureString storage is tested in-session", options: { bullet: true } },
], { x: 0.5, y: 3.05, w: 9.0, h: 1.95, fontSize: 14, paraSpaceAfter: 4 });
s.addNotes("These numbers were read directly from the running lab on 25 November 2026. The cap is our own rule: the lower of 3 dollars or 5 percent of the budget. The sandbox deletes everything when the session ends, which is why the whole stack is infrastructure as code and deploys in about ten minutes.");

// ===================== 5. Architecture =====================
pres.addSection({ title: "Architecture" });
s = content("Architecture", "Target architecture on AWS");
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
arrow(s, 1.15, 3.25, 2.1, 3.95);
arrow(s, 3.65, 2.85, 3.9, 2.85);
arrow(s, 3.65, 3.75, 4.1, 3.25);
arrow(s, 4.675, 2.45, 4.675, 2.15);
arrow(s, 4.675, 3.25, 4.675, 3.55);
arrow(s, 5.45, 2.85, 5.75, 2.85);
arrow(s, 6.525, 3.25, 6.525, 3.55);
arrow(s, 7.3, 2.85, 7.55, 2.85);
arrow(s, 8.325, 2.45, 8.325, 2.15);
// legend
s.addShape(pres.shapes.LINE, { x: 0.5, y: 4.75, w: 0.45, h: 0, line: { color: C.accent2, width: 1.75, dashType: "dash" }, objectName: "legend-impl" });
text(s, "Implemented & tested, not yet deployed", { x: 1.05, y: 4.62, w: 3.2, h: 0.28, fontSize: 11, color: C.text1, valign: "middle" });
s.addShape(pres.shapes.RECTANGLE, { x: 4.4, y: 4.64, w: 0.45, h: 0.22, fill: { color: C.background2 }, line: { color: C.accent4, width: 1, dashType: "dash" }, objectName: "legend-future" });
text(s, "Designed only (future)", { x: 4.95, y: 4.62, w: 2.2, h: 0.28, fontSize: 11, color: C.text1, valign: "middle" });
text(s, "Solid lines will mark deployed links", { x: 7.1, y: 4.62, w: 2.4, h: 0.28, fontSize: 11, color: C.accent4, valign: "middle", italic: true });
s.addNotes("Left to right: the browser calls API Gateway, which forwards to the API Lambda running our unchanged Express app. On cold start it reads secrets from Parameter Store. When a manager approves leave or assigns a task, an event goes to SQS; a worker Lambda processes it and publishes to SNS; failures retry and then land in the dead-letter queue. CloudWatch collects logs and alarms. Dashed lines mean implemented and tested but not yet deployed. That is deliberate honesty.");

// ===================== 6. Service choices =====================
s = content("Architecture", "Why each AWS service");
const rows = [
  ["Service", "Why we chose it", "Status"],
  ["Lambda", "Runs the unchanged app; scales to zero, no idle cost", "Implemented"],
  ["API Gateway (HTTP)", "Managed HTTPS, throttling, access logs; cheaper than REST API", "Implemented"],
  ["SQS + DLQ", "Durable buffer, per-message retries, dead-lettering", "Implemented"],
  ["SNS", "Fan-out to e-mail and other subscribers", "Implemented"],
  ["SSM Parameter Store", "Encrypted secrets at no extra charge", "Implemented"],
  ["CloudWatch", "JSON logs, 4 alarms, optional dashboard", "Implemented"],
  ["SAM / CloudFormation", "Whole stack as code; one-command teardown", "Implemented"],
  ["RDS, NAT, ALB, EC2", "Hourly charges even when idle, so avoided", "Rejected"],
];
const hdr = { bold: true, color: HEX.lt1, fill: { color: HEX.dk2 }, fontSize: 13 };
s.addTable(rows.map((r, i) => r.map((c, j) => ({
  text: c,
  options: i === 0 ? hdr : { fontSize: 12, color: j === 2 ? (c === "Rejected" ? HEX.accent5 : HEX.accent3) : HEX.dk1, bold: j !== 1, fill: { color: i % 2 ? HEX.lt1 : HEX.lt2 } },
}))), { x: 0.5, y: 1.25, w: 9.0, colW: [2.2, 5.4, 1.4], rowH: 0.4, border: { type: "solid", color: HEX.lt2, pt: 0.75 }, valign: "middle", margin: [0, 0.08, 0, 0.08], objectName: "services-table" });
s.addNotes("Every service has a job, which avoids collecting AWS logos. The key selection rule was near-zero idle cost. The last row matters: RDS, NAT gateways, load balancers and EC2 charge by the hour even when nobody uses them, so an automated test fails the build if any of them appears in our template.");

// ===================== 7. Request flow =====================
s = content("Architecture", "How a request is handled");
const steps = [
  ["Browser", "HTTPS call to the API Gateway URL"],
  ["API Gateway", "Throttles, then sends a JSON event to Lambda"],
  ["Cold start", "Load secrets from SSM, start Express on 127.0.0.1"],
  ["Bridge", "Replay the event as a real HTTP request"],
  ["Express", "Auth, roles, tenant-scoped SQL, same as local"],
];
steps.forEach(([h, d], i) => {
  const x = 0.5 + i * 1.84;
  card(s, { x, y: 1.45, w: 1.66, h: 2.35 });
  badge(s, x + 0.62, 1.62, String(i + 1));
  text(s, h, { x: x + 0.1, y: 2.15, w: 1.46, h: 0.4, fontSize: 14, bold: true, color: C.text2, align: "center" });
  text(s, d, { x: x + 0.12, y: 2.6, w: 1.42, h: 1.1, fontSize: 12, align: "center" });
  if (i < steps.length - 1) arrow(s, x + 1.68, 2.62, x + 1.82, 2.62, false, C.accent1);
});
text(s, [
  { text: "Key idea: ", options: { bold: true, color: C.accent5 } },
  { text: "a small, dependency-free bridge lets the original Express app run on Lambda unchanged, so every security check behaves exactly as it does locally (about 1 ms overhead per request)." },
], { x: 0.5, y: 4.1, w: 9.0, h: 0.8, fontSize: 14 });
s.addNotes("Lambda does not receive HTTP connections; it receives JSON events. Our bridge starts Express once per container on a private loopback port and replays each event as a real HTTP request. Secrets are loaded before the app is imported because the app validates them at import time. The bridge also overwrites X-Forwarded-For with the IP AWS verified, so the login rate limiter cannot be bypassed.");

// ===================== 8. Event-driven pipeline =====================
s = content("Architecture", "Event-driven processing");
const chain = [["Manager approves leave", C.background2], ["API writes DB + publishes event", C.accent6], ["SQS queue", C.accent6], ["Worker Lambda validates & logs", C.accent6], ["SNS notification", C.accent6]];
chain.forEach(([t, f], i) => {
  const x = 0.5 + i * 1.84;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.35, w: 1.62, h: 0.95, rectRadius: 0.08, fill: { color: f }, line: { color: C.accent2, width: 1 }, objectName: nm("chain") });
  text(s, t, { x: x + 0.08, y: 1.35, w: 1.46, h: 0.95, fontSize: 12, bold: true, color: C.text2, align: "center", valign: "middle" });
  if (i < chain.length - 1) arrow(s, x + 1.63, 1.82, x + 1.83, 1.82, false, C.accent1);
});
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.18, y: 2.75, w: 1.62, h: 0.6, rectRadius: 0.08, fill: { color: C.background2 }, line: { color: C.accent5, width: 1 }, objectName: "dlq" });
text(s, "Dead-letter queue + alarm", { x: 4.2, y: 2.75, w: 1.58, h: 0.6, fontSize: 11, bold: true, color: C.accent5, align: "center", valign: "middle" });
arrow(s, 4.99, 2.3, 4.99, 2.75, true, C.accent5);
text(s, "after 3 failed tries", { x: 5.1, y: 2.38, w: 1.6, h: 0.3, fontSize: 10, color: C.accent5, italic: true });
const facts = [
  ["Original behaviour kept", "Notification and audit rows are still written synchronously"],
  ["Never blocks users", "If publishing fails, it is logged; the request still succeeds"],
  ["Retry-safe", "Only failed messages retry (partial batch responses)"],
  ["Privacy", "Events carry IDs and status only, never names or e-mails"],
];
facts.forEach(([h, d], i) => {
  const x = 0.5 + (i % 2) * 4.6, y = 3.6 + Math.floor(i / 2) * 0.72;
  text(s, [{ text: h + ": ", options: { bold: true, color: C.text2 } }, { text: d }], { x, y, w: 4.4, h: 0.65, fontSize: 13 });
});
s.addNotes("This is the event-driven part. The user gets their response immediately; slower side-effects such as e-mail fan-out run asynchronously. Delivery is at-least-once, so each event has a UUID for idempotent consumers in future. Poison messages go to the dead-letter queue, which raises a CloudWatch alarm.");

// ===================== 9. Security =====================
pres.addSection({ title: "Engineering" });
s = content("Engineering", "Security controls");
const sec = [
  ["Secrets", "Only in SSM SecureStrings; a test proves none are in Lambda env vars"],
  ["Least privilege", "Exact actions on exact ARNs; no wildcards (tested)"],
  ["Spoof-proof throttle", "X-Forwarded-For overwritten with the AWS source IP"],
  ["Encryption", "TLS-only queue policy, SQS server-side encryption"],
  ["Privacy", "PII-free events, logs omit query strings"],
  ["Supply chain", "0 vulnerabilities, secret scan in every CI run"],
];
sec.forEach(([h, d], i) => {
  const x = 0.5 + (i % 3) * 3.05, y = 1.3 + Math.floor(i / 3) * 1.85;
  card(s, { x, y, w: 2.85, h: 1.6 });
  badge(s, x + 0.2, y + 0.2, "✓", C.accent3, C.background1);
  text(s, h, { x: x + 0.75, y: y + 0.22, w: 1.95, h: 0.4, fontSize: 15, bold: true, color: C.text2, valign: "middle" });
  text(s, d, { x: x + 0.2, y: y + 0.78, w: 2.45, h: 0.75, fontSize: 12 });
});
s.addNotes("All original controls are preserved: bcrypt, 8-hour JWTs, role checks, tenant-scoped parameterised SQL and security headers. Accepted risk to mention honestly: in the Academy sandbox we must use LabRole, which is broader than our least-privilege policies. In a normal account the template creates the tight roles automatically.");

// ===================== 10. IaC & CI/CD =====================
s = content("Engineering", "Infrastructure as code and CI/CD");
card(s, { x: 0.5, y: 1.3, w: 4.3, h: 3.6 });
text(s, "One SAM template", { x: 0.75, y: 1.5, w: 3.8, h: 0.35, fontSize: 16, bold: true, color: C.text2 });
text(s, [
  { text: "Front door: HttpApi or FunctionUrl", options: { bullet: true, breakLine: true } },
  { text: "Role: LabRole or least-privilege", options: { bullet: true, breakLine: true } },
  { text: "Data: ephemeral demo or PostgreSQL", options: { bullet: true, breakLine: true } },
  { text: "Throttle, log retention, alarms", options: { bullet: true, breakLine: true } },
  { text: "Passes cfn-lint with 0 findings", options: { bullet: true } },
], { x: 0.75, y: 1.95, w: 3.85, h: 2.8, fontSize: 14, paraSpaceAfter: 6 });
const pipe = [["Every push", "56 tests · audit · package smoke test · cfn-lint · ShellCheck · secret scan", C.accent3], ["Deploy", "Manual only, typed confirmation, pre-flight checks, change-set review", C.accent1], ["Cleanup", "Deletes the stack, then verifies nothing is left", C.accent5]];
pipe.forEach(([h, d, col], i) => {
  const y = 1.3 + i * 1.23;
  card(s, { x: 5.1, y, w: 4.4, h: 1.08 });
  s.addShape(pres.shapes.OVAL, { x: 5.3, y: y + 0.32, w: 0.42, h: 0.42, fill: { color: col }, line: { type: "none" }, objectName: nm("dot") });
  text(s, h, { x: 5.9, y: y + 0.12, w: 3.45, h: 0.32, fontSize: 14, bold: true, color: C.text2 });
  text(s, d, { x: 5.9, y: y + 0.45, w: 3.45, h: 0.6, fontSize: 12 });
});
s.addNotes("Because the sandbox deletes everything after a session, infrastructure as code is essential: the same template recreates the stack in minutes. GitHub Actions never deploy automatically, so CI can never spend credits by accident. GitHub OIDC would be the best practice, but the sandbox forbids creating identity providers; the trust policy is designed and documented.");

// ===================== 11. Cost =====================
pres.addSection({ title: "Results" });
s = content("Results", "Cost: far below the cap");
s.addChart(pres.charts.BAR, [{ name: "Estimated credits (US$)", labels: ["One demo session", "Idle 30 days", "Abuse at full throttle (24 h)", "Our credit cap"], values: [0.03, 0.70, 1.80, 2.00] }], {
  x: 0.5, y: 1.25, w: 5.6, h: 3.7, barDir: "bar", chartColors: [HEX.accent3, HEX.accent4, HEX.accent5, HEX.dk2],
  showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "$0.00", dataLabelFontSize: 11, dataLabelColor: HEX.dk1, dataLabelFontFace: "+mn-lt",
  catAxisLabelColor: HEX.dk1, catAxisLabelFontSize: 11, catAxisLabelFontFace: "+mn-lt", valAxisHidden: true, valAxisMaxVal: 2.4,
  valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false,
  showTitle: true, title: "Estimated Academy credit use (no free tier)", titleFontSize: 13, titleColor: HEX.dk2, titleFontFace: "+mn-lt",
  objectName: "cost-chart",
});
card(s, { x: 6.4, y: 1.25, w: 3.1, h: 3.7, fill: C.text2 });
text(s, "₹0", { x: 6.6, y: 1.45, w: 2.7, h: 0.8, fontSize: 44, bold: true, color: C.accent1 });
text(s, "personal spending", { x: 6.6, y: 2.25, w: 2.7, h: 0.35, fontSize: 14, color: C.background1 });
text(s, [
  { text: "No servers, NAT, load balancers or RDS", options: { bullet: true, breakLine: true } },
  { text: "Throttling caps abuse", options: { bullet: true, breakLine: true } },
  { text: "Stack deleted after each demo", options: { bullet: true } },
], { x: 6.6, y: 2.75, w: 2.75, h: 2.0, fontSize: 13, color: C.background1, paraSpaceAfter: 6 });
s.addNotes("Estimates use AWS's published us-east-1 prices without assuming any free tier. A demo session costs a few cents of Academy credit. The only idle charges are alarms and SQS polling, about 70 cents a month, and the sandbox removes even those at session end. The worst case, someone hammering the public URL at full throttle for a day, is still under our 2-dollar cap.");

// ===================== 12. Testing =====================
s = content("Results", "Testing and verification");
const tstats = [["56/56", "automated tests pass"], ["0", "dependency vulnerabilities"], ["0", "lint findings (template, scripts, CI)"], ["2", "pre-existing bugs found and fixed"]];
tstats.forEach(([v, l], i) => {
  const x = 0.5 + i * 2.3;
  card(s, { x, y: 1.3, w: 2.1, h: 1.55 });
  text(s, v, { x: x + 0.1, y: 1.42, w: 1.9, h: 0.75, fontSize: 36, bold: true, color: i === 3 ? C.accent5 : C.accent3, align: "center", valign: "middle" });
  text(s, l, { x: x + 0.12, y: 2.2, w: 1.86, h: 0.55, fontSize: 12, align: "center" });
});
text(s, [
  { text: "What the new tests prove", options: { bold: true, color: C.text2, breakLine: true } },
  { text: "Real Lambda events run through the real Express app: login, roles, CORS, security headers", options: { bullet: true, breakLine: true } },
  { text: "A forged X-Forwarded-For header cannot bypass the login throttle", options: { bullet: true, breakLine: true } },
  { text: "Leave decisions publish events; the worker retries only failed messages", options: { bullet: true, breakLine: true } },
  { text: "The template contains no paid resource types, wildcard IAM or exposed secrets", options: { bullet: true } },
], { x: 0.5, y: 3.1, w: 9.0, h: 1.9, fontSize: 14, paraSpaceAfter: 4 });
s.addNotes("21 original tests plus 35 new ones. The built deployment package is also smoke-tested on its own. Highlight the two bugs: in local in-memory mode, managers could not approve leave or move tasks because of correlated SQL subqueries. We rewrote them into equivalent IN subqueries and added regression tests.");

// ===================== 13. Deployment status =====================
s = content("Results", "Deployment status");
const cols = [
  ["Verified", C.accent3, ["Sandbox services and budget", "56 tests, linters, audit", "Package smoke test"]],
  ["Ready to deploy", C.accent2, ["Lambda, API Gateway, SQS, SNS", "SSM secrets, CloudWatch alarms", "One command, about 10 minutes"]],
  ["Designed only", C.accent4, ["RDS / Aurora database", "CloudFront + WAF", "GitHub OIDC deployments"]],
];
cols.forEach(([h, col, items], i) => {
  const x = 0.5 + i * 3.05;
  card(s, { x, y: 1.3, w: 2.85, h: 2.45 });
  s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: 1.48, w: 0.36, h: 0.36, fill: { color: col }, line: { type: "none" }, objectName: nm("dot") });
  text(s, h, { x: x + 0.7, y: 1.46, w: 2.0, h: 0.4, fontSize: 16, bold: true, color: C.text2, valign: "middle" });
  text(s, items.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < items.length - 1 } })), { x: x + 0.2, y: 2.05, w: 2.5, h: 1.6, fontSize: 13, paraSpaceAfter: 6 });
});
text(s, [
  { text: "On demonstration day: ", options: { bold: true, color: C.accent5 } },
  { text: "start the lab → deploy from CloudShell → open the live HTTPS link → show logs and queue metrics → delete the stack. The sandbox removes everything when the session ends, so deployment happens in the same session as the demo." },
], { x: 0.5, y: 4.0, w: 9.0, h: 0.95, fontSize: 13 });
s.addNotes("Be explicit with the examiner about what is deployed. Before the demo session, nothing runs on AWS. Everything is implemented and verified, and the deployment path is scripted. If we deploy during the demo, show the live link, the worker log entry for an approved leave, and the SQS metrics, then run the cleanup script.");

// ===================== 14. Limitations & future =====================
s = content("Results", "Limitations and future work");
card(s, { x: 0.5, y: 1.3, w: 4.35, h: 2.95 });
text(s, "Current limitations", { x: 0.75, y: 1.5, w: 3.9, h: 0.35, fontSize: 16, bold: true, color: C.accent5 });
text(s, [
  { text: "Demo data lives in each Lambda container", options: { bullet: true, breakLine: true } },
  { text: "Login throttle is per container", options: { bullet: true, breakLine: true } },
  { text: "LabRole is broader than ideal", options: { bullet: true, breakLine: true } },
  { text: "KMS not listed, so secret storage is checked in-session", options: { bullet: true, breakLine: true } },
  { text: "PostgreSQL mode not exercised", options: { bullet: true } },
], { x: 0.75, y: 1.95, w: 3.9, h: 2.2, fontSize: 14, paraSpaceAfter: 6 });
card(s, { x: 5.15, y: 1.3, w: 4.35, h: 2.95 });
text(s, "Production roadmap", { x: 5.4, y: 1.5, w: 3.9, h: 0.35, fontSize: 16, bold: true, color: C.accent3 });
text(s, [
  { text: "RDS / Aurora with RDS Proxy in a VPC", options: { bullet: true, breakLine: true } },
  { text: "CloudFront, WAF and a custom domain", options: { bullet: true, breakLine: true } },
  { text: "Cognito or HttpOnly cookie sessions", options: { bullet: true, breakLine: true } },
  { text: "DynamoDB for rate limits and idempotency", options: { bullet: true, breakLine: true } },
  { text: "X-Ray tracing and OIDC canary deploys", options: { bullet: true } },
], { x: 5.4, y: 1.95, w: 3.9, h: 2.2, fontSize: 14, paraSpaceAfter: 6 });
text(s, [{ text: "Every limitation on the left has a matching production fix on the right.", options: { italic: true, color: C.accent4 } }], { x: 0.5, y: 4.45, w: 9.0, h: 0.4, fontSize: 13 });
s.addNotes("Being honest about limitations is part of good engineering. The roadmap shows what a paid production environment would add, and each item maps to a limitation on the left.");

// ===================== 15. Closing =====================
pres.addSection({ title: "Close" });
s = pres.addSlide({ masterName: "CLOSING_DARK", sectionTitle: "Close" });
s.addText("Conclusion", { placeholder: "title" });
const take = [
  ["Same app, cloud-native", "Unchanged business logic on Lambda, behind API Gateway"],
  ["Real cloud concepts", "Serverless, messaging, secrets, IAM, monitoring, IaC"],
  ["Evidence over claims", "56 tests, verified sandbox, honest deployment status"],
];
take.forEach(([h, d], i) => {
  const x = 0.6 + i * 3.0;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y: 1.6, w: 2.8, h: 1.9, rectRadius: 0.08, fill: { color: C.text1 }, line: { color: C.accent1, width: 1 }, objectName: nm("take") });
  text(s, h, { x: x + 0.2, y: 1.8, w: 2.4, h: 0.6, fontSize: 16, bold: true, color: C.accent1 });
  text(s, d, { x: x + 0.2, y: 2.45, w: 2.4, h: 0.95, fontSize: 13, color: C.background1 });
});
text(s, "Thank you. Questions?", { x: 0.6, y: 4.0, w: 8.8, h: 0.6, fontSize: 28, bold: true, color: C.background1 });
text(s, "Private repository: Ak7950/EnterpriseOS-AWS-Cloud (access on request)", { x: 0.6, y: 4.7, w: 8.8, h: 0.35, fontSize: 12, color: C.accent4 });
s.addNotes("Summarise the three takeaways and invite questions. Likely viva questions and answers are in docs/evaluation-guide.md: cold starts, why HTTP API over REST, duplicates with at-least-once delivery, least privilege with LabRole, and how cost was controlled.");

(async () => {
  await pres.writeFile({ fileName: OUT });
  await applyTheme(OUT, THEME);
  console.log("wrote", OUT);
})();

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
  ["₹0", "Zero personal spend", "No paid plan, no free-tier assumptions"],
  ["$", "AWS Free plan", "$120 credits; no charges unless upgraded"],
  ["2", "Two environments", "Free plan target, Academy sandbox fallback"],
  ["=", "Preserve the app", "Same routes, roles and local workflow"],
];
cons.forEach(([b, h, d], i) => {
  const x = 4.2 + (i % 2) * 2.7, y = 1.3 + Math.floor(i / 2) * 1.85;
  card(s, { x, y, w: 2.5, h: 1.65 });
  badge(s, x + 0.2, y + 0.2, b);
  text(s, h, { x: x + 0.75, y: y + 0.22, w: 1.65, h: 0.4, fontSize: 14, bold: true, color: C.text2, valign: "middle" });
  text(s, d, { x: x + 0.2, y: y + 0.75, w: 2.15, h: 0.8, fontSize: 12, color: C.text1 });
});
s.addNotes("The cloud question: how do you move an existing app to AWS so it demonstrates real cloud concepts without changing business logic and without spending money? Walk through the four constraints. Our deployment target is a new AWS account on the Free plan: 120 dollars of credits, 182 days, no charges unless upgraded, plus a zero-spend budget alert. The AWS Academy sandbox (40 dollars, 3-hour sessions) is the fallback. The original project, its Vercel deployment and its database were never touched; this is a separate private repository.");

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
s.addNotes("Left to right: the browser calls API Gateway, which forwards to the API Lambda running our unchanged Express app. On cold start it reads secrets from Parameter Store. When a manager approves leave or assigns a task, an event goes to SQS; a worker Lambda processes it and publishes to SNS; failures retry and then land in the dead-letter queue. CloudWatch collects logs and alarms. Dashed lines mean implemented and tested but not yet deployed. Key idea: Lambda receives JSON events, not HTTP connections, so a small dependency-free bridge starts Express on a private loopback port and replays each event as a real HTTP request. Every security check behaves exactly as it does locally, at about 1 ms overhead.");

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
s = content("Engineering", "Security and automation");
const sec = [
  ["Secrets", "Only in SSM SecureStrings; a test proves none are in Lambda env vars"],
  ["Least privilege", "Exact actions on exact ARNs; no wildcards (tested)"],
  ["Spoof-proof throttle", "X-Forwarded-For overwritten with the AWS source IP"],
  ["One template", "SAM / CloudFormation creates or deletes the whole stack"],
  ["CI on every push", "Tests, audit, linters and secret scan in GitHub Actions"],
  ["Guarded deploys", "Manual only: pre-flight checks, typed confirmation, verified cleanup"],
];
sec.forEach(([h, d], i) => {
  const x = 0.5 + (i % 3) * 3.05, y = 1.3 + Math.floor(i / 3) * 1.85;
  card(s, { x, y, w: 2.85, h: 1.6 });
  badge(s, x + 0.2, y + 0.2, "✓", i < 3 ? C.accent3 : C.accent2, C.background1);
  text(s, h, { x: x + 0.75, y: y + 0.22, w: 1.95, h: 0.4, fontSize: 15, bold: true, color: C.text2, valign: "middle" });
  text(s, d, { x: x + 0.2, y: y + 0.78, w: 2.45, h: 0.75, fontSize: 12 });
});
s.addNotes("Top row is security, bottom row is automation. All original controls are preserved: bcrypt, 8-hour JWTs, role checks, tenant-scoped parameterised SQL and security headers. Accepted risk to mention honestly: in the Academy sandbox we must use LabRole, which is broader than our least-privilege policies. In a normal account the template creates the tight roles automatically. Deployments are never automatic, so CI can never spend credits by accident.");

// ===================== 10b. Website demo =====================
pres.addSection({ title: "Results" });
s = content("Results", "The application, unchanged");
[["ui-dashboard.png", "Manager dashboard"], ["ui-audit.png", "Audit trail after a leave approval"]].forEach(([f, cap], i) => {
  const x = 0.5 + i * 4.6;
  s.addImage({ path: path.join(__dirname, "..", "report", "figures", f), x, y: 1.3, w: 4.4, h: 2.475, objectName: nm("shot"), altText: cap });
  s.addShape(pres.shapes.RECTANGLE, { x, y: 1.3, w: 4.4, h: 2.475, fill: { type: "none" }, line: { color: C.accent4, width: 0.75 }, objectName: nm("frame") });
  text(s, cap, { x, y: 3.85, w: 4.4, h: 0.3, fontSize: 12, color: C.accent4, align: "center", italic: true });
});
text(s, [
  { text: "Same code locally and on Lambda: ", options: { bold: true, color: C.text2 } },
  { text: "approving Rohan's leave writes the audit entry shown on the right and publishes a LEAVE_DECIDED event to SQS." },
], { x: 0.5, y: 4.35, w: 9.0, h: 0.6, fontSize: 14 });
s.addNotes("Screenshots from EnterpriseOS running with its synthetic demo data. The left shows the manager dashboard; the right shows the audit trail after the manager approved a pending leave request. In the cloud version, that same approval also publishes an event that the worker Lambda processes asynchronously.");

// ===================== 11. Cost =====================
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
  { text: "Zero-spend budget alert", options: { bullet: true } },
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
s = content("Results", "Status and future scope");
const cols = [
  ["Verified", C.accent3, ["AWS services and budgets", "56 tests, linters, audit", "Package smoke test"]],
  ["Ready to deploy", C.accent2, ["Lambda, API Gateway, SQS, SNS", "SSM secrets, CloudWatch alarms", "One command, about 10 minutes"]],
  ["Future scope", C.accent4, ["Managed PostgreSQL (RDS)", "CloudFront, WAF, custom domain", "Cognito, X-Ray, OIDC deploys"]],
];
cols.forEach(([h, col, items], i) => {
  const x = 0.5 + i * 3.05;
  card(s, { x, y: 1.3, w: 2.85, h: 2.45 });
  s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: 1.48, w: 0.36, h: 0.36, fill: { color: col }, line: { type: "none" }, objectName: nm("dot") });
  text(s, h, { x: x + 0.7, y: 1.46, w: 2.0, h: 0.4, fontSize: 16, bold: true, color: C.text2, valign: "middle" });
  text(s, items.map((t, k) => ({ text: t, options: { bullet: true, breakLine: k < items.length - 1 } })), { x: x + 0.2, y: 2.05, w: 2.5, h: 1.6, fontSize: 13, paraSpaceAfter: 6 });
});
text(s, [
  { text: "Deployment: ", options: { bold: true, color: C.accent5 } },
  { text: "waiting only on AWS's new-account verification for our Free plan account. Then: deploy from CloudShell → live HTTPS link → logs and queue metrics as evidence. Limitations: demo data lives per Lambda container; PostgreSQL mode not yet exercised." },
], { x: 0.5, y: 4.0, w: 9.0, h: 0.95, fontSize: 13 });
s.addNotes("Be explicit with the examiner about what is deployed. At the time of writing, nothing runs on AWS yet because the new account is still being verified by AWS. Everything is implemented and verified, and the deployment path is scripted. If we deploy during the demo, show the live link, the worker log entry for an approved leave, and the SQS metrics, then run the cleanup script.");

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

import crypto from 'node:crypto';
import { q } from './db.js'; import { hash } from './auth.js';

// Deterministic UUIDs for synthetic demo records. Every process that seeds an
// empty database produces identical IDs, so stateless horizontally-scaled
// instances (e.g. several AWS Lambda containers in ephemeral demo mode) agree on
// the same users, tasks and leave requests referenced by JWTs and URLs.
export function demoId(key) {
  const b = crypto.createHash('sha256').update(`enterpriseos-demo:${key}`).digest();
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.subarray(0, 16).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function seed() {
  if (Number((await q('SELECT count(*) FROM organizations')).rows[0].count) !== 0) return;
  const org = (await q("INSERT INTO organizations(id,name) VALUES($1,'Acme Systems') RETURNING id", [demoId('organization')])).rows[0];
  const deps = {};
  for (const [name, head] of [['Engineering', 'Priya Sharma'], ['Human Resources', 'Aarav Mehta'], ['Marketing', 'Nisha Kapoor'], ['Finance', 'Kabir Malhotra']]) {
    deps[name] = (await q('INSERT INTO departments(id,organization_id,name,head_name) VALUES($4,$1,$2,$3) RETURNING id', [org.id, name, head, demoId(`department:${name}`)])).rows[0].id;
  }
  const pass = await hash('Demo@12345');
  const make = async (first, last, email, role, dep, designation, managerId = null) => (await q('INSERT INTO users(id,organization_id,first_name,last_name,email,password_hash,role,department_id,designation,manager_id) VALUES($10,$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *', [org.id, first, last, email, pass, role, deps[dep], designation, managerId, demoId(`user:${email}`)])).rows[0];
  const admin = await make('Aarav', 'Mehta', 'admin@demo.com', 'ADMIN', 'Human Resources', 'Platform Administrator');
  const engManager = await make('Priya', 'Sharma', 'manager@demo.com', 'MANAGER', 'Engineering', 'Engineering Manager');
  const marketingManager = await make('Nisha', 'Kapoor', 'marketing.manager@demo.com', 'MANAGER', 'Marketing', 'Marketing Manager');
  const people = {
    rohan: await make('Rohan', 'Verma', 'employee@demo.com', 'EMPLOYEE', 'Engineering', 'Frontend Engineer', engManager.id),
    maya: await make('Maya', 'Iyer', 'maya@demo.com', 'EMPLOYEE', 'Engineering', 'Backend Engineer', engManager.id),
    dev: await make('Dev', 'Patel', 'dev@demo.com', 'EMPLOYEE', 'Engineering', 'QA Engineer', engManager.id),
    ananya: await make('Ananya', 'Rao', 'ananya@demo.com', 'EMPLOYEE', 'Engineering', 'Product Designer', engManager.id),
    karan: await make('Karan', 'Singh', 'karan@demo.com', 'EMPLOYEE', 'Marketing', 'Content Strategist', marketingManager.id),
    zoe: await make('Zoe', 'Fernandes', 'zoe@demo.com', 'EMPLOYEE', 'Marketing', 'Growth Specialist', marketingManager.id),
    kabir: await make('Kabir', 'Malhotra', 'kabir@demo.com', 'EMPLOYEE', 'Finance', 'Financial Analyst', admin.id)
  };
  const project = async (name, description, manager, priority, days) => { const due = new Date(); due.setDate(due.getDate() + days); return (await q('INSERT INTO projects(id,organization_id,name,description,manager_id,due_date,priority) VALUES($7,$1,$2,$3,$4,$5,$6) RETURNING id', [org.id, name, description, manager.id, due.toISOString().slice(0, 10), priority, demoId(`project:${name}`)])).rows[0]; };
  const commerce = await project('E-Commerce Platform', 'A reliable, accessible customer checkout experience.', engManager, 'HIGH', 45);
  const insight = await project('People Insights Dashboard', 'Organization analytics for managers and leadership.', engManager, 'MEDIUM', 60);
  const campaign = await project('Autumn Growth Campaign', 'A multi-channel acquisition and retention campaign.', marketingManager, 'HIGH', 35);
  const addTask = async (projectId, title, status, priority, assignee, creator, days, description) => {
    const due = new Date(); due.setDate(due.getDate() + days);
    await q('INSERT INTO tasks(id,organization_id,project_id,title,description,status,priority,assignee_id,creator_id,due_date,estimated_hours) VALUES($10,$1,$2,$3,$4,$5,$6,$7,$8,$9,8)', [org.id, projectId, title, description, status, priority, assignee.id, creator.id, due.toISOString().slice(0, 10), demoId(`task:${title}`)]);
  };
  for (const [title, status, priority, assignee, days, description] of [
    ['Design checkout error states', 'TODO', 'HIGH', people.rohan, 4, 'Design error states and recovery paths.'], ['Implement payment adapter', 'IN_PROGRESS', 'URGENT', people.maya, 2, 'Connect the payment provider and error handling.'], ['Mobile QA regression', 'IN_REVIEW', 'MEDIUM', people.dev, 1, 'Verify core checkout journeys on mobile.'], ['Catalog performance baseline', 'DONE', 'MEDIUM', people.maya, -3, 'Capture current search and catalog metrics.'], ['Accessibility review', 'BACKLOG', 'LOW', people.ananya, 12, 'Review checkout flow against WCAG requirements.']
  ]) await addTask(commerce.id, title, status, priority, assignee, engManager, days, description);
  for (const [title, status, priority, assignee, days, description] of [
    ['Define manager metrics', 'DONE', 'HIGH', people.ananya, -2, 'Agree on key team health indicators.'], ['Build attendance data table', 'IN_PROGRESS', 'HIGH', people.rohan, 5, 'Create scalable attendance records and filters.'], ['Validate analytics access', 'TODO', 'MEDIUM', people.maya, 8, 'Confirm manager and administrator visibility.'], ['Review data export', 'BACKLOG', 'LOW', people.dev, 14, 'Test the CSV workflow with larger datasets.']
  ]) await addTask(insight.id, title, status, priority, assignee, engManager, days, description);
  for (const [title, status, priority, assignee, days, description] of [
    ['Create audience segments', 'DONE', 'MEDIUM', people.zoe, -1, 'Prepare campaign audience definitions.'], ['Draft launch content', 'IN_PROGRESS', 'HIGH', people.karan, 3, 'Write launch email and social copy.'], ['Set campaign attribution', 'TODO', 'HIGH', people.zoe, 6, 'Configure campaign tracking and dashboards.'], ['Approve creative brief', 'IN_REVIEW', 'MEDIUM', people.karan, 2, 'Review final creative brief with stakeholders.']
  ]) await addTask(campaign.id, title, status, priority, assignee, marketingManager, days, description);
  const staff = [admin, engManager, marketingManager, ...Object.values(people)];
  for (const [offset, hour] of [[0, 9], [1, 9], [2, 10], [3, 9], [4, 10]]) for (const [index, person] of staff.entries()) {
    if (offset === 0 && index > 7) continue;
    const workDate = new Date(); workDate.setDate(workDate.getDate() - offset);
    const clockIn = new Date(workDate); clockIn.setHours(hour + (index % 3), (index * 7) % 30, 0, 0);
    const clockOut = offset === 0 && index === 0 ? null : new Date(clockIn.getTime() + (7.5 + (index % 2) * .5) * 3600000);
    await q('INSERT INTO attendance(organization_id,user_id,work_date,clock_in,clock_out,status) VALUES($1,$2,$3,$4,$5,$6)', [org.id, person.id, workDate.toISOString().slice(0, 10), clockIn.toISOString(), clockOut?.toISOString() || null, 'PRESENT']);
  }
  const relativeDate = days => { const value = new Date(); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); };
  await q("INSERT INTO leave_requests(id,organization_id,user_id,leave_type,start_date,end_date,reason,status) VALUES($8,$1,$2,'Annual Leave',$3,$4,'Family travel','PENDING'),($9,$1,$5,'Casual Leave',$6,$7,'Personal appointment','APPROVED')", [org.id, people.rohan.id, relativeDate(10), relativeDate(12), people.zoe.id, relativeDate(-8), relativeDate(-7), demoId('leave:rohan-annual'), demoId('leave:zoe-casual')]);
  await q("INSERT INTO performance_reviews(organization_id,employee_id,reviewer_id,rating,feedback,goals) VALUES($1,$2,$3,4,'Strong ownership and thoughtful delivery.','Lead the checkout accessibility pass.'),($1,$4,$3,5,'Excellent technical depth and collaboration.','Mentor the analytics workstream.'),($1,$5,$6,4,'Consistent campaign execution and clear writing.','Own the launch content calendar.')", [org.id, people.rohan.id, engManager.id, people.maya.id, people.karan.id, marketingManager.id]);
  await q("INSERT INTO notifications(organization_id,recipient_id,type,title,message) VALUES($1,$2,'TASK_ASSIGNED','New task assigned','Priya assigned you Design checkout error states.'),($1,$3,'SYSTEM','Welcome to EnterpriseOS','Your workspace is ready.'),($1,$4,'TASK_ASSIGNED','New task assigned','Nisha assigned you Draft launch content.')", [org.id, people.rohan.id, engManager.id, people.karan.id]);
  await q("INSERT INTO audit_logs(organization_id,actor_id,action,entity,metadata) VALUES($1,$2,'SYSTEM_SEEDED','ORGANIZATION','{\"source\":\"development seed\",\"projects\":3,\"users\":10}')", [org.id, admin.id]);
}

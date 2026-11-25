# Contributing to EnterpriseOS

Thank you for helping improve EnterpriseOS. Keep changes focused, preserve tenant boundaries, and update documentation/tests whenever behavior or configuration changes.

## Development workflow

1. Create a focused branch from the intended base branch.
2. Install dependencies with npm ci.
3. Create a local .env from .env.example; never commit .env or real credentials.
4. Make the smallest complete change that addresses the task.
5. Add or update automated tests for changed behavior.
6. Run npm test, npm audit --omit=dev, and git diff --check.
7. Commit with a clear conventional message.
8. Push the branch and open a pull request.
9. Review the diff and CI result before merging.

Example commit messages:

~~~text
feat: add employee management workflow
fix: enforce organization boundary for task assignment
test: cover attendance date conversion
docs: refresh deployment instructions
chore: update CI workflow
~~~

## Project team

EnterpriseOS is developed by Group 4 for Software Engineering (UCS503):

- Avik Khetarpal
- Humza Ali Choudhri
- Shashwat Tewari

The team shares responsibility for requirements, design, implementation, verification, and documentation. Do not assign an individual ownership claim in project documentation unless it has been confirmed by the team.

## Security and data handling

- Never commit .env, Neon connection strings, JWT secrets, one-time passwords, or real user data.
- Use synthetic test records in issues, screenshots, and demonstrations.
- Do not seed demo accounts into production.
- Report suspected vulnerabilities privately using SECURITY.md.

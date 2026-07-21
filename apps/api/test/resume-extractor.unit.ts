import assert from 'node:assert/strict';
import { ResumeExtractorService } from '../src/modules/matching/resume-extractor.service';

// In-house resume parser — deterministic extraction from resume text.
async function main() {
  const svc = new ResumeExtractorService({} as any);
  let passed = 0;

  const resume = `Ananya Sharma
Pune, Maharashtra
ananya.sharma@example.com | +91 98765 43210 | linkedin.com/in/ananya-sharma

Summary
Senior Backend Engineer with 6 years of experience building scalable APIs.

Skills
Node.js, PostgreSQL, AWS, TypeScript, Docker, Kubernetes

Work Experience
Senior Software Engineer, Infosys | Jan 2021 - Present
Software Engineer, TCS | Jun 2018 - Dec 2020

Education
B.Tech Computer Science, Pune University, 2018
`;
  const r = svc.parseText(resume, ['Node.js', 'PostgreSQL']);

  assert.equal(r.firstName, 'Ananya');
  assert.equal(r.lastName, 'Sharma');
  assert.equal(r.email, 'ananya.sharma@example.com');
  assert.ok(r.phone && r.phone.includes('98765'));
  assert.equal(r.city, 'Pune');
  assert.equal(r.totalYearsExperience, 6);
  assert.ok(r.linkedIn && r.linkedIn.includes('linkedin.com/in/ananya-sharma'));
  passed++;

  // Skills matched from both the dictionary and the tenant list.
  for (const s of ['Node.js', 'PostgreSQL', 'AWS', 'TypeScript', 'Docker', 'Kubernetes']) {
    assert.ok(r.skills.includes(s), `missing skill ${s}`);
  }
  passed++;

  // Work history parsed with company/title/dates (heading not treated as a role).
  assert.equal(r.experiences.length, 2);
  assert.equal(r.experiences[0].title, 'Senior Software Engineer');
  assert.equal(r.experiences[0].company, 'Infosys');
  assert.equal(r.experiences[0].startDate, '2021-01');
  assert.equal(r.experiences[1].endDate, '2020-12');
  passed++;

  // Education with degree + year.
  assert.equal(r.education.length, 1);
  assert.equal(r.education[0].degree, 'B.Tech');
  assert.equal(r.education[0].year, 2018);
  passed++;

  // Name derived from email when the header has no clean name line.
  const r2 = svc.parseText('CURRICULUM VITAE\njohn.doe@corp.com\nSoftware developer', []);
  assert.equal(r2.firstName, 'John');
  assert.equal(r2.lastName, 'Doe');
  passed++;

  // Empty / junk input is handled safely.
  const r3 = svc.parseText('', []);
  assert.equal(r3.firstName, null);
  assert.equal(r3.skills.length, 0);
  passed++;

  console.log(`Resume extractor unit: ${passed} passed, 0 failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

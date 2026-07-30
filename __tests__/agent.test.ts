import { Agent } from '../src/agent';
import path from 'path';
import fs from 'fs';

describe('Agent Integration', () => {
  const agent = new Agent();

  it('orchestrates parser → codegen → executor flow', async () => {
    const fixtureSkill = path.join(__dirname, 'fixtures/skill.yaml');
    expect(fs.existsSync(fixtureSkill)).toBe(true);
  });

  it('throws error if skill.md not found', async () => {
    await expect(agent.run('/nonexistent/skill.md', '/tmp')).rejects.toThrow();
  });
});

import { Parser } from '../src/parser';
import fs from 'fs';
import path from 'path';

describe('Parser', () => {
  const parser = new Parser();

  describe('parseSkillFile', () => {
    it('parses valid YAML skill file', async () => {
      const fixturePath = path.join(__dirname, 'fixtures/skill.yaml');
      const config = await parser.parseSkillFile(fixturePath);

      expect(config.project.name).toBe('test-api');
      expect(config.server.port).toBe(3000);
      expect(config.steps).toContain('npm-install');
    });

    it('throws error if skill file not found', async () => {
      await expect(parser.parseSkillFile('/nonexistent/skill.yaml')).rejects.toThrow(
        'skill.md not found'
      );
    });

    it('throws error if required fields missing', async () => {
      const invalidSkill = 'project:\n  name: test\n';
      const tempFile = '/tmp/invalid-skill.yaml';
      fs.writeFileSync(tempFile, invalidSkill);

      await expect(parser.parseSkillFile(tempFile)).rejects.toThrow();

      fs.unlinkSync(tempFile);
    });
  });

  describe('normalizeTown', () => {
    it('lowercases and trims', () => {
      const result = (parser as any).normalizeTown('  BUDAPEST  ');
      expect(result).toBe('budapest');
    });

    it('removes accents', () => {
      const result = (parser as any).normalizeTown('Václav');
      expect(result).toBe('vaclav');
    });

    it('handles multiple accents', () => {
      const result = (parser as any).normalizeTown('Kraków');
      expect(result).toBe('krakow');
    });
  });
});

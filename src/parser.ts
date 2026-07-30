import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { Config, TemplateContext } from './types';
import { log } from './logger';

export class Parser {
  async parseSkillFile(skillPath: string): Promise<Config> {
    if (!fs.existsSync(skillPath)) {
      throw new Error(`skill.md not found: ${skillPath}`);
    }

    const content = fs.readFileSync(skillPath, 'utf-8');
    const config = yaml.load(content) as Config;

    this.validateConfig(config);
    return config;
  }

  private validateConfig(config: Config): void {
    if (!config.project?.name) throw new Error('Missing project.name');
    if (!config.database?.url) throw new Error('Missing database.url');
    if (!config.server?.host || config.server.port === undefined) {
      throw new Error('Missing server.host or server.port');
    }
    if (!config.data?.seedFile || !config.data?.coordinatesRef) {
      throw new Error('Missing data.seedFile or data.coordinatesRef');
    }
    if (!Array.isArray(config.steps)) throw new Error('Missing steps array');
  }

  async loadCoordinates(refFile: string): Promise<Record<string, { lat: number; lon: number }>> {
    if (!fs.existsSync(refFile)) {
      throw new Error(`Coordinates reference file not found: ${refFile}`);
    }

    const content = fs.readFileSync(refFile, 'utf-8');
    const coords: Record<string, { lat: number; lon: number }> = {};

    const lines = content.split('\n');
    let inTable = false;

    for (const line of lines) {
      if (line.includes('| Település')) inTable = true;
      if (!inTable || line.startsWith('|---')) continue;

      const match = line.match(/\|\s*([^\|]+?)\s*\|\s*([\d.]+)\s*\|\s*([-\d.]+)\s*\|/);
      if (match) {
        const town = match[1].trim();
        const lat = parseFloat(match[2]);
        const lon = parseFloat(match[3]);
        const normalized = this.normalizeTown(town);
        coords[normalized] = { lat, lon };
      }
    }

    log.info(`Loaded ${Object.keys(coords).length} towns from ${refFile}`);
    return coords;
  }

  async loadSeed(seedFile: string): Promise<any[]> {
    if (!fs.existsSync(seedFile)) {
      throw new Error(`Seed file not found: ${seedFile}`);
    }

    const content = fs.readFileSync(seedFile, 'utf-8');
    const data = JSON.parse(content);

    if (!Array.isArray(data)) throw new Error('Seed file must be a JSON array');
    log.info(`Loaded ${data.length} customers from ${seedFile}`);

    return data;
  }

  private normalizeTown(town: string): string {
    const accents: Record<string, string> = {
      á: 'a', é: 'e', í: 'i', ó: 'o', ö: 'o', ő: 'o',
      ú: 'u', ü: 'u', ű: 'u', č: 'c', š: 's', ž: 'z',
    };

    return town
      .toLowerCase()
      .trim()
      .replace(/[áéíóöőúüűčšž]/g, c => accents[c] || c);
  }
}

export const parser = new Parser();

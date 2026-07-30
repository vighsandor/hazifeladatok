import { Executor } from '../src/executor';
import { execSync } from 'child_process';

jest.mock('child_process');

describe('Executor', () => {
  const executor = new Executor();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeStep', () => {
    it('calls npm install for npm-install step', async () => {
      (execSync as jest.Mock).mockReturnValue('');

      await executor.executeStep('npm-install', '/test');

      expect(execSync).toHaveBeenCalledWith(
        'npm install',
        expect.objectContaining({ cwd: '/test' })
      );
    });

    it('calls psql migrate for migrate-db step', async () => {
      (execSync as jest.Mock).mockReturnValue('');
      process.env.DATABASE_URL = 'postgresql://test@localhost/test';

      await executor.executeStep('migrate-db', '/test');

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('psql'),
        expect.objectContaining({ cwd: '/test' })
      );
    });

    it('calls npm run seed for seed-data step', async () => {
      (execSync as jest.Mock).mockReturnValue('');

      await executor.executeStep('seed-data', '/test');

      expect(execSync).toHaveBeenCalledWith(
        'npm run seed',
        expect.any(Object)
      );
    });

    it('calls npm test for run-tests step', async () => {
      (execSync as jest.Mock).mockReturnValue('');

      await executor.executeStep('run-tests', '/test');

      expect(execSync).toHaveBeenCalledWith(
        'npm test',
        expect.any(Object)
      );
    });

    it('throws error if command fails', async () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command failed');
      });

      await expect(executor.executeStep('npm-install', '/test')).rejects.toThrow();
    });
  });
});

import { DatabaseConnection } from '../../src/database/connection';

// Mock pg
const mockClient = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn().mockResolvedValue(mockClient),
  query: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
};

jest.mock('pg', () => ({
  Pool: jest.fn(() => mockPool),
}));

describe('DatabaseConnection', () => {
  let dbConnection: DatabaseConnection;

  beforeEach(() => {
    jest.clearAllMocks();
    dbConnection = new DatabaseConnection('postgresql://localhost:5432/test');
  });

  afterEach(async () => {
    await dbConnection.close();
  });

  describe('connect', () => {
    it('should connect to database successfully', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.connect.mockResolvedValue(undefined);

      await dbConnection.connect();

      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed');
      mockPool.connect.mockRejectedValue(error);

      await expect(dbConnection.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.connect.mockResolvedValue(undefined);
      await dbConnection.connect();
    });

    it('should execute query successfully', async () => {
      const sql = 'SELECT * FROM pools';
      const params = ['param1'];
      const expectedResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };

      mockClient.query.mockResolvedValue(expectedResult);

      const result = await dbConnection.query(sql, params);

      expect(mockClient.query).toHaveBeenCalledWith(sql, params);
      expect(result).toEqual(expectedResult);
    });

    it('should execute query without parameters', async () => {
      const sql = 'SELECT * FROM pools';
      const expectedResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };

      mockClient.query.mockResolvedValue(expectedResult);

      const result = await dbConnection.query(sql);

      expect(mockClient.query).toHaveBeenCalledWith(sql, []);
      expect(result).toEqual(expectedResult);
    });

    it('should handle query errors', async () => {
      const sql = 'SELECT * FROM non_existent_table';
      const error = new Error('Table does not exist');

      mockClient.query.mockRejectedValue(error);

      await expect(dbConnection.query(sql)).rejects.toThrow('Table does not exist');
    });
  });

  describe('transaction', () => {
    beforeEach(async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.connect.mockResolvedValue(undefined);
      await dbConnection.connect();
    });

    it('should execute transaction successfully', async () => {
      const queries = [
        { sql: 'INSERT INTO pools (name) VALUES ($1)', params: ['pool1'] },
        { sql: 'INSERT INTO pools (name) VALUES ($1)', params: ['pool2'] },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // First INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // Second INSERT
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // COMMIT

      const result = await dbConnection.transaction(queries);

      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(2, queries[0].sql, queries[0].params);
      expect(mockClient.query).toHaveBeenNthCalledWith(3, queries[1].sql, queries[1].params);
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'COMMIT');
      expect(result).toBe(true);
    });

    it('should rollback on error', async () => {
      const queries = [
        { sql: 'INSERT INTO pools (name) VALUES ($1)', params: ['pool1'] },
        { sql: 'INSERT INTO invalid_table (name) VALUES ($1)', params: ['pool2'] },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // BEGIN
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // First INSERT
        .mockRejectedValueOnce(new Error('Table does not exist')) // Second INSERT fails
        .mockResolvedValueOnce({ rows: [], rowCount: 1 }); // ROLLBACK

      const result = await dbConnection.transaction(queries);

      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(mockClient.query).toHaveBeenNthCalledWith(4, 'ROLLBACK');
      expect(result).toBe(false);
    });

    it('should handle empty queries array', async () => {
      const result = await dbConnection.transaction([]);

      expect(result).toBe(true);
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  describe('isConnected', () => {
    it('should return false when not connected', () => {
      expect(dbConnection.isConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.connect.mockResolvedValue(undefined);

      await dbConnection.connect();

      expect(dbConnection.isConnected()).toBe(true);
    });
  });

  describe('close', () => {
    it('should close connection successfully', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.end.mockResolvedValue(undefined);
      mockPool.end.mockResolvedValue(undefined);

      await dbConnection.connect();
      await dbConnection.close();

      expect(mockClient.end).toHaveBeenCalled();
      expect(mockPool.end).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.end.mockRejectedValue(new Error('Close failed'));

      await dbConnection.connect();
      
      // Should not throw
      await expect(dbConnection.close()).resolves.toBeUndefined();
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when connected', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockResolvedValue({ rows: [{ version: 'PostgreSQL 14.0' }] });

      await dbConnection.connect();
      const health = await dbConnection.healthCheck();

      expect(health).toEqual({
        status: 'healthy',
        database: 'PostgreSQL 14.0',
        connected: true,
      });
    });

    it('should return unhealthy status when not connected', async () => {
      const health = await dbConnection.healthCheck();

      expect(health).toEqual({
        status: 'unhealthy',
        error: 'Not connected to database',
        connected: false,
      });
    });

    it('should return unhealthy status on query error', async () => {
      mockPool.connect.mockResolvedValue(mockClient);
      mockClient.connect.mockResolvedValue(undefined);
      mockClient.query.mockRejectedValue(new Error('Query failed'));

      await dbConnection.connect();
      const health = await dbConnection.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.error).toBe('Query failed');
    });
  });
});

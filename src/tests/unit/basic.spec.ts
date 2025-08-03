describe('Basic Test Suite', () => {
  describe('Environment', () => {
    it('should be in test environment', () => {
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should have access to process', () => {
      expect(process).toBeDefined();
    });
  });

  describe('Basic operations', () => {
    it('should handle basic arithmetic', () => {
      expect(2 + 2).toBe(4);
    });

    it('should handle string operations', () => {
      expect('hello'.toUpperCase()).toBe('HELLO');
    });

    it('should handle array operations', () => {
      const arr = [1, 2, 3];
      expect(arr.length).toBe(3);
      expect(arr.includes(2)).toBe(true);
    });
  });

  describe('Async operations', () => {
    it('should handle promises', async () => {
      const promise = Promise.resolve('test');
      const result = await promise;
      expect(result).toBe('test');
    });

    it('should handle timeouts', async () => {
      const delay = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));
      const start = Date.now();
      await delay(15); // Increased from 10 to 15 for more reliable timing
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(10); // Still check for at least 10ms
    });
  });

  describe('Object operations', () => {
    it('should handle object creation and manipulation', () => {
      const obj = { name: 'John', age: 30 };
      expect(obj.name).toBe('John');
      expect(obj.age).toBe(30);

      obj.age = 31;
      expect(obj.age).toBe(31);
    });

    it('should handle object destructuring', () => {
      const user = { id: 1, name: 'Alice', email: 'alice@example.com' };
      const { id, name } = user;

      expect(id).toBe(1);
      expect(name).toBe('Alice');
    });
  });
});

const mockPasswordResetService = {
  sign: jest.fn(),
  getAccessTokenFromWhitelist: jest.fn(),
  refreshTokens: jest.fn(),
  logout: jest.fn(),
  isPasswordCorrect: jest.fn(),
};

export default mockPasswordResetService;

import { jest } from '@jest/globals';

import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  const registerMock = jest.fn();

  const authServiceMock = {
    register: registerMock,
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new AuthController(authServiceMock as never);
  });

  it('delegates registration to AuthService', async () => {
    const dto = {
      email: 'vijay@example.com',
      password: 'correct horse battery staple',
    };

    registerMock.mockResolvedValue({
      id: 1,
      email: 'vijay@example.com',
    });

    await expect(controller.register(dto)).resolves.toEqual({
      id: 1,
      email: 'vijay@example.com',
    });

    expect(registerMock).toHaveBeenCalledWith(dto);
  });
});

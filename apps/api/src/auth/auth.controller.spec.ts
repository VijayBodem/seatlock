import { jest } from '@jest/globals';

import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  const registerMock = jest.fn();
  const loginMock = jest.fn();

  const authServiceMock = {
    register: registerMock,
    login: loginMock,
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

  it('delegates login to AuthService', async () => {
    const dto = {
      email: 'vijay@example.com',
      password: 'correct horse battery staple',
    };

    loginMock.mockResolvedValue({
      id: 1,
      email: 'vijay@example.com',
      accessToken: 'signed-access-token',
    });

    await expect(controller.login(dto)).resolves.toEqual({
      id: 1,
      email: 'vijay@example.com',
      accessToken: 'signed-access-token',
    });

    expect(loginMock).toHaveBeenCalledWith(dto);
  });

  it('returns the authenticated request user', () => {
    const request = {
      user: {
        id: 1,
        email: 'vijay@example.com',
      },
    };

    expect(controller.me(request as never)).toEqual({
      id: 1,
      email: 'vijay@example.com',
    });
  });
});

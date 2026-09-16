import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import request from 'supertest';
import { App } from 'supertest/types';

import { AdminGuard } from '../src/auth/admin.guard.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { VenuesController } from '../src/venues/venues.controller.js';
import { VenuesService } from '../src/venues/venues.service.js';

describe('Admin authorization (e2e)', () => {
  let app: INestApplication<App>;

  const verifyAsyncMock = jest.fn();
  const findAllMock = jest.fn();
  const createMock = jest.fn();

  const jwtServiceMock = {
    verifyAsync: verifyAsyncMock,
  };

  const venuesServiceMock = {
    findAll: findAllMock,
    create: createMock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [VenuesController],
      providers: [
        JwtAuthGuard,
        AdminGuard,
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: VenuesService,
          useValue: venuesServiceMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows public venue reads without authentication', async () => {
    findAllMock.mockResolvedValue([
      {
        id: 1,
        name: 'SeatLock Cinema',
        city: 'Hyderabad',
        address: null,
      },
    ]);

    await request(app.getHttpServer())
      .get('/venues')
      .expect(200)
      .expect([
        {
          id: 1,
          name: 'SeatLock Cinema',
          city: 'Hyderabad',
          address: null,
        },
      ]);

    expect(verifyAsyncMock).not.toHaveBeenCalled();
    expect(findAllMock).toHaveBeenCalledTimes(1);
  });

  it('rejects an unauthenticated venue mutation with 401', async () => {
    await request(app.getHttpServer())
      .post('/venues')
      .send({
        name: 'Admin Cinema',
        city: 'Hyderabad',
      })
      .expect(401);

    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects a customer venue mutation with 403', async () => {
    verifyAsyncMock.mockResolvedValue({
      sub: 1,
      email: 'customer@example.com',
      role: 'CUSTOMER',
    });

    await request(app.getHttpServer())
      .post('/venues')
      .set('Authorization', 'Bearer customer-token')
      .send({
        name: 'Admin Cinema',
        city: 'Hyderabad',
      })
      .expect(403);

    expect(verifyAsyncMock).toHaveBeenCalledWith('customer-token');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('allows an administrator venue mutation', async () => {
    verifyAsyncMock.mockResolvedValue({
      sub: 2,
      email: 'admin@example.com',
      role: 'ADMIN',
    });

    createMock.mockResolvedValue({
      id: 2,
      name: 'Admin Cinema',
      city: 'Hyderabad',
      address: null,
    });

    await request(app.getHttpServer())
      .post('/venues')
      .set('Authorization', 'Bearer admin-token')
      .send({
        name: 'Admin Cinema',
        city: 'Hyderabad',
      })
      .expect(201)
      .expect({
        id: 2,
        name: 'Admin Cinema',
        city: 'Hyderabad',
        address: null,
      });

    expect(verifyAsyncMock).toHaveBeenCalledWith('admin-token');

    expect(createMock).toHaveBeenCalledWith({
      name: 'Admin Cinema',
      city: 'Hyderabad',
    });
  });
});

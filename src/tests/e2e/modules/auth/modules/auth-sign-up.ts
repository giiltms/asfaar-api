import DefaultContext from '@tests/e2e/context/default-context';
import { User } from '@prisma/client';
import { Roles } from '@modules/app/app.roles';
import { SignUpDTO } from '@modules/auth/dto/sign-up.dto';

export default (ctx: DefaultContext) => {
  let user: User;
  let signUpDTO: SignUpDTO;

  beforeAll(async () => {
    user = await ctx.service.createUser();
  });

  beforeEach(() => {
    signUpDTO = {
      ...ctx.service.getSignUpData(),
      roles: [Roles.USER],
    };
  });

  it('Should be able to sign up a user [POST /auth/sign-up]', async () => {
    const { body } = await ctx.request
      .post('/auth/sign-up')
      .send({
        ...signUpDTO,
        roles: [Roles.USER],
      })
      .expect(201);

    expect(body).toBeDefined();
    expect(body.email).toBe(signUpDTO.email);
  });

  it('Should fail if email already exists [POST /auth/sign-up]', async () => {
    await ctx.request
      .post('/auth/sign-up')
      .send({
        email: user.email,
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        roles: [Roles.USER],
      })
      .expect(409);
  });

  it('Should fail with invalid email format [POST /auth/sign-up]', async () => {
    await ctx.request
      .post('/auth/sign-up')
      .send({
        email: 'invalid-email',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        roles: [Roles.USER],
      })
      .expect(400);
  });
};

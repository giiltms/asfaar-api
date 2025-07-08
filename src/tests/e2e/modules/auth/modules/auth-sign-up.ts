import DefaultContext from '@tests/e2e/context/default-context';
import { User } from '@prisma/client';
import { AUTH_SIGN_UP } from '@tests/e2e/common/routes';
import { SignUpDTO } from '@modules/auth/dto/sign-up.dto';
import { Roles } from '@modules/app/app.roles';

export default (ctx: DefaultContext) => {
  let user: User;
  let signUpDTO: SignUpDTO;

  beforeAll(async () => {
    user = await ctx.service.createUser();
  });

  beforeEach(async () => {
    signUpDTO = ctx.service.getSignUpData();
  });

  it('should return USER_CONFLICT exception', async () => {
    const busyEmailDTO: SignUpDTO = {
      email: user.email,
      password: user.password,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: [Roles.PASSENGER],
    };

    return ctx.request.post(AUTH_SIGN_UP).send(busyEmailDTO).expect(409);
  });

  it('should create new user', async () => {
    return ctx.request
      .post(AUTH_SIGN_UP)
      .send(signUpDTO)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toStrictEqual({
          id: expect.any(String),
          email: signUpDTO.email,
          firstName: signUpDTO.firstName,
          lastName: signUpDTO.lastName,
          phone: null,
        });
      });
  });
};

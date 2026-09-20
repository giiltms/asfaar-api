import { PrismaClient } from '@prisma/client';
import { CoreModule } from '@core/core.module';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PRISMA_SERVICE_OPTIONS } from '@providers/prisma/prisma.constants';

/**
 * PrismaService owns the middleware chain: it registers every application
 * middleware in its constructor. Options passed through
 * `PrismaModule.forRoot({ prismaServiceOptions: { middlewares } })` are applied
 * *in addition* to that list, so naming a middleware in both places registers
 * it twice - and a middleware registered twice runs twice, sending duplicate
 * email for a single write.
 */
describe('Prisma middleware registration', () => {
  const captureRegistrations = (options?: any) => {
    const useSpy = jest
      .spyOn(PrismaClient.prototype as any, '$use')
      .mockImplementation(() => undefined);

    try {
      new PrismaService(options);
      return useSpy.mock.calls.map((call) => call[0]);
    } finally {
      useSpy.mockRestore();
    }
  };

  it('registers each application middleware exactly once', () => {
    const registered = captureRegistrations();

    // Bump this deliberately when adding or removing a middleware.
    expect(registered).toHaveLength(11);
  });

  it('applies middlewares passed through options in addition to its own', () => {
    const extra = jest.fn();

    const registered = captureRegistrations({ middlewares: [extra] });

    expect(registered).toHaveLength(12);
    expect(registered).toContain(extra);
  });

  it('does not let CoreModule re-register middlewares PrismaService already owns', () => {
    const imports = Reflect.getMetadata('imports', CoreModule) || [];
    const prismaModule = imports.find(
      (imported: any) => imported?.module === PrismaModule,
    );

    expect(prismaModule).toBeDefined();

    const optionsProvider = prismaModule.providers.find(
      (provider: any) => provider?.provide === PRISMA_SERVICE_OPTIONS,
    );
    const middlewares = optionsProvider?.useValue?.middlewares || [];

    expect(middlewares).toHaveLength(0);
  });
});
